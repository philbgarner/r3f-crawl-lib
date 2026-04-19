[atomic-core](../README.md) / ServerStateUpdate

# Type Alias: ServerStateUpdate

> **ServerStateUpdate** = `object`

Defined in: [transport/types.ts:55](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L55)

Broadcast by the server after every accepted action.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="monsters"></a> `monsters?` | `MonsterNetState`[] | Current monster positions/state, supplied by the host. | [transport/types.ts:60](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L60) |
| <a id="players"></a> `players` | `Record`\<`string`, [`PlayerNetState`](PlayerNetState.md)\> | Canonical state for every connected player. | [transport/types.ts:57](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L57) |
| <a id="turn"></a> `turn` | `number` | - | [transport/types.ts:58](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/transport/types.ts#L58) |
