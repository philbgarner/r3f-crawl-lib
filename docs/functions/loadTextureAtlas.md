[atomic-core](../README.md) / loadTextureAtlas

# Function: loadTextureAtlas()

> **loadTextureAtlas**(`imageUrl`, `atlasJson`, `options?`): `Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>

Defined in: [rendering/textureLoader.ts:375](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/rendering/textureLoader.ts#L375)

Load a TexturePacker-format sprite atlas, repack all sprites into a
power-of-two OffscreenCanvas, and return a PackedAtlas with UV data and
name/id lookups.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `imageUrl` | `string` | URL of the source sprite sheet image. |
| `atlasJson` | [`TextureAtlasJson`](../type-aliases/TextureAtlasJson.md) | Parsed TextureAtlasJson (frames + meta). |
| `options` | [`LoadingOptions`](../type-aliases/LoadingOptions.md) | Optional loading screen and progress options. |

## Returns

`Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>
