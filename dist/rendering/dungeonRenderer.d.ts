import { GameHandle } from '../api/createGame';
import { EntityBase } from '../entities/types';
import { DirectionFaceMap } from './tileAtlas';
import { PackedAtlas } from './textureLoader';
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
export type { FaceTileSpec, DirectionFaceMap } from './tileAtlas';
export type { SpriteMap } from './billboardSprites';
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
/** Which class of dungeon geometry a layer targets. */
export type LayerTarget = "floor" | "ceil" | "wall" | "floorSkirt" | "ceilSkirt";
/**
 * Return value from a `LayerSpec.filter` callback.
 * Return an object (optionally overriding `tile`/`rotation`) to include the
 * face, or a falsy value to exclude it.
 */
export type LayerFaceResult = {
    tile?: string | number;
    rotation?: number;
} | null | false | undefined;
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
    filter?: (cx: number, cz: number, direction?: "north" | "south" | "east" | "west") => LayerFaceResult;
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
    worldToScreen(gridX: number, gridZ: number, worldY?: number): {
        x: number;
        y: number;
    } | null;
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
    highlightCells(filter: (cx: number, cz: number, regionId: number) => string | null | false | undefined): LayerHandle;
    /** Unmount the canvas and release all Three.js resources. */
    destroy(): void;
};
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
export declare function createDungeonRenderer(element: HTMLElement, game: GameHandle, options?: DungeonRendererOptions): DungeonRenderer;
//# sourceMappingURL=dungeonRenderer.d.ts.map