[atomic-core](../README.md) / MissionEvaluator

# Type Alias: MissionEvaluator

> **MissionEvaluator** = (`ctx`) => `boolean`

Defined in: [missions/types.ts:61](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/missions/types.ts#L61)

Called once per turn for every active mission. Return `true` to mark the
mission as complete. Synchronous only — kick off any async work from
`onComplete` rather than here.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ctx` | [`MissionContext`](MissionContext.md) |

## Returns

`boolean`
