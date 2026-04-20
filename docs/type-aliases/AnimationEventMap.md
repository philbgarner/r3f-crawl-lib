[atomic-core](../README.md) / AnimationEventMap

# Type Alias: AnimationEventMap

> **AnimationEventMap** = `object`

Defined in: [animations/types.ts:21](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L21)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="attack"></a> `attack` | `object` | An entity initiated an attack (resolved as hit or miss; see damage/miss for outcome). `actor` is the target. | [animations/types.ts:31](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L31) |
| `attack.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:31](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L31) |
| `attack.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:31](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L31) |
| <a id="damage"></a> `damage` | `object` | An entity took damage. `actor` is who dealt it (if known). | [animations/types.ts:23](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L23) |
| `damage.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:23](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L23) |
| `damage.amount` | `number` | - | [animations/types.ts:23](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L23) |
| `damage.effect?` | `string` | - | [animations/types.ts:23](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L23) |
| `damage.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:23](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L23) |
| <a id="death"></a> `death` | `object` | An entity died. `actor` is who killed it (if known). | [animations/types.ts:27](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L27) |
| `death.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:27](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L27) |
| `death.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:27](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L27) |
| <a id="heal"></a> `heal` | `object` | An entity was healed. | [animations/types.ts:25](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L25) |
| `heal.amount` | `number` | - | [animations/types.ts:25](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L25) |
| `heal.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:25](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L25) |
| <a id="miss"></a> `miss` | `object` | An attack missed. `actor` is who attacked. | [animations/types.ts:33](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L33) |
| `miss.actor?` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:33](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L33) |
| `miss.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:33](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L33) |
| <a id="move"></a> `move` | `object` | An entity moved from one cell to another. | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.from` | `object` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.from.x` | `number` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.from.z` | `number` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.to` | `object` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.to.x` | `number` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| `move.to.z` | `number` | - | [animations/types.ts:29](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L29) |
| <a id="xp-gain"></a> `xp-gain` | `object` | Player gained XP. | [animations/types.ts:35](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L35) |
| `xp-gain.amount` | `number` | - | [animations/types.ts:35](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L35) |
| `xp-gain.entity` | [`EntityBase`](EntityBase.md) | - | [animations/types.ts:35](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/animations/types.ts#L35) |
