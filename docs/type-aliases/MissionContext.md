[atomic-core](../README.md) / MissionContext

# Type Alias: MissionContext

> **MissionContext** = `object`

Defined in: [missions/types.ts:39](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L39)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="dungeon"></a> `dungeon` | `DungeonHandle` | Live dungeon handle — rooms, outputs, decorations, etc. | [missions/types.ts:45](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L45) |
| <a id="events"></a> `events` | [`EventEmitter`](../interfaces/EventEmitter.md) | Game event emitter — subscribe to events from within the evaluator. | [missions/types.ts:47](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L47) |
| <a id="mission"></a> `mission` | `Readonly`\<[`Mission`](Mission.md)\> | Read-only snapshot of the mission being evaluated. | [missions/types.ts:49](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L49) |
| <a id="player"></a> `player` | `PlayerHandle` | Live player handle — position, hp, inventory, etc. | [missions/types.ts:43](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L43) |
| <a id="turn"></a> `turn` | `number` | Current turn number. | [missions/types.ts:41](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L41) |
