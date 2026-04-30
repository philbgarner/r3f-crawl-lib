[atomic-core](../README.md) / colliderFlagsFromSolid

# Function: colliderFlagsFromSolid()

> **colliderFlagsFromSolid**(`solid`): `number`

Defined in: [dungeon/colliderFlags.ts:27](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/colliderFlags.ts#L27)

Derive a collider-flags byte from a legacy `solid` mask value.
  solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
  solid  > 0  →  wall:   IS_BLOCKED                        (0x02)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `solid` | `number` |

## Returns

`number`
