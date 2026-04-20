[atomic-core](../README.md) / spriteToUvRect

# Function: spriteToUvRect()

> **spriteToUvRect**(`sprite`): [`UvRect`](../type-aliases/UvRect.md)

Defined in: [rendering/textureLoader.ts:103](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/textureLoader.ts#L103)

Convert a PackedSprite's canvas UV coordinates to a GL-convention UV rect.
Three.js textures use flipY=true by default, so canvas y=0 (top) becomes
GL y=1 (top). The returned rect's y is the GL bottom-left corner of the sprite.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sprite` | [`PackedSprite`](../type-aliases/PackedSprite.md) |

## Returns

[`UvRect`](../type-aliases/UvRect.md)
