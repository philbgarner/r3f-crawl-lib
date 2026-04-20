[atomic-core](../README.md) / toFaceRotation

# Function: toFaceRotation()

> **toFaceRotation**(`rotation`): `FaceRotation`

Defined in: [rendering/textureLoader.ts:89](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/rendering/textureLoader.ts#L89)

Convert a PackedSprite rotation (degrees CW) to a FaceRotation index
compatible with the FaceTileSpec / billboard shader pathway.

FaceRotation: 0=0°, 1=90° CCW, 2=180°, 3=270° CCW
PackedSprite.rotation: 0=0°, 90=90° CW, 180=180°, 270=270° CW

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rotation` | `0` \| `90` \| `180` \| `270` |

## Returns

`FaceRotation`
