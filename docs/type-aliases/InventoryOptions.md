[atomic-core](../README.md) / InventoryOptions

# Type Alias: InventoryOptions

> **InventoryOptions** = `object`

Defined in: [ui/inventoryDialog.ts:60](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L60)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="actions"></a> `actions?` | [`ActionDef`](ActionDef.md)[] | [ui/inventoryDialog.ts:71](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L71) |
| <a id="background"></a> `background?` | [`BackgroundDef`](BackgroundDef.md) | [ui/inventoryDialog.ts:76](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L76) |
| <a id="charactername"></a> `characterName?` | `string` | [ui/inventoryDialog.ts:64](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L64) |
| <a id="classname"></a> `className?` | `string` | [ui/inventoryDialog.ts:75](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L75) |
| <a id="customlayout"></a> `customLayout?` | `boolean` | [ui/inventoryDialog.ts:61](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L61) |
| <a id="dragicon"></a> `dragIcon?` | ((`item`, `el`) => `string` \| `HTMLElement` \| `null`) \| `null` | [ui/inventoryDialog.ts:73](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L73) |
| <a id="equippeditems"></a> `equippedItems?` | `Record`\<`string`, [`Item`](../interfaces/Item.md)\> | [ui/inventoryDialog.ts:63](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L63) |
| <a id="equipslots"></a> `equipSlots?` | [`EquipSlotDef`](EquipSlotDef.md)[] \| `null` | [ui/inventoryDialog.ts:69](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L69) |
| <a id="gridcols"></a> `gridCols?` | `number` | [ui/inventoryDialog.ts:67](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L67) |
| <a id="gridrows"></a> `gridRows?` | `number` | [ui/inventoryDialog.ts:68](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L68) |
| <a id="indicators"></a> `indicators?` | [`IndicatorDef`](IndicatorDef.md)[] | [ui/inventoryDialog.ts:70](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L70) |
| <a id="inventory"></a> `inventory?` | [`InventorySlot`](../interfaces/InventorySlot.md)[] | [ui/inventoryDialog.ts:62](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L62) |
| <a id="keybindings"></a> `keybindings?` | `Record`\<`string`, `string`[]\> | [ui/inventoryDialog.ts:74](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L74) |
| <a id="onclose"></a> `onClose?` | (() => `void`) \| `null` | [ui/inventoryDialog.ts:77](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L77) |
| <a id="ondragenter"></a> `onDragEnter?` | ((`item`, `slot`, `e`) => `void`) \| `null` | [ui/inventoryDialog.ts:84](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L84) |
| <a id="ondragstart"></a> `onDragStart?` | ((`item`, `slot`, `e`) => `void`) \| `null` | [ui/inventoryDialog.ts:83](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L83) |
| <a id="ondrop"></a> `onDrop?` | ((`item`, `fromSlot`, `toSlot`, `e`) => `boolean` \| `void`) \| `null` | [ui/inventoryDialog.ts:85](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L85) |
| <a id="ondropitem"></a> `onDropItem?` | ((`slot`) => `void`) \| `null` | [ui/inventoryDialog.ts:80](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L80) |
| <a id="onequip"></a> `onEquip?` | ((`key`, `slot`) => `void`) \| `null` | [ui/inventoryDialog.ts:81](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L81) |
| <a id="onselectslot"></a> `onSelectSlot?` | ((`slot`) => `void`) \| `null` | [ui/inventoryDialog.ts:78](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L78) |
| <a id="onunequip"></a> `onUnequip?` | ((`key`, `item`) => `void`) \| `null` | [ui/inventoryDialog.ts:82](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L82) |
| <a id="onuseitem"></a> `onUseItem?` | ((`slot`) => `void`) \| `null` | [ui/inventoryDialog.ts:79](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L79) |
| <a id="portrait"></a> `portrait?` | `string` \| `null` | [ui/inventoryDialog.ts:65](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L65) |
| <a id="resolveicon"></a> `resolveIcon?` | ((`item`) => [`IconDescriptor`](IconDescriptor.md) \| `null`) \| `null` | [ui/inventoryDialog.ts:72](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L72) |
| <a id="stats"></a> `stats?` | [`StatDef`](StatDef.md)[] | [ui/inventoryDialog.ts:66](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/ui/inventoryDialog.ts#L66) |
