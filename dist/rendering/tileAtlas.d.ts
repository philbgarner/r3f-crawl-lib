/** UV rotation applied within a tile, in 90° increments (0 = none, 1 = 90° CCW, 2 = 180°, 3 = 270° CCW). */
export type FaceRotation = 0 | 1 | 2 | 3;
/**
 * Specifies which atlas tile to use for a single face, with an optional UV rotation.
 * Rotation is applied within the tile bounds, so the same source tile can be reused
 * on all four directions without visible seams.
 */
export type FaceTileSpec = {
    tileId: number;
    /** UV rotation within the tile (0–3). Default: 0. */
    rotation?: FaceRotation;
};
/**
 * Per-direction tile overrides for walls or skirt faces.
 * Any direction not specified falls back to the caller's default tile ID.
 */
export type DirectionFaceMap = {
    north?: FaceTileSpec;
    south?: FaceTileSpec;
    east?: FaceTileSpec;
    west?: FaceTileSpec;
};
/** One entry in the atlas - UV coords of its tile in normalised 0..1 space. */
export type TileEntry = {
    id: number;
    /** Left edge of tile (0..1). */
    uvX: number;
    /** Bottom edge of tile in WebGL convention (0..1, y=0 is bottom). */
    uvY: number;
    uvW: number;
    uvH: number;
};
/**
 * Describes a uniform tilesheet where every tile is the same pixel size.
 * Rows are read top-to-bottom from the source image, but uvY is flipped for
 * WebGL/Three.js (y=0 = bottom of texture).
 */
export type TileAtlas = {
    sheetWidth: number;
    sheetHeight: number;
    tileWidth: number;
    tileHeight: number;
    columns: number;
    rows: number;
    getTile(id: number): TileEntry;
};
/**
 * Convert a pixel UV origin (top-left corner of a tile in the atlas image)
 * into a row-major tile ID compatible with `buildTileAtlas`.
 *
 * @param pixelX    Left edge of the tile in pixels (from atlas.json `uv[0]`).
 * @param pixelY    Top edge of the tile in pixels (from atlas.json `uv[1]`).
 * @param tileSize  Tile width/height in pixels (atlas.json `tileSize`).
 * @param sheetWidth Full width of the atlas image in pixels.
 */
export declare function uvToTileId(pixelX: number, pixelY: number, tileSize: number, sheetWidth: number): number;
/**
 * Build a TileAtlas from sheet dimensions and per-tile pixel size.
 * Tile IDs are row-major: id=0 is top-left, id=columns is start of row 1, etc.
 */
export declare function buildTileAtlas(sheetWidth: number, sheetHeight: number, tileWidth: number, tileHeight: number): TileAtlas;
//# sourceMappingURL=tileAtlas.d.ts.map