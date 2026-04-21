import * as THREE from "three";

/**
 * basicLighting.ts
 *
 * Minimal Three.js shader chunks for atlas and object rendering.
 * No torch flicker, no tint bands — just texture sampling + linear fog.
 */

/**
 * Atlas vertex shader.
 * Handles aTileId UV lookup, aHeightOffset, and fog distance.
 */
export const BASIC_ATLAS_VERT = /* glsl */ `
attribute float aUvX;
attribute float aUvY;
attribute float aUvW;
attribute float aUvH;
attribute float aHeightOffset;
attribute float aUvRotation;
// 1.0 = full tile; < 1.0 = show only that fraction of the tile, top-aligned.
// Used for partial-height skirt panels so bricks keep their aspect ratio.
attribute float aUvHeightScale;
// Per-instance grid cell coordinates — used to look up the overlay texture.
attribute float aCellX;
attribute float aCellZ;

uniform vec2 uDungeonSize;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying vec2  vTileSize;
varying vec2  vLocalUv;
varying vec2  vOverlayUv;
varying float vFogDist;

void main() {
  // Scale face height dimension BEFORE rotation so it always affects the
  // physical height axis of the face, regardless of UV rotation.
  float hs = clamp(aUvHeightScale, 0.0, 1.0);
  vec2 localUv = vec2(uv.x, uv.y * hs);

  // Rotate UV within tile bounds (0=0°, 1=90°CCW, 2=180°, 3=270°CCW).
  int iRot = int(floor(aUvRotation + 0.5));
  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);
  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);

  vLocalUv   = localUv;
  vOverlayUv = (vec2(aCellX, aCellZ) + 0.5) / uDungeonSize;

  vTileOrigin = vec2(aUvX, aUvY);
  vTileSize   = vec2(aUvW, aUvH);
  vAtlasUv    = vTileOrigin + localUv * vTileSize;

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  worldPos.y   += aHeightOffset;

  vec4 eyePos = viewMatrix * worldPos;
  vFogDist    = length(eyePos.xyz);

  gl_Position = projectionMatrix * eyePos;
}
`;

/**
 * Atlas fragment shader.
 * Samples the tile atlas and applies linear fog. No torch effects.
 */
export const BASIC_ATLAS_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2  uTexelSize;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

// Surface painter overlay system.
// uOverlayLookup: W×H Uint8 RGBA texture — each channel holds one overlay tile ID (0 = none).
// uTileUvLookup:  1D float RGBA texture  — index = tile ID, value = (uvX, uvY, uvW, uvH).
uniform sampler2D uOverlayLookup;
uniform sampler2D uTileUvLookup;
uniform float     uTileUvCount;
// Per-cell skirt overlay slots (RGBA: 4 tile IDs, same encoding as uOverlayLookup). 1×1 zero by default (no-op).
uniform sampler2D uSkirtLookup;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying vec2  vTileSize;
varying vec2  vLocalUv;
varying vec2  vOverlayUv;
varying float vFogDist;

vec4 sampleOverlayTile(float id) {
  vec2 luv = vec2((id + 0.5) / uTileUvCount, 0.5);
  vec4 tr  = texture2D(uTileUvLookup, luv);
  vec2 ov  = clamp(
    tr.xy + vLocalUv * tr.zw,
    tr.xy + uTexelSize * 0.5,
    tr.xy + tr.zw    - uTexelSize * 0.5
  );
  return texture2D(uAtlas, ov);
}

