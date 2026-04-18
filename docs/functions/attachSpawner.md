[atomic-core](../README.md) / attachSpawner

# Function: attachSpawner()

> **attachSpawner**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1321](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/api/createGame.ts#L1321)

Register a spawn callback. Called per room during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onSpawn`: `SpawnCallback`; \} |
| `opts.onSpawn` | `SpawnCallback` |

## Returns

`void`
