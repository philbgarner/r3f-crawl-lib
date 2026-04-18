[atomic-core](../README.md) / MissionsHandle

# Type Alias: MissionsHandle

> **MissionsHandle** = `object`

Defined in: [missions/types.ts:100](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L100)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="active"></a> `active` | `readonly` | [`Mission`](Mission.md)[] | Only missions whose status is 'active'. | [missions/types.ts:115](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L115) |
| <a id="completed"></a> `completed` | `readonly` | [`Mission`](Mission.md)[] | Only missions whose status is 'complete'. | [missions/types.ts:117](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L117) |
| <a id="list"></a> `list` | `readonly` | [`Mission`](Mission.md)[] | All registered missions (active and complete). | [missions/types.ts:113](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L113) |

## Methods

### add()

> **add**(`def`): `void`

Defined in: [missions/types.ts:105](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L105)

Register a new mission. The evaluator is called every turn until the
mission completes or is removed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `def` | [`MissionDef`](MissionDef.md) |

#### Returns

`void`

***

### get()

> **get**(`id`): [`Mission`](Mission.md) \| `undefined`

Defined in: [missions/types.ts:111](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L111)

Retrieve a mission by ID. Returns undefined if not found.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Mission`](Mission.md) \| `undefined`

***

### remove()

> **remove**(`id`): `void`

Defined in: [missions/types.ts:109](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/missions/types.ts#L109)

Unregister a mission by ID. Has no effect if the mission does not exist.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`void`
