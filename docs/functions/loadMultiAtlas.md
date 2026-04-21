[atomic-core](../README.md) / loadMultiAtlas

# Function: loadMultiAtlas()

> **loadMultiAtlas**(`sources`, `options?`): `Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>

Defined in: [rendering/textureLoader.ts:269](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L269)

Load multiple TexturePacker-format sprite atlases, repack all sprites from
every source into a single power-of-two OffscreenCanvas, and return a
PackedAtlas with UV data and name/id lookups.

Frames from later sources override same-named frames from earlier ones.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sources` | [`AtlasSource`](../type-aliases/AtlasSource.md)[] | Array of { imageUrl, atlasJson } pairs. |
| `options` | [`LoadingOptions`](../type-aliases/LoadingOptions.md) | Optional loading screen and progress options. |

## Returns

`Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>
