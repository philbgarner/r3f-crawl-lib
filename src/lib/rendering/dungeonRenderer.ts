/**
 * dungeonRenderer.ts
 *
 * Plain Three.js first-person dungeon renderer — no React or R3F required.
 * Designed for script-tag usage: create it after `game.generate()` is wired
 * up, and it will visualise the dungeon and player/entity positions.
 *
 * Usage (plain colours):
 *   const renderer = createDungeonRenderer(document.getElementById('viewport'), game);
 *
 * Usage (tile atlas):
 *   const renderer = createDungeonRenderer(el, game, {
 *     atlas: {
 *       texture,
 *       tileWidth: 16, tileHeight: 16,
 *       sheetWidth: 256, sheetHeight: 256,
 *       columns: 16,
 *     },
 *     floorTileId: 0,
 *     ceilTileId: 1,
 *     wallTileId: 2,
 *   });
 *
 *   // Pass live entity list on every turn:
 *   game.events.on('turn', () => renderer.setEntities(enemies));
 */

import * as THREE from 'three';
import type { GameHandle } from '../api/createGame';
import type { EntityBase } from '../entities/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Describes a sprite-sheet atlas used for tile texturing. */
export type TileAtlasConfig = {
  /**
   * Pre-loaded sprite sheet image.  Pass an HTMLImageElement so the texture
   * is created by the renderer's own bundled Three.js instance, avoiding
   * cross-instance mismatch when Three.js is also imported as a global.
   */
  image: HTMLImageElement;
  /** Width of a single tile in pixels. */
  tileWidth: number;
  /** Height of a single tile in pixels. */
  tileHeight: number;
  /** Total width of the sprite sheet in pixels. */
  sheetWidth: number;
  /** Total height of the sprite sheet in pixels. */
  sheetHeight: number;
  /** Number of tile columns in the sprite sheet. */
  columns: number;
};

export type DungeonRendererOptions = {
  /** Camera field of view in degrees. Default: 75. */
  fov?: number;
  /** World units per grid cell. Default: 3. */
  tileSize?: number;
  /** World-unit height of each corridor/room. Default: 3. */
  ceilingHeight?: number;
  /** Distance at which fog begins. Default: 5. */
  fogNear?: number;
  /** Distance at which fog is fully opaque (== background colour). Default: 24. */
  fogFar?: number;
  /** CSS colour string for fog / background. Default: '#000000'. */
  fogColor?: string;
  /** Smoothing factor for camera animation (0 = instant, 1 = never arrives). Default: 0.18. */
  lerpFactor?: number;
  /**
   * When provided the dungeon geometry uses the tile atlas shader instead of
   * plain MeshStandardMaterial.  Requires floorTileId / ceilTileId / wallTileId.
   */
  atlas?: TileAtlasConfig;
  /** Atlas tile index (0-based) for floor faces. Default: 0. */
  floorTileId?: number;
  /** Atlas tile index (0-based) for ceiling faces. Default: 0. */
  ceilTileId?: number;
  /** Atlas tile index (0-based) for wall faces. Default: 0. */
  wallTileId?: number;
  /**
   * Distance (world units) at which brightness falloff begins.
   * Everything closer is rendered at full torch brightness (band 0).
   * Default: 8.
   */
  bandNear?: number;
  /** Additive warm torch colour. Default: #ffd966 (warm yellow). */
  torchColor?: THREE.Color;
  /** Torch intensity multiplier 0–2. Default: 0.33. */
  torchIntensity?: number;
};

export type DungeonRenderer = {
  /**
   * Update the renderer's entity list. Call this on every 'turn' event
   * (or whenever entity positions change) to keep the scene in sync.
   */
  setEntities(entities: EntityBase[]): void;
  /** Unmount the canvas and release all Three.js resources. */
  destroy(): void;
};

// ---------------------------------------------------------------------------
// Inline GLSL — torch lighting chunks (ported from torchLighting.ts)
// ---------------------------------------------------------------------------

const TORCH_UNIFORMS_GLSL = /* glsl */ `
uniform float uFogNear;
uniform float uFogFar;
uniform float uBandNear;
uniform float uTime;
uniform vec3  uTint0;
uniform vec3  uTint1;
uniform vec3  uTint2;
uniform vec3  uTint3;
uniform vec3  uTorchColor;
uniform float uTorchIntensity;
`;

const TORCH_HASH_GLSL = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

