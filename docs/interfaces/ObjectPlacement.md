[atomic-core](../README.md) / ObjectPlacement

# Interface: ObjectPlacement

Defined in: [entities/types.ts:66](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L66)

A static object placed in the world (chest, lever, torch, etc.).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="meta"></a> `meta?` | `Record`\<`string`, `unknown`\> | Arbitrary metadata for game logic. | [entities/types.ts:82](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L82) |
| <a id="offsetx"></a> `offsetX?` | `number` | Fine-grained world-space offset from cell centre (in cell units). | [entities/types.ts:74](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L74) |
| <a id="offsety"></a> `offsetY?` | `number` | - | [entities/types.ts:76](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L76) |
| <a id="offsetz"></a> `offsetZ?` | `number` | - | [entities/types.ts:75](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L75) |
| <a id="scale"></a> `scale?` | `number` | Uniform scale multiplier. | [entities/types.ts:80](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L80) |
| <a id="spritemap"></a> `spriteMap?` | [`SpriteMap`](SpriteMap.md) | When present, renders this placement as a camera-facing billboard sprite via the dungeon renderer's `setObjects()` method. | [entities/types.ts:87](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L87) |
| <a id="type"></a> `type` | `string` | Factory key resolved by the renderer's ObjectRegistry. | [entities/types.ts:72](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L72) |
| <a id="x"></a> `x` | `number` | Grid column (2-D grid X). | [entities/types.ts:68](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L68) |
| <a id="yaw"></a> `yaw?` | `number` | Yaw rotation in radians. | [entities/types.ts:78](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L78) |
| <a id="z"></a> `z` | `number` | Grid row (2-D grid Y → world Z). | [entities/types.ts:70](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L70) |
