import { FaceRotation } from './tileAtlas';
export type AtlasFrameRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type AtlasFrame = {
    frame: AtlasFrameRect;
    rotated: boolean;
    /** Optional additional display rotation (degrees CW). Not baked into pixels; forwarded to shader via FaceRotation. */
    rotation?: 0 | 90 | 180 | 270;
    trimmed: boolean;
    spriteSourceSize: AtlasFrameRect;
    sourceSize: {
        w: number;
        h: number;
    };
    pivot: {
        x: number;
        y: number;
    };
};
export type TextureAtlasJson = {
    frames: Record<string, AtlasFrame>;
    meta: {
        image: string;
        size: {
            w: number;
            h: number;
        };
        scale: string | number;
    };
};
export type PackedSprite = {
    /** Original atlas key (e.g. "bat_placeholder1.png"). */
    name: string;
    /** Insertion-order index — maps 1:1 with a numeric tileId. */
    id: number;
    /** Normalised left edge in the packed texture (y=0 at top). */
    uvX: number;
    /** Normalised top edge in the packed texture (y=0 at top). */
    uvY: number;
    uvW: number;
    uvH: number;
    pivot: {
        x: number;
        y: number;
    };
    /** Display rotation in degrees CW — convert to FaceRotation via toFaceRotation(). */
    rotation: 0 | 90 | 180 | 270;
};
export type PackedAtlas = {
    /** The baked output texture (OffscreenCanvas when available, else HTMLCanvasElement). */
    texture: HTMLCanvasElement | OffscreenCanvas;
    /** Full name → sprite map for direct lookups. */
    sprites: Map<string, PackedSprite>;
    getByName(name: string): PackedSprite | undefined;
    /** Look up by insertion-order index (same as tileId). */
    getById(id: number): PackedSprite | undefined;
};
export type LoadingOptions = {
    /** Inject a full-screen loading overlay while fetching. Default: true. */
    showLoadingScreen?: boolean;
    /** Text shown in the loading overlay. Default: "Loading...". */
    loadingText?: string;
    /** Element to append the overlay to. Default: document.body. */
    container?: HTMLElement;
    /** Progress callback (loaded steps out of total steps). */
    onProgress?: (loaded: number, total: number) => void;
};
/**
 * Convert a PackedSprite rotation (degrees CW) to a FaceRotation index
 * compatible with the FaceTileSpec / billboard shader pathway.
 *
 * FaceRotation: 0=0°, 1=90° CCW, 2=180°, 3=270° CCW
 * PackedSprite.rotation: 0=0°, 90=90° CW, 180=180°, 270=270° CW
 */
export declare function toFaceRotation(rotation: 0 | 90 | 180 | 270): FaceRotation;
/**
 * Resolve a sprite from a PackedAtlas by either name or insertion-order id.
 */
export declare function resolveSprite(atlas: PackedAtlas, nameOrId: string | number): PackedSprite | undefined;
export type AtlasSource = {
    imageUrl: string;
    atlasJson: TextureAtlasJson;
};
/**
 * Load multiple TexturePacker-format sprite atlases, repack all sprites from
 * every source into a single power-of-two OffscreenCanvas, and return a
 * PackedAtlas with UV data and name/id lookups.
 *
 * Frames from later sources override same-named frames from earlier ones.
 *
 * @param sources  Array of { imageUrl, atlasJson } pairs.
 * @param options  Optional loading screen and progress options.
 */
export declare function loadMultiAtlas(sources: AtlasSource[], options?: LoadingOptions): Promise<PackedAtlas>;
/**
 * Load a TexturePacker-format sprite atlas, repack all sprites into a
 * power-of-two OffscreenCanvas, and return a PackedAtlas with UV data and
 * name/id lookups.
 *
 * @param imageUrl  URL of the source sprite sheet image.
 * @param atlasJson Parsed TextureAtlasJson (frames + meta).
 * @param options   Optional loading screen and progress options.
 */
export declare function loadTextureAtlas(imageUrl: string, atlasJson: TextureAtlasJson, options?: LoadingOptions): Promise<PackedAtlas>;
//# sourceMappingURL=textureLoader.d.ts.map