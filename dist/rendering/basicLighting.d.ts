import * as THREE from "three";
/**
 * basicLighting.ts
 *
 * GLSL shader chunks for the dungeon atlas renderer. Two lighting passes run
 * in sequence in the fragment shader, both always active when an atlas is used:
 *
 *   1. Ambient occlusion (AO) — baked per-face corner values darken geometry
 *      where walls, floors, and ceilings meet. Intensity is controlled by the
 *      uAoIntensity uniform (0 = disabled, 1 = maximum darkening). Set via
 *      ambientOcclusion option on createDungeonRenderer.
 *
 *   2. Directional surface lighting — a per-surface brightness multiplier that
 *      makes depth and orientation readable without dynamic lights:
 *        - Walls: 0.9–1.1, scaled by abs(dot(face_normal, camera_forward)).
 *          Walls you face head-on are brighter (1.1); side walls are darker (0.9).
 *        - Floor: fixed 0.85
 *        - Ceiling: fixed 0.95
 *      This is always on; there is no runtime toggle.
 *
 * WebGL attribute slot budget: 16 total.
 *   Built-ins used by Three.js InstancedMesh:
 *     position (1) + uv (1) + instanceMatrix/mat4 (4) = 6
 *   Custom attributes: aUvRect(1) + aSurface(1) + aAoCorners(1) + aCellFace(1) = 4
 *   Total used: 10 / 16 — 6 slots remain for future attributes.
 *   Each vec2/vec3/vec4 attribute occupies exactly 1 WebGL slot regardless of component count.
 */
/**
 * Atlas vertex shader.
 *
 * Responsibilities (in order):
 *   1. Clip UV height for partial-height skirt panels (aSurface.z = uvHeightScale).
 *   2. Select the AO corner value for this vertex from aAoCorners.
 *   3. Rotate the tile UV in 90° steps (aSurface.y = uvRotation).
 *   4. Map local UV into the atlas rect (aUvRect.xy = origin, aUvRect.zw = size).
 *   5. Compute cell-relative overlay UV (aCellFace.xy / uDungeonSize).
 *   6. Apply height offset in world space (aSurface.x = heightOffset).
 *   7. Compute vFacingLight: fixed for floors/ceilings, dot-product for walls.
 *   8. Output fog distance as eye-space length.
 */
