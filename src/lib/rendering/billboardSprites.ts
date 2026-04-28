// src/lib/rendering/billboardSprites.ts
//
// Camera-facing billboard sprite system for mobile entities.
// Supports layered sprite rendering with multi-angle variants.

import * as THREE from "three";
import type { EntityBase } from "../entities/types";
import { resolveTile } from "./tileAtlas";
import type { PackedAtlas } from "./textureLoader";
import { spriteToUvRect } from "./textureLoader";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AngleKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface SpriteBob {
  /** Peak horizontal displacement left/right of offsetX, in world units. Default 0. */
  amplitudeX?: number;
  /** Peak vertical displacement above/below offsetY, in world units. Default 0. */
  amplitudeY?: number;
  /** Oscillation speed in radians per second. Default 2. */
  speed?: number;
  /** Phase offset in radians, useful for staggering multiple layers. Default 0. */
  phase?: number;
}

export interface SpriteLayer {
  /** Atlas tile: string name (resolved via resolver) or numeric tile index. */
  tile: string | number;
  /** Horizontal offset from billboard center, in world units. Default 0. */
  offsetX?: number;
  /** Vertical offset from billboard center, in world units. Default 0. */
  offsetY?: number;
  /** Uniform scale multiplier. Default 1. */
  scale?: number;
  /** Alpha multiplier [0,1]. Default 1. */
  opacity?: number;
  /** Sinusoidal vertical bobbing animation applied on top of offsetY. */
  bob?: SpriteBob;
}

export interface AngleOverride {
  /** Which layer index this override targets. */
  layerIndex: number;
  /** Replacement tile for this angle: string name or numeric tile index. */
  tile: string | number;
  /** Replacement opacity (optional). */
  opacity?: number;
}

/**
 * Describes how to render an entity as a camera-facing billboard.
 * Presence of this field on an EntityBase switches the renderer from
 * box geometry to billboard quads.
 */
