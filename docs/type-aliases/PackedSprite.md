[atomic-core](../README.md) / PackedSprite

# Type Alias: PackedSprite

> **PackedSprite** = `object`

Defined in: [rendering/textureLoader.ts:41](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L41)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="id"></a> `id` | `number` | Insertion-order index — maps 1:1 with a numeric tileId. | [rendering/textureLoader.ts:45](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L45) |
| <a id="name"></a> `name` | `string` | Original atlas key (e.g. "bat_placeholder1.png"). | [rendering/textureLoader.ts:43](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L43) |
| <a id="pivot"></a> `pivot` | `object` | - | [rendering/textureLoader.ts:52](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L52) |
| `pivot.x` | `number` | - | [rendering/textureLoader.ts:52](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L52) |
| `pivot.y` | `number` | - | [rendering/textureLoader.ts:52](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L52) |
| <a id="rotation"></a> `rotation` | `0` \| `90` \| `180` \| `270` | Display rotation in degrees CW — convert to FaceRotation via toFaceRotation(). | [rendering/textureLoader.ts:54](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L54) |
| <a id="uvh"></a> `uvH` | `number` | - | [rendering/textureLoader.ts:51](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L51) |
| <a id="uvw"></a> `uvW` | `number` | - | [rendering/textureLoader.ts:50](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L50) |
| <a id="uvx"></a> `uvX` | `number` | Normalised left edge in the packed texture (y=0 at top). | [rendering/textureLoader.ts:47](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L47) |
| <a id="uvy"></a> `uvY` | `number` | Normalised top edge in the packed texture (y=0 at top). | [rendering/textureLoader.ts:49](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/textureLoader.ts#L49) |
