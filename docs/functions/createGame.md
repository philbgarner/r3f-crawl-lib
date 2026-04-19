[atomic-core](../README.md) / createGame

# Function: createGame()

> **createGame**(`canvas`, `options`): `GameHandle`

Defined in: [api/createGame.ts:1129](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/api/createGame.ts#L1129)

Create a game handle. Does not generate the dungeon — call `game.generate()`
after attaching callbacks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `canvas` | `HTMLElement` |
| `options` | `GameOptions` |

## Returns

`GameHandle`
