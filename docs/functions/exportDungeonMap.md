[atomic-core](../README.md) / exportDungeonMap

# Function: exportDungeonMap()

> **exportDungeonMap**(`dungeon`, `options`): [`DungeonMapFile`](../type-aliases/DungeonMapFile.md)

Defined in: [dungeon/mapFile.ts:125](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L125)

Snapshot a dungeon and all settings needed to reproduce it into a
plain, JSON-safe DungeonMapFile object.

Pass `generatorOptions` with the same values used in generateBspDungeon,
including the resolved numeric seed so the room graph can be reconstructed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dungeon` | [`RoomedDungeonOutputs`](../type-aliases/RoomedDungeonOutputs.md) |
| `options` | [`ExportOptions`](../type-aliases/ExportOptions.md) |

## Returns

[`DungeonMapFile`](../type-aliases/DungeonMapFile.md)
