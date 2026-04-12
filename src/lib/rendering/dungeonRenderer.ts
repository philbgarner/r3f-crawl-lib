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
import { BASIC_ATLAS_VERT, BASIC_ATLAS_FRAG, makeBasicAtlasUniforms } from './basicLighting';

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
// Tile atlas shaders (imported from basicLighting.ts)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const HALF_PI = Math.PI / 2;
/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
const EYE_HEIGHT_FACTOR = 0.4;

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
  heightOffsets?: Float32Array,
): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);

  if (useAtlas) {
    const tileIdArr = new Float32Array(matrices.length);
    tileIds.forEach((id, i) => { tileIdArr[i] = id; });
    geo.setAttribute('aTileId', new THREE.InstancedBufferAttribute(tileIdArr, 1));

    const offsets = heightOffsets ?? new Float32Array(matrices.length);
    geo.setAttribute('aHeightOffset', new THREE.InstancedBufferAttribute(offsets, 1));
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
  const tileSize    = options.tileSize      ?? 3;
  const ceilingH    = options.ceilingHeight ?? 3;
  const fov         = options.fov           ?? 75;
  const fogNear     = options.fogNear       ?? 5;
  const fogFar      = options.fogFar        ?? 24;
  const fogHex      = options.fogColor      ?? '#000000';
  const lerpFactor  = options.lerpFactor    ?? 0.18;
  const fogColor    = new THREE.Color(fogHex);
  const atlas       = options.atlas;
  const floorTileId = options.floorTileId   ?? 0;
  const ceilTileId  = options.ceilTileId    ?? 0;
  const wallTileId  = options.wallTileId    ?? 0;

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
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(0.5, 1, 0.75);
  scene.add(dirLight);

  function makeAtlasMaterial(atlasConfig: TileAtlasConfig): THREE.ShaderMaterial {
    // Create texture using this module's bundled Three.js so the WebGLRenderer
    // recognises it correctly (avoids cross-instance mismatch with window.THREE).
    const tex = new THREE.Texture(atlasConfig.image);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;

    const mat = new THREE.ShaderMaterial({
      vertexShader: BASIC_ATLAS_VERT,
      fragmentShader: BASIC_ATLAS_FRAG,
      uniforms: makeBasicAtlasUniforms({
        atlas: tex,
        tileSize: new THREE.Vector2(
          atlasConfig.tileWidth  / atlasConfig.sheetWidth,
          atlasConfig.tileHeight / atlasConfig.sheetHeight,
        ),
        texelSize: new THREE.Vector2(
          1 / atlasConfig.sheetWidth,
          1 / atlasConfig.sheetHeight,
        ),
        columns: atlasConfig.columns,
        fogColor,
        fogNear,
        fogFar,
      }),
      side: THREE.FrontSide,
    });
    return mat;
  }

  function makeAtlasMaterialDoubleSide(atlasConfig: TileAtlasConfig): THREE.ShaderMaterial {
    const mat = makeAtlasMaterial(atlasConfig);
    mat.side = THREE.DoubleSide;
    return mat;
  }

  // ── Plain (fallback) materials ────────────────────────────────────────────
  const floorMat     = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilMat      = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x222233 });
  const wallMat      = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });
  const ceilEdgeMat  = atlas
    ? makeAtlasMaterialDoubleSide(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x222233, side: THREE.DoubleSide });

  // ── Dungeon geometry ──────────────────────────────────────────────────────
  let floorMesh:     THREE.InstancedMesh | null = null;
  let ceilMesh:      THREE.InstancedMesh | null = null;
  let wallMesh:      THREE.InstancedMesh | null = null;
  let floorEdgeMesh: THREE.InstancedMesh | null = null;
  let ceilEdgeMesh:  THREE.InstancedMesh | null = null;
  let dungeonBuilt = false;

  function buildDungeon() {
    if (dungeonBuilt) return;
    const outputs = game.dungeon.outputs;
    if (!outputs) return;
    dungeonBuilt = true;

    const { width, height } = outputs;
    const solid = outputs.textures.solid.image.data as Uint8Array;
    const wallMidY = ceilingH / 2;
    const offsetFactor = 0.5;
    const offsetStep = tileSize * offsetFactor;

    // Height offset texture data (value 128 = no offset; 0 = pit for floor).
    const floorOffData  = outputs.textures.floorHeightOffset?.image.data  as Uint8Array | undefined;
    const ceilOffData   = outputs.textures.ceilingHeightOffset?.image.data as Uint8Array | undefined;

    const floors:        THREE.Matrix4[] = [];
    const ceils:         THREE.Matrix4[] = [];
    const walls:         THREE.Matrix4[] = [];
    const floorEdges:    THREE.Matrix4[] = [];
    const ceilEdges:     THREE.Matrix4[] = [];
    const floorIds:      number[]        = [];
    const ceilIds:       number[]        = [];
    const wallIds:       number[]        = [];
    const floorEdgeIds:  number[]        = [];
    const ceilEdgeIds:   number[]        = [];
    const floorOffsets:  number[]        = [];
    const ceilOffsets:   number[]        = [];

    function isSolid(cx: number, cz: number) {
      if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
      return (solid[cz * width + cx] ?? 0) > 0;
    }

    // Returns the raw offset value for an open cell, or null if solid/out-of-bounds.
    function openFloorVal(ncx: number, ncz: number): number | null {
      if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
      if (isSolid(ncx, ncz)) return null;
      const nidx = ncz * width + ncx;
      return floorOffData ? (floorOffData[nidx] ?? 128) : 128;
    }
    function openCeilVal(ncx: number, ncz: number): number | null {
      if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
      if (isSolid(ncx, ncz)) return null;
      const nidx = ncz * width + ncx;
      return ceilOffData ? (ceilOffData[nidx] ?? 128) : 128;
    }

    for (let cz = 0; cz < height; cz++) {
      for (let cx = 0; cx < width; cx++) {
        if (isSolid(cx, cz)) continue;

        const idx = cz * width + cx;
        const wx = (cx + 0.5) * tileSize;
        const wz = (cz + 0.5) * tileSize;

        // Floor — skip tile if floorHeightOffset === 0 (pit marker).
        const floorVal = floorOffData ? (floorOffData[idx] ?? 128) : 128;
        if (floorVal !== 0) {
          floors.push(makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize));
          floorIds.push(floorTileId);
          floorOffsets.push((floorVal - 128) * offsetStep); // vertex shader applies this
        }

        // Ceiling — inverted: value < 128 raises ceiling, > 128 lowers it.
        const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;
        ceils.push(makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize));
        ceilIds.push(ceilTileId);
        ceilOffsets.push(-(ceilVal - 128) * offsetStep); // vertex shader applies this (inverted)

        if (isSolid(cx, cz - 1)) { walls.push(makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx, cz + 1)) { walls.push(makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx - 1, cz)) { walls.push(makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }
        if (isSolid(cx + 1, cz)) { walls.push(makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH)); wallIds.push(wallTileId); }

        // Voxel-style floor edge skirts: side faces of the floor cube (top=y0, extends down).
        // Only emit when the open neighbour has a different floor offset (Minecraft face-culling rule).
        if (floorVal !== 0) {
          const feMidY = -tileSize / 2;
          // Outward-facing = opposite rotations to inward-facing walls.
          const nfN = openFloorVal(cx, cz - 1); if (nfN !== null && nfN < floorVal) { floorEdges.push(makeFaceMatrix(wx,               feMidY, cz * tileSize,         0, Math.PI,    0, tileSize, tileSize)); floorEdgeIds.push(floorTileId); }
          const nfS = openFloorVal(cx, cz + 1); if (nfS !== null && nfS < floorVal) { floorEdges.push(makeFaceMatrix(wx,               feMidY, (cz + 1) * tileSize,   0, 0,          0, tileSize, tileSize)); floorEdgeIds.push(floorTileId); }
          const nfW = openFloorVal(cx - 1, cz); if (nfW !== null && nfW < floorVal) { floorEdges.push(makeFaceMatrix(cx * tileSize,     feMidY, wz,                    0, -HALF_PI,   0, tileSize, tileSize)); floorEdgeIds.push(floorTileId); }
          const nfE = openFloorVal(cx + 1, cz); if (nfE !== null && nfE < floorVal) { floorEdges.push(makeFaceMatrix((cx+1) * tileSize, feMidY, wz,                    0, HALF_PI,    0, tileSize, tileSize)); floorEdgeIds.push(floorTileId); }
        }

        // Voxel-style ceiling edge skirts: height = exact difference between the two ceiling levels.
        // Current cell's actual ceiling Y in world space:
        const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
        function addCeilSkirt(ncVal: number, mx: number, mz: number, ry: number) {
          const h = (ncVal - ceilVal) * offsetStep; // height of the step
          const midY = yCurrent - h / 2;            // centre between the two ceiling levels
          ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, h));
          ceilEdgeIds.push(ceilTileId);
        }
        const ncN = openCeilVal(cx, cz - 1); if (ncN !== null && ncN > ceilVal) addCeilSkirt(ncN, wx,               cz * tileSize,         Math.PI);
        const ncS = openCeilVal(cx, cz + 1); if (ncS !== null && ncS > ceilVal) addCeilSkirt(ncS, wx,               (cz + 1) * tileSize,   0);
        const ncW = openCeilVal(cx - 1, cz); if (ncW !== null && ncW > ceilVal) addCeilSkirt(ncW, cx * tileSize,     wz,                    -HALF_PI);
        const ncE = openCeilVal(cx + 1, cz); if (ncE !== null && ncE > ceilVal) addCeilSkirt(ncE, (cx+1) * tileSize, wz,                    HALF_PI);
      }
    }

    floorMesh = buildInstancedMesh(floors, floorIds, floorMat, !!atlas, new Float32Array(floorOffsets));
    scene.add(floorMesh);

    ceilMesh = buildInstancedMesh(ceils, ceilIds, ceilMat, !!atlas, new Float32Array(ceilOffsets));
    scene.add(ceilMesh);

    wallMesh = buildInstancedMesh(walls, wallIds, wallMat, !!atlas);
    scene.add(wallMesh);

    floorEdgeMesh = buildInstancedMesh(floorEdges, floorEdgeIds, floorMat, !!atlas);
    scene.add(floorEdgeMesh);

    ceilEdgeMesh = buildInstancedMesh(ceilEdges, ceilEdgeIds, ceilEdgeMat, !!atlas);
    scene.add(ceilEdgeMesh);
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
