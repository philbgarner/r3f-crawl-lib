// src/lib/dungeon/tiled.ts
//
// Converts a Tiled JSON export into DungeonOutputs.
// All layer-name and tileset-GID mappings come entirely from developer config.
// No built-in layer-name assumptions.

import * as THREE from "three";
import type { DungeonOutputs } from "./bsp";
import type { ObjectPlacement } from "../entities/types";
import { buildColliderFlags } from "./colliderFlags";

// ----------------------------------------------------------------
// Tiled JSON types (minimal subset we need)
// ----------------------------------------------------------------

interface TiledLayer {
  type: "tilelayer" | "objectgroup" | string;
  name: string;
  /** Flat GID array (row-major, length = width × height), present on tilelayers. */
  data?: number[];
  objects?: TiledObject[];
}

interface TiledObject {
  id: number;
  name: string;
  type: string;
  /** Pixel X of top-left corner of the object bounding box. */
  x: number;
  /** Pixel Y of top-left corner of the object bounding box. */
  y: number;
  width: number;
  height: number;
  properties?: Array<{ name: string; value: unknown }>;
}

interface TiledJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

// ----------------------------------------------------------------
// Public API types
// ----------------------------------------------------------------

/** Maps DungeonOutputs channel names to the Tiled layer name to source them from. */
export interface TiledLayerMap {
  solid?: string;
  regionId?: string;
  distanceToWall?: string;
  hazards?: string;
  temperature?: string;
  floorType?: string;
  overlays?: string;
  wallType?: string;
  wallOverlays?: string;
  ceilingType?: string;
  ceilingOverlays?: string;
  /**
   * Optional: map a Tiled layer to the colliderFlags channel (R8).
   * If omitted, flags are derived automatically from the `solid` channel.
   */
  colliderFlags?: string;
}

export interface TiledMapOptions {
  /**
   * Maps each DungeonOutputs channel to a Tiled layer name in the JSON.
   * Channels with no entry are zero-filled.
   */
  layers: TiledLayerMap;
  /**
   * Maps Tiled tile GID (the integer stored in tilelayer data arrays) to the
   * byte value written into the corresponding channel.
   * GID 0 (empty cell) always writes 0, regardless of this map.
   */
  tilesetMap: Record<number, number>;
  /**
   * Maps the Tiled object `type` string to an ObjectPlacement `type` key.
   * Objects whose type is absent from this map are silently skipped.
   */
  objectTypes: Record<string, string>;
  /** Name of the Tiled object-group layer to parse for entity placements. */
  objectLayer?: string;
  /** Seed embedded verbatim in the returned DungeonOutputs. Defaults to 0. */
  seed?: number;
}

export interface TiledMapOutputs extends DungeonOutputs {
  /** Entity placements parsed from the configured object layer. */
  objectPlacements: ObjectPlacement[];
}

// ----------------------------------------------------------------
// DataTexture helpers (identical settings to bsp.ts)
// ----------------------------------------------------------------

function r8Texture(data: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.name = name;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  return tex;
}

function rgbaTexture(data: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.name = name;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  return tex;
}

// ----------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------

/**
 * Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
 * superset that also carries the parsed object placements).
 *
 * @param tiledJson  Raw object from `JSON.parse` of a Tiled .tmj / .json export.
 * @param options    Developer-supplied channel map, GID→value map, and object-type map.
 */
