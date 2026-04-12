import { GameHandle } from '../api/createGame';
import { EntityBase } from '../entities/types';
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
export declare function createDungeonRenderer(element: HTMLElement, game: GameHandle, options?: DungeonRendererOptions): DungeonRenderer;
//# sourceMappingURL=dungeonRenderer.d.ts.map