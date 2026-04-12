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
attribute float aTileId;
attribute float aHeightOffset;
attribute float aUvRotation;
// 1.0 = full tile; < 1.0 = show only that fraction of the tile, top-aligned.
// Used for partial-height skirt panels so bricks keep their aspect ratio.
attribute float aUvHeightScale;
uniform vec2  uTileSize;
uniform float uColumns;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;

void main() {
  float id  = floor(aTileId + 0.5);
  float col = mod(id, uColumns);
  float row = floor(id / uColumns);

  // Scale face height dimension BEFORE rotation so it always affects the
  // physical height axis of the face, regardless of UV rotation.
  float hs = clamp(aUvHeightScale, 0.0, 1.0);
  vec2 localUv = vec2(uv.x, uv.y * hs);

  // Rotate UV within tile bounds (0=0°, 1=90°CCW, 2=180°, 3=270°CCW).
  int iRot = int(floor(aUvRotation + 0.5));
  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);
  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);

  vec2 offset = vec2(col * uTileSize.x, 1.0 - (row + 1.0) * uTileSize.y);
  vAtlasUv    = offset + localUv * uTileSize;
  vTileOrigin = offset;

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
uniform vec2  uTileSize;
uniform vec2  uTexelSize;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;

void main() {
  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax   = vTileOrigin + uTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

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
 */
export function makeBasicAtlasUniforms(params: {
  atlas: THREE.Texture;
  tileSize: THREE.Vector2;
  texelSize: THREE.Vector2;
  columns: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
}): Record<string, { value: unknown }> {
  return {
    uAtlas:    { value: params.atlas },
    uTileSize: { value: params.tileSize },
    uTexelSize:{ value: params.texelSize },
    uColumns:  { value: params.columns },
    uFogColor: { value: params.fogColor },
    uFogNear:  { value: params.fogNear },
    uFogFar:   { value: params.fogFar },
  };
}
