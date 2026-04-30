[atomic-core](../README.md) / MissionCompleteCallback

# Type Alias: MissionCompleteCallback

> **MissionCompleteCallback** = (`mission`) => `void`

Defined in: [missions/types.ts:70](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L70)

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