export interface SpriteMap {
  /** Pixel dimensions of a single sprite cell in the atlas. */
  frameSize: { w: number; h: number };
  /** Ordered layers composited back-to-front (index 0 = bottommost). */
  layers: SpriteLayer[];
  /**
   * Per-angle layer overrides. Key is a cardinal/intercardinal direction.
   * When the viewer's bearing falls within 45° of a key, that override
   * takes precedence over the base layer for the targeted layer index.
   */
  angles?: Partial<Record<AngleKey, AngleOverride[]>>;
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BILLBOARD_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uUvX;
uniform float uUvY;
uniform float uUvW;
uniform float uUvH;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec2 atlasUv = vec2(uUvX + vUv.x * uUvW, uUvY + vUv.y * uUvH);
  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
`;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

export interface BillboardHandle {
  /** Update position, orientation, and angle-variant uniforms each frame. */
  update(
    entity: EntityBase,
    cameraYaw: number,
    tileSize: number,
    ceilingH: number,
  ): void;
  /** Remove meshes from scene and dispose GPU resources. */
  dispose(): void;
}

interface LayerMeshEntry {
  mesh: THREE.Mesh;
  uniforms: {
    uUvX: { value: number };
    uUvY: { value: number };
    uUvW: { value: number };
    uUvH: { value: number };
    uOpacity: { value: number };
  };
  baseLayer: SpriteLayer;
  layerIndex: number;
}

// ---------------------------------------------------------------------------
// Angle selection
// ---------------------------------------------------------------------------

const ANGLE_KEYS: AngleKey[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function selectAngleKey(entityFacing: number, cameraYaw: number): AngleKey {
  const rel =
    (((entityFacing - cameraYaw) % (Math.PI * 2)) + Math.PI * 2) %
    (Math.PI * 2);
  const sector = Math.round(rel / (Math.PI / 4)) % 8;
  return ANGLE_KEYS[sector] ?? "N";
}

// ---------------------------------------------------------------------------
// Billboard factory
// ---------------------------------------------------------------------------

/**
 * Create a per-entity billboard handle. Call `handle.update()` each RAF frame.
 * The atlas texture should already be created and cached by the caller.
 */
export function createBillboard(
  entity: EntityBase & { spriteMap: SpriteMap },
  packedAtlas: PackedAtlas,
  scene: THREE.Scene,
  resolver?: (name: string) => number,
  expectedFrameSize: number = 64, // Expected tile size is 64 pixels by default.
): BillboardHandle {
  const { spriteMap } = entity;
  const group = new THREE.Group();
  scene.add(group);

  const atlasTex = new THREE.Texture(packedAtlas.texture as HTMLCanvasElement);
  atlasTex.magFilter = THREE.NearestFilter;
  atlasTex.minFilter = THREE.NearestFilter;
  atlasTex.needsUpdate = true;

  function getRect(tile: string | number) {
    const id = resolveTile(tile, resolver);
    const sprite = packedAtlas.getById(id);
    return sprite ? spriteToUvRect(sprite) : { x: 0, y: 0, w: 0, h: 0 };
  }

  function getPivot(tile: string | number) {
    const id = resolveTile(tile, resolver);
    const sprite = packedAtlas.getById(id);
    return sprite?.pivot ?? { x: 0.5, y: 0.5 };
  }

  const layerEntries: LayerMeshEntry[] = spriteMap.layers.map(
    (layer, layerIndex) => {
      const rect = getRect(layer.tile);
      const uniforms = {
        uAtlas: { value: atlasTex },
        uUvX: { value: rect.x },
        uUvY: { value: rect.y },
        uUvW: { value: rect.w },
        uUvH: { value: rect.h },
        uOpacity: { value: layer.opacity ?? 1 },
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: BILLBOARD_VERT,
        fragmentShader: BILLBOARD_FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const geo = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = layerIndex + 1;

      const s = layer.scale ?? 1;
      mesh.position.set(
        layer.offsetX ?? 0,
        layer.offsetY ?? 0,
        layerIndex * 0.001,
      );
      mesh.scale.set(s, s, 1);

      group.add(mesh);
      return { mesh, uniforms, baseLayer: layer, layerIndex };
    },
  );

  return {
    update(ent, cameraYaw, tileSize, ceilingH) {
      // Position group at entity world coordinates.
      const wx = (ent.x + 0.5) * tileSize;
      const wz = (ent.z + 0.5) * tileSize;
      const basePivot = spriteMap.layers[0]
        ? getPivot(spriteMap.layers[0].tile)
        : { x: 0.5, y: 0.5 };
      const wy = (1 - basePivot.y) * tileSize;
      group.position.set(wx, wy, wz);

      // Rotate the group to always face the camera (Y-axis billboard).
      group.rotation.set(0, cameraYaw, 0, "YXZ");

      // Scale layers to world-unit sprite size, preserving frameSize aspect ratio.
      // no longer do this. the artist decides the scaling, which by default should be tilesize if it's a full-size monster
      // we should probably use the actual sprite sizes, but we'll use the passed frameSize and thus allow tiny and large-sized monsters
      // to exist. Expected tile size is 64 pixels (anything less just looks bad)
      const sprW = tileSize * (spriteMap.frameSize.w / expectedFrameSize);
      const sprH = tileSize * (spriteMap.frameSize.h / expectedFrameSize);

      // Determine active angle key for override lookup.
      const facing = (ent as { facing?: number }).facing ?? 0;
      const angleKey = selectAngleKey(facing, cameraYaw);
      const overrides = spriteMap.angles?.[angleKey];

      for (const entry of layerEntries) {
        const override = overrides?.find(
          (o) => o.layerIndex === entry.layerIndex,
        );
        const rawTile = override?.tile ?? entry.baseLayer.tile;
        const rect = getRect(rawTile);
        entry.uniforms.uUvX.value = rect.x;
        entry.uniforms.uUvY.value = rect.y;
        entry.uniforms.uUvW.value = rect.w;
        entry.uniforms.uUvH.value = rect.h;
        entry.uniforms.uOpacity.value =
          override?.opacity ?? entry.baseLayer.opacity ?? 1;

        const s = entry.baseLayer.scale ?? 1;
        entry.mesh.scale.set(sprW * s, sprH * s, 1);

        const bob = entry.baseLayer.bob;
        const bobTheta = bob
          ? (performance.now() / 1000) * (bob.speed ?? 2) + (bob.phase ?? 0)
          : 0;
        const bobX = bob ? (bob.amplitudeX ?? 0) * Math.sin(bobTheta) : 0;
        const bobY = bob ? (bob.amplitudeY ?? 0) * (1 + Math.sin(bobTheta)) : 0;

        entry.mesh.position.set(
          (entry.baseLayer.offsetX ?? 0) + bobX,
          (entry.baseLayer.offsetY ?? 0) + bobY,
          entry.layerIndex * 0.001,
        );
      }
    },

    dispose() {
      scene.remove(group);
      for (const entry of layerEntries) {
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.Material).dispose();
      }
    },
  };
}
