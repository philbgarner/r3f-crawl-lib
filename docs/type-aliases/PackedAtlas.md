[atomic-core](../README.md) / PackedAtlas

# Type Alias: PackedAtlas

> **PackedAtlas** = `object`

Defined in: [rendering/textureLoader.ts:57](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L57)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="sprites"></a> `sprites` | `Map`\<`string`, [`PackedSprite`](PackedSprite.md)\> | Full name → sprite map for direct lookups. | [rendering/textureLoader.ts:61](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L61) |
| <a id="texture"></a> `texture` | `HTMLCanvasElement` \| `OffscreenCanvas` | The baked output texture (OffscreenCanvas when available, else HTMLCanvasElement). | [rendering/textureLoader.ts:59](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L59) |

## Methods

### getById()

> **getById**(`id`): [`PackedSprite`](PackedSprite.md) \| `undefined`

Defined in: [rendering/textureLoader.ts:64](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L64)

Look up by insertion-order index (same as tileId).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `number` |

#### Returns

[`PackedSprite`](PackedSprite.md) \| `undefined`

***

### getByName()

> **getByName**(`name`): [`PackedSprite`](PackedSprite.md) \| `undefined`

Defined in: [rendering/textureLoader.ts:62](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L62)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

[`PackedSprite`](PackedSprite.md) \| `undefined`