void main() {
  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax   = vTileOrigin + vTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  // Sample the per-cell overlay slot texture (4 slots packed into RGBA).
  vec4 slots = texture2D(uOverlayLookup, vOverlayUv);

  float id0 = floor(slots.r * 255.0 + 0.5);
  if (id0 > 0.5) { vec4 oc = sampleOverlayTile(id0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id1 = floor(slots.g * 255.0 + 0.5);
  if (id1 > 0.5) { vec4 oc = sampleOverlayTile(id1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id2 = floor(slots.b * 255.0 + 0.5);
  if (id2 > 0.5) { vec4 oc = sampleOverlayTile(id2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id3 = floor(slots.a * 255.0 + 0.5);
  if (id3 > 0.5) { vec4 oc = sampleOverlayTile(id3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  // Per-cell skirt overlay slots (4 slots, same encoding as surface painter overlays).
  vec4 skirtSlots = texture2D(uSkirtLookup, vOverlayUv);
  float sk0 = floor(skirtSlots.r * 255.0 + 0.5);
  if (sk0 > 0.5) { vec4 oc = sampleOverlayTile(sk0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk1 = floor(skirtSlots.g * 255.0 + 0.5);
  if (sk1 > 0.5) { vec4 oc = sampleOverlayTile(sk1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk2 = floor(skirtSlots.b * 255.0 + 0.5);
  if (sk2 > 0.5) { vec4 oc = sampleOverlayTile(sk2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk3 = floor(skirtSlots.a * 255.0 + 0.5);
  if (sk3 > 0.5) { vec4 oc = sampleOverlayTile(sk3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);
}
`;

/**
 * Vertex shader for textured 3-D objects (GLB/FBX models).
 * Outputs vUv and vFogDist for use with BASIC_OBJECT_FRAG.
 */
export const BASIC_OBJECT_VERT = /* glsl */ `
varying vec2  vUv;
varying float vFogDist;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 eyePos   = viewMatrix * worldPos;
  vFogDist      = length(eyePos.xyz);
  gl_Position   = projectionMatrix * eyePos;
}
`;

/**
 * Fragment shader for textured 3-D objects (GLB/FBX models).
 * Samples uMap and applies linear fog.
 */
export const BASIC_OBJECT_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2  vUv;
varying float vFogDist;

void main() {
  vec4 color = texture2D(uMap, vUv);
  if (color.a < 0.01) discard;

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);
}
`;

/**
 * Build Three.js uniform objects for the basic atlas ShaderMaterial.
 * Overlay uniforms are optional — when omitted a 1×1 zero-filled default
 * texture is used, which disables the overlay pass at zero cost.
 */
export function makeBasicAtlasUniforms(params: {
  atlas: THREE.Texture;
  texelSize: THREE.Vector2;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  /** 1D float DataTexture mapping tile ID → (uvX, uvY, uvW, uvH). */
  tileUvLookup?: THREE.Texture;
  /** Number of tiles in tileUvLookup (width of the 1D texture). */
  tileUvCount?: number;
  /** W×H Uint8 RGBA DataTexture: each channel = overlay slot tile ID (0 = none). */
  overlayLookup?: THREE.Texture;
  /** W×H Uint8 RGBA DataTexture for per-cell skirt tile overrides (R=N,G=S,B=E,A=W). */
  skirtLookup?: THREE.Texture;
  /** Dungeon grid dimensions (width, height). Used by vertex shader. */
  dungeonSize?: THREE.Vector2;
}): Record<string, { value: unknown }> {
  const defaultTex = makeSinglePixelTex();
  return {
    uAtlas:          { value: params.atlas },
    uTexelSize:      { value: params.texelSize },
    uFogColor:       { value: params.fogColor },
    uFogNear:        { value: params.fogNear },
    uFogFar:         { value: params.fogFar },
    uTileUvLookup:   { value: params.tileUvLookup ?? defaultTex },
    uTileUvCount:    { value: params.tileUvCount ?? 1 },
    uOverlayLookup:  { value: params.overlayLookup ?? defaultTex },
    uSkirtLookup:    { value: params.skirtLookup ?? defaultTex },
    uDungeonSize:    { value: params.dungeonSize ?? new THREE.Vector2(1, 1) },
  };
}

/** Returns a 1×1 transparent black DataTexture used as a no-op default. */
function makeSinglePixelTex(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