const TORCH_FNS_GLSL = /* glsl */ `
float torchBand(float flickerRadius) {
  float raw = sin(uTime * 7.0)  * 0.45
            + sin(uTime * 13.7) * 0.35
            + sin(uTime * 3.1)  * 0.20;
  float flicker = (floor(raw * 1.5 + 0.5)) / 6.0;
  float dist = clamp((vFogDist - uBandNear) / (uFogFar - uBandNear), 0.0, 1.0);
  float flickeredDist = clamp(dist + flicker * flickerRadius, 0.0, 1.0);
  return floor(pow(flickeredDist, 0.75) * 5.0);
}

vec3 applyTorchLighting(vec3 baseColor, float band) {
  float timeSlot = floor(uTime * 1.5);
  vec2 cell = floor(vWorldPos * 0.5);
  float spatialNoise = hash(cell + vec2(timeSlot * 7.3, timeSlot * 3.1));
  float turb = (floor(spatialNoise * 3.0) / 3.0) * 0.18;

  float brightness;
  vec3  tint;
  if (band < 1.0) {
    brightness = 1.00 - turb; tint = uTint0;
  } else if (band < 2.0) {
    brightness = 0.55;        tint = uTint1;
  } else if (band < 3.0) {
    brightness = 0.22;        tint = uTint2;
  } else if (band < 4.0) {
    brightness = 0.10;        tint = uTint3;
  } else {
    brightness = 0.00;        tint = vec3(1.0);
  }

  vec3 lit = baseColor * tint * brightness;
  float torchAdd = (band < 1.0) ? 0.250 :
                   (band < 2.0) ? 0.200 : 0.0;
  lit += uTorchColor * (torchAdd * uTorchIntensity);
  return lit;
}
`;

// How much the torch radius breathes (fraction of the fog range).
const FLICKER_RADIUS = 0.03;
// z-component of the bump tangent normal — larger = flatter bump effect.
const BUMP_DEPTH = 0.3;

// ---------------------------------------------------------------------------
// Tile atlas shaders
// ---------------------------------------------------------------------------

const ATLAS_VERT = /* glsl */ `
attribute float aTileId;
uniform vec2  uTileSize;
uniform float uColumns;

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;
varying vec2  vWorldPos;
varying vec3  vWorldPos3D;
varying vec3  vFaceNormal;
varying vec2  vTileUv;

void main() {
  float id  = floor(aTileId + 0.5);
  float col = mod(id, uColumns);
  float row = floor(id / uColumns);

  vec2 offset = vec2(col * uTileSize.x, 1.0 - (row + 1.0) * uTileSize.y);
  vAtlasUv    = offset + uv * uTileSize;
  vTileOrigin = offset;
  vTileUv     = uv;

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos    = worldPos.xz;
  vWorldPos3D  = worldPos.xyz;
  vFaceNormal  = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));

  vec4 eyePos = viewMatrix * worldPos;
  vFogDist = length(eyePos.xyz);

  gl_Position = projectionMatrix * eyePos;
}
`;

const ATLAS_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2  uTileSize;
uniform float uColumns;
uniform vec3  uFogColor;
uniform float uFlickerRadius;
uniform vec2  uTexelSize;
${TORCH_UNIFORMS_GLSL}

varying vec2  vAtlasUv;
varying vec2  vTileOrigin;
varying float vFogDist;
varying vec2  vWorldPos;
varying vec3  vWorldPos3D;
varying vec3  vFaceNormal;
varying vec2  vTileUv;

${TORCH_HASH_GLSL}
${TORCH_FNS_GLSL}

