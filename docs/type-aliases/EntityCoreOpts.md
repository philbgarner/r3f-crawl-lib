[atomic-core](../README.md) / EntityCoreOpts

# Type Alias: EntityCoreOpts

> **EntityCoreOpts** = `object`

Defined in: [entities/factory.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L24)

Required and optional engine-level fields for createEntity().
Any additional keys (hp, maxHp, attack, xp, …) are passed through verbatim
and stored on the entity via its index signature.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive?` | `boolean` | Whether this entity participates in the turn scheduler. Default: `true`. | [entities/factory.ts:34](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L34) |
| <a id="blocksmove"></a> `blocksMove?` | `boolean` | Whether this entity blocks movement. Default: `false`. | [entities/factory.ts:36](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L36) |
| <a id="faction"></a> `faction` | `string` | Faction id used for stance/combat resolution. | [entities/factory.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L28) |
| <a id="kind"></a> `kind` | `EntityKind` | Entity category — drives AI and rendering behaviour. | [entities/factory.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L26) |
| <a id="speed"></a> `speed?` | `number` | Turn priority; higher = acts more often. Default: `1`. | [entities/factory.ts:38](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L38) |
| <a id="spritemap"></a> `spriteMap?` | [`SpriteMap`](../interfaces/SpriteMap.md) | - | [entities/factory.ts:39](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L39) |
| <a id="spritename"></a> `spriteName` | `string` | Sprite atlas name resolved through the tile-atlas resolver in the renderer. | [entities/factory.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L30) |
| <a id="x"></a> `x` | `number` | - | [entities/factory.ts:31](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L31) |
| <a id="z"></a> `z` | `number` | - | [entities/factory.ts:32](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/entities/factory.ts#L32) |
