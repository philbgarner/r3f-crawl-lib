[atomic-core](../README.md) / DungeonInitPayload

# Type Alias: DungeonInitPayload

> **DungeonInitPayload** = `object`

Defined in: [transport/types.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/transport/types.ts#L65)

Sent by the host client after generate() so the server can validate moves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `Record`\<`string`, `unknown`\> | Original dungeon config so the server can share it with late-joiners. | [transport/types.ts:71](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/transport/types.ts#L71) |
| <a id="height"></a> `height` | `number` | - | [transport/types.ts:69](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/transport/types.ts#L69) |
| <a id="solid"></a> `solid` | `number`[] | Flat Uint8Array contents: 0 = walkable, >0 = solid. | [transport/types.ts:67](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/transport/types.ts#L67) |
| <a id="width"></a> `width` | `number` | - | [transport/types.ts:68](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/transport/types.ts#L68) |
