[atomic-core](../README.md) / DungeonInitPayload

# Type Alias: DungeonInitPayload

> **DungeonInitPayload** = `object`

Defined in: [transport/types.ts:69](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L69)

Sent by the host client after generate() so the server can validate moves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `Record`\<`string`, `unknown`\> | Original dungeon config so the server can share it with late-joiners. | [transport/types.ts:75](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L75) |
| <a id="height"></a> `height` | `number` | - | [transport/types.ts:73](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L73) |
| <a id="solid"></a> `solid` | `number`[] | Flat Uint8Array contents: 0 = walkable, >0 = solid. | [transport/types.ts:71](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L71) |
| <a id="width"></a> `width` | `number` | - | [transport/types.ts:72](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/transport/types.ts#L72) |
