// src/lib/rendering/textureLoader.ts
//
// Two-phase texture atlas loader / sprite packer.
//
// Phase 1 (load): fetch a source image and a TexturePacker-format atlas JSON,
// unpack each named sprite (undoing packer rotation when rotated:true), and
// blit them into a clean, row-ordered output texture via an OffscreenCanvas.
//
// Phase 2 (runtime): expose a PackedAtlas that maps string names → UV rects
// in the baked texture, with numeric id (insertion-order index) for
// compatibility with the existing tileId / FaceTileSpec pathway.

import type { FaceRotation } from './tileAtlas'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AtlasFrameRect = { x: number; y: number; w: number; h: number };

export type AtlasFrame = {
  frame:            AtlasFrameRect;
  rotated:          boolean;
  /** Optional additional display rotation (degrees CW). Not baked into pixels; forwarded to shader via FaceRotation. */
  rotation?:        0 | 90 | 180 | 270;
  trimmed:          boolean;
  spriteSourceSize: AtlasFrameRect;
  sourceSize:       { w: number; h: number };
  pivot:            { x: number; y: number };
};

export type TextureAtlasJson = {
  frames: Record<string, AtlasFrame>;
  meta: {
    image:  string;
    size:   { w: number; h: number };
    scale:  string | number;
  };
};

export type PackedSprite = {
  /** Original atlas key (e.g. "bat_placeholder1.png"). */
  name:     string;
  /** Insertion-order index — maps 1:1 with a numeric tileId. */
  id:       number;
  /** Normalised left edge in the packed texture (y=0 at top). */
  uvX:      number;
  /** Normalised top edge in the packed texture (y=0 at top). */
  uvY:      number;
  uvW:      number;
  uvH:      number;
  pivot:    { x: number; y: number };
  /** Display rotation in degrees CW — convert to FaceRotation via toFaceRotation(). */
  rotation: 0 | 90 | 180 | 270;
};

export type PackedAtlas = {
  /** The baked output texture (OffscreenCanvas when available, else HTMLCanvasElement). */
  texture:   HTMLCanvasElement | OffscreenCanvas;
  /** Full name → sprite map for direct lookups. */
  sprites:   Map<string, PackedSprite>;
  getByName(name: string): PackedSprite | undefined;
  /** Look up by insertion-order index (same as tileId). */
  getById(id: number): PackedSprite | undefined;
};

export type LoadingOptions = {
  /** Inject a full-screen loading overlay while fetching. Default: true. */
  showLoadingScreen?: boolean;
  /** Text shown in the loading overlay. Default: "Loading...". */
  loadingText?:       string;
  /** Element to append the overlay to. Default: document.body. */
  container?:         HTMLElement;
  /** Progress callback (loaded steps out of total steps). */
  onProgress?:        (loaded: number, total: number) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a PackedSprite rotation (degrees CW) to a FaceRotation index
 * compatible with the FaceTileSpec / billboard shader pathway.
 *
 * FaceRotation: 0=0°, 1=90° CCW, 2=180°, 3=270° CCW
 * PackedSprite.rotation: 0=0°, 90=90° CW, 180=180°, 270=270° CW
 */
export function toFaceRotation(rotation: 0 | 90 | 180 | 270): FaceRotation {
  // 90° CW == 270° CCW == index 3; 270° CW == 90° CCW == index 1
  const map: Record<number, FaceRotation> = { 0: 0, 90: 3, 180: 2, 270: 1 };
  return map[rotation] ?? 0;
}

/** A normalised UV rectangle in GL convention (y=0 at the bottom of the texture). */
export type UvRect = { x: number; y: number; w: number; h: number };

/**
 * Convert a PackedSprite's canvas UV coordinates to a GL-convention UV rect.
 * Three.js textures use flipY=true by default, so canvas y=0 (top) becomes
 * GL y=1 (top). The returned rect's y is the GL bottom-left corner of the sprite.
 */
export function spriteToUvRect(sprite: PackedSprite): UvRect {
  return {
    x: sprite.uvX,
    y: 1 - sprite.uvY - sprite.uvH,
    w: sprite.uvW,
    h: sprite.uvH,
  };
}

/**
 * Create a tile-name resolver from a baked PackedAtlas.
 * Pass the returned function as `tileNameResolver` in DungeonRendererOptions.
 *
 * @example
 * const packed = await loadTextureAtlas(src, json);
 * const resolver = packedAtlasResolver(packed);
 * createDungeonRenderer(el, game, { ..., tileNameResolver: resolver });
 */
export function packedAtlasResolver(atlas: PackedAtlas): (name: string) => number {
  return (name: string) => atlas.getByName(name)?.id ?? 0;
}

/**
 * Resolve a sprite from a PackedAtlas by either name or insertion-order id.
 */
export function resolveSprite(
  atlas: PackedAtlas,
  nameOrId: string | number,
): PackedSprite | undefined {
  return typeof nameOrId === 'string'
    ? atlas.getByName(nameOrId)
    : atlas.getById(nameOrId);
}

// ---------------------------------------------------------------------------
// Internal: shelf packing
// ---------------------------------------------------------------------------

const PADDING = 2;

type LayoutEntry = {
  name:  string;
  frame: AtlasFrame;
  outW:  number;
  outH:  number;
  destX: number;
  destY: number;
};

function computeLayout(
  frames: Record<string, AtlasFrame>,
): { entries: LayoutEntry[]; texSize: number } {
  const entries: LayoutEntry[] = Object.entries(frames).map(([name, af]) => ({
    name,
    frame: af,
    outW:  af.sourceSize.w,
    outH:  af.sourceSize.h,
    destX: 0,
    destY: 0,
  }));

  // Sort tallest-first for better shelf utilisation; entries share object refs
  // so destX/destY mutations below are reflected back in entries[].
  const sorted = [...entries].sort((a, b) => b.outH - a.outH);

  for (let texSize = 512; texSize <= 4096; texSize *= 2) {
    let cursorX = 0;
    let cursorY = 0;
    let shelfH  = 0;
    let fits    = true;

    for (const e of sorted) {
      const cellW = e.outW + PADDING * 2;
      const cellH = e.outH + PADDING * 2;

      if (cellW > texSize) { fits = false; break; }

      if (cursorX + cellW > texSize) {
        cursorY += shelfH;
        cursorX  = 0;
        shelfH   = 0;
      }

      if (cursorY + cellH > texSize) { fits = false; break; }

      e.destX  = cursorX + PADDING;
      e.destY  = cursorY + PADDING;
      cursorX += cellW;
      shelfH   = Math.max(shelfH, cellH);
    }

    if (fits) return { entries, texSize };
  }

  throw new Error('[textureLoader] Sprites cannot fit into a 4096×4096 texture.');
}

// ---------------------------------------------------------------------------
// Internal: blit
// ---------------------------------------------------------------------------

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function blitSprite(ctx: Ctx2D, source: ImageBitmap, e: LayoutEntry): void {
  const { frame: af, destX, destY } = e;
  const src = af.frame;
  const sss = af.spriteSourceSize;

  ctx.save();

  if (af.rotated) {
    // Packer stored the sprite rotated 90° CW to save space; undo it.
    // frame.w/h are the ORIGINAL dimensions. Physical atlas storage is src.h × src.w (swapped).
    // After rotate(-PI/2) a src.h×src.w block becomes src.w×src.h = sss.w×sss.h in screen space.
    const cx = destX + sss.x + sss.w / 2;
    const cy = destY + sss.y + sss.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(source, src.x, src.y, src.h, src.w, -src.h / 2, -src.w / 2, src.h, src.w);
  } else {
    // No packer rotation: place frame pixels at spriteSourceSize offset, pixel-perfect (no scaling).
    // frame.rotation is NOT baked here — it is forwarded to the shader via PackedSprite.rotation.
    ctx.drawImage(source, src.x, src.y, src.w, src.h,
      destX + sss.x, destY + sss.y, src.w, src.h);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Internal: loading overlay
// ---------------------------------------------------------------------------

function injectOverlay(text: string, container: HTMLElement): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.75);color:#fff;font-family:monospace;font-size:16px;z-index:9999;';
  el.textContent = text;
  container.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public API — multi-source variant
// ---------------------------------------------------------------------------

export type AtlasSource = {
  imageUrl:  string;
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
export async function loadMultiAtlas(
  sources: AtlasSource[],
  options: LoadingOptions = {},
): Promise<PackedAtlas> {
  const {
    showLoadingScreen = true,
    loadingText       = 'Loading...',
    container         = typeof document !== 'undefined' ? document.body : undefined,
    onProgress,
  } = options;

  let overlay: HTMLElement | null = null;
  if (showLoadingScreen && container) {
    overlay = injectOverlay(loadingText, container);
  }

  try {
    const total = sources.length + 1;

    // Merge frames and track which source each frame belongs to.
    const mergedFrames: Record<string, AtlasFrame> = {};
    const frameSourceIdx: Record<string, number>   = {};
    for (let i = 0; i < sources.length; i++) {
      for (const [name, frame] of Object.entries(sources[i]!.atlasJson.frames)) {
        mergedFrames[name]   = frame;
        frameSourceIdx[name] = i;
      }
    }

    // Compute layout from all merged frames.
    const { entries, texSize } = computeLayout(mergedFrames);

    // Fetch all source images in parallel.
    const imageBitmaps = await Promise.all(
      sources.map(async (s, i) => {
        const resp = await fetch(s.imageUrl);
        const blob = await resp.blob();
        onProgress?.(i + 1, total);
        return createImageBitmap(blob);
      }),
    );

    // Allocate output canvas.
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: Ctx2D;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(texSize, texSize);
      ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
      const el  = document.createElement('canvas');
      el.width  = texSize;
      el.height = texSize;
      canvas    = el;
      ctx       = el.getContext('2d') as CanvasRenderingContext2D;
    }

    // Blit each sprite from its originating source image.
    for (const e of entries) {
      blitSprite(ctx, imageBitmaps[frameSourceIdx[e.name]!]!, e);
    }

    for (const bmp of imageBitmaps) bmp.close();
    onProgress?.(total, total);

    // Build PackedAtlas.
    const sprites = new Map<string, PackedSprite>();
    const byId: PackedSprite[] = [];
    entries.forEach((e, idx) => {
      const sprite: PackedSprite = {
        name:     e.name,
        id:       idx,
        uvX:      e.destX / texSize,
        uvY:      e.destY / texSize,
        uvW:      e.outW  / texSize,
        uvH:      e.outH  / texSize,
        pivot:    e.frame.pivot ?? { x: 0.5, y: 0.5 },
        rotation: (e.frame.rotation ?? 0) as 0 | 90 | 180 | 270,
      };
      sprites.set(e.name, sprite);
      byId.push(sprite);
    });

    return {
      texture:   canvas,
      sprites,
      getByName: (name) => sprites.get(name),
      getById:   (id)   => byId[id],
    };
  } finally {
    overlay?.remove();
  }
}

// ---------------------------------------------------------------------------
// Public API — single-source (original)
// ---------------------------------------------------------------------------

/**
 * Load a TexturePacker-format sprite atlas, repack all sprites into a
 * power-of-two OffscreenCanvas, and return a PackedAtlas with UV data and
 * name/id lookups.
 *
 * @param imageUrl  URL of the source sprite sheet image.
 * @param atlasJson Parsed TextureAtlasJson (frames + meta).
 * @param options   Optional loading screen and progress options.
 */
export async function loadTextureAtlas(
  imageUrl:  string,
  atlasJson: TextureAtlasJson,
  options:   LoadingOptions = {},
): Promise<PackedAtlas> {
  const {
    showLoadingScreen = true,
    loadingText       = 'Loading...',
    container         = typeof document !== 'undefined' ? document.body : undefined,
    onProgress,
  } = options;

  let overlay: HTMLElement | null = null;
  if (showLoadingScreen && container) {
    overlay = injectOverlay(loadingText, container);
  }

  try {
    // --- Fetch source image ---
    const resp   = await fetch(imageUrl);
    const blob   = await resp.blob();
    const source = await createImageBitmap(blob);
    onProgress?.(1, 2);

    // --- Compute shelf-packed layout ---
    const { entries, texSize } = computeLayout(atlasJson.frames);

    // --- Allocate output canvas ---
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: Ctx2D;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(texSize, texSize);
      ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
      const el  = document.createElement('canvas');
      el.width  = texSize;
      el.height = texSize;
      canvas    = el;
      ctx       = el.getContext('2d') as CanvasRenderingContext2D;
    }

    // --- Blit each sprite ---
    for (const e of entries) {
      blitSprite(ctx, source, e);
    }

    source.close();
    onProgress?.(2, 2);

    // --- Build PackedAtlas ---
    const sprites = new Map<string, PackedSprite>();
    const byId: PackedSprite[] = [];

    entries.forEach((e, idx) => {
      const sprite: PackedSprite = {
        name:     e.name,
        id:       idx,
        uvX:      e.destX / texSize,
        uvY:      e.destY / texSize,
        uvW:      e.outW  / texSize,
        uvH:      e.outH  / texSize,
        pivot:    e.frame.pivot ?? { x: 0.5, y: 0.5 },
        rotation: (e.frame.rotation ?? 0) as 0 | 90 | 180 | 270,
      };
      sprites.set(e.name, sprite);
      byId.push(sprite);
    });

    return {
      texture:   canvas,
      sprites,
      getByName: (name) => sprites.get(name),
      getById:   (id)   => byId[id],
    };
  } finally {
    overlay?.remove();
  }
}
