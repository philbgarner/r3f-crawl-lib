[atomic-core](../README.md) / MissionContext

# Type Alias: MissionContext

> **MissionContext** = `object`

Defined in: [missions/types.ts:40](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L40)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="dungeon"></a> `dungeon` | `DungeonHandle` | Live dungeon handle — rooms, outputs, decorations, etc. | [missions/types.ts:46](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L46) |
| <a id="events"></a> `events` | [`EventEmitter`](../interfaces/EventEmitter.md) | Game event emitter — subscribe to events from within the evaluator. | [missions/types.ts:48](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L48) |
| <a id="mission"></a> `mission` | `Readonly`\<[`Mission`](Mission.md)\> | Read-only snapshot of the mission being evaluated. | [missions/types.ts:50](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L50) |
| <a id="player"></a> `player` | `PlayerHandle` | Live player handle — position, hp, inventory, etc. | [missions/types.ts:44](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L44) |
| <a id="turn"></a> `turn` | `number` | Current turn number. | [missions/types.ts:42](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L42) |