export declare const BASIC_ATLAS_VERT = "\n// \u2500\u2500 Per-instance atlas UV rect \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Atlas tile UV rect packed as a single vec4 (1 slot).\n//   .xy = rect origin (uvX, uvY)   .zw = rect size (uvW, uvH)\n// Packing four floats into one vec4 saves 3 attribute slots vs. separate floats.\nattribute vec4 aUvRect;\n\n// \u2500\u2500 Per-instance geometry + UV transform \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Three per-face scalars packed into one vec3 (1 slot, saves 2 vs. 3 floats).\n//   .x = heightOffset   \u2014 world-space Y shift applied after instance matrix\n//   .y = uvRotation     \u2014 UV rotation index: 0=0\u00B0, 1=90\u00B0CCW, 2=180\u00B0, 3=270\u00B0CCW\n//   .z = uvHeightScale  \u2014 fraction of tile height to show, top-aligned [0,1];\n//                         skirt panels use < 1 so brick rows keep aspect ratio\nattribute vec3 aSurface;\n\n// \u2500\u2500 Per-instance overlay / lighting data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Pre-baked ambient-occlusion corner values in face-local UV order:\n//   .x = top-left (uv 0,1), .y = top-right (uv 1,1)\n//   .z = bot-left (uv 0,0), .w = bot-right (uv 1,0)\n// Each component in [0,1]: 1 = fully lit, 0 = fully occluded.\n// Computed once at dungeon-build time from the solid map; see computeFaceAO().\n// Floors/ceilings use 8-neighbour sampling; walls use the two horizontal\n// neighbours on each side. Skirt faces default to 1.0 (always fully lit).\nattribute vec4 aAoCorners;\n\n// Grid cell + face normal packed as a single vec4 (1 slot, saves 1 vs. 2\u00D7vec2).\n//   .xy = grid cell (column, row) \u2014 used to index into uOverlayLookup\n//   .zw = XZ outward face normal  \u2014 non-zero only for wall faces:\n//           North (0, 1)  South (0,-1)  West (1, 0)  East (-1, 0)\n//         Floor/ceiling carry (0,0) and use uSurfaceLight directly.\nattribute vec4 aCellFace;\n\n// \u2500\u2500 Uniforms \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Width and height of the dungeon grid in cells. Used to normalise aCell\n// into [0,1] UV space for the overlay lookup texture.\nuniform vec2 uDungeonSize;\n\n// Camera forward direction projected onto the XZ plane, updated every RAF tick.\n// Computed in dungeonRenderer.ts as (-sin(curYaw), -cos(curYaw)).\n// Only read by the directional-lighting branch (uSurfaceLight < 0).\nuniform vec2 uCamDir;\n\n// Directional surface lighting mode per material:\n//   >= 0 : fixed brightness multiplier applied to all pixels on this surface\n//           (floor and ceiling use this path; value set via surfaceLighting option)\n//    < 0 : use the camera-angle formula for walls/skirts (see uWallLightMin/Max)\nuniform float uSurfaceLight;\n\n// Wall directional lighting range. Only used when uSurfaceLight < 0.\n//   uWallLightMin : brightness when wall normal is perpendicular to camera (side wall)\n//   uWallLightMax : brightness when wall normal is parallel   to camera (facing wall)\n// Formula: vFacingLight = uWallLightMin + abs(dot(aFaceN, uCamDir)) * (uWallLightMax - uWallLightMin)\n// Defaults: min=0.9, max=1.1  \u2192  range [0.9, 1.1]\nuniform float uWallLightMin;\nuniform float uWallLightMax;\n\n// \u2500\u2500 Varyings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nvarying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation\nvarying vec2  vTileOrigin;  // Top-left corner of the atlas tile rect (for clamping)\nvarying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)\nvarying vec2  vLocalUv;     // Local UV within the tile [0,1]\u00B2 after rotation\nvarying vec2  vOverlayUv;   // UV into the overlay lookup texture\nvarying float vFogDist;     // Eye-space distance used for linear fog\nvarying float vAo;          // Interpolated AO value for this fragment [0,1]\nvarying float vFacingLight; // Directional surface brightness multiplier\n\nvoid main() {\n  // \u2500\u2500 1. Clip UV height for partial skirt panels \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // Scale the Y axis of the UV BEFORE any rotation so the clip always acts on\n  // the physical vertical axis of the face, regardless of rotation.\n  float hs = clamp(aSurface.z, 0.0, 1.0);\n  vec2 localUv = vec2(uv.x, uv.y * hs);\n\n  // \u2500\u2500 2. Select per-corner AO value for this vertex \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // aAoCorners stores one float per corner in face-local UV space.\n  // We select by raw (pre-rotation) UV quadrant so corners stay consistent\n  // across all rotation modes. The GPU then interpolates vAo between vertices.\n  if      (uv.x < 0.5 && uv.y >= 0.5) vAo = aAoCorners.x; // top-left\n  else if (uv.x >= 0.5 && uv.y >= 0.5) vAo = aAoCorners.y; // top-right\n  else if (uv.x < 0.5 && uv.y <  0.5) vAo = aAoCorners.z; // bottom-left\n  else                                  vAo = aAoCorners.w; // bottom-right\n\n  // \u2500\u2500 3. Rotate UV within the tile (0=0\u00B0, 1=90\u00B0CCW, 2=180\u00B0, 3=270\u00B0CCW) \u2500\u2500\u2500\u2500\u2500\u2500\n  int iRot = int(floor(aSurface.y + 0.5));\n  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);\n  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);\n  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);\n\n  vLocalUv = localUv;\n\n  // \u2500\u2500 4. Map local UV into the atlas rect \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  vTileOrigin = aUvRect.xy;\n  vTileSize   = aUvRect.zw;\n  vAtlasUv    = vTileOrigin + localUv * vTileSize;\n\n  // \u2500\u2500 5. Overlay UV: cell-centre in normalised dungeon-grid space \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // Adding 0.5 moves from corner to centre of the cell so the lookup texture\n  // is sampled at the right texel for this grid cell.\n  vOverlayUv = (aCellFace.xy + 0.5) / uDungeonSize;\n\n  // \u2500\u2500 6. World position + height offset \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);\n  worldPos.y   += aSurface.x;\n\n  // \u2500\u2500 7. Fog distance (eye-space length) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  vec4 eyePos = viewMatrix * worldPos;\n  vFogDist    = length(eyePos.xyz);\n\n  // \u2500\u2500 8. Directional surface lighting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // For walls (uSurfaceLight < 0): brightness depends on how directly the wall\n  // faces the camera. abs() makes back-facing walls identical to front-facing.\n  //   dot = \u00B11 \u2192 wall perpendicular to view \u2192 uWallLightMax (e.g. 1.1, bright)\n  //   dot =  0 \u2192 wall parallel to view      \u2192 uWallLightMin (e.g. 0.9, dim)\n  // For flat surfaces (uSurfaceLight >= 0): uSurfaceLight is used directly\n  // (floor=0.85, ceiling=0.95 by default; configurable via surfaceLighting option).\n  if (uSurfaceLight < 0.0) {\n    vFacingLight = uWallLightMin + abs(dot(aCellFace.zw, uCamDir)) * (uWallLightMax - uWallLightMin);\n  } else {\n    vFacingLight = uSurfaceLight;\n  }\n\n  gl_Position = projectionMatrix * eyePos;\n}\n";
/**
 * Atlas fragment shader.
 *
 * Rendering pipeline (in order):
 *   1. Base tile sample    — atlas texture at the rect mapped by the vertex shader.
 *   2. Surface-painter overlays — up to 4 overlay tile IDs blended over the base
 *      (walls, floors, ceilings separately via uOverlayLookup).
 *   3. Skirt overlays      — up to 4 additional overlay IDs for skirt/edge panels
 *      (uSkirtLookup, same RGBA encoding as the surface-painter lookup).
 *   4. Ambient occlusion   — corner-darkening via vAo × uAoIntensity.
 *   5. Directional lighting — surface-orientation brightness via vFacingLight.
 *   6. Fog                 — linear blend to uFogColor over [uFogNear, uFogFar].
 */
