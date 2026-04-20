[atomic-core](../README.md) / HiddenPassage

# Interface: HiddenPassage

Defined in: [entities/types.ts:118](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L118)

A hidden passage connecting two dungeon regions through wall cells.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cells"></a> `cells` | `object`[] | Ordered list of cells from start to end (inclusive of both endpoints). | [entities/types.ts:128](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L128) |
| <a id="enabled"></a> `enabled` | `boolean` | Whether the passage can currently be used. Toggled by lever/button. | [entities/types.ts:130](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L130) |
| <a id="end"></a> `end` | `object` | Exit cell (floor cell at the far end of the tunnel). | [entities/types.ts:124](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L124) |
| `end.x` | `number` | - | [entities/types.ts:124](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L124) |
| `end.y` | `number` | - | [entities/types.ts:124](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L124) |
| <a id="id"></a> `id` | `number` | Unique id within this dungeon floor. | [entities/types.ts:120](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L120) |
| <a id="start"></a> `start` | `object` | Entry cell (floor cell adjacent to the tunnel entrance). | [entities/types.ts:122](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L122) |
| `start.x` | `number` | - | [entities/types.ts:122](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L122) |
| `start.y` | `number` | - | [entities/types.ts:122](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/entities/types.ts#L122) |
