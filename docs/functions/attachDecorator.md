[atomic-core](../README.md) / attachDecorator

# Function: attachDecorator()

> **attachDecorator**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1497](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/api/createGame.ts#L1497)

Register a decorator callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onDecorate`: `DecoratorCallback`; \} |
| `opts.onDecorate` | `DecoratorCallback` |

## Returns

`void`
