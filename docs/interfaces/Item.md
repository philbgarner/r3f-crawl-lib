[atomic-core](../README.md) / Item

# Interface: Item

Defined in: [entities/inventory.ts:11](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/inventory.ts#L11)

A single item instance.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="id"></a> `id` | `string` | Auto-generated unique id. | [entities/inventory.ts:13](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/inventory.ts#L13) |
| <a id="name"></a> `name` | `string` | Display name. | [entities/inventory.ts:15](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/inventory.ts#L15) |
| <a id="state"></a> `state?` | `Record`\<`string`, `unknown`\> | Arbitrary item-specific state (charges, durability, etc.). | [entities/inventory.ts:19](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/inventory.ts#L19) |
| <a id="type"></a> `type` | `string` | Specific item type key (e.g. "health_potion", "sword"). | [entities/inventory.ts:17](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/entities/inventory.ts#L17) |
