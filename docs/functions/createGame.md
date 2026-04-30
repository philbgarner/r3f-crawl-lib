[atomic-core](../README.md) / createGame

# Function: createGame()

> **createGame**(`canvas`, `options`): `GameHandle`

Defined in: [api/createGame.ts:1224](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/api/createGame.ts#L1224)

Create a game handle. Does not generate the dungeon — call `game.generate()`
after attaching callbacks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `canvas` | `HTMLElement` |
| `options` | `GameOptions` |

## Returns

`GameHandle`