export declare const BASIC_ATLAS_FRAG = "\n// \u2500\u2500 Uniforms \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nuniform sampler2D uAtlas;\n// Half-texel size of the atlas texture, used to inset UV clamp bounds and\n// prevent sampling the adjacent tile across a texel boundary.\nuniform vec2  uTexelSize;\nuniform vec3  uFogColor;\nuniform float uFogNear;\nuniform float uFogFar;\n\n// Ambient occlusion intensity in [0,1].\n//   0   = AO disabled (mix term is always 1.0; zero cost).\n//   0.75 = default when ambientOcclusion: true.\n//   1   = fully-occluded corners go black.\n// Applied as: color *= mix(1 - uAoIntensity, 1.0, vAo)\nuniform float uAoIntensity;\n\n// \u2500\u2500 Surface-painter overlay system \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Each grid cell can have up to 4 atlas tile IDs composited over the base tile.\n// uOverlayLookup: W\u00D7H Uint8 RGBA DataTexture \u2014 one texel per dungeon cell.\n//   Each RGBA channel encodes one overlay tile ID (0 = empty slot).\n//   Separate textures exist for floor, wall, and ceiling surfaces.\n// uTileUvLookup:  1D Float RGBA DataTexture \u2014 one texel per tile ID.\n//   Each texel stores (uvX, uvY, uvW, uvH) for that tile in atlas UV space.\n//   Indexed by tile ID; enables the overlay system to look up any tile's UV.\n// uTileUvCount:   width of uTileUvLookup (= max tile ID + 1).\nuniform sampler2D uOverlayLookup;\nuniform sampler2D uTileUvLookup;\nuniform float     uTileUvCount;\n\n// Per-cell skirt overlay slots \u2014 same RGBA encoding as uOverlayLookup.\n// Applied only to skirt/edge panel meshes via a separate lookup texture.\n// Defaults to a 1\u00D71 zero texture (no-op) when skirt overrides are not in use.\nuniform sampler2D uSkirtLookup;\n\n// \u2500\u2500 Varyings (from vertex shader) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nvarying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation\nvarying vec2  vTileOrigin;  // Top-left of the atlas tile rect (for clamping)\nvarying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)\nvarying vec2  vLocalUv;     // Local UV within the tile [0,1]\u00B2 after rotation\nvarying vec2  vOverlayUv;   // UV into the overlay / skirt lookup textures\nvarying float vFogDist;     // Eye-space distance for fog\nvarying float vAo;          // Interpolated AO corner value [0,1]\nvarying float vFacingLight; // Directional surface brightness multiplier\n\n// Look up tile ID's UV rect from the 1D tileUvLookup, then sample the atlas\n// at vLocalUv within that rect. Used by the overlay composite passes.\nvec4 sampleOverlayTile(float id) {\n  // Centre-sample the 1D texture to avoid filtering artifacts on the boundary.\n  vec2 luv = vec2((id + 0.5) / uTileUvCount, 0.5);\n  vec4 tr  = texture2D(uTileUvLookup, luv); // (uvX, uvY, uvW, uvH)\n  // Inset by half a texel on each edge to prevent bleeding from adjacent tiles.\n  vec2 ov  = clamp(\n    tr.xy + vLocalUv * tr.zw,\n    tr.xy + uTexelSize * 0.5,\n    tr.xy + tr.zw    - uTexelSize * 0.5\n  );\n  return texture2D(uAtlas, ov);\n}\n\nvoid main() {\n  // \u2500\u2500 1. Base tile sample \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // Clamp to the tile's texel-inset bounds to prevent bleed from adjacent tiles.\n  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;\n  vec2 uvMax   = vTileOrigin + vTileSize  - uTexelSize * 0.5;\n  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);\n\n  vec4 color = texture2D(uAtlas, atlasUv);\n  if (color.a < 0.01) discard;\n\n  // \u2500\u2500 2. Surface-painter overlays (4 slots, RGBA-packed) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // Each channel of the lookup texel is a tile ID (0 = no overlay for that slot).\n  // IDs are stored as uint8 [0,255] in the texture and recovered via *255+0.5.\n  vec4 slots = texture2D(uOverlayLookup, vOverlayUv);\n\n  float id0 = floor(slots.r * 255.0 + 0.5);\n  if (id0 > 0.5) { vec4 oc = sampleOverlayTile(id0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id1 = floor(slots.g * 255.0 + 0.5);\n  if (id1 > 0.5) { vec4 oc = sampleOverlayTile(id1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id2 = floor(slots.b * 255.0 + 0.5);\n  if (id2 > 0.5) { vec4 oc = sampleOverlayTile(id2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id3 = floor(slots.a * 255.0 + 0.5);\n  if (id3 > 0.5) { vec4 oc = sampleOverlayTile(id3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  // \u2500\u2500 3. Skirt overlays (4 slots, same RGBA encoding) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // A separate lookup texture targets skirt/edge panels independently from\n  // the main wall/floor/ceiling overlay, so skirt tile overrides don't bleed\n  // onto the base surface.\n  vec4 skirtSlots = texture2D(uSkirtLookup, vOverlayUv);\n  float sk0 = floor(skirtSlots.r * 255.0 + 0.5);\n  if (sk0 > 0.5) { vec4 oc = sampleOverlayTile(sk0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk1 = floor(skirtSlots.g * 255.0 + 0.5);\n  if (sk1 > 0.5) { vec4 oc = sampleOverlayTile(sk1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk2 = floor(skirtSlots.b * 255.0 + 0.5);\n  if (sk2 > 0.5) { vec4 oc = sampleOverlayTile(sk2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk3 = floor(skirtSlots.a * 255.0 + 0.5);\n  if (sk3 > 0.5) { vec4 oc = sampleOverlayTile(sk3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  // \u2500\u2500 4. Ambient occlusion \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // vAo=1 (open corner) \u2192 multiplier = 1.0 (no change).\n  // vAo=0 (fully boxed corner) \u2192 multiplier = (1 - uAoIntensity).\n  // At uAoIntensity=0 the term is always 1.0; the pass costs a single multiply.\n  color.rgb *= mix(1.0 - uAoIntensity, 1.0, vAo);\n\n  // \u2500\u2500 5. Directional surface lighting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // vFacingLight is computed per-vertex in the vertex shader and interpolated:\n  //   Floor/ceiling: fixed uSurfaceLight value (configurable via surfaceLighting option;\n  //                  defaults: floor=0.85, ceiling=0.95)\n  //   Walls/skirts:  uWallLightMin + abs(dot(face_normal, cam_forward))\n  //                                * (uWallLightMax - uWallLightMin)\n  //                  defaults: min=0.9 (side walls), max=1.1 (facing walls)\n  color.rgb *= vFacingLight;\n\n  // \u2500\u2500 6. Fog \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);\n  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);\n}\n";
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
 * Build the Three.js uniform map for `BASIC_ATLAS_VERT` / `BASIC_ATLAS_FRAG`.
 *
 * All overlay and skirt params are optional; when omitted a 1×1 zero-filled
 * DataTexture is substituted so the overlay pass is a no-op at zero cost.
 *
 * The `surfaceLight` and `camDir` params drive the directional surface lighting
 * pass. Pass `surfaceLight >= 0` for flat surfaces (floor = 0.85, ceil = 0.95)
 * or `surfaceLight < 0` for wall/skirt materials that need the camera-angle
 * formula. `camDir` must be updated every frame for the wall formula to track
 * player rotation; it has no effect on flat-surface materials.
 */
