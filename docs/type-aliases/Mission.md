[atomic-core](../README.md) / Mission

# Type Alias: Mission

> **Mission** = `object`

Defined in: [missions/types.ts:20](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L20)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="completedat"></a> `completedAt` | `readonly` | `number` \| `undefined` | Turn number at which the mission was completed. undefined while active. | [missions/types.ts:27](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L27) |
| <a id="description"></a> `description` | `readonly` | `string` | - | [missions/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L24) |
| <a id="id"></a> `id` | `readonly` | `string` | Developer-assigned unique identifier. | [missions/types.ts:22](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L22) |
| <a id="metadata"></a> `metadata` | `public` | `Record`\<`string`, `unknown`\> | Arbitrary key/value bag owned by the developer. The evaluator and onComplete callback can read and mutate this freely (e.g. incrementing a kill counter across turns). Cast to a concrete shape in your evaluator. | [missions/types.ts:33](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L33) |
| <a id="name"></a> `name` | `readonly` | `string` | - | [missions/types.ts:23](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L23) |
| <a id="status"></a> `status` | `readonly` | [`MissionStatus`](MissionStatus.md) | - | [missions/types.ts:25](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/missions/types.ts#L25) |
