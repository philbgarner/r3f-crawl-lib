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

import * as THREE from "three";
import type { GameHandle } from "../api/createGame";
import type { EntityBase } from "../entities/types";
import {
  BASIC_ATLAS_VERT,
  BASIC_ATLAS_FRAG,
  makeBasicAtlasUniforms,
} from "./basicLighting";
import type { FaceTileSpec, DirectionFaceMap } from "./tileAtlas";
export type { FaceTileSpec, DirectionFaceMap } from "./tileAtlas";

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
   * Per-direction tile overrides for wall faces.
   * Each entry may specify a different tile ID and/or UV rotation (0–3 × 90°).
   * Falls back to `wallTileId` for any direction not specified.
   */
  wallTiles?: DirectionFaceMap;
  /**
   * Per-direction tile overrides for floor skirt (edge) faces.
   * Falls back to `floorTileId` for any direction not specified.
   */
  floorSkirtTiles?: DirectionFaceMap;
  /**
   * Per-direction tile overrides for ceiling skirt (edge) faces.
   * Falls back to `ceilTileId` for any direction not specified.
   */
  ceilSkirtTiles?: DirectionFaceMap;
  /**
   * Per-entity-type (or per-kind) visual overrides for the cube renderer.
   * Keys are matched against `entity.type` first, then `entity.kind`.
   * Unmatched entities use built-in defaults (0.35×0.55×0.35 tileSize fractions, red).
   */
  entityAppearances?: Record<string, EntityAppearanceSpec>;
};

// ---------------------------------------------------------------------------
// Layer API types
// ---------------------------------------------------------------------------

/** Which class of dungeon geometry a layer targets. */
export type LayerTarget =
  | "floor"
  | "ceil"
  | "wall"
  | "floorSkirt"
  | "ceilSkirt";

/**
 * Return value from a `LayerSpec.filter` callback.
 * Return an object (optionally overriding `tileId`/`rotation`) to include the
 * face, or a falsy value to exclude it.
 */
export type LayerFaceResult =
  | { tileId?: number; rotation?: number }
  | null
  | false
  | undefined;

export type LayerSpec = {
  /** Which geometry class to add the layer on top of. */
  target: LayerTarget;
  /** Three.js material for this layer's instanced mesh. */
  material: THREE.Material;
  /**
   * Called for each candidate face.  Return an object to include the face
   * (optionally overriding `tileId` and `rotation`), or a falsy value to skip.
   * `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets.
   * Default: include every face with tileId 0, rotation 0.
   */
  filter?: (
    cx: number,
    cz: number,
    direction?: "north" | "south" | "east" | "west",
  ) => LayerFaceResult;
  /**
   * Whether to attach atlas shader attributes (aTileId, aUvRotation, etc.)
   * to the instanced geometry.  Defaults to `true` when an atlas was passed
   * to `createDungeonRenderer`, `false` otherwise.
   */
  useAtlas?: boolean;
  /**
   * Enable `THREE.Material.polygonOffset` on the layer material so it
   * renders on top of the base geometry without z-fighting.  Default: `true`.
   */
  polygonOffset?: boolean;
};

export type LayerHandle = {
  /** Remove this layer from the scene and release its geometry. */
  remove(): void;
};

/**
 * Visual appearance for a specific entity type or kind used by the cube renderer.
 * Keys in `DungeonRendererOptions.entityAppearances` are matched against
 * `entity.type` first, then `entity.kind` as a fallback.
 */
export type EntityAppearanceSpec = {
  /** Hex colour number or CSS colour string. Default: 0xcc2222. */
  color?: number | string;
  /** Width as a fraction of tileSize. Default: 0.35. */
  widthFactor?: number;
  /** Height as a fraction of ceilingHeight. Default: 0.55. */
  heightFactor?: number;
  /** Depth as a fraction of tileSize. Defaults to widthFactor when omitted. */
  depthFactor?: number;

  /**TODO: Billboarding texture. */
};

