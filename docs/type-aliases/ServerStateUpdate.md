[atomic-core](../README.md) / ServerStateUpdate

# Type Alias: ServerStateUpdate

> **ServerStateUpdate** = `object`

Defined in: [transport/types.ts:60](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L60)

Broadcast by the server after every accepted action.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="monsters"></a> `monsters?` | `MonsterNetState`[] | Current monster positions/state, supplied by the host. | [transport/types.ts:65](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L65) |
| <a id="players"></a> `players` | `Record`\<`string`, [`PlayerNetState`](PlayerNetState.md)\> | Canonical state for every connected player. | [transport/types.ts:62](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L62) |
| <a id="turn"></a> `turn` | `number` | - | [transport/types.ts:63](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L63) |
