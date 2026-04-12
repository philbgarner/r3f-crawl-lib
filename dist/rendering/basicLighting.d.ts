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
export declare const BASIC_ATLAS_VERT = "\nattribute float aTileId;\nattribute float aHeightOffset;\nattribute float aUvRotation;\n// 1.0 = full tile; < 1.0 = show only that fraction of the tile, top-aligned.\n// Used for partial-height skirt panels so bricks keep their aspect ratio.\nattribute float aUvHeightScale;\nuniform vec2  uTileSize;\nuniform float uColumns;\n\nvarying vec2  vAtlasUv;\nvarying vec2  vTileOrigin;\nvarying float vFogDist;\n\nvoid main() {\n  float id  = floor(aTileId + 0.5);\n  float col = mod(id, uColumns);\n  float row = floor(id / uColumns);\n\n  // Scale face height dimension BEFORE rotation so it always affects the\n  // physical height axis of the face, regardless of UV rotation.\n  float hs = clamp(aUvHeightScale, 0.0, 1.0);\n  vec2 localUv = vec2(uv.x, uv.y * hs);\n\n  // Rotate UV within tile bounds (0=0\u00B0, 1=90\u00B0CCW, 2=180\u00B0, 3=270\u00B0CCW).\n  int iRot = int(floor(aUvRotation + 0.5));\n  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);\n  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);\n  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);\n\n  vec2 offset = vec2(col * uTileSize.x, 1.0 - (row + 1.0) * uTileSize.y);\n  vAtlasUv    = offset + localUv * uTileSize;\n  vTileOrigin = offset;\n\n  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);\n  worldPos.y   += aHeightOffset;\n\n  vec4 eyePos = viewMatrix * worldPos;\n  vFogDist    = length(eyePos.xyz);\n\n  gl_Position = projectionMatrix * eyePos;\n}\n";
/**
 * Atlas fragment shader.
 * Samples the tile atlas and applies linear fog. No torch effects.
 */
export declare const BASIC_ATLAS_FRAG = "\nuniform sampler2D uAtlas;\nuniform vec2  uTileSize;\nuniform vec2  uTexelSize;\nuniform vec3  uFogColor;\nuniform float uFogNear;\nuniform float uFogFar;\n\nvarying vec2  vAtlasUv;\nvarying vec2  vTileOrigin;\nvarying float vFogDist;\n\nvoid main() {\n  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;\n  vec2 uvMax   = vTileOrigin + uTileSize  - uTexelSize * 0.5;\n  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);\n\n  vec4 color = texture2D(uAtlas, atlasUv);\n  if (color.a < 0.01) discard;\n\n  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);\n  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);\n}\n";
/**
 * Vertex shader for textured 3-D objects (GLB/FBX models).
 * Outputs vUv and vFogDist for use with BASIC_OBJECT_FRAG.
 */
export declare const BASIC_OBJECT_VERT = "\nvarying vec2  vUv;\nvarying float vFogDist;\n\nvoid main() {\n  vUv = uv;\n  vec4 worldPos = modelMatrix * vec4(position, 1.0);\n  vec4 eyePos   = viewMatrix * worldPos;\n  vFogDist      = length(eyePos.xyz);\n  gl_Position   = projectionMatrix * eyePos;\n}\n";
/**
 * Fragment shader for textured 3-D objects (GLB/FBX models).
 * Samples uMap and applies linear fog.
 */
export declare const BASIC_OBJECT_FRAG = "\nuniform sampler2D uMap;\nuniform vec3  uFogColor;\nuniform float uFogNear;\nuniform float uFogFar;\n\nvarying vec2  vUv;\nvarying float vFogDist;\n\nvoid main() {\n  vec4 color = texture2D(uMap, vUv);\n  if (color.a < 0.01) discard;\n\n  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);\n  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);\n}\n";
/**
 * Build Three.js uniform objects for the basic atlas ShaderMaterial.
 */
export declare function makeBasicAtlasUniforms(params: {
    atlas: THREE.Texture;
    tileSize: THREE.Vector2;
    texelSize: THREE.Vector2;
    columns: number;
    fogColor: THREE.Color;
    fogNear: number;
    fogFar: number;
}): Record<string, {
    value: unknown;
}>;
//# sourceMappingURL=basicLighting.d.ts.map