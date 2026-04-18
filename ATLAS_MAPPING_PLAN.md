# Atlas Mapping Plan — Tile Name Resolution

## Problem

Callers currently must pre-compute numeric `tileId` constants (row-major index into the sprite sheet) and hard-code them in renderer options and entity definitions:

```typescript
// Before — caller must know the sheet layout
const renderer = createDungeonRenderer(el, game, {
  atlas: { image, tileWidth: 16, tileHeight: 16, sheetWidth: 256, sheetHeight: 256, columns: 16 },
  floorTileId: 3,     // what tile is "3"? requires looking at the sheet or uvToTileId()
  wallTileId: 10,
  ceilTileId: 0,
});

const spriteMap: SpriteMap = {
  frameSize: { w: 32, h: 32 },
  layers: [{ tileId: 42 }],          // magic number
  angles: { N: [{ layerIndex: 0, tileId: 47 }] },
};
```

The atlas (both `PackedAtlas` from `loadTextureAtlas()` and `AtlasIndex` from `buildAtlasIndex()`) already has named entries and name→id lookup. The goal is to let callers pass string tile names and have the library resolve them to numeric IDs internally.

```typescript
// After — names, no magic numbers
const renderer = createDungeonRenderer(el, game, {
  atlas: { image, tileWidth: 16, tileHeight: 16, sheetWidth: 256, sheetHeight: 256, columns: 16 },
  tileNameResolver: packedAtlasResolver(packed),
  floorTile: 'stone_floor',
  wallTile: 'brick_wall',
  ceilTile: 'ceiling_stone',
});

const spriteMap: SpriteMap = {
  frameSize: { w: 32, h: 32 },
  layers: [{ tile: 'goblin_front' }],
  angles: { N: [{ layerIndex: 0, tile: 'goblin_back' }] },
};
```

Numeric IDs remain valid everywhere — the new `string | number` union is backward compatible.

---

## Affected Files

| File | What Changes |
|------|-------------|
| `src/lib/rendering/tileAtlas.ts` | `FaceTileSpec.tileId: number` → `tile: string \| number`; add `resolveTile()` helper |
| `src/lib/rendering/dungeonRenderer.ts` | `floorTileId/ceilTileId/wallTileId` → `floorTile/ceilTile/wallTile`; `tileNameResolver` option; `LayerFaceResult.tileId` → `tile` |
| `src/lib/rendering/billboardSprites.ts` | `SpriteLayer.tileId` → `tile`; `AngleOverride.tileId` → `tile`; resolver threaded through `createBillboard()` |
| `src/lib/rendering/textureLoader.ts` | Add `packedAtlasResolver()` factory function |
| `src/lib/index.ts` | Export `packedAtlasResolver` |

---

## Step-by-Step Changes

### Step 1 — `src/lib/rendering/tileAtlas.ts`

**Change `FaceTileSpec`:** rename `tileId` to `tile` and widen its type.

```typescript
// Before
export type FaceTileSpec = {
  tileId: number;
  rotation?: FaceRotation;
};

// After
export type FaceTileSpec = {
  /** Atlas tile: pass a string name (resolved via tileNameResolver) or a numeric id directly. */
  tile: string | number;
  rotation?: FaceRotation;
};
```

**Add `resolveTile()` helper** (used internally by the renderer):

```typescript
/**
 * Resolve a tile specifier to a numeric ID.
 * - If `tile` is already a number, return it as-is.
 * - If `tile` is a string, call `resolver` to look it up.
 * - Returns 0 when the resolver returns undefined (same as AtlasIndex behaviour for missing names).
 */
export function resolveTile(
  tile: string | number,
  resolver: ((name: string) => number) | undefined,
): number {
  if (typeof tile === 'number') return tile;
  return resolver?.(tile) ?? 0;
}
```

---

### Step 2 — `src/lib/rendering/textureLoader.ts`

Add a convenience factory that wraps a `PackedAtlas` as a resolver function.
Place it near the end of the file, alongside the existing `resolveSprite` export.

```typescript
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
```

---

### Step 3 — `src/lib/rendering/dungeonRenderer.ts`

**3a — Add `tileNameResolver` to `DungeonRendererOptions`:**

```typescript
export type DungeonRendererOptions = {
  // ... existing fields ...

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

  // wallTiles / floorSkirtTiles / ceilSkirtTiles remain DirectionFaceMap
  // but FaceTileSpec.tile is now string | number (changed in Step 1)
  wallTiles?: DirectionFaceMap;
  floorSkirtTiles?: DirectionFaceMap;
  ceilSkirtTiles?: DirectionFaceMap;
};
```

Remove the old `floorTileId`, `ceilTileId`, `wallTileId` fields entirely (they are on a feature branch; no need for a deprecation shim).

**3b — Update `LayerFaceResult`:**

```typescript
// Before
export type LayerFaceResult =
  | { tileId?: number; rotation?: number }
  | null | false | undefined;

// After
export type LayerFaceResult =
  | { tile?: string | number; rotation?: number }
  | null | false | undefined;
```

**3c — Add resolver to internal `createDungeonRenderer` scope:**

At the top of the renderer factory, extract the resolver once:

```typescript
const resolver = options.tileNameResolver;
```

**3d — Replace every `tileId` read site** inside the renderer with `resolveTile(tile, resolver)`.

Key internal sites to update (search for `floorTileId`, `ceilTileId`, `wallTileId`, `tileId` reads):

- Default tile ID extraction from options:
  ```typescript
  // Before
  const floorId = options.floorTileId ?? 0;

  // After
  const floorId = resolveTile(options.floorTile ?? 0, resolver);
  ```

- `spec()` helper that reads `FaceTileSpec` per direction:
  ```typescript
  // Before
  ids.push(spec.tileId);

  // After
  ids.push(resolveTile(spec.tile, resolver));
  ```

- `LayerFaceResult` handling in `addLayer` / filter invocations:
  ```typescript
  // Before
  const overrideTileId = result.tileId ?? defaultId;

  // After
  const overrideTileId = result.tile !== undefined
    ? resolveTile(result.tile, resolver)
    : defaultId;
  ```

---

### Step 4 — `src/lib/rendering/billboardSprites.ts`

**4a — Update `SpriteLayer`:**

```typescript
export interface SpriteLayer {
  /** Atlas tile: string name (resolved via resolver) or numeric tile index. */
  tile: string | number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  opacity?: number;
}
```

**4b — Update `AngleOverride`:**

```typescript
export interface AngleOverride {
  layerIndex: number;
  /** Replacement tile for this angle: string name or numeric tile index. */
  tile: string | number;
  opacity?: number;
}
```

**4c — Thread the resolver into `createBillboard()`:**

Add `resolver: ((name: string) => number) | undefined` as the last parameter:

```typescript
export function createBillboard(
  entity: EntityBase & { spriteMap: SpriteMap },
  atlas: THREE.Texture,
  atlasColumns: number,
  tileSizeNorm: THREE.Vector2,
  scene: THREE.Scene,
  resolver?: (name: string) => number,   // ← new
): BillboardHandle { ... }
```

Inside the `update()` callback, resolve before setting the uniform:

```typescript
// Before
entry.uniforms.uTileId.value = override?.tileId ?? entry.baseLayer.tileId;

// After
const rawTile = override?.tile ?? entry.baseLayer.tile;
entry.uniforms.uTileId.value = resolveTile(rawTile, resolver);
```

Resolve base layer IDs at creation time (in the `layers.map(...)` loop):

```typescript
// Before
uTileId: { value: layer.tileId },

// After
uTileId: { value: resolveTile(layer.tile, resolver) },
```

**4d — Update the `createBillboard` call site in `dungeonRenderer.ts`:**

```typescript
// Pass resolver when constructing billboard handles
createBillboard(entity, atlasTexture, columns, tileSizeNorm, scene, resolver)
```

---

### Step 5 — `src/lib/index.ts`

Add `packedAtlasResolver` to the texture loader export line:

```typescript
export { loadTextureAtlas, loadMultiAtlas, resolveSprite, toFaceRotation, packedAtlasResolver } from './rendering/textureLoader'
```

---

## Example Usage After Changes

### Baked PackedAtlas (most common)

```typescript
import { loadTextureAtlas, packedAtlasResolver, createDungeonRenderer } from 'atomic-core';

const packed = await loadTextureAtlas('textures/sprites.png', 'textures/sprites.json');
const resolver = packedAtlasResolver(packed);

const renderer = createDungeonRenderer(viewport, game, {
  atlas: { image: packed.texture as HTMLImageElement, tileWidth: 32, tileHeight: 32,
           sheetWidth: 1024, sheetHeight: 1024, columns: 32 },
  tileNameResolver: resolver,
  floorTile: 'dungeon_floor_stone',
  wallTile:  'dungeon_wall_brick',
  ceilTile:  'dungeon_ceiling_dark',
  wallTiles: {
    north: { tile: 'dungeon_wall_arch', rotation: 0 },
    south: { tile: 'dungeon_wall_arch', rotation: 2 },
  },
});
```

### AtlasIndex (static atlas.json)

```typescript
import { buildAtlasIndex } from 'atomic-core/atlas';
import atlasJson from './atlas.json';

const atlas = buildAtlasIndex(atlasJson);

// Build a single resolver that searches all categories
const resolver = (name: string) =>
  atlas.architecture.idByName(name) ||
  atlas.floorTypes.idByName(name)   ||
  atlas.wallTypes.idByName(name)    ||
  0;

createDungeonRenderer(viewport, game, {
  atlas: { ... },
  tileNameResolver: resolver,
  floorTile: 'Cobblestone',
  wallTile:  'Stone Brick',
});
```

### Billboard sprites

```typescript
const goblin: EntityBase & { spriteMap: SpriteMap } = {
  ...baseEntity,
  spriteMap: {
    frameSize: { w: 32, h: 32 },
    layers: [
      { tile: 'goblin_body_front' },
      { tile: 'goblin_weapon_front', offsetY: 0.05 },
    ],
    angles: {
      N: [{ layerIndex: 0, tile: 'goblin_body_back' }],
      S: [{ layerIndex: 0, tile: 'goblin_body_front' }],
    },
  },
};
```

---

## Resolution Order and Edge Cases

| Input | Behaviour |
|-------|-----------|
| `tile: 0` (number zero) | Used as-is — tile index 0 |
| `tile: 7` (any number) | Used as-is |
| `tile: 'stone_floor'` (string, found) | `resolver('stone_floor')` → numeric id |
| `tile: 'unknown_name'` (string, not found) | `resolver` returns `0`; logs nothing (matches existing `idByName` contract) |
| `tile: 'foo'`, `tileNameResolver` not set | `resolveTile` returns `0` (safe fallback) |

---

## Non-Goals

- No changes to shaders — they always receive numeric `aTileId` floats.
- No changes to `AtlasData`, `AtlasIndex`, or `PackedAtlas` internals.
- No support for resolving names at atlas-category granularity in the renderer API — callers provide a single `(name: string) => number` function and own the category routing.
- No deprecation shims for `tileId` — this is a clean rename on a feature branch.
