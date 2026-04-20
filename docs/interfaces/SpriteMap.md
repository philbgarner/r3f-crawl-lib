[atomic-core](../README.md) / SpriteMap

# Interface: SpriteMap

Defined in: [rendering/billboardSprites.ts:58](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L58)

Describes how to render an entity as a camera-facing billboard.
Presence of this field on an EntityBase switches the renderer from
box geometry to billboard quads.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="angles"></a> `angles?` | `Partial`\<`Record`\<[`AngleKey`](../type-aliases/AngleKey.md), [`AngleOverride`](AngleOverride.md)[]\>\> | Per-angle layer overrides. Key is a cardinal/intercardinal direction. When the viewer's bearing falls within 45° of a key, that override takes precedence over the base layer for the targeted layer index. | [rendering/billboardSprites.ts:68](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L68) |
| <a id="framesize"></a> `frameSize` | `object` | Pixel dimensions of a single sprite cell in the atlas. | [rendering/billboardSprites.ts:60](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L60) |
| `frameSize.h` | `number` | - | [rendering/billboardSprites.ts:60](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L60) |
| `frameSize.w` | `number` | - | [rendering/billboardSprites.ts:60](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L60) |
| <a id="layers"></a> `layers` | [`SpriteLayer`](SpriteLayer.md)[] | Ordered layers composited back-to-front (index 0 = bottommost). | [rendering/billboardSprites.ts:62](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/billboardSprites.ts#L62) |
