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
 *   const packed = await loadTextureAtlas('sprites.png', atlasJson);
 *   const resolver = packedAtlasResolver(packed);
 *   const renderer = createDungeonRenderer(el, game, {
 *     packedAtlas: packed,
 *     tileNameResolver: resolver,
 *     floorTile: 'stone_floor',
 *     ceilTile:  'ceiling_stone',
 *     wallTile:  'brick_wall',
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
import { resolveTile } from "./tileAtlas";
export type { FaceTileSpec, DirectionFaceMap } from "./tileAtlas";
import type { PackedAtlas, UvRect } from "./textureLoader";
import { spriteToUvRect } from "./textureLoader";
import { createBillboard } from "./billboardSprites";
import type { BillboardHandle, SpriteMap } from "./billboardSprites";
export type { SpriteMap } from "./billboardSprites";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Information about a dungeon cell returned by mouse interaction callbacks.
 */
export type CellInfo = {
  /** Grid column (0-based). */
  cx: number;
  /** Grid row (0-based). */
  cz: number;
  /** Region/room ID from the dungeon's regionId texture (0 = unassigned). */
  regionId: number;
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
  /** When provided the dungeon geometry uses the packed atlas shader instead of plain MeshStandardMaterial. */
  packedAtlas?: PackedAtlas;
  /**
   * Converts a string tile name to a numeric atlas tile ID.
   * Required when any tile option is specified as a string name.
   * Use `packedAtlasResolver(packed)` for baked-texture atlases,
   * or provide a custom function wrapping AtlasIndex.someCategory.idByName().
   */
  tileNameResolver?: (name: string) => number;
  /** Floor tile: string name (resolved via tileNameResolver) or numeric tile index. Default: 0. */
  floorTile?: string | number;
  /** Ceiling tile: string name or numeric tile index. Default: 0. */
  ceilTile?: string | number;
  /** Wall tile: string name or numeric tile index. Default: 0. */
  wallTile?: string | number;
  /**
   * Per-direction tile overrides for wall faces.
   * Each entry may specify a different tile and/or UV rotation (0–3 × 90°).
   * Falls back to `wallTile` for any direction not specified.
   */
  wallTiles?: DirectionFaceMap;
  /**
   * Per-direction tile overrides for floor skirt (edge) faces.
   * Falls back to `floorTile` for any direction not specified.
   */
  floorSkirtTiles?: DirectionFaceMap;
  /**
   * Per-direction tile overrides for ceiling skirt (edge) faces.
   * Falls back to `ceilTile` for any direction not specified.
   */
  ceilSkirtTiles?: DirectionFaceMap;
  /**
   * Fraction of tileSize used as the height step per offset unit.
   * Controls how tall each floor/ceiling height level is. Default: 0.5.
   */
  offsetFactor?: number;
  /**
   * Camera eye height as a fraction of ceilingHeight.
   * 0 = floor level, 1 = ceiling level. Default: 0.66 (~5 ft in a 7.5 ft room).
   */
  eyeHeightFactor?: number;
  /**
   * Per-entity-type (or per-kind) visual overrides for the cube renderer.
   * Keys are matched against `entity.type` first, then `entity.kind`.
   * Unmatched entities use built-in defaults (0.35×0.55×0.35 tileSize fractions, red).
   */
  entityAppearances?: Record<string, EntityAppearanceSpec>;
  /**
   * Called when the user clicks on a floor cell in the dungeon.
   * The click is resolved by casting a ray from the camera through the
   * mouse position and intersecting it with the floor plane (y = 0).
   */
  onCellClick?: (info: CellInfo) => void;
  /**
   * Called whenever the hovered cell changes (including when the cursor
   * leaves the dungeon surface, in which case `info` is `null`).
   * Throttled: only fires when the cell actually changes.
   */
  onCellHover?: (info: CellInfo | null) => void;
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
 * Return an object (optionally overriding `tile`/`rotation`) to include the
 * face, or a falsy value to exclude it.
 */
export type LayerFaceResult =
  | { tile?: string | number; rotation?: number }
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
   * (optionally overriding `tile` and `rotation`), or a falsy value to skip.
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
   * Project a dungeon grid cell to 2D pixel coordinates relative to the
   * renderer's container element, using the current camera state.
   *
   * Returns `{ x, y }` in pixels (suitable for `left`/`top` on an absolutely-
   * positioned child of the container), or `null` when the point is behind
   * the camera or outside the viewport.
   *
   * `worldY` is the vertical world-space position to project; defaults to
   * mid-entity height (~40% of ceiling height).
   */
  worldToScreen(gridX: number, gridZ: number, worldY?: number): { x: number; y: number } | null;
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
  /**
   * Overlay coloured floor highlights on a subset of cells.
   *
   * The `filter` is called for every non-solid floor cell and should return a
   * CSS colour string to highlight that cell, or a falsy value to skip it.
   * The `regionId` argument lets callers colour-code cells by room/corridor
   * without extra bookkeeping.
   *
   * Returns a `LayerHandle` whose `remove()` tears the overlay down.
   * May be called before or after `game.generate()`.
   *
   * Example — highlight all cells in room 3 red, corridor cells yellow:
   * ```ts
   * const handle = renderer.highlightCells((cx, cz, regionId) => {
   *   if (regionId === 3) return 'red';
   *   if (regionId > 100) return 'rgba(255,255,0,0.3)';
   *   return null;
   * });
   * // later:
   * handle.remove();
   * ```
   */
  highlightCells(
    filter: (cx: number, cz: number, regionId: number) => string | null | false | undefined,
  ): LayerHandle;
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
// using the d&d standard of 7.5ft shrinking cubes, 0.66x gives eye level for a medium creature at about 5ft which is what we expect.
const EYE_HEIGHT_FACTOR = 0.66;

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
  uvRects: UvRect[],
  material: THREE.Material,
  useAtlas: boolean,
  heightOffsets?: Float32Array,
  uvRotations?: number[],
  uvHeightScales?: number[],
  cellX?: Float32Array,
  cellZ?: Float32Array,
): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);

  if (useAtlas) {
    const n = matrices.length;
    const uvXArr = new Float32Array(n);
    const uvYArr = new Float32Array(n);
    const uvWArr = new Float32Array(n);
    const uvHArr = new Float32Array(n);
    uvRects.forEach((r, i) => {
      uvXArr[i] = r.x;
      uvYArr[i] = r.y;
      uvWArr[i] = r.w;
      uvHArr[i] = r.h;
    });
    geo.setAttribute("aUvX", new THREE.InstancedBufferAttribute(uvXArr, 1));
    geo.setAttribute("aUvY", new THREE.InstancedBufferAttribute(uvYArr, 1));
    geo.setAttribute("aUvW", new THREE.InstancedBufferAttribute(uvWArr, 1));
    geo.setAttribute("aUvH", new THREE.InstancedBufferAttribute(uvHArr, 1));

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

    if (cellX && cellZ) {
      geo.setAttribute("aCellX", new THREE.InstancedBufferAttribute(cellX, 1));
      geo.setAttribute("aCellZ", new THREE.InstancedBufferAttribute(cellZ, 1));
    }
  }

  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// createDungeonRenderer
// ---------------------------------------------------------------------------

/**
 * Mount a Three.js first-person dungeon renderer into `element`.
 *
 * Call after `game.generate()` is wired up. The renderer reads dungeon geometry
 * from the game handle and re-renders whenever the player moves. Pass an
 * `options.packedAtlas` + `options.tileNameResolver` pair to enable textured
 * walls/floors/ceilings; omit them for flat-colour geometry.
 *
 * @param element  Container element — the renderer fills it entirely.
 * @param game     Live `GameHandle` returned by `createGame()`.
 * @param options  Optional renderer configuration (fog, atlas, skirt tiles, etc.).
 * @returns        A `DungeonRenderer` handle with `setEntities`, `addLayer`, etc.
 *
 * @example
 * const packed = await loadTextureAtlas('sprites.png', atlasJson);
 * const renderer = createDungeonRenderer(document.getElementById('viewport'), game, {
 *   packedAtlas: packed,
 *   tileNameResolver: packedAtlasResolver(packed),
 *   floorTile: 'stone_floor',
 *   wallTile:  'brick_wall',
 *   ceilTile:  'ceiling_stone',
 * });
 * game.events.on('turn', () => renderer.setEntities([...enemies]));
 */
export function createDungeonRenderer(
  element: HTMLElement,
  game: GameHandle,
  options: DungeonRendererOptions = {},
): DungeonRenderer {
  const tileSize = options.tileSize ?? 3;
  const ceilingH = options.ceilingHeight ?? 3;
  const eyeHeightFactor = options.eyeHeightFactor ?? EYE_HEIGHT_FACTOR;
  const fov = options.fov ?? 75;
  const fogNear = options.fogNear ?? 5;
  const fogFar = options.fogFar ?? 24;
  const fogHex = options.fogColor ?? "#000000";
  const lerpFactor = options.lerpFactor ?? 0.18;
  const fogColor = new THREE.Color(fogHex);
  const packedAtlas = options.packedAtlas;
  const resolver = options.tileNameResolver;

  function getUvRect(id: number): UvRect {
    const sprite = packedAtlas?.getById(id);
    return sprite ? spriteToUvRect(sprite) : { x: 0, y: 0, w: 0, h: 0 };
  }
  const floorId = resolveTile(options.floorTile ?? 0, resolver);
  const ceilId = resolveTile(options.ceilTile ?? 0, resolver);
  const wallId = resolveTile(options.wallTile ?? 0, resolver);
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

  // Shared atlas texture — created once, reused across all materials.
  let sharedAtlasTex: THREE.Texture | null = null;
  if (packedAtlas) {
    sharedAtlasTex = new THREE.Texture(packedAtlas.texture as HTMLCanvasElement);
    sharedAtlasTex.magFilter = THREE.NearestFilter;
    sharedAtlasTex.minFilter = THREE.NearestFilter;
    sharedAtlasTex.needsUpdate = true;
  }

  // ── Overlay / surface-painter textures ───────────────────────────────────
  // 1-D float texture mapping tile ID → (uvX, uvY, uvW, uvH). Built from atlas once.
  let tileUvLookupTex: THREE.DataTexture | null = null;
  let tileUvCount = 1;

  if (packedAtlas) {
    let maxId = 0;
    for (const sp of packedAtlas.sprites.values()) if (sp.id > maxId) maxId = sp.id;
    tileUvCount = maxId + 1;
    const uvData = new Float32Array(tileUvCount * 4);
    for (const sp of packedAtlas.sprites.values()) {
      const uv = spriteToUvRect(sp);
      const i = sp.id * 4;
      uvData[i]     = uv.x;
      uvData[i + 1] = uv.y;
      uvData[i + 2] = uv.w;
      uvData[i + 3] = uv.h;
    }
    tileUvLookupTex = new THREE.DataTexture(uvData, tileUvCount, 1, THREE.RGBAFormat, THREE.FloatType);
    tileUvLookupTex.magFilter = THREE.NearestFilter;
    tileUvLookupTex.minFilter = THREE.NearestFilter;
    tileUvLookupTex.needsUpdate = true;
  }

  // Per-surface W×H Uint8 RGBA overlay textures. Rebuilt after each generate().
  // Each channel = one overlay slot tile ID (0 = none). Max 4 slots per surface per cell.
  const _defaultOverlayTex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  _defaultOverlayTex.magFilter = THREE.NearestFilter;
  _defaultOverlayTex.minFilter = THREE.NearestFilter;
  _defaultOverlayTex.needsUpdate = true;

  type OverlaySurface = { tex: THREE.DataTexture; data: Uint8Array };
  const defSurf: OverlaySurface = { tex: _defaultOverlayTex, data: new Uint8Array(4) };

  let overlayFloor: OverlaySurface = defSurf;
  let overlayWall:  OverlaySurface = defSurf;
  let overlayCeil:  OverlaySurface = defSurf;

  function makeOverlayTex(data: Uint8Array, width: number, height: number): THREE.DataTexture {
    const t = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  }

  /** Rebuild all three per-surface overlay textures from the current paintMap. */
  function rebuildOverlayTexture(width: number, height: number): void {
    if (!resolver) return;
    const n = width * height * 4;
    const fd = new Uint8Array(n);
    const wd = new Uint8Array(n);
    const cd = new Uint8Array(n);

    for (const [key, paint] of game.dungeon.paintMap) {
      const comma = key.indexOf(',');
      const x = parseInt(key.slice(0, comma), 10);
      const z = parseInt(key.slice(comma + 1), 10);
      if (x < 0 || z < 0 || x >= width || z >= height) continue;
      const idx = (z * width + x) * 4;
      const write = (arr: Uint8Array, layers: string[] | undefined) => {
        if (!layers) return;
        for (let i = 0; i < Math.min(layers.length, 4); i++)
          arr[idx + i] = resolver!(layers[i]!) & 0xFF;
      };
      write(fd, paint.floor);
      write(wd, paint.wall);
      write(cd, paint.ceil);
    }

    if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
    if (overlayWall  !== defSurf) overlayWall.tex.dispose();
    if (overlayCeil  !== defSurf) overlayCeil.tex.dispose();

    overlayFloor = { tex: makeOverlayTex(fd, width, height), data: fd };
    overlayWall  = { tex: makeOverlayTex(wd, width, height), data: wd };
    overlayCeil  = { tex: makeOverlayTex(cd, width, height), data: cd };
  }

  /** Update one cell in-place across all three overlay textures. */
  function updateOverlayCell(
    x: number, z: number,
    paint: { floor?: string[]; wall?: string[]; ceil?: string[] },
  ): void {
    if (!resolver) return;
    const outputs = game.dungeon.outputs;
    if (!outputs || overlayFloor === defSurf) return;
    const { width, height } = outputs;
    if (x < 0 || z < 0 || x >= width || z >= height) return;
    const idx = (z * width + x) * 4;
    const write = (surf: OverlaySurface, layers: string[] | undefined) => {
      if (layers === undefined) return;
      surf.data[idx] = surf.data[idx+1] = surf.data[idx+2] = surf.data[idx+3] = 0;
      for (let i = 0; i < Math.min(layers.length, 4); i++)
        surf.data[idx + i] = resolver!(layers[i]!) & 0xFF;
      surf.tex.needsUpdate = true;
    };
    write(overlayFloor, paint.floor);
    write(overlayWall,  paint.wall);
    write(overlayCeil,  paint.ceil);
  }

  function setSkirtLookupUniform(mat: THREE.Material, tex: THREE.DataTexture): void {
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    const u = mat.uniforms;
    if (u['uSkirtLookup']) u['uSkirtLookup'].value = tex;
  }

  function syncSkirtLookupUniforms(): void {
    const outputs = game.dungeon.outputs;
    if (!outputs) return;
    setSkirtLookupUniform(floorEdgeMat,      outputs.textures.floorSkirtType);
    setSkirtLookupUniform(ceilEdgeMat,       outputs.textures.ceilSkirtType);
    setSkirtLookupUniform(floorWallSkirtMat, outputs.textures.floorSkirtType);
    setSkirtLookupUniform(ceilWallSkirtMat,  outputs.textures.ceilSkirtType);
  }

  /** Push per-surface overlay textures into their respective atlas materials. */
  function syncOverlayUniforms(width: number, height: number): void {
    const size = new THREE.Vector2(width, height);
    const set = (mat: THREE.Material, overlayTex: THREE.DataTexture) => {
      if (!(mat instanceof THREE.ShaderMaterial)) return;
      const u = mat.uniforms;
      if (u['uOverlayLookup']) u['uOverlayLookup'].value = overlayTex;
      if (u['uTileUvLookup'])  u['uTileUvLookup'].value  = tileUvLookupTex;
      if (u['uTileUvCount'])   u['uTileUvCount'].value   = tileUvCount;
      if (u['uDungeonSize'])   u['uDungeonSize'].value   = size;
    };
    set(floorMat,          overlayFloor.tex);
    set(floorEdgeMat,      overlayFloor.tex);
    set(wallMat,           overlayWall.tex);
    set(ceilMat,           overlayCeil.tex);
    set(ceilEdgeMat,       overlayCeil.tex);
    set(floorWallSkirtMat, overlayWall.tex);
    set(ceilWallSkirtMat,  overlayWall.tex);
  }

  function makeAtlasMaterial(): THREE.ShaderMaterial {
    const canvas = packedAtlas!.texture as HTMLCanvasElement;
    const mat = new THREE.ShaderMaterial({
      vertexShader: BASIC_ATLAS_VERT,
      fragmentShader: BASIC_ATLAS_FRAG,
      uniforms: makeBasicAtlasUniforms({
        atlas: sharedAtlasTex!,
        texelSize: new THREE.Vector2(1 / canvas.width, 1 / canvas.height),
        fogColor,
        fogNear,
        fogFar,
        ...(tileUvLookupTex ? { tileUvLookup: tileUvLookupTex, tileUvCount } : {}),
        overlayLookup: overlayFloor.tex,
        dungeonSize: new THREE.Vector2(1, 1),
      }),
      side: THREE.FrontSide,
    });
    return mat;
  }

  function makeAtlasMaterialDoubleSide(): THREE.ShaderMaterial {
    const mat = makeAtlasMaterial();
    mat.side = THREE.DoubleSide;
    return mat;
  }

  // ── Plain (fallback) materials ────────────────────────────────────────────
  const floorMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x222233 });
  const wallMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });
  const floorEdgeMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilEdgeMat = packedAtlas
    ? makeAtlasMaterialDoubleSide()
    : new THREE.MeshStandardMaterial({
        color: 0x222233,
        side: THREE.DoubleSide,
      });
  const floorWallSkirtMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });
  const ceilWallSkirtMat = packedAtlas
    ? makeAtlasMaterial()
    : new THREE.MeshStandardMaterial({ color: 0x6b6070 });

  // ── Dungeon geometry ──────────────────────────────────────────────────────
  let floorMesh: THREE.InstancedMesh | null = null;
  let ceilMesh: THREE.InstancedMesh | null = null;
  let wallMesh: THREE.InstancedMesh | null = null;
  let floorEdgeMesh: THREE.InstancedMesh | null = null;
  let ceilEdgeMesh: THREE.InstancedMesh | null = null;
  let floorWallSkirtMesh: THREE.InstancedMesh | null = null;
  let ceilWallSkirtMesh: THREE.InstancedMesh | null = null;
  let dungeonBuilt = false;

  // Parallel cell-index arrays: entry i gives the grid cell for instance i.
  // Rebuilt whenever buildDungeon runs.
  type CellRef = { cx: number; cz: number };
  let floorCellMap: CellRef[] = [];
  let ceilCellMap: CellRef[] = [];
  let wallCellMap: CellRef[] = [];
  let floorEdgeCellMap: CellRef[] = [];
  let ceilEdgeCellMap: CellRef[] = [];
  let floorWallSkirtCellMap: CellRef[] = [];
  let ceilWallSkirtCellMap: CellRef[] = [];
  // Fast lookup: InstancedMesh → its cell array.
  const meshToCellMap = new Map<THREE.InstancedMesh, CellRef[]>();

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
    const offsetStep = tileSize * (options.offsetFactor ?? 0.5);

    const matrices: THREE.Matrix4[] = [];
    const uvRects: UvRect[] = [];
    const rotations: number[] = [];
    const offsets: number[] = [];
    const heightScales: number[] = [];

    const filter = spec.filter ?? (() => ({ tile: 0 }));

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
      const id = result.tile !== undefined ? resolveTile(result.tile, resolver) : 0;
      uvRects.push(getUvRect(id));
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
          const currentFloorY = (floorVal - 128) * offsetStep;
          function tryAddFloorSkirtTiled(
            nfVal: number,
            mx: number,
            mz: number,
            ry: number,
            dir: "north" | "south" | "east" | "west",
          ) {
            const result = filter(cx, cz, dir);
            if (!result) return;
            const neighborFloorY = (nfVal - 128) * offsetStep;
            const stepH = currentFloorY - neighborFloorY;
            const fullPanels = Math.floor(stepH / tileSize);
            const rem = stepH - fullPanels * tileSize;
            for (let i = 0; i < fullPanels; i++) {
              const midY = neighborFloorY + i * tileSize + tileSize / 2;
              tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize), 0, 1.0);
            }
            if (rem > 0.001) {
              const midY = neighborFloorY + fullPanels * tileSize + rem / 2;
              tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize);
            }
          }
          const nfN = openFloorVal(cx, cz - 1);
          if (nfN !== null && nfN < floorVal) tryAddFloorSkirtTiled(nfN, wx, cz * tileSize, Math.PI, "north");
          const nfS = openFloorVal(cx, cz + 1);
          if (nfS !== null && nfS < floorVal) tryAddFloorSkirtTiled(nfS, wx, (cz + 1) * tileSize, 0, "south");
          const nfW = openFloorVal(cx - 1, cz);
          if (nfW !== null && nfW < floorVal) tryAddFloorSkirtTiled(nfW, cx * tileSize, wz, -HALF_PI, "west");
          const nfE = openFloorVal(cx + 1, cz);
          if (nfE !== null && nfE < floorVal) tryAddFloorSkirtTiled(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
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
            const result = filter(cx, cz, dir);
            if (!result) return;
            const fullPanels = Math.floor(h / tileSize);
            const rem = h - fullPanels * tileSize;
            for (let i = 0; i < fullPanels; i++) {
              const midY = yCurrent - i * tileSize - tileSize / 2;
              tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize), 0, 1.0);
            }
            if (rem > 0.001) {
              const midY = yCurrent - fullPanels * tileSize - rem / 2;
              tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize);
            }
          };
          addCS(openCeilVal(cx, cz - 1), wx, cz * tileSize, Math.PI, "north");
          addCS(openCeilVal(cx, cz + 1), wx, (cz + 1) * tileSize, 0, "south");
          addCS(openCeilVal(cx - 1, cz), cx * tileSize, wz, -HALF_PI, "west");
          addCS(openCeilVal(cx + 1, cz), (cx + 1) * tileSize, wz, HALF_PI, "east");
        }
      }
    }

    if (matrices.length === 0) return null;

    const useAtlas = spec.useAtlas ?? !!packedAtlas;
    const mesh = buildInstancedMesh(
      matrices,
      uvRects,
      spec.material,
      useAtlas,
      new Float32Array(offsets),
      rotations,
      (spec.target === "ceilSkirt" || spec.target === "floorSkirt") ? heightScales : undefined,
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
    const offsetFactor = options.offsetFactor ?? 0.5;
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
      return map?.[dir] ?? { tile: fallbackId, rotation: 0 };
    }

    floorCellMap = [];
    ceilCellMap = [];
    wallCellMap = [];
    floorEdgeCellMap = [];
    ceilEdgeCellMap = [];
    floorWallSkirtCellMap = [];
    ceilWallSkirtCellMap = [];

    const floors: THREE.Matrix4[] = [];
    const ceils: THREE.Matrix4[] = [];
    const walls: THREE.Matrix4[] = [];
    const floorEdges: THREE.Matrix4[] = [];
    const ceilEdges: THREE.Matrix4[] = [];
    const floorRects: UvRect[] = [];
    const ceilRects: UvRect[] = [];
    const wallRects: UvRect[] = [];
    const floorEdgeRects: UvRect[] = [];
    const ceilEdgeRects: UvRect[] = [];
    const floorOffsets: number[] = [];
    const ceilOffsets: number[] = [];
    const wallRots: number[] = [];
    const floorEdgeRots: number[] = [];
    const ceilEdgeRots: number[] = [];
    const floorEdgeHeightScales: number[] = [];
    const ceilEdgeHeightScales: number[] = [];
    const floorWallSkirtEdges: THREE.Matrix4[] = [];
    const floorWallSkirtRects: UvRect[] = [];
    const floorWallSkirtRots: number[] = [];
    const floorWallSkirtHeightScales: number[] = [];
    const ceilWallSkirtEdges: THREE.Matrix4[] = [];
    const ceilWallSkirtRects: UvRect[] = [];
    const ceilWallSkirtRots: number[] = [];
    const ceilWallSkirtHeightScales: number[] = [];

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
          floorRects.push(getUvRect(floorId));
          floorOffsets.push((floorVal - 128) * offsetStep); // vertex shader applies this
          floorCellMap.push({ cx, cz });
        }

        // Ceiling — inverted: value < 128 raises ceiling, > 128 lowers it.
        const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;
        ceils.push(
          makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize),
        );
        ceilRects.push(getUvRect(ceilId));
        ceilOffsets.push(-(ceilVal - 128) * offsetStep); // vertex shader applies this (inverted)
        ceilCellMap.push({ cx, cz });

        // Walls — north/south/west/east with per-direction tile + rotation.
        if (isSolid(cx, cz - 1)) {
          const s = spec(wallTiles, "north", wallId);
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
          wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
          wallRots.push(s.rotation ?? 0);
          wallCellMap.push({ cx, cz });
        }
        if (isSolid(cx, cz + 1)) {
          const s = spec(wallTiles, "south", wallId);
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
          wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
          wallRots.push(s.rotation ?? 0);
          wallCellMap.push({ cx, cz });
        }
        if (isSolid(cx - 1, cz)) {
          const s = spec(wallTiles, "west", wallId);
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
          wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
          wallRots.push(s.rotation ?? 0);
          wallCellMap.push({ cx, cz });
        }
        if (isSolid(cx + 1, cz)) {
          const s = spec(wallTiles, "east", wallId);
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
          wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
          wallRots.push(s.rotation ?? 0);
          wallCellMap.push({ cx, cz });
        }

        // Voxel-style floor edge skirts: tiled panels covering the full step height.
        // Only emit when the open neighbour has a lower floor level.
        if (floorVal !== 0) {
          const currentFloorY = (floorVal - 128) * offsetStep;
          function addFloorSkirt(
            nfVal: number,
            mx: number,
            mz: number,
            ry: number,
            dir: "north" | "south" | "east" | "west",
          ) {
            const s = spec(floorSkirtTiles, dir, floorId);
            const neighborFloorY = (nfVal - 128) * offsetStep;
            const stepH = currentFloorY - neighborFloorY;
            const fullPanels = Math.floor(stepH / tileSize);
            const rem = stepH - fullPanels * tileSize;
            for (let i = 0; i < fullPanels; i++) {
              const midY = neighborFloorY + i * tileSize + tileSize / 2;
              floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
              floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
              floorEdgeRots.push(s.rotation ?? 0);
              floorEdgeHeightScales.push(1.0);
              floorEdgeCellMap.push({ cx, cz });
            }
            if (rem > 0.001) {
              const midY = neighborFloorY + fullPanels * tileSize + rem / 2;
              floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
              floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
              floorEdgeRots.push(s.rotation ?? 0);
              floorEdgeHeightScales.push(rem / tileSize);
              floorEdgeCellMap.push({ cx, cz });
            }
          }
          const nfN = openFloorVal(cx, cz - 1);
          if (nfN !== null && nfN < floorVal) addFloorSkirt(nfN, wx, cz * tileSize, Math.PI, "north");
          const nfS = openFloorVal(cx, cz + 1);
          if (nfS !== null && nfS < floorVal) addFloorSkirt(nfS, wx, (cz + 1) * tileSize, 0, "south");
          const nfW = openFloorVal(cx - 1, cz);
          if (nfW !== null && nfW < floorVal) addFloorSkirt(nfW, cx * tileSize, wz, -HALF_PI, "west");
          const nfE = openFloorVal(cx + 1, cz);
          if (nfE !== null && nfE < floorVal) addFloorSkirt(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
        }

        // Wall-adjacent floor skirts: when floor is sunken below y=0 and the
        // neighbour is solid, fill the gap between y=0 and the sunken floor
        // using the wall tile repeated downward.
        if (floorVal < 128 && floorVal !== 0) {
          const gapH = (128 - floorVal) * offsetStep;
          function addWallFloorSkirt(
            mx: number,
            mz: number,
            ry: number,
            dir: "north" | "south" | "east" | "west",
          ) {
            const s = spec(wallTiles, dir, wallId);
            const fullPanels = Math.floor(gapH / tileSize);
            const rem = gapH - fullPanels * tileSize;
            for (let i = 0; i < fullPanels; i++) {
              const midY = -(i * tileSize + tileSize / 2);
              floorWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
              floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
              floorWallSkirtRots.push(s.rotation ?? 0);
              floorWallSkirtHeightScales.push(1.0);
              floorWallSkirtCellMap.push({ cx, cz });
            }
            if (rem > 0.001) {
              const midY = -(fullPanels * tileSize + rem / 2);
              floorWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
              floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
              floorWallSkirtRots.push(s.rotation ?? 0);
              floorWallSkirtHeightScales.push(rem / tileSize);
              floorWallSkirtCellMap.push({ cx, cz });
            }
          }
          if (isSolid(cx, cz - 1)) addWallFloorSkirt(wx, cz * tileSize, 0, "north");
          if (isSolid(cx, cz + 1)) addWallFloorSkirt(wx, (cz + 1) * tileSize, Math.PI, "south");
          if (isSolid(cx - 1, cz)) addWallFloorSkirt(cx * tileSize, wz, HALF_PI, "west");
          if (isSolid(cx + 1, cz)) addWallFloorSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east");
        }

        // Voxel-style ceiling edge skirts: tiled panels covering the full step height.
        // Current cell's actual ceiling Y in world space:
        const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
        function addCeilSkirt(
          ncVal: number,
          mx: number,
          mz: number,
          ry: number,
          dir: "north" | "south" | "east" | "west",
        ) {
          const s = spec(ceilSkirtTiles, dir, ceilId);
          const h = (ncVal - ceilVal) * offsetStep;
          const fullPanels = Math.floor(h / tileSize);
          const rem = h - fullPanels * tileSize;
          for (let i = 0; i < fullPanels; i++) {
            const midY = yCurrent - i * tileSize - tileSize / 2;
            ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
            ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
            ceilEdgeRots.push(s.rotation ?? 0);
            ceilEdgeHeightScales.push(1.0);
            ceilEdgeCellMap.push({ cx, cz });
          }
          if (rem > 0.001) {
            const midY = yCurrent - fullPanels * tileSize - rem / 2;
            ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
            ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
            ceilEdgeRots.push(s.rotation ?? 0);
            ceilEdgeHeightScales.push(rem / tileSize);
            ceilEdgeCellMap.push({ cx, cz });
          }
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

        // Wall-adjacent ceiling skirts: when ceiling is raised above ceilingH and the
        // neighbour is solid, fill the gap between the wall top and the raised ceiling
        // using the wall tile repeated upward.
        if (ceilVal < 128) {
          const gapH = (128 - ceilVal) * offsetStep;
          function addWallCeilSkirt(
            mx: number,
            mz: number,
            ry: number,
            dir: "north" | "south" | "east" | "west",
          ) {
            const s = spec(wallTiles, dir, wallId);
            const fullPanels = Math.floor(gapH / tileSize);
            const rem = gapH - fullPanels * tileSize;
            for (let i = 0; i < fullPanels; i++) {
              const midY = ceilingH + i * tileSize + tileSize / 2;
              ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
              ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
              ceilWallSkirtRots.push(s.rotation ?? 0);
              ceilWallSkirtHeightScales.push(1.0);
              ceilWallSkirtCellMap.push({ cx, cz });
            }
            if (rem > 0.001) {
              const midY = ceilingH + fullPanels * tileSize + rem / 2;
              ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
              ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
              ceilWallSkirtRots.push(s.rotation ?? 0);
              ceilWallSkirtHeightScales.push(rem / tileSize);
              ceilWallSkirtCellMap.push({ cx, cz });
            }
          }
          if (isSolid(cx, cz - 1)) addWallCeilSkirt(wx, cz * tileSize, 0, "north");
          if (isSolid(cx, cz + 1)) addWallCeilSkirt(wx, (cz + 1) * tileSize, Math.PI, "south");
          if (isSolid(cx - 1, cz)) addWallCeilSkirt(cx * tileSize, wz, HALF_PI, "west");
          if (isSolid(cx + 1, cz)) addWallCeilSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east");
        }
      }
    }

    meshToCellMap.clear();

    // Helper: extract parallel Float32Arrays of cell coords from a CellRef[].
    function cellArrays(map: CellRef[]): [Float32Array, Float32Array] {
      const xs = new Float32Array(map.length);
      const zs = new Float32Array(map.length);
      map.forEach((c, i) => { xs[i] = c.cx; zs[i] = c.cz; });
      return [xs, zs];
    }

    const [floorCX, floorCZ]     = cellArrays(floorCellMap);
    const [ceilCX, ceilCZ]       = cellArrays(ceilCellMap);
    const [wallCX, wallCZ]       = cellArrays(wallCellMap);
    const [fEdgeCX, fEdgeCZ]     = cellArrays(floorEdgeCellMap);
    const [cEdgeCX, cEdgeCZ]     = cellArrays(ceilEdgeCellMap);

    floorMesh = buildInstancedMesh(
      floors, floorRects, floorMat, !!packedAtlas,
      new Float32Array(floorOffsets), undefined, undefined, floorCX, floorCZ,
    );
    scene.add(floorMesh);
    meshToCellMap.set(floorMesh, floorCellMap);

    ceilMesh = buildInstancedMesh(
      ceils, ceilRects, ceilMat, !!packedAtlas,
      new Float32Array(ceilOffsets), undefined, undefined, ceilCX, ceilCZ,
    );
    scene.add(ceilMesh);
    meshToCellMap.set(ceilMesh, ceilCellMap);

    wallMesh = buildInstancedMesh(
      walls, wallRects, wallMat, !!packedAtlas,
      undefined, wallRots, undefined, wallCX, wallCZ,
    );
    scene.add(wallMesh);
    meshToCellMap.set(wallMesh, wallCellMap);

    floorEdgeMesh = buildInstancedMesh(
      floorEdges, floorEdgeRects, floorEdgeMat, !!packedAtlas,
      undefined, floorEdgeRots, floorEdgeHeightScales, fEdgeCX, fEdgeCZ,
    );
    scene.add(floorEdgeMesh);
    meshToCellMap.set(floorEdgeMesh, floorEdgeCellMap);

    ceilEdgeMesh = buildInstancedMesh(
      ceilEdges, ceilEdgeRects, ceilEdgeMat, !!packedAtlas,
      undefined, ceilEdgeRots, ceilEdgeHeightScales, cEdgeCX, cEdgeCZ,
    );
    scene.add(ceilEdgeMesh);
    meshToCellMap.set(ceilEdgeMesh, ceilEdgeCellMap);

    if (floorWallSkirtEdges.length > 0) {
      const [fwsCX, fwsCZ] = cellArrays(floorWallSkirtCellMap);
      floorWallSkirtMesh = buildInstancedMesh(
        floorWallSkirtEdges, floorWallSkirtRects, floorWallSkirtMat, !!packedAtlas,
        undefined, floorWallSkirtRots, floorWallSkirtHeightScales, fwsCX, fwsCZ,
      );
      scene.add(floorWallSkirtMesh);
      meshToCellMap.set(floorWallSkirtMesh, floorWallSkirtCellMap);
    }
    if (ceilWallSkirtEdges.length > 0) {
      const [cwsCX, cwsCZ] = cellArrays(ceilWallSkirtCellMap);
      ceilWallSkirtMesh = buildInstancedMesh(
        ceilWallSkirtEdges, ceilWallSkirtRects, ceilWallSkirtMat, !!packedAtlas,
        undefined, ceilWallSkirtRots, ceilWallSkirtHeightScales, cwsCX, cwsCZ,
      );
      scene.add(ceilWallSkirtMesh);
      meshToCellMap.set(ceilWallSkirtMesh, ceilWallSkirtCellMap);
    }

    // Build / sync the surface-painter overlay texture now that the dungeon is ready.
    rebuildOverlayTexture(width, height);
    syncOverlayUniforms(width, height);
    syncSkirtLookupUniforms();

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
  const billboardMap = new Map<string, BillboardHandle>();

  function syncEntities(entities: EntityBase[]) {
    const aliveIds = new Set(entities.filter((e) => e.alive).map((e) => e.id));

    for (const [id, mesh] of entityMeshMap) {
      if (!aliveIds.has(id)) {
        scene.remove(mesh);
        entityMeshMap.delete(id);
      }
    }
    for (const [id, handle] of billboardMap) {
      if (!aliveIds.has(id)) {
        handle.dispose();
        billboardMap.delete(id);
      }
    }

    for (const e of entities) {
      if (!e.alive) continue;

      if (e.spriteMap) {
        // Billboard path
        if (!billboardMap.has(e.id) && packedAtlas) {
          const handle = createBillboard(
            e as EntityBase & { spriteMap: SpriteMap },
            packedAtlas,
            scene,
            resolver,
          );
          billboardMap.set(e.id, handle);
        }
        // update() is called in the RAF loop using the current camera yaw
      } else {
        // Box geometry path
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
  }

  // Kept so the RAF loop can call billboard updates with current camera yaw.
  let currentEntities: EntityBase[] = [];

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

      camera.position.set(curX, ceilingH * eyeHeightFactor, curZ);
      camera.rotation.set(0, curYaw, 0, "YXZ");

      // Update all live billboard handles with current camera yaw.
      for (const e of currentEntities) {
        if (!e.alive || !e.spriteMap) continue;
        const handle = billboardMap.get(e.id);
        if (handle) handle.update(e, curYaw, tileSize, ceilingH);
      }
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

  // ── Mouse / cell picking ──────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const _mouseNdc = new THREE.Vector2();

  function getCellAtPointer(clientX: number, clientY: number): CellInfo | null {
    const outputs = game.dungeon.outputs;
    if (!outputs) return null;

    const rect = canvas.getBoundingClientRect();
    _mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(_mouseNdc, camera);

    const pickable = [floorMesh, ceilMesh, wallMesh, floorEdgeMesh, ceilEdgeMesh, floorWallSkirtMesh, ceilWallSkirtMesh].filter(
      (m): m is THREE.InstancedMesh => m !== null,
    );
    if (pickable.length === 0) return null;

    const hits = raycaster.intersectObjects(pickable, false);
    const hit = hits[0];
    if (!hit) return null;

    const cellArray = meshToCellMap.get(hit.object as THREE.InstancedMesh);
    if (!cellArray || hit.instanceId == null) return null;

    const cell = cellArray[hit.instanceId];
    if (!cell) return null;
    const { cx, cz } = cell;
    const { width } = outputs;
    const regionData = outputs.textures.regionId?.image.data as Uint8Array | undefined;
    const regionId = regionData ? (regionData[cz * width + cx] ?? 0) : 0;
    return { cx, cz, regionId };
  }

  let _lastHoverKey: string | null = null;

  function onCanvasClick(e: MouseEvent) {
    if (!options.onCellClick) return;
    const info = getCellAtPointer(e.clientX, e.clientY);
    if (info) options.onCellClick(info);
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (!options.onCellHover) return;
    const info = getCellAtPointer(e.clientX, e.clientY);
    const key = info ? `${info.cx},${info.cz}` : null;
    if (key === _lastHoverKey) return;
    _lastHoverKey = key;
    options.onCellHover(info);
  }

  function onCanvasPointerLeave() {
    if (!options.onCellHover) return;
    if (_lastHoverKey !== null) {
      _lastHoverKey = null;
      options.onCellHover(null);
    }
  }

  if (options.onCellClick) canvas.addEventListener("click", onCanvasClick);
  if (options.onCellHover) {
    canvas.addEventListener("pointermove", onCanvasPointerMove);
    canvas.addEventListener("pointerleave", onCanvasPointerLeave);
  }

  // ── Surface painter — dynamic cell-paint events ───────────────────────────
  function onCellPaint(e: { x: number; z: number; floor?: string[]; wall?: string[]; ceil?: string[] }) {
    updateOverlayCell(e.x, e.z, e);
  }
  game.events.on("cell-paint", onCellPaint);

  // ── Internal addLayer ─────────────────────────────────────────────────────
  function internalAddLayer(spec: LayerSpec): LayerHandle {
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
  }

  // ── Public handle ─────────────────────────────────────────────────────────
  return {
    setEntities(entities) {
      currentEntities = entities;
      syncEntities(entities);
    },
    worldToScreen(gridX, gridZ, worldY) {
      const wx = (gridX + 0.5) * tileSize;
      const wy = worldY ?? ceilingH * 0.4;
      const wz = (gridZ + 0.5) * tileSize;
      const v = new THREE.Vector3(wx, wy, wz).project(camera);
      if (v.z > 1) return null;
      const w = element.clientWidth || 1;
      const h = element.clientHeight || 1;
      const sx = (v.x * 0.5 + 0.5) * w;
      const sy = (-v.y * 0.5 + 0.5) * h;
      if (sx < 0 || sx > w || sy < 0 || sy > h) return null;
      return { x: sx, y: sy };
    },
    createAtlasMaterial() {
      return packedAtlas ? makeAtlasMaterial() : null;
    },
    addLayer(spec: LayerSpec): LayerHandle {
      return internalAddLayer(spec);
    },
    highlightCells(filter) {
      const outputs = game.dungeon.outputs;
      const regionData = outputs?.textures.regionId?.image.data as Uint8Array | undefined;
      const solid = outputs?.textures.solid?.image.data as Uint8Array | undefined;
      const width = outputs?.width ?? 0;
      const height = outputs?.height ?? 0;

      // Group cells by color string.
      const colorGroups = new Map<string, Set<number>>();
      for (let cz = 0; cz < height; cz++) {
        for (let cx = 0; cx < width; cx++) {
          const idx = cz * width + cx;
          if (solid && (solid[idx] ?? 1) > 0) continue;
          const regionId = regionData ? (regionData[idx] ?? 0) : 0;
          const color = filter(cx, cz, regionId);
          if (!color) continue;
          let group = colorGroups.get(color);
          if (!group) { group = new Set(); colorGroups.set(color, group); }
          group.add(idx);
        }
      }

      const subHandles: LayerHandle[] = [];
      const subMaterials: THREE.MeshBasicMaterial[] = [];

      for (const [color, cellIdxSet] of colorGroups) {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        subMaterials.push(mat);
        const cellFilter = (cx: number, cz: number) =>
          cellIdxSet.has(cz * width + cx) ? {} : false;
        for (const target of ["floor", "ceil", "wall"] as LayerTarget[]) {
          subHandles.push(internalAddLayer({
            target,
            material: mat,
            useAtlas: false,
            polygonOffset: true,
            filter: cellFilter,
          }));
        }
      }

      return {
        remove() {
          for (const h of subHandles) h.remove();
          for (const m of subMaterials) m.dispose();
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
        floorWallSkirtMesh,
        ceilWallSkirtMesh,
      ]) {
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
        }
      }
      floorMesh = ceilMesh = wallMesh = floorEdgeMesh = ceilEdgeMesh = floorWallSkirtMesh = ceilWallSkirtMesh = null;
      meshToCellMap.clear();
      // Remove and dispose layer meshes — they will be rebuilt by buildDungeon.
      for (const entry of layerEntries) {
        if (entry.holder.mesh) {
          scene.remove(entry.holder.mesh);
          entry.holder.mesh.geometry.dispose();
          entry.holder.mesh = null;
        }
      }
      // Reset overlay textures so they are rebuilt for the new dungeon dimensions.
      if (overlayFloor !== defSurf) { overlayFloor.tex.dispose(); overlayFloor = defSurf; }
      if (overlayWall  !== defSurf) { overlayWall.tex.dispose();  overlayWall  = defSurf; }
      if (overlayCeil  !== defSurf) { overlayCeil.tex.dispose();  overlayCeil  = defSurf; }
      dungeonBuilt = false;
      buildDungeon();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      game.events.off("turn", onTurn);
      game.events.off("cell-paint", onCellPaint);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("pointermove", onCanvasPointerMove);
      canvas.removeEventListener("pointerleave", onCanvasPointerLeave);
      for (const geo of entityGeoCache.values()) geo.dispose();
      for (const mat of entityMatCache.values()) mat.dispose();
      for (const handle of billboardMap.values()) handle.dispose();
      sharedAtlasTex?.dispose();
      tileUvLookupTex?.dispose();
      if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
      if (overlayWall  !== defSurf) overlayWall.tex.dispose();
      if (overlayCeil  !== defSurf) overlayCeil.tex.dispose();
      _defaultOverlayTex.dispose();
      glRenderer.dispose();
      canvas.remove();
    },
  };
}