export declare function makeBasicAtlasUniforms(params: {
    atlas: THREE.Texture;
    texelSize: THREE.Vector2;
    fogColor: THREE.Color;
    fogNear: number;
    fogFar: number;
    /** 1D Float RGBA DataTexture: index = tile ID, value = (uvX, uvY, uvW, uvH). */
    tileUvLookup?: THREE.Texture;
    /** Width of tileUvLookup (= max tile ID + 1). */
    tileUvCount?: number;
    /** W×H Uint8 RGBA DataTexture: each channel = overlay slot tile ID (0 = none). */
    overlayLookup?: THREE.Texture;
    /** W×H Uint8 RGBA DataTexture for per-cell skirt tile overrides. */
    skirtLookup?: THREE.Texture;
    /** Dungeon grid dimensions (width, height) in cells. */
    dungeonSize?: THREE.Vector2;
    /** AO darkening strength in [0,1]. 0 (default) = disabled. */
    aoIntensity?: number;
    /**
     * Camera forward direction projected onto the XZ plane.
     * Set to (-sin(yaw), -cos(yaw)) and updated every RAF tick.
     * Only consumed by wall/skirt materials (surfaceLight < 0).
     */
    camDir?: THREE.Vector2;
    /**
     * Directional surface lighting mode for this material:
     *   >= 0 : fixed brightness multiplier (floor = 0.85, ceiling = 0.95).
     *    < 0 : use the camera-angle formula → walls facing camera are brighter.
     * Default: 1.0 (no effect — useful for layer/custom materials).
     */
    surfaceLight?: number;
    /**
     * Minimum wall brightness — applied when the wall normal is perpendicular to
     * the camera (side walls, dot product = 0). Default: 0.9.
     * Only consumed by wall/skirt materials (surfaceLight < 0).
     */
    wallLightMin?: number;
    /**
     * Maximum wall brightness — applied when the wall normal is parallel to the
     * camera forward vector (facing walls, dot product = ±1). Default: 1.1.
     * Only consumed by wall/skirt materials (surfaceLight < 0).
     */
    wallLightMax?: number;
}): Record<string, {
    value: unknown;
}>;
//# sourceMappingURL=basicLighting.d.ts.map