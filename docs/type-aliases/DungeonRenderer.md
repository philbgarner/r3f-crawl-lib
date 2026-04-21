[atomic-core](../README.md) / DungeonRenderer

# Type Alias: DungeonRenderer

> **DungeonRenderer** = `object`

Defined in: [rendering/dungeonRenderer.ts:210](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L210)

## Methods

### addLayer()

> **addLayer**(`spec`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:235](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L235)

Add an instanced geometry layer on top of existing walls, ceilings, or
floors.  May be called before or after the dungeon is generated; layers
added before generation are deferred and applied automatically.

Returns a handle whose `remove()` method tears the layer down.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`LayerSpec`](LayerSpec.md) |

#### Returns

[`LayerHandle`](LayerHandle.md)

***

### createAtlasMaterial()

> **createAtlasMaterial**(): `ShaderMaterial` \| `null`

Defined in: [rendering/dungeonRenderer.ts:248](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L248)

Create a new atlas `ShaderMaterial` using the same texture, fog, and
shader settings as the renderer's own geometry.  Useful when building a
layer material that should display tiles from the configured atlas.
Returns `null` when no atlas was passed to `createDungeonRenderer`.

#### Returns

`ShaderMaterial` \| `null`

***

### destroy()

> **destroy**(): `void`

Defined in: [rendering/dungeonRenderer.ts:275](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L275)

Unmount the canvas and release all Three.js resources.

#### Returns

`void`

***

### highlightCells()

> **highlightCells**(`filter`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:271](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L271)

Overlay coloured floor highlights on a subset of cells.

The `filter` is called for every non-solid floor cell and should return a
CSS colour string to highlight that cell, or a falsy value to skip it.
The `regionId` argument lets callers colour-code cells by room/corridor
without extra bookkeeping.

Returns a `LayerHandle` whose `remove()` tears the overlay down.
May be called before or after `game.generate()`.

Example — highlight all cells in room 3 red, corridor cells yellow:
```ts
const handle = renderer.highlightCells((cx, cz, regionId) => {
  if (regionId === 3) return 'red';
  if (regionId > 100) return 'rgba(255,255,0,0.3)';
  return null;
});
// later:
handle.remove();
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `filter` | (`cx`, `cz`, `regionId`) => `string` \| `false` \| `null` \| `undefined` |

#### Returns

[`LayerHandle`](LayerHandle.md)

***

### rebuild()

> **rebuild**(): `void`

Defined in: [rendering/dungeonRenderer.ts:241](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L241)

Tear down all existing dungeon geometry and rebuild it from the current
dungeon outputs. Call this after `game.regenerate()` to keep the renderer
in sync when the dungeon layout has changed (e.g. a new seed).

#### Returns

`void`

***

### setEntities()

> **setEntities**(`entities`): `void`

Defined in: [rendering/dungeonRenderer.ts:215](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L215)

Update the renderer's entity list. Call this on every 'turn' event
(or whenever entity positions change) to keep the scene in sync.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entities` | [`EntityBase`](EntityBase.md)[] |

#### Returns

`void`

***

### worldToScreen()

> **worldToScreen**(`gridX`, `gridZ`, `worldY?`): \{ `x`: `number`; `y`: `number`; \} \| `null`

Defined in: [rendering/dungeonRenderer.ts:227](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/dungeonRenderer.ts#L227)

Project a dungeon grid cell to 2D pixel coordinates relative to the
renderer's container element, using the current camera state.

Returns `{ x, y }` in pixels (suitable for `left`/`top` on an absolutely-
positioned child of the container), or `null` when the point is behind
the camera or outside the viewport.

`worldY` is the vertical world-space position to project; defaults to
mid-entity height (~40% of ceiling height).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `gridX` | `number` |
| `gridZ` | `number` |
| `worldY?` | `number` |

#### Returns

\{ `x`: `number`; `y`: `number`; \} \| `null`
