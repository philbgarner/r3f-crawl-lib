[atomic-core](../README.md) / PlayerNetState

# Type Alias: PlayerNetState

> **PlayerNetState** = `object`

Defined in: [transport/types.ts:21](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L21)

Network state snapshot for a single player, broadcast in every `ServerStateUpdate`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive` | `boolean` | - | [transport/types.ts:28](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L28) |
| <a id="facing"></a> `facing?` | `number` | Yaw in radians. Optional — omit when server doesn't track facing. | [transport/types.ts:30](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L30) |
| <a id="hp"></a> `hp` | `number` | - | [transport/types.ts:26](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L26) |
| <a id="maxhp"></a> `maxHp` | `number` | - | [transport/types.ts:27](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L27) |
| <a id="meta"></a> `meta?` | `Record`\<`string`, `unknown`\> | Arbitrary client-defined metadata (e.g. sprite choice) broadcast to all peers. | [transport/types.ts:32](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L32) |
| <a id="x"></a> `x` | `number` | Grid X position. | [transport/types.ts:23](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L23) |
| <a id="y"></a> `y` | `number` | Grid Y position (row — maps to entity.z on the client). | [transport/types.ts:25](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L25) |
