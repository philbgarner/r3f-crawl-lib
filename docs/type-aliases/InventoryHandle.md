[atomic-core](../README.md) / InventoryHandle

# Type Alias: InventoryHandle

> **InventoryHandle** = [`InventoryHandleCore`](InventoryHandleCore.md) & `object`

Defined in: [ui/inventoryDialog.ts:98](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/ui/inventoryDialog.ts#L98)

Extended handle — additional methods added when customLayout is false.

## Type Declaration

### getCanvas()?

> `optional` **getCanvas**(): `HTMLCanvasElement`

#### Returns

`HTMLCanvasElement`

### getRegion()?

> `optional` **getRegion**(`name`): `HTMLElement` \| `null`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`HTMLElement` \| `null`

### setBackground()?

> `optional` **setBackground**(`bg`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bg` | [`BackgroundDef`](BackgroundDef.md) |

#### Returns

`void`

### setEquipped()?

> `optional` **setEquipped**(`equipped`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `equipped` | `Record`\<`string`, [`Item`](../interfaces/Item.md)\> |

#### Returns

`void`

### setIndicator()?

> `optional` **setIndicator**(`key`, `value`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | `unknown` |

#### Returns

`void`

### setInventory()?

> `optional` **setInventory**(`slots`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `slots` | [`InventorySlot`](../interfaces/InventorySlot.md)[] |

#### Returns

`void`

### setStat()?

> `optional` **setStat**(`label`, `value`, `max?`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` |
| `value` | `number` |
| `max?` | `number` |

#### Returns

`void`
