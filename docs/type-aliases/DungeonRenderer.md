[atomic-core](../README.md) / DungeonRenderer

# Type Alias: DungeonRenderer

> **DungeonRenderer** = `object`

Defined in: [rendering/dungeonRenderer.ts:176](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L176)

## Methods

### addLayer()

> **addLayer**(`spec`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:189](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L189)

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

Defined in: [rendering/dungeonRenderer.ts:202](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L202)

Create a new atlas `ShaderMaterial` using the same texture, fog, and
shader settings as the renderer's own geometry.  Useful when building a
layer material that should display tiles from the configured atlas.
Returns `null` when no atlas was passed to `createDungeonRenderer`.

#### Returns

`ShaderMaterial` \| `null`

***

### destroy()

> **destroy**(): `void`

Defined in: [rendering/dungeonRenderer.ts:204](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L204)

Unmount the canvas and release all Three.js resources.

#### Returns

`void`

***

### rebuild()

> **rebuild**(): `void`

Defined in: [rendering/dungeonRenderer.ts:195](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L195)

Tear down all existing dungeon geometry and rebuild it from the current
dungeon outputs. Call this after `game.regenerate()` to keep the renderer
in sync when the dungeon layout has changed (e.g. a new seed).

#### Returns

`void`

***

### setEntities()

> **setEntities**(`entities`): `void`

Defined in: [rendering/dungeonRenderer.ts:181](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L181)

Update the renderer's entity list. Call this on every 'turn' event
(or whenever entity positions change) to keep the scene in sync.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entities` | [`EntityBase`](EntityBase.md)[] |

#### Returns

`void`
