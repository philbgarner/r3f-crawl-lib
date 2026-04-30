[atomic-core](../README.md) / generateCellularDungeon

# Function: generateCellularDungeon()

> **generateCellularDungeon**(`options`): [`CellularDungeonOutputs`](../type-aliases/CellularDungeonOutputs.md)

Defined in: [dungeon/cellular.ts:388](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L388)

Generate a cellular-automata cave dungeon.
Unlike BSP, there is no explicit room graph; use regionId for flood-fill regions.
Pass the output directly to generateContent() as it shares the same texture layout.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CellularOptions`](../type-aliases/CellularOptions.md) |

## Returns

[`CellularDungeonOutputs`](../type-aliases/CellularDungeonOutputs.md)
