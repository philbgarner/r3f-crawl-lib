[atomic-core](../README.md) / MissionCompleteCallback

# Type Alias: MissionCompleteCallback

> **MissionCompleteCallback** = (`mission`) => `void`

Defined in: [missions/types.ts:70](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L70)

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
