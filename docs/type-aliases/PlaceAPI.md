[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:154](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L154)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:161](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L161)

Place a stationary camera-facing billboard sprite at a grid cell.
The placement is stored in `game.dungeon.objects` and rendered when passed
to `renderer.setObjects(game.dungeon.objects)`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `spriteMap` | [`SpriteMap`](../interfaces/SpriteMap.md) |
| `opts?` | `Pick`\<[`ObjectPlacement`](../interfaces/ObjectPlacement.md), `"meta"` \| `"offsetX"` \| `"offsetZ"` \| `"offsetY"` \| `"yaw"` \| `"scale"`\> |

#### Returns

`void`

***

### decoration()

> **decoration**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:170](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L170)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### enemy()

> **enemy**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:169](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L169)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### npc()

> **npc**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:168](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L168)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### object()

> **object**(`x`, `z`, `type`, `meta?`): `void`

Defined in: [api/createGame.ts:155](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L155)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `meta?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### surface()

> **surface**(`x`, `z`, `layers`): `void`

Defined in: [api/createGame.ts:171](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L171)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
