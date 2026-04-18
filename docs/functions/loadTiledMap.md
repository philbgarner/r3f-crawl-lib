[atomic-core](../README.md) / loadTiledMap

# Function: loadTiledMap()

> **loadTiledMap**(`tiledJson`, `options`): `TiledMapOutputs`

Defined in: [dungeon/tiled.ts:134](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/dungeon/tiled.ts#L134)

Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
superset that also carries the parsed object placements).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tiledJson` | `unknown` | Raw object from `JSON.parse` of a Tiled .tmj / .json export. |
| `options` | `TiledMapOptions` | Developer-supplied channel map, GID→value map, and object-type map. |

## Returns

`TiledMapOutputs`