export function loadTiledMap(tiledJson: unknown, options: TiledMapOptions): TiledMapOutputs {
  const json = tiledJson as TiledJson;
  const W = json.width;
  const H = json.height;
  const tileW = json.tilewidth ?? 1;
  const tileH = json.tileheight ?? 1;
  const { layers: layerMap, tilesetMap, objectTypes, objectLayer, seed = 0 } = options;

  // Index all layers by name for O(1) lookup
  const layersByName = new Map<string, TiledLayer>();
  for (const layer of json.layers) {
    layersByName.set(layer.name, layer);
  }

  /** Build an R8 (1 byte/cell) channel from a named tile layer. */
  function buildR8(layerName: string | undefined): Uint8Array {
    const out = new Uint8Array(W * H);
    if (!layerName) return out;
    const layer = layersByName.get(layerName);
    if (!layer || layer.type !== "tilelayer" || !layer.data) return out;
    for (let i = 0; i < W * H; i++) {
      const gid = layer.data[i] ?? 0;
      out[i] = gid === 0 ? 0 : (tilesetMap[gid] ?? 0);
    }
    return out;
  }

  /**
   * Build an RGBA (4 bytes/cell) channel from a named tile layer.
   * The mapped GID value is written into the R byte; G/B/A remain 0.
   * This matches how bsp.ts encodes the overlays/wallOverlays/ceilingOverlays channels.
   */
  function buildRGBA(layerName: string | undefined): Uint8Array {
    const out = new Uint8Array(W * H * 4);
    if (!layerName) return out;
    const layer = layersByName.get(layerName);
    if (!layer || layer.type !== "tilelayer" || !layer.data) return out;
    for (let i = 0; i < W * H; i++) {
      const gid = layer.data[i] ?? 0;
      out[i * 4] = gid === 0 ? 0 : (tilesetMap[gid] ?? 0);
    }
    return out;
  }

  // Solid must be built first so we can derive the temperature default.
  const solidArr = buildR8(layerMap.solid);

  let tempArr: Uint8Array;
  if (layerMap.temperature) {
    tempArr = buildR8(layerMap.temperature);
  } else {
    // Floor cells default to 127 (neutral temperature), matching bsp.ts convention.
    tempArr = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      tempArr[i] = solidArr[i] === 0 ? 127 : 0;
    }
  }

  const colliderFlagsArr = layerMap.colliderFlags
    ? buildR8(layerMap.colliderFlags)
    : buildColliderFlags(solidArr);

  const textures: DungeonOutputs["textures"] = {
    solid:           r8Texture(solidArr,                         W, H, "solid"),
    regionId:        r8Texture(buildR8(layerMap.regionId),       W, H, "regionId"),
    distanceToWall:  r8Texture(buildR8(layerMap.distanceToWall), W, H, "distanceToWall"),
    hazards:         r8Texture(buildR8(layerMap.hazards),        W, H, "hazards"),
    temperature:     r8Texture(tempArr,                          W, H, "temperature"),
    floorType:       r8Texture(buildR8(layerMap.floorType),      W, H, "floorType"),
    overlays:        rgbaTexture(buildRGBA(layerMap.overlays),        W, H, "overlays"),
    wallType:        r8Texture(buildR8(layerMap.wallType),       W, H, "wallType"),
    wallOverlays:    rgbaTexture(buildRGBA(layerMap.wallOverlays),    W, H, "wallOverlays"),
    ceilingType:     r8Texture(buildR8(layerMap.ceilingType),    W, H, "ceilingType"),
    ceilingOverlays: rgbaTexture(buildRGBA(layerMap.ceilingOverlays), W, H, "ceilingOverlays"),
    colliderFlags:   r8Texture(colliderFlagsArr,                 W, H, "colliderFlags"),
  };

  // ----------------------------------------------------------------
  // Object placements
  // ----------------------------------------------------------------
  const objectPlacements: ObjectPlacement[] = [];

  if (objectLayer) {
    const layer = layersByName.get(objectLayer);
    if (layer && layer.type === "objectgroup" && layer.objects) {
      for (const obj of layer.objects) {
        const placementType = objectTypes[obj.type];
        if (!placementType) continue;

        // Convert pixel bounding-box centre to tile grid coordinates.
        const gridX = Math.floor((obj.x + obj.width / 2) / tileW);
        const gridZ = Math.floor((obj.y + obj.height / 2) / tileH);

        // Carry Tiled custom properties (and identity info) into meta.
        const meta: Record<string, unknown> = {
          tiledId: obj.id,
          tiledName: obj.name,
        };
        if (obj.properties) {
          for (const prop of obj.properties) {
            meta[prop.name] = prop.value;
          }
        }

        objectPlacements.push({ x: gridX, z: gridZ, type: placementType, meta });
      }
    }
  }

  return { width: W, height: H, seed, textures, objectPlacements };
}