void main() {
  // Clamp to tile texel bounds to prevent atlas bleed from perspective interpolation.
  vec2 uvMin = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax = vTileOrigin + uTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  // Bump from intensity gradient: derive tangent normal from neighbouring texels.
  vec3 luma = vec3(0.299, 0.587, 0.114);
  float l0 = dot(color.rgb, luma);
  float lR = dot(texture2D(uAtlas, clamp(atlasUv + vec2(uTexelSize.x, 0.0), uvMin, uvMax)).rgb, luma);
  float lU = dot(texture2D(uAtlas, clamp(atlasUv + vec2(0.0, uTexelSize.y), uvMin, uvMax)).rgb, luma);
  vec3 bumpN = normalize(vec3(l0 - lR, l0 - lU, ${BUMP_DEPTH}));
  float bumpShade = clamp(dot(bumpN, normalize(vec3(0.5, 0.5, 1.0))), 0.0, 1.0);
  bumpShade = 0.8 + 0.35 * bumpShade;

  float band = torchBand(uFlickerRadius);
  vec3 lit = applyTorchLighting(color.rgb * bumpShade, band);

  gl_FragColor = vec4(mix(lit, uFogColor, step(4.0, band)), color.a);
}
`;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const HALF_PI = Math.PI / 2;
/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
const EYE_HEIGHT_FACTOR = 0.4;
const DEFAULT_BAND_NEAR = 8;

function makeFaceMatrix(
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  w: number, h: number,
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(w, h, 1),
  );
}

/**
 * Build a PlaneGeometry with a pre-allocated aTileId InstancedBufferAttribute,
 * and an InstancedMesh using either a ShaderMaterial (atlas) or a plain material.
 */
function buildInstancedMesh(
  matrices: THREE.Matrix4[],
  tileIds: number[],
  material: THREE.Material,
  useAtlas: boolean,
): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);

  if (useAtlas) {
    const tileIdArr = new Float32Array(matrices.length);
    tileIds.forEach((id, i) => { tileIdArr[i] = id; });
    geo.setAttribute('aTileId', new THREE.InstancedBufferAttribute(tileIdArr, 1));
  }

  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// createDungeonRenderer
// ---------------------------------------------------------------------------

export function createDungeonRenderer(
  element: HTMLElement,
  game: GameHandle,
  options: DungeonRendererOptions = {},
): DungeonRenderer {
  const tileSize      = options.tileSize      ?? 3;
  const ceilingH      = options.ceilingHeight ?? 3;
  const fov           = options.fov           ?? 75;
  const fogNear       = options.fogNear       ?? 5;
  const fogFar        = options.fogFar        ?? 24;
  const fogHex        = options.fogColor      ?? '#000000';
  const lerpFactor    = options.lerpFactor    ?? 0.18;
  const fogColor      = new THREE.Color(fogHex);
  const atlas         = options.atlas;
  const floorTileId   = options.floorTileId   ?? 0;
  const ceilTileId    = options.ceilTileId    ?? 0;
  const wallTileId    = options.wallTileId    ?? 0;
  const bandNear      = options.bandNear      ?? DEFAULT_BAND_NEAR;
  const torchColor    = options.torchColor    ?? new THREE.Color(1.0, 0.85, 0.4);
  const torchIntensity = options.torchIntensity ?? 0.33;

  // ── WebGL renderer ────────────────────────────────────────────────────────
  const glRenderer = new THREE.WebGLRenderer({ antialias: false });
  glRenderer.setPixelRatio(window.devicePixelRatio);
  glRenderer.setClearColor(fogColor);
  const canvas = glRenderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  element.appendChild(canvas);

  // ── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, fogFar * 2);

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const torchLight = new THREE.PointLight(0xffe8c0, 3, tileSize * 5, 2);
  scene.add(torchLight);

  // ── Atlas shader materials ─────────────────────────────────────────────────
  // Collect all ShaderMaterials so we can update uTime each frame.
  const atlasMaterials: THREE.ShaderMaterial[] = [];

  function makeAtlasMaterial(atlasConfig: TileAtlasConfig): THREE.ShaderMaterial {
    // Create texture using this module's bundled Three.js so the WebGLRenderer
    // recognises it correctly (avoids cross-instance mismatch with window.THREE).
    const tex = new THREE.Texture(atlasConfig.image);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;

    const mat = new THREE.ShaderMaterial({
      vertexShader: ATLAS_VERT,
      fragmentShader: ATLAS_FRAG,
      uniforms: {
        uAtlas:         { value: tex },
        uTileSize:      { value: new THREE.Vector2(
          atlasConfig.tileWidth  / atlasConfig.sheetWidth,
          atlasConfig.tileHeight / atlasConfig.sheetHeight,
        )},
        uColumns:       { value: atlasConfig.columns },
        uTexelSize:     { value: new THREE.Vector2(
          1 / atlasConfig.sheetWidth,
          1 / atlasConfig.sheetHeight,
        )},
        uFogColor:      { value: fogColor },
        uFogNear:       { value: fogNear },
        uFogFar:        { value: fogFar },
        uFlickerRadius: { value: FLICKER_RADIUS },
        uTime:          { value: 0 },
        // Torch lighting bands
        uBandNear:      { value: bandNear },
        uTint0:         { value: new THREE.Color(1.0,  1.0,  1.0)  },
        uTint1:         { value: new THREE.Color(0.67, 0.67, 0.67) },
        uTint2:         { value: new THREE.Color(0.33, 0.33, 0.33) },
        uTint3:         { value: new THREE.Color(0.25, 0.25, 0.25) },
        uTorchColor:    { value: torchColor },
        uTorchIntensity:{ value: torchIntensity },
      },
      side: THREE.FrontSide,
    });
    atlasMaterials.push(mat);
    return mat;
  }

  // ── Plain (fallback) materials ────────────────────────────────────────────
  const floorMat = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilMat  = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x222233 });
  const wallMat  = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });

  // ── Dungeon geometry ──────────────────────────────────────────────────────
  let floorMesh: THREE.InstancedMesh | null = null;
  let ceilMesh:  THREE.InstancedMesh | null = null;
  let wallMesh:  THREE.InstancedMesh | null = null;
  let dungeonBuilt = false;

  function buildDungeon() {
    if (dungeonBuilt) return;
    const outputs = game.dungeon.outputs;
    if (!outputs) return;
    dungeonBuilt = true;

    const { width, height } = outputs;
    const solid = outputs.textures.solid.image.data as Uint8Array;
    const wallMidY = ceilingH / 2;

    const floors:    THREE.Matrix4[] = [];
    const ceils:     THREE.Matrix4[] = [];
    const walls:     THREE.Matrix4[] = [];
    const floorIds:  number[]        = [];
    const ceilIds:   number[]        = [];
    const wallIds:   number[]        = [];

    function isSolid(cx: number, cz: number) {
      if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
      return (solid[cz * width + cx] ?? 0) > 0;
    }

    for (let cz = 0; cz < height; cz++) {
      for (let cx = 0; cx < width; cx++) {
        if (isSolid(cx, cz)) continue;

        const wx = (cx + 0.5) * tileSize;
        const wz = (cz + 0.5) * tileSize;

        floors.push(makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize));
        floorIds.push(floorTileId);
        ceils.push(makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize));
        ceilIds.push(ceilTileId);

        if (isSolid(cx, cz - 1)) { walls.push(makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx, cz + 1)) { walls.push(makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx - 1, cz)) { walls.push(makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx + 1, cz)) { walls.push(makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
      }
    }

    floorMesh = buildInstancedMesh(floors, floorIds, floorMat, !!atlas);
    scene.add(floorMesh);

    ceilMesh = buildInstancedMesh(ceils, ceilIds, ceilMat, !!atlas);
    scene.add(ceilMesh);

    wallMesh = buildInstancedMesh(walls, wallIds, wallMat, !!atlas);
    scene.add(wallMesh);
  }

  // ── Entity rendering ──────────────────────────────────────────────────────
  const entityGeo = new THREE.BoxGeometry(
    tileSize * 0.35,
    ceilingH * 0.55,
    tileSize * 0.35,
  );
  const entityMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
  const entityMeshMap = new Map<string, THREE.Mesh>();

  function syncEntities(entities: EntityBase[]) {
    const aliveIds = new Set(entities.filter(e => e.alive).map(e => e.id));

    for (const [id, mesh] of entityMeshMap) {
      if (!aliveIds.has(id)) {
        scene.remove(mesh);
        entityMeshMap.delete(id);
      }
    }

    for (const e of entities) {
      if (!e.alive) continue;
      if (!entityMeshMap.has(e.id)) {
        const newMesh = new THREE.Mesh(entityGeo, entityMat);
        entityMeshMap.set(e.id, newMesh);
        scene.add(newMesh);
      }
      entityMeshMap.get(e.id)!.position.set(
        (e.x + 0.5) * tileSize,
        ceilingH * EYE_HEIGHT_FACTOR,
        (e.z + 0.5) * tileSize,
      );
    }
  }

  // ── Camera lerp state ─────────────────────────────────────────────────────
  let tgtX = 0, tgtZ = 0, tgtYaw = 0;
  let curX = 0, curZ = 0, curYaw = 0;
  let initialized = false;

  const onTurn = () => {
    buildDungeon();
    tgtX   = (game.player.x + 0.5) * tileSize;
    tgtZ   = (game.player.z + 0.5) * tileSize;
    tgtYaw = game.player.facing;
    if (!initialized) {
      curX = tgtX; curZ = tgtZ; curYaw = tgtYaw;
      initialized = true;
    }
  };

  game.events.on('turn', onTurn);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastT = 0;

  function tick(t: number) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;

    const tSec = t / 1000;
    for (const mat of atlasMaterials) {
      if (mat.uniforms.uTime) mat.uniforms.uTime.value = tSec;
    }

    if (initialized) {
      const k = 1 - Math.pow(1 - lerpFactor, dt * 60);
      curX += (tgtX - curX) * k;
      curZ += (tgtZ - curZ) * k;

      let dy = tgtYaw - curYaw;
      if (dy >  Math.PI) dy -= 2 * Math.PI;
      if (dy < -Math.PI) dy += 2 * Math.PI;
      curYaw += dy * k;

      camera.position.set(curX, ceilingH * EYE_HEIGHT_FACTOR, curZ);
      camera.rotation.set(0, curYaw, 0, 'YXZ');
      torchLight.position.copy(camera.position);
    }

    glRenderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = element.clientWidth  || 1;
    const h = element.clientHeight || 1;
    glRenderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(element);
  resize();

  rafId = requestAnimationFrame(tick);

  // ── Public handle ─────────────────────────────────────────────────────────
  return {
    setEntities(entities) {
      syncEntities(entities);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      game.events.off('turn', onTurn);
      glRenderer.dispose();
      canvas.remove();
    },
  };
}
