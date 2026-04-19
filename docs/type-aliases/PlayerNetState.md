[atomic-core](../README.md) / PlayerNetState

# Type Alias: PlayerNetState

> **PlayerNetState** = `object`

Defined in: [transport/types.ts:20](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L20)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive` | `boolean` | - | [transport/types.ts:27](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L27) |
| <a id="facing"></a> `facing?` | `number` | Yaw in radians. Optional — omit when server doesn't track facing. | [transport/types.ts:29](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L29) |
| <a id="hp"></a> `hp` | `number` | - | [transport/types.ts:25](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L25) |
| <a id="maxhp"></a> `maxHp` | `number` | - | [transport/types.ts:26](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L26) |
| <a id="meta"></a> `meta?` | `Record`\<`string`, `unknown`\> | Arbitrary client-defined metadata (e.g. sprite choice) broadcast to all peers. | [transport/types.ts:31](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L31) |
| <a id="x"></a> `x` | `number` | Grid X position. | [transport/types.ts:22](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L22) |
| <a id="y"></a> `y` | `number` | Grid Y position (row — maps to entity.z on the client). | [transport/types.ts:24](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L24) |
