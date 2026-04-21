[atomic-core](../README.md) / MissionEvaluator

# Type Alias: MissionEvaluator

> **MissionEvaluator** = (`ctx`) => `boolean`

Defined in: [missions/types.ts:62](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L62)

Called once per turn for every active mission. Return `true` to mark the
mission as complete. Synchronous only — kick off any async work from
`onComplete` rather than here.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ctx` | [`MissionContext`](MissionContext.md) |

## Returns

`boolean`
