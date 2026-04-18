[atomic-core](../README.md) / attachDecorator

# Function: attachDecorator()

> **attachDecorator**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1332](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/api/createGame.ts#L1332)

Register a decorator callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onDecorate`: `DecoratorCallback`; \} |
| `opts.onDecorate` | `DecoratorCallback` |

## Returns

`void`
