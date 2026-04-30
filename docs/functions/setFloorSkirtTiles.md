[atomic-core](../README.md) / setFloorSkirtTiles

# Function: setFloorSkirtTiles()

> **setFloorSkirtTiles**(`outputs`, `cx`, `cz`, `tiles`): `void`

Defined in: [dungeon/bsp.ts:1086](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/bsp.ts#L1086)

Write floor skirt overlay tile IDs for a single cell.
`tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
Missing entries are left unchanged; pass 0 to clear a slot.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`DungeonOutputs`](../type-aliases/DungeonOutputs.md) |
| `cx` | `number` |
| `cz` | `number` |
| `tiles` | `number`[] |

## Returns

`void`
