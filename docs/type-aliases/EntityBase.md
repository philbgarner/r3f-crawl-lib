[atomic-core](../README.md) / EntityBase

# Type Alias: EntityBase

> **EntityBase** = `object`

Defined in: [entities/types.ts:23](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L23)

Unified base for every game entity.

Engine fields (id, kind, faction, spriteName, x, z, alive, blocksMove, speed,
tick, spriteMap) are explicitly typed. All game-specific attributes — hp,
maxHp, attack, defense, xp, etc. — are stored via the index signature and
typed as `unknown`; cast them to the concrete type your game uses.

## Indexable

> \[`key`: `string`\]: `unknown`

Developer-defined attributes (hp, maxHp, attack, xp, etc.).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive` | `boolean` | - | [entities/types.ts:36](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L36) |
| <a id="blocksmove"></a> `blocksMove` | `boolean` | - | [entities/types.ts:37](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L37) |
| <a id="faction"></a> `faction` | `string` | Faction id used for stance/combat resolution. | [entities/types.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L28) |
| <a id="id"></a> `id` | `string` | - | [entities/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L24) |
| <a id="kind"></a> `kind` | `EntityKind` | Category of entity. | [entities/types.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L26) |
| <a id="speed"></a> `speed` | `number` | >0; higher speed = acts more often in the turn scheduler. | [entities/types.ts:35](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L35) |
| <a id="spritemap"></a> `spriteMap?` | [`SpriteMap`](../interfaces/SpriteMap.md) | When present, switches the dungeon renderer from box geometry to a camera-facing billboard quad with layered sprite support. | [entities/types.ts:44](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L44) |
| <a id="spritename"></a> `spriteName` | `string` | Sprite atlas name resolved through the tile-atlas resolver in the renderer. | [entities/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L30) |
| <a id="tick"></a> `tick` | `number` | Turn-scheduler tick counter; incremented by the scheduler on each action. | [entities/types.ts:39](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L39) |
| <a id="x"></a> `x` | `number` | - | [entities/types.ts:31](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L31) |
| <a id="z"></a> `z` | `number` | Ground-plane axis (maps to world Z in the 3-D renderer). | [entities/types.ts:33](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/types.ts#L33) |
