[atomic-core](../README.md) / importDungeonMap

# Function: importDungeonMap()

> **importDungeonMap**(`data`): [`ImportResult`](../type-aliases/ImportResult.md)

Defined in: [dungeon/mapFile.ts:162](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L162)

Reconstruct a dungeon from a DungeonMapFile.

The returned `dungeon` is ready to pass to buildDungeon / syncEntities.
Note: surface-painter overlays are zeroed on import (not serialized) —
call game.dungeon.paint() to reapply them.
Re-supply packedAtlas and tileNameResolver when creating the renderer.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | [`DungeonMapFile`](../type-aliases/DungeonMapFile.md) |

## Returns

[`ImportResult`](../type-aliases/ImportResult.md)
