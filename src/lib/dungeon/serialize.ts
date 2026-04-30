// Dungeon state serialization to/from JSON-safe plain objects.
// Textures hold all mutable state; generation inputs are stored for
// full rehydration (including the room graph) without re-running from scratch.

import type { BspDungeonOptions, BspDungeonOutputs, RoomedDungeonOutputs, RoomInfo } from "./bsp";
import { generateBspDungeon } from "./bsp";
import { buildColliderFlags } from "./colliderFlags";
import * as THREE from "three";

// --------------------------------
// Types
// --------------------------------

/**
 * Plain, JSON-safe snapshot of a dungeon's mutable texture data.
 * Immutable generation inputs are stored so the dungeon can be fully
 * reconstructed without the original options object.
 */
export type SerializedDungeon = {
  version: 1;
  width: number;
  height: number;
  seed: number;
  startRoomId: number;
  endRoomId: number;
  firstCorridorRegionId: number;
  /** Base64-encoded Uint8Array for each texture channel. */
  solid: string;
  regionId: string;
  distanceToWall: string;
  hazards: string;
  colliderFlags: string;
  /** Base64-encoded RGBA Uint8Array for skirt tile overrides. Optional for backwards compatibility. */
  floorSkirtType?: string;
  ceilSkirtType?: string;
  /** Base64-encoded R8 Uint8Array matching textures.floorHeightOffset. Optional for backwards compatibility. */
  floorHeightOffset?: string;
  /** Base64-encoded R8 Uint8Array matching textures.ceilingHeightOffset. Optional for backwards compatibility. */
  ceilingHeightOffset?: string;
  /**
   * Per-cell surface-painter tile-name overlays, keyed by "x,z".
   * Values match SurfacePaintTarget: { floor?, wall?, ceil? } each an array of tile name strings.
   */
  paintMap?: Record<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>;
  /**
   * Serialized rooms map: region ID → { type, rect, connections }.
   * Optional for backwards compatibility with files that predate this field.
   */
  rooms?: Record<number, {
    type: "room" | "corridor";
    rect: { x: number; y: number; w: number; h: number };
    connections: number[];
  }>;
};

// --------------------------------
// Base64 helpers
// --------------------------------

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

