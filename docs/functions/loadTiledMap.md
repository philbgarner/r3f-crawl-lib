[atomic-core](../README.md) / loadTiledMap

# Function: loadTiledMap()

> **loadTiledMap**(`tiledJson`, `options`): `TiledMapOutputs`

Defined in: [dungeon/tiled.ts:140](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/dungeon/tiled.ts#L140)

Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
superset that also carries the parsed object placements).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tiledJson` | `unknown` | Raw object from `JSON.parse` of a Tiled .tmj / .json export. |
| `options` | `TiledMapOptions` | Developer-supplied channel map, GID→value map, and object-type map. |

## Returns

`TiledMapOutputs`
