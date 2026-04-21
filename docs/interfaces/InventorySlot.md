[atomic-core](../README.md) / InventorySlot

# Interface: InventorySlot

Defined in: [entities/inventory.ts:34](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/entities/inventory.ts#L34)

A single slot in a character's inventory grid.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="index"></a> `index` | `number` | Slot position index (0-based). | [entities/inventory.ts:36](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/entities/inventory.ts#L36) |
| <a id="item"></a> `item` | [`Item`](Item.md) \| `null` | The item occupying this slot, or `null` if empty. | [entities/inventory.ts:38](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/entities/inventory.ts#L38) |
| <a id="quantity"></a> `quantity` | `number` | Stack count. 1 for non-stackable items. | [entities/inventory.ts:40](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/entities/inventory.ts#L40) |
