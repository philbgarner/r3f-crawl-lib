[atomic-core](../README.md) / attachSpawner

# Function: attachSpawner()

> **attachSpawner**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1486](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/api/createGame.ts#L1486)

Register a spawn callback. Called per room during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onSpawn`: `SpawnCallback`; \} |
| `opts.onSpawn` | `SpawnCallback` |

## Returns

`void`
