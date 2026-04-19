[atomic-core](../README.md) / EntityBase

# Type Alias: EntityBase

> **EntityBase** = `object`

Defined in: [entities/types.ts:20](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L20)

Unified base for every game entity.
Fields are a superset of the old ActorBase + MonsterActor + MobilePlacement.
hp/maxHp/attack/defense default to 0 for non-combat entities (decorations).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive` | `boolean` | - | [entities/types.ts:37](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L37) |
| <a id="attack"></a> `attack` | `number` | - | [entities/types.ts:33](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L33) |
| <a id="blocksmove"></a> `blocksMove` | `boolean` | - | [entities/types.ts:38](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L38) |
| <a id="defense"></a> `defense` | `number` | - | [entities/types.ts:34](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L34) |
| <a id="faction"></a> `faction` | `string` | Faction id used for stance/combat resolution. | [entities/types.ts:40](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L40) |
| <a id="hp"></a> `hp` | `number` | - | [entities/types.ts:31](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L31) |
| <a id="id"></a> `id` | `string` | - | [entities/types.ts:21](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L21) |
| <a id="kind"></a> `kind` | `EntityKind` | Category of entity. | [entities/types.ts:23](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L23) |
| <a id="maxhp"></a> `maxHp` | `number` | - | [entities/types.ts:32](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L32) |
| <a id="speed"></a> `speed` | `number` | >0; higher speed = acts more often in the turn scheduler. | [entities/types.ts:36](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L36) |
| <a id="sprite"></a> `sprite` | `string` \| `number` | Sprite atlas key or tile id. | [entities/types.ts:27](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L27) |
| <a id="spritemap"></a> `spriteMap?` | [`SpriteMap`](../interfaces/SpriteMap.md) | When present, switches the dungeon renderer from box geometry to a camera-facing billboard quad with layered sprite support. | [entities/types.ts:47](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L47) |
| <a id="tick"></a> `tick` | `number` | Turn-scheduler tick counter; incremented by the scheduler on each action. | [entities/types.ts:42](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L42) |
| <a id="type"></a> `type` | `string` | Specific entity type key (e.g. "goblin", "chest", "torch"). | [entities/types.ts:25](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L25) |
| <a id="x"></a> `x` | `number` | - | [entities/types.ts:28](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L28) |
| <a id="z"></a> `z` | `number` | Ground-plane axis (maps to world Z in the 3-D renderer). | [entities/types.ts:30](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/types.ts#L30) |