function base64ToUint8(str: string): Uint8Array {
  const binary = atob(str);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function textureData(tex: THREE.DataTexture): Uint8Array {
  return tex.image.data as Uint8Array;
}

// --------------------------------
// DataTexture reconstruction
// --------------------------------

function makeDataTexture(data: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
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

function makeDataTextureRGBA(data: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
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

// --------------------------------
// Public API
// --------------------------------

/**
 * Snapshot all mutable texture data into a JSON-safe object.
 * Call after generateContent() to capture placed content (doors, hazards, etc.).
 *
 * Pass paintMap (from game.dungeon.paintMap) to include surface-painter overlays.
 * Height offset textures are read directly from the dungeon when present.
 */
export function serializeDungeon(
  dungeon: RoomedDungeonOutputs,
  paintMap?: ReadonlyMap<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>,
): SerializedDungeon {
  const out: SerializedDungeon = {
    version: 1,
    width: dungeon.width,
    height: dungeon.height,
    seed: dungeon.seed,
    startRoomId: dungeon.startRoomId,
    endRoomId: dungeon.endRoomId,
    firstCorridorRegionId: dungeon.firstCorridorRegionId,
    solid: uint8ToBase64(textureData(dungeon.textures.solid)),
    regionId: uint8ToBase64(textureData(dungeon.textures.regionId)),
    distanceToWall: uint8ToBase64(textureData(dungeon.textures.distanceToWall)),
    hazards: uint8ToBase64(textureData(dungeon.textures.hazards)),
    colliderFlags: uint8ToBase64(textureData(dungeon.textures.colliderFlags)),
    floorSkirtType: uint8ToBase64(textureData(dungeon.textures.floorSkirtType)),
    ceilSkirtType: uint8ToBase64(textureData(dungeon.textures.ceilSkirtType)),
  };

  if (dungeon.textures.floorHeightOffset?.image.data) {
    out.floorHeightOffset = uint8ToBase64(dungeon.textures.floorHeightOffset.image.data as Uint8Array);
  }
  if (dungeon.textures.ceilingHeightOffset?.image.data) {
    out.ceilingHeightOffset = uint8ToBase64(dungeon.textures.ceilingHeightOffset.image.data as Uint8Array);
  }
  if (paintMap && paintMap.size > 0) {
    out.paintMap = Object.fromEntries(paintMap);
  }
  if (dungeon.rooms && dungeon.rooms.size > 0) {
    const roomsObj: SerializedDungeon["rooms"] = {};
    for (const [id, info] of dungeon.rooms) {
      roomsObj[id] = { type: info.type, rect: info.rect, connections: info.connections };
    }
    out.rooms = roomsObj;
  }

  return out;
}

/**
 * Reconstruct a BspDungeonOutputs from a snapshot.
 * The returned object is fully usable with generateContent, aStar8, computeFov, etc.
 * The `rooms` map is empty - call rehydrateDungeon() if room graph data is needed.
 */
export function deserializeDungeon(data: SerializedDungeon): BspDungeonOutputs {
  const { width: W, height: H } = data;
  const solidData = base64ToUint8(data.solid);
  const regionIdData = base64ToUint8(data.regionId);

  const rooms = new Map<number, RoomInfo>();
  if (data.rooms) {
    for (const [idStr, info] of Object.entries(data.rooms)) {
      const id = Number(idStr);
      rooms.set(id, { id, type: info.type, rect: info.rect, connections: info.connections });
    }
  }
  const { firstCorridorRegionId } = data;
  // regionId already contains unique corridor IDs (baked in by generateBspDungeon)
  const fullRegionIds = regionIdData;

  const temperature = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (solidData[i] === 0) temperature[i] = 127;
  }

  return {
    width: W,
    height: H,
    seed: data.seed,
    startRoomId: data.startRoomId,
    endRoomId: data.endRoomId,
    rooms,
    fullRegionIds,
    firstCorridorRegionId,
    textures: {
      solid: makeDataTexture(solidData, W, H, "bsp_dungeon_solid"),
      regionId: makeDataTexture(regionIdData, W, H, "bsp_dungeon_region_id"),
      distanceToWall: makeDataTexture(base64ToUint8(data.distanceToWall), W, H, "bsp_dungeon_distance_to_wall"),
      hazards: makeDataTexture(base64ToUint8(data.hazards), W, H, "bsp_dungeon_hazards"),
      temperature: makeDataTexture(temperature, W, H, "bsp_dungeon_temperature"),
      floorType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_floor_type"),
      overlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_overlays"),
      wallType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_wall_type"),
      wallOverlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_wall_overlays"),
      ceilingType: makeDataTexture(new Uint8Array(W * H), W, H, "bsp_dungeon_ceiling_type"),
      ceilingOverlays: makeDataTextureRGBA(new Uint8Array(4 * W * H), W, H, "bsp_dungeon_ceiling_overlays"),
      colliderFlags: makeDataTexture(base64ToUint8(data.colliderFlags), W, H, "bsp_dungeon_collider_flags"),
      floorSkirtType: makeDataTextureRGBA(
        data.floorSkirtType ? base64ToUint8(data.floorSkirtType) : new Uint8Array(4 * W * H),
        W, H, "bsp_dungeon_floor_skirt_type",
      ),
      ceilSkirtType: makeDataTextureRGBA(
        data.ceilSkirtType ? base64ToUint8(data.ceilSkirtType) : new Uint8Array(4 * W * H),
        W, H, "bsp_dungeon_ceil_skirt_type",
      ),
      ...(data.floorHeightOffset !== undefined
        ? { floorHeightOffset: makeDataTexture(base64ToUint8(data.floorHeightOffset), W, H, "bsp_dungeon_floor_height_offset") }
        : {}),
      ...(data.ceilingHeightOffset !== undefined
        ? { ceilingHeightOffset: makeDataTexture(base64ToUint8(data.ceilingHeightOffset), W, H, "bsp_dungeon_ceiling_height_offset") }
        : {}),
    },
  };
}

/**
 * Full rehydration: deserializes texture data AND reconstructs the room graph
 * by re-running BSP with the stored seed. Rooms will be identical because
 * generation is deterministic.
 */
export function rehydrateDungeon(
  data: SerializedDungeon,
  originalOptions: Omit<BspDungeonOptions, "seed">,
): BspDungeonOutputs {
  const fresh = generateBspDungeon({ ...originalOptions, seed: data.seed });

  const solidData = base64ToUint8(data.solid);
  const regionIdData = base64ToUint8(data.regionId);
  const distanceToWallData = base64ToUint8(data.distanceToWall);
  const hazardsData = base64ToUint8(data.hazards);
  const colliderFlagsData = base64ToUint8(data.colliderFlags);

  (fresh.textures.solid.image.data as Uint8Array).set(solidData);
  (fresh.textures.regionId.image.data as Uint8Array).set(regionIdData);
  (fresh.textures.distanceToWall.image.data as Uint8Array).set(distanceToWallData);
  (fresh.textures.hazards.image.data as Uint8Array).set(hazardsData);
  (fresh.textures.colliderFlags.image.data as Uint8Array).set(colliderFlagsData);

  fresh.textures.solid.needsUpdate = true;
  fresh.textures.regionId.needsUpdate = true;
  fresh.textures.distanceToWall.needsUpdate = true;
  fresh.textures.hazards.needsUpdate = true;
  fresh.textures.colliderFlags.needsUpdate = true;

  if (data.floorSkirtType) {
    (fresh.textures.floorSkirtType.image.data as Uint8Array).set(base64ToUint8(data.floorSkirtType));
    fresh.textures.floorSkirtType.needsUpdate = true;
  }
  if (data.ceilSkirtType) {
    (fresh.textures.ceilSkirtType.image.data as Uint8Array).set(base64ToUint8(data.ceilSkirtType));
    fresh.textures.ceilSkirtType.needsUpdate = true;
  }
  if (data.floorHeightOffset && fresh.textures.floorHeightOffset) {
    (fresh.textures.floorHeightOffset.image.data as Uint8Array).set(base64ToUint8(data.floorHeightOffset));
    fresh.textures.floorHeightOffset.needsUpdate = true;
  }
  if (data.ceilingHeightOffset && fresh.textures.ceilingHeightOffset) {
    (fresh.textures.ceilingHeightOffset.image.data as Uint8Array).set(base64ToUint8(data.ceilingHeightOffset));
    fresh.textures.ceilingHeightOffset.needsUpdate = true;
  }

  if (data.rooms) {
    for (const [idStr, saved] of Object.entries(data.rooms)) {
      const id = Number(idStr);
      const room = fresh.rooms.get(id);
      if (room) room.type = saved.type;
    }
  }

  return fresh;
}

/**
 * Convenience: serialize a dungeon to a JSON string.
 */
export function dungeonToJson(dungeon: RoomedDungeonOutputs): string {
  return JSON.stringify(serializeDungeon(dungeon));
}

/**
 * Convenience: deserialize a dungeon from a JSON string.
 * The `rooms` map will be empty; use rehydrateDungeon() for full restoration.
 */
export function dungeonFromJson(json: string): BspDungeonOutputs {
  return deserializeDungeon(JSON.parse(json) as SerializedDungeon);
}
