[atomic-core](../README.md) / showInventory

# Function: showInventory()

> **showInventory**(`opts?`): [`InventoryHandle`](../type-aliases/InventoryHandle.md)

Defined in: [ui/inventoryDialog.ts:209](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L209)

Build and open an RPG-style inventory dialog.

Default behaviour (`customLayout: false`) renders a two-column layout:
left column has a character profile + item grid; right column has an equipment
paper-doll, optional indicator strip, and action buttons. Full drag-and-drop
is supported between inventory slots and equip slots.

Pass `customLayout: true` to receive a bare `<dialog>` element and populate it
yourself via `handle.getElement()`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `opts` | [`InventoryOptions`](../type-aliases/InventoryOptions.md) | Configuration options — all fields are optional. |

## Returns

[`InventoryHandle`](../type-aliases/InventoryHandle.md)

An `InventoryHandle` for programmatic updates and close control.

## Example

```ts
const handle = showInventory({
  inventory: player.inventory,
  equippedItems: player.equipped,
  stats: [{ label: 'HP', value: player.hp, max: player.maxHp }],
  onClose: () => resumeGame(),
  onUseItem: (slot) => useItem(slot.item),
});
```
