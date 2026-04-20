[atomic-core](../README.md) / MissionCompleteCallback

# Type Alias: MissionCompleteCallback

> **MissionCompleteCallback** = (`mission`) => `void`

Defined in: [missions/types.ts:69](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/missions/types.ts#L69)

Optional callback invoked immediately after the mission transitions to
'complete'. Use this to run bookkeeping, manipulate game state, update the
UI, log messages, or anything else that should happen exactly once when the
condition is met.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `mission` | [`Mission`](Mission.md) |

## Returns

`void`