export type DungeonRenderer = {
  /**
   * Update the renderer's entity list. Call this on every 'turn' event
   * (or whenever entity positions change) to keep the scene in sync.
   */
  setEntities(entities: EntityBase[]): void;
  /**
   * Add an instanced geometry layer on top of existing walls, ceilings, or
   * floors.  May be called before or after the dungeon is generated; layers
   * added before generation are deferred and applied automatically.
   *
   * Returns a handle whose `remove()` method tears the layer down.
   */
  addLayer(spec: LayerSpec): LayerHandle;
  /**
   * Tear down all existing dungeon geometry and rebuild it from the current
   * dungeon outputs. Call this after `game.regenerate()` to keep the renderer
   * in sync when the dungeon layout has changed (e.g. a new seed).
   */
  rebuild(): void;
  /**
   * Create a new atlas `ShaderMaterial` using the same texture, fog, and
   * shader settings as the renderer's own geometry.  Useful when building a
   * layer material that should display tiles from the configured atlas.
   * Returns `null` when no atlas was passed to `createDungeonRenderer`.
   */
  createAtlasMaterial(): THREE.ShaderMaterial | null;
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
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  w: number,
  h: number,
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
  uvRotations?: number[],
  uvHeightScales?: number[],
): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);

  if (useAtlas) {
    const tileIdArr = new Float32Array(matrices.length);
    tileIds.forEach((id, i) => {
      tileIdArr[i] = id;
    });
    geo.setAttribute(
      "aTileId",
      new THREE.InstancedBufferAttribute(tileIdArr, 1),
    );

    const offsets = heightOffsets ?? new Float32Array(matrices.length);
    geo.setAttribute(
      "aHeightOffset",
      new THREE.InstancedBufferAttribute(offsets, 1),
    );

    const rotArr = new Float32Array(matrices.length);
    if (uvRotations)
      uvRotations.forEach((r, i) => {
        rotArr[i] = r;
      });
    geo.setAttribute(
      "aUvRotation",
      new THREE.InstancedBufferAttribute(rotArr, 1),
    );

    const hsArr = new Float32Array(matrices.length).fill(1.0);
    if (uvHeightScales)
      uvHeightScales.forEach((s, i) => {
        hsArr[i] = s;
      });
    geo.setAttribute(
      "aUvHeightScale",
      new THREE.InstancedBufferAttribute(hsArr, 1),
    );
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
  const tileSize = options.tileSize ?? 3;
  const ceilingH = options.ceilingHeight ?? 3;
  const fov = options.fov ?? 75;
  const fogNear = options.fogNear ?? 5;
  const fogFar = options.fogFar ?? 24;
  const fogHex = options.fogColor ?? "#000000";
  const lerpFactor = options.lerpFactor ?? 0.18;
  const fogColor = new THREE.Color(fogHex);
  const atlas = options.atlas;
  const floorTileId = options.floorTileId ?? 0;
  const ceilTileId = options.ceilTileId ?? 0;
  const wallTileId = options.wallTileId ?? 0;
  const wallTiles = options.wallTiles;
  const floorSkirtTiles = options.floorSkirtTiles;
  const ceilSkirtTiles = options.ceilSkirtTiles;

  // ── WebGL renderer ────────────────────────────────────────────────────────
  const glRenderer = new THREE.WebGLRenderer({ antialias: false });
  glRenderer.setPixelRatio(window.devicePixelRatio);
  glRenderer.setClearColor(fogColor);
  const canvas = glRenderer.domElement;
  canvas.style.cssText = "width:100%;height:100%;display:block;";
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

  function makeAtlasMaterial(
    atlasConfig: TileAtlasConfig,
  ): THREE.ShaderMaterial {
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
          atlasConfig.tileWidth / atlasConfig.sheetWidth,
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

  function makeAtlasMaterialDoubleSide(
    atlasConfig: TileAtlasConfig,
  ): THREE.ShaderMaterial {
    const mat = makeAtlasMaterial(atlasConfig);
    mat.side = THREE.DoubleSide;
    return mat;
  }

  // ── Plain (fallback) materials ────────────────────────────────────────────
  const floorMat = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilMat = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x222233 });
  const wallMat = atlas
    ? makeAtlasMaterial(atlas)
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });
  const ceilEdgeMat = atlas
    ? makeAtlasMaterialDoubleSide(atlas)
    : new THREE.MeshStandardMaterial({
        color: 0x222233,
        side: THREE.DoubleSide,
      });

  // ── Dungeon geometry ──────────────────────────────────────────────────────
  let floorMesh: THREE.InstancedMesh | null = null;
  let ceilMesh: THREE.InstancedMesh | null = null;
  let wallMesh: THREE.InstancedMesh | null = null;
  let floorEdgeMesh: THREE.InstancedMesh | null = null;
  let ceilEdgeMesh: THREE.InstancedMesh | null = null;
  let dungeonBuilt = false;

  // ── Layer state ───────────────────────────────────────────────────────────
  type LayerEntry = {
    spec: LayerSpec;
    holder: { mesh: THREE.InstancedMesh | null };
  };
  const layerEntries: LayerEntry[] = [];

  /** Build an instanced mesh for a single LayerSpec by scanning the dungeon map. */
  function buildLayerMesh(spec: LayerSpec): THREE.InstancedMesh | null {
    const outputs = game.dungeon.outputs;
    if (!outputs) return null;

    const { width, height } = outputs;
    const solid = outputs.textures.solid.image.data as Uint8Array;
    const floorOffData = outputs.textures.floorHeightOffset?.image.data as
      | Uint8Array
      | undefined;
    const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data as
      | Uint8Array
      | undefined;
    const wallMidY = ceilingH / 2;
    const offsetStep = tileSize * 0.5;

    const matrices: THREE.Matrix4[] = [];
    const tileIds: number[] = [];
    const rotations: number[] = [];
    const offsets: number[] = [];
    const heightScales: number[] = [];

    const filter = spec.filter ?? (() => ({ tileId: 0 }));

    function isSolid(cx: number, cz: number) {
      if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
      return (solid[cz * width + cx] ?? 0) > 0;
    }
    function openFloorVal(ncx: number, ncz: number): number | null {
      if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
      if (isSolid(ncx, ncz)) return null;
      return floorOffData ? (floorOffData[ncz * width + ncx] ?? 128) : 128;
    }
    function openCeilVal(ncx: number, ncz: number): number | null {
      if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
      if (isSolid(ncx, ncz)) return null;
      return ceilOffData ? (ceilOffData[ncz * width + ncx] ?? 128) : 128;
    }

    function tryAdd(
      result: LayerFaceResult,
      matrix: THREE.Matrix4,
      offset = 0,
      hs = 1.0,
    ) {
      if (!result) return;
      matrices.push(matrix);
      tileIds.push(result.tileId ?? 0);
      rotations.push(result.rotation ?? 0);
      offsets.push(offset);
      heightScales.push(hs);
    }

    for (let cz = 0; cz < height; cz++) {
      for (let cx = 0; cx < width; cx++) {
        if (isSolid(cx, cz)) continue;

        const idx = cz * width + cx;
        const wx = (cx + 0.5) * tileSize;
        const wz = (cz + 0.5) * tileSize;
        const floorVal = floorOffData ? (floorOffData[idx] ?? 128) : 128;
        const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;

        if (spec.target === "floor" && floorVal !== 0) {
          tryAdd(
            filter(cx, cz, undefined),
            makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize),
            (floorVal - 128) * offsetStep,
          );
        }

        if (spec.target === "ceil") {
          tryAdd(
            filter(cx, cz, undefined),
            makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize),
            -(ceilVal - 128) * offsetStep,
          );
        }

        if (spec.target === "wall") {
          if (isSolid(cx, cz - 1))
            tryAdd(
              filter(cx, cz, "north"),
              makeFaceMatrix(
                wx,
                wallMidY,
                cz * tileSize,
                0,
                0,
                0,
                tileSize,
                ceilingH,
              ),
            );
          if (isSolid(cx, cz + 1))
            tryAdd(
              filter(cx, cz, "south"),
              makeFaceMatrix(
                wx,
                wallMidY,
                (cz + 1) * tileSize,
                0,
                Math.PI,
                0,
                tileSize,
                ceilingH,
              ),
            );
          if (isSolid(cx - 1, cz))
            tryAdd(
              filter(cx, cz, "west"),
              makeFaceMatrix(
                cx * tileSize,
                wallMidY,
                wz,
                0,
                HALF_PI,
                0,
                tileSize,
                ceilingH,
              ),
            );
          if (isSolid(cx + 1, cz))
            tryAdd(
              filter(cx, cz, "east"),
              makeFaceMatrix(
                (cx + 1) * tileSize,
                wallMidY,
                wz,
                0,
                -HALF_PI,
                0,
                tileSize,
                ceilingH,
              ),
            );
        }

        if (spec.target === "floorSkirt" && floorVal !== 0) {
          const feMidY = -tileSize / 2;
          const nfN = openFloorVal(cx, cz - 1);
          if (nfN !== null && nfN < floorVal)
            tryAdd(
              filter(cx, cz, "north"),
              makeFaceMatrix(
                wx,
                feMidY,
                cz * tileSize,
                0,
                Math.PI,
                0,
                tileSize,
                tileSize,
              ),
            );
          const nfS = openFloorVal(cx, cz + 1);
          if (nfS !== null && nfS < floorVal)
            tryAdd(
              filter(cx, cz, "south"),
              makeFaceMatrix(
                wx,
                feMidY,
                (cz + 1) * tileSize,
                0,
                0,
                0,
                tileSize,
                tileSize,
              ),
            );
          const nfW = openFloorVal(cx - 1, cz);
          if (nfW !== null && nfW < floorVal)
            tryAdd(
              filter(cx, cz, "west"),
              makeFaceMatrix(
                cx * tileSize,
                feMidY,
                wz,
                0,
                -HALF_PI,
                0,
                tileSize,
                tileSize,
              ),
            );
          const nfE = openFloorVal(cx + 1, cz);
          if (nfE !== null && nfE < floorVal)
            tryAdd(
              filter(cx, cz, "east"),
              makeFaceMatrix(
                (cx + 1) * tileSize,
                feMidY,
                wz,
                0,
                HALF_PI,
                0,
                tileSize,
                tileSize,
              ),
            );
        }

        if (spec.target === "ceilSkirt") {
          const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
          const addCS = (
            ncVal: number | null,
            mx: number,
            mz: number,
            ry: number,
            dir: "north" | "south" | "east" | "west",
          ) => {
            if (ncVal === null || ncVal <= ceilVal) return;
            const h = (ncVal - ceilVal) * offsetStep;
            const midY = yCurrent - h / 2;
            tryAdd(
              filter(cx, cz, dir),
              makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, h),
              0,
              h / tileSize,
            );
          };
          addCS(openCeilVal(cx, cz - 1), wx, cz * tileSize, Math.PI, "north");
          addCS(openCeilVal(cx, cz + 1), wx, (cz + 1) * tileSize, 0, "south");
          addCS(openCeilVal(cx - 1, cz), cx * tileSize, wz, -HALF_PI, "west");
          addCS(
            openCeilVal(cx + 1, cz),
            (cx + 1) * tileSize,
            wz,
            HALF_PI,
            "east",
          );
        }
      }
    }

    if (matrices.length === 0) return null;

    const useAtlas = spec.useAtlas ?? !!atlas;
    const mesh = buildInstancedMesh(
      matrices,
      tileIds,
      spec.material,
      useAtlas,
      new Float32Array(offsets),
      rotations,
      spec.target === "ceilSkirt" ? heightScales : undefined,
    );

    if (spec.polygonOffset !== false) {
      spec.material.polygonOffset = true;
      spec.material.polygonOffsetFactor = -1;
      spec.material.polygonOffsetUnits = -1;
    }
    mesh.renderOrder = 1;
    return mesh;
  }

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
    const floorOffData = outputs.textures.floorHeightOffset?.image.data as
      | Uint8Array
      | undefined;
    const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data as
      | Uint8Array
      | undefined;

    // Helper: resolve a FaceTileSpec from a DirectionFaceMap for a given direction,
    // falling back to a plain tile ID with no rotation.
    function spec(
      map: DirectionFaceMap | undefined,
      dir: "north" | "south" | "east" | "west",
      fallbackId: number,
    ): FaceTileSpec {
      return map?.[dir] ?? { tileId: fallbackId, rotation: 0 };
    }

    const floors: THREE.Matrix4[] = [];
    const ceils: THREE.Matrix4[] = [];
    const walls: THREE.Matrix4[] = [];
    const floorEdges: THREE.Matrix4[] = [];
    const ceilEdges: THREE.Matrix4[] = [];
    const floorIds: number[] = [];
    const ceilIds: number[] = [];
    const wallIds: number[] = [];
    const floorEdgeIds: number[] = [];
    const ceilEdgeIds: number[] = [];
    const floorOffsets: number[] = [];
    const ceilOffsets: number[] = [];
    const wallRots: number[] = [];
    const floorEdgeRots: number[] = [];
    const ceilEdgeRots: number[] = [];
    const ceilEdgeHeightScales: number[] = [];

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
          floors.push(
            makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize),
          );
          floorIds.push(floorTileId);
          floorOffsets.push((floorVal - 128) * offsetStep); // vertex shader applies this
        }

        // Ceiling — inverted: value < 128 raises ceiling, > 128 lowers it.
        const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;
        ceils.push(
          makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize),
        );
        ceilIds.push(ceilTileId);
        ceilOffsets.push(-(ceilVal - 128) * offsetStep); // vertex shader applies this (inverted)

        // Walls — north/south/west/east with per-direction tile + rotation.
        if (isSolid(cx, cz - 1)) {
          const s = spec(wallTiles, "north", wallTileId);
          walls.push(
            makeFaceMatrix(
              wx,
              wallMidY,
              cz * tileSize,
              0,
              0,
              0,
              tileSize,
              ceilingH,
            ),
          );
          wallIds.push(s.tileId);
          wallRots.push(s.rotation ?? 0);
        }
        if (isSolid(cx, cz + 1)) {
          const s = spec(wallTiles, "south", wallTileId);
          walls.push(
            makeFaceMatrix(
              wx,
              wallMidY,
              (cz + 1) * tileSize,
              0,
              Math.PI,
              0,
              tileSize,
              ceilingH,
            ),
          );
          wallIds.push(s.tileId);
          wallRots.push(s.rotation ?? 0);
        }
        if (isSolid(cx - 1, cz)) {
          const s = spec(wallTiles, "west", wallTileId);
          walls.push(
            makeFaceMatrix(
              cx * tileSize,
              wallMidY,
              wz,
              0,
              HALF_PI,
              0,
              tileSize,
              ceilingH,
            ),
          );
          wallIds.push(s.tileId);
          wallRots.push(s.rotation ?? 0);
        }
        if (isSolid(cx + 1, cz)) {
          const s = spec(wallTiles, "east", wallTileId);
          walls.push(
            makeFaceMatrix(
              (cx + 1) * tileSize,
              wallMidY,
              wz,
              0,
              -HALF_PI,
              0,
              tileSize,
              ceilingH,
            ),
          );
          wallIds.push(s.tileId);
          wallRots.push(s.rotation ?? 0);
        }

        // Voxel-style floor edge skirts: side faces of the floor cube (top=y0, extends down).
        // Only emit when the open neighbour has a different floor offset (Minecraft face-culling rule).
        if (floorVal !== 0) {
          const feMidY = -tileSize / 2;
          // Outward-facing = opposite rotations to inward-facing walls.
          const nfN = openFloorVal(cx, cz - 1);
          if (nfN !== null && nfN < floorVal) {
            const s = spec(floorSkirtTiles, "north", floorTileId);
            floorEdges.push(
              makeFaceMatrix(
                wx,
                feMidY,
                cz * tileSize,
                0,
                Math.PI,
                0,
                tileSize,
                tileSize,
              ),
            );
            floorEdgeIds.push(s.tileId);
            floorEdgeRots.push(s.rotation ?? 0);
          }
          const nfS = openFloorVal(cx, cz + 1);
          if (nfS !== null && nfS < floorVal) {
            const s = spec(floorSkirtTiles, "south", floorTileId);
            floorEdges.push(
              makeFaceMatrix(
                wx,
                feMidY,
                (cz + 1) * tileSize,
                0,
                0,
                0,
                tileSize,
                tileSize,
              ),
            );
            floorEdgeIds.push(s.tileId);
            floorEdgeRots.push(s.rotation ?? 0);
          }
          const nfW = openFloorVal(cx - 1, cz);
          if (nfW !== null && nfW < floorVal) {
            const s = spec(floorSkirtTiles, "west", floorTileId);
            floorEdges.push(
              makeFaceMatrix(
                cx * tileSize,
                feMidY,
                wz,
                0,
                -HALF_PI,
                0,
                tileSize,
                tileSize,
              ),
            );
            floorEdgeIds.push(s.tileId);
            floorEdgeRots.push(s.rotation ?? 0);
          }
          const nfE = openFloorVal(cx + 1, cz);
          if (nfE !== null && nfE < floorVal) {
            const s = spec(floorSkirtTiles, "east", floorTileId);
            floorEdges.push(
              makeFaceMatrix(
                (cx + 1) * tileSize,
                feMidY,
                wz,
                0,
                HALF_PI,
                0,
                tileSize,
                tileSize,
              ),
            );
            floorEdgeIds.push(s.tileId);
            floorEdgeRots.push(s.rotation ?? 0);
          }
        }

        // Voxel-style ceiling edge skirts: height = exact difference between the two ceiling levels.
        // Current cell's actual ceiling Y in world space:
        const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
        function addCeilSkirt(
          ncVal: number,
          mx: number,
          mz: number,
          ry: number,
          dir: "north" | "south" | "east" | "west",
        ) {
          const s = spec(ceilSkirtTiles, dir, ceilTileId);
          const h = (ncVal - ceilVal) * offsetStep; // height of the step
          const midY = yCurrent - h / 2; // centre between the two ceiling levels
          ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, h));
          ceilEdgeIds.push(s.tileId);
          ceilEdgeRots.push(s.rotation ?? 0);
          ceilEdgeHeightScales.push(h / tileSize); // clip UV so bricks stay square
        }
        const ncN = openCeilVal(cx, cz - 1);
        if (ncN !== null && ncN > ceilVal)
          addCeilSkirt(ncN, wx, cz * tileSize, Math.PI, "north");
        const ncS = openCeilVal(cx, cz + 1);
        if (ncS !== null && ncS > ceilVal)
          addCeilSkirt(ncS, wx, (cz + 1) * tileSize, 0, "south");
        const ncW = openCeilVal(cx - 1, cz);
        if (ncW !== null && ncW > ceilVal)
          addCeilSkirt(ncW, cx * tileSize, wz, -HALF_PI, "west");
        const ncE = openCeilVal(cx + 1, cz);
        if (ncE !== null && ncE > ceilVal)
          addCeilSkirt(ncE, (cx + 1) * tileSize, wz, HALF_PI, "east");
      }
    }

    floorMesh = buildInstancedMesh(
      floors,
      floorIds,
      floorMat,
      !!atlas,
      new Float32Array(floorOffsets),
    );
    scene.add(floorMesh);

    ceilMesh = buildInstancedMesh(
      ceils,
      ceilIds,
      ceilMat,
      !!atlas,
      new Float32Array(ceilOffsets),
    );
    scene.add(ceilMesh);

    wallMesh = buildInstancedMesh(
      walls,
      wallIds,
      wallMat,
      !!atlas,
      undefined,
      wallRots,
    );
    scene.add(wallMesh);

    floorEdgeMesh = buildInstancedMesh(
      floorEdges,
      floorEdgeIds,
      floorMat,
      !!atlas,
      undefined,
      floorEdgeRots,
    );
    scene.add(floorEdgeMesh);

    ceilEdgeMesh = buildInstancedMesh(
      ceilEdges,
      ceilEdgeIds,
      ceilEdgeMat,
      !!atlas,
      undefined,
      ceilEdgeRots,
      ceilEdgeHeightScales,
    );
    scene.add(ceilEdgeMesh);

    // Apply any layers registered before the dungeon was generated.
    for (const entry of layerEntries) {
      if (!entry.holder.mesh) {
        entry.holder.mesh = buildLayerMesh(entry.spec);
        if (entry.holder.mesh) scene.add(entry.holder.mesh);
      }
    }
  }

  // ── Entity rendering ──────────────────────────────────────────────────────
  const appearances = options.entityAppearances ?? {};
  const entityGeoCache = new Map<string, THREE.BoxGeometry>();
  const entityMatCache = new Map<string, THREE.MeshStandardMaterial>();

  function resolveAppearanceKey(e: EntityBase): string {
    if (appearances[e.type]) return e.type;
    if (appearances[e.kind]) return e.kind;
    return "__default__";
  }

  function getEntityGeo(key: string): THREE.BoxGeometry {
    if (!entityGeoCache.has(key)) {
      const spec = appearances[key] ?? {};
      const wf = spec.widthFactor ?? 0.35;
      const hf = spec.heightFactor ?? 0.55;
      const df = spec.depthFactor ?? wf;
      entityGeoCache.set(
        key,
        new THREE.BoxGeometry(tileSize * wf, ceilingH * hf, tileSize * df),
      );
    }
    return entityGeoCache.get(key)!;
  }

  function getEntityMat(key: string): THREE.MeshStandardMaterial {
    if (!entityMatCache.has(key)) {
      const spec = appearances[key] ?? {};
      entityMatCache.set(
        key,
        new THREE.MeshStandardMaterial({ color: spec.color ?? 0xcc2222 }),
      );
    }
    return entityMatCache.get(key)!;
  }

  const entityMeshMap = new Map<string, THREE.Mesh>();

  function syncEntities(entities: EntityBase[]) {
    const aliveIds = new Set(entities.filter((e) => e.alive).map((e) => e.id));

    for (const [id, mesh] of entityMeshMap) {
      if (!aliveIds.has(id)) {
        scene.remove(mesh);
        entityMeshMap.delete(id);
      }
    }

    for (const e of entities) {
      if (!e.alive) continue;
      const key = resolveAppearanceKey(e);
      if (!entityMeshMap.has(e.id)) {
        const mesh = new THREE.Mesh(getEntityGeo(key), getEntityMat(key));
        entityMeshMap.set(e.id, mesh);
        scene.add(mesh);
      }
      const hf = (appearances[key] ?? {}).heightFactor ?? 0.55;
      entityMeshMap
        .get(e.id)!
        .position.set(
          (e.x + 0.5) * tileSize,
          (ceilingH * hf) / 2,
          (e.z + 0.5) * tileSize,
        );
    }
  }

  // ── Camera lerp state ─────────────────────────────────────────────────────
  let tgtX = 0,
    tgtZ = 0,
    tgtYaw = 0;
  let curX = 0,
    curZ = 0,
    curYaw = 0;
  let initialized = false;

  const onTurn = () => {
    buildDungeon();
    tgtX = (game.player.x + 0.5) * tileSize;
    tgtZ = (game.player.z + 0.5) * tileSize;
    tgtYaw = game.player.facing;
    if (!initialized) {
      curX = tgtX;
      curZ = tgtZ;
      curYaw = tgtYaw;
      initialized = true;
    }
  };

  game.events.on("turn", onTurn);

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
      if (dy > Math.PI) dy -= 2 * Math.PI;
      if (dy < -Math.PI) dy += 2 * Math.PI;
      curYaw += dy * k;

      camera.position.set(curX, ceilingH * EYE_HEIGHT_FACTOR, curZ);
      camera.rotation.set(0, curYaw, 0, "YXZ");
    }

    glRenderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = element.clientWidth || 1;
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
    createAtlasMaterial() {
      return atlas ? makeAtlasMaterial(atlas) : null;
    },
    addLayer(spec: LayerSpec): LayerHandle {
      const holder: { mesh: THREE.InstancedMesh | null } = { mesh: null };
      if (dungeonBuilt) {
        holder.mesh = buildLayerMesh(spec);
        if (holder.mesh) scene.add(holder.mesh);
      }
      const entry: LayerEntry = { spec, holder };
      layerEntries.push(entry);
      return {
        remove() {
          if (holder.mesh) {
            scene.remove(holder.mesh);
            holder.mesh.geometry.dispose();
            holder.mesh = null;
          }
          const i = layerEntries.indexOf(entry);
          if (i !== -1) layerEntries.splice(i, 1);
        },
      };
    },
    rebuild() {
      // Remove and dispose existing dungeon meshes.
      for (const mesh of [
        floorMesh,
        ceilMesh,
        wallMesh,
        floorEdgeMesh,
        ceilEdgeMesh,
      ]) {
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
        }
      }
      floorMesh = ceilMesh = wallMesh = floorEdgeMesh = ceilEdgeMesh = null;
      // Remove and dispose layer meshes — they will be rebuilt by buildDungeon.
      for (const entry of layerEntries) {
        if (entry.holder.mesh) {
          scene.remove(entry.holder.mesh);
          entry.holder.mesh.geometry.dispose();
          entry.holder.mesh = null;
        }
      }
      dungeonBuilt = false;
      buildDungeon();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      game.events.off("turn", onTurn);
      for (const geo of entityGeoCache.values()) geo.dispose();
      for (const mat of entityMatCache.values()) mat.dispose();
      glRenderer.dispose();
      canvas.remove();
    },
  };
}
