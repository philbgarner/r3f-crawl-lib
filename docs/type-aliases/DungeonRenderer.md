[atomic-core](../README.md) / DungeonRenderer

# Type Alias: DungeonRenderer

> **DungeonRenderer** = `object`

Defined in: [rendering/dungeonRenderer.ts:186](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L186)

## Methods

### addLayer()

> **addLayer**(`spec`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:211](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L211)

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

Defined in: [rendering/dungeonRenderer.ts:224](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L224)

Create a new atlas `ShaderMaterial` using the same texture, fog, and
shader settings as the renderer's own geometry.  Useful when building a
layer material that should display tiles from the configured atlas.
Returns `null` when no atlas was passed to `createDungeonRenderer`.

#### Returns

`ShaderMaterial` \| `null`

***

### destroy()

> **destroy**(): `void`

Defined in: [rendering/dungeonRenderer.ts:226](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L226)

Unmount the canvas and release all Three.js resources.

#### Returns

`void`

***

### rebuild()

> **rebuild**(): `void`

Defined in: [rendering/dungeonRenderer.ts:217](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L217)

Tear down all existing dungeon geometry and rebuild it from the current
dungeon outputs. Call this after `game.regenerate()` to keep the renderer
in sync when the dungeon layout has changed (e.g. a new seed).

#### Returns

`void`

***

### setEntities()

> **setEntities**(`entities`): `void`

Defined in: [rendering/dungeonRenderer.ts:191](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L191)

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

Defined in: [rendering/dungeonRenderer.ts:203](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L203)

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
