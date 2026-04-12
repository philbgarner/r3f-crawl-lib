import { GameHandle } from '../api/createGame';
import { EntityBase } from '../entities/types';
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
export declare function createDungeonRenderer(element: HTMLElement, game: GameHandle, options?: DungeonRendererOptions): DungeonRenderer;
//# sourceMappingURL=dungeonRenderer.d.ts.map