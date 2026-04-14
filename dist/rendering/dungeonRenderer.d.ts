import { GameHandle } from '../api/createGame';
import { EntityBase } from '../entities/types';
import { DirectionFaceMap } from './tileAtlas';
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
export type { FaceTileSpec, DirectionFaceMap } from './tileAtlas';
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
/** Which class of dungeon geometry a layer targets. */
export type LayerTarget = 'floor' | 'ceil' | 'wall' | 'floorSkirt' | 'ceilSkirt';
/**
 * Return value from a `LayerSpec.filter` callback.
 * Return an object (optionally overriding `tileId`/`rotation`) to include the
 * face, or a falsy value to exclude it.
 */
export type LayerFaceResult = {
    tileId?: number;
    rotation?: number;
} | null | false | undefined;
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
    filter?: (cx: number, cz: number, direction?: 'north' | 'south' | 'east' | 'west') => LayerFaceResult;
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
export declare function createDungeonRenderer(element: HTMLElement, game: GameHandle, options?: DungeonRendererOptions): DungeonRenderer;
//# sourceMappingURL=dungeonRenderer.d.ts.map