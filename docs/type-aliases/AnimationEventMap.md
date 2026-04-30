[atomic-core](../README.md) / AnimationEventMap

# Type Alias: AnimationEventMap

> **AnimationEventMap** = `object`

Defined in: [animations/types.ts:22](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L22)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="attack"></a> `attack` | `object` | An entity initiated an attack (resolved as hit or miss; see damage/miss for outcome). `actor` is the target. | [animations/types.ts:32](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L32) |
| `attack.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:32](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L32) |
| `attack.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:32](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L32) |
| <a id="damage"></a> `damage` | `object` | An entity took damage. `actor` is who dealt it (if known). | [animations/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L24) |
| `damage.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L24) |
| `damage.amount` | `number` | - | [animations/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L24) |
| `damage.effect?` | `string` | - | [animations/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L24) |
| `damage.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L24) |
| <a id="death"></a> `death` | `object` | An entity died. `actor` is who killed it (if known). | [animations/types.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L28) |
| `death.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L28) |
| `death.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L28) |
| <a id="heal"></a> `heal` | `object` | An entity was healed. | [animations/types.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L26) |
| `heal.amount` | `number` | - | [animations/types.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L26) |
| `heal.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L26) |
| <a id="miss"></a> `miss` | `object` | An attack missed. `actor` is who attacked. | [animations/types.ts:34](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L34) |
| `miss.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:34](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L34) |
| `miss.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:34](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L34) |
| <a id="move"></a> `move` | `object` | An entity moved from one cell to another. | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.from` | `object` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.from.x` | `number` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.from.z` | `number` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.to` | `object` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.to.x` | `number` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| `move.to.z` | `number` | - | [animations/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L30) |
| <a id="xp-gain"></a> `xp-gain` | `object` | Player gained XP. | [animations/types.ts:36](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L36) |
| `xp-gain.amount` | `number` | - | [animations/types.ts:36](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L36) |
| `xp-gain.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:36](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/animations/types.ts#L36) |
