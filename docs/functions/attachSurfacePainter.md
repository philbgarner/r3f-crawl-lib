[atomic-core](../README.md) / attachSurfacePainter

# Function: attachSurfacePainter()

> **attachSurfacePainter**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1343](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/api/createGame.ts#L1343)

Register a surface painter callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onPaint`: `SurfacePainterCallback`; \} |
| `opts.onPaint` | `SurfacePainterCallback` |

## Returns

`void`
