[atomic-core](../README.md) / IndicatorDef

# Type Alias: IndicatorDef

> **IndicatorDef** = `object`

Defined in: [ui/inventoryDialog.ts:44](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L44)

A status indicator shown in the right-column strip (e.g. hunger, weight, gold).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="icon"></a> `icon?` | `string` | URL for an icon image shown alongside the label. | [ui/inventoryDialog.ts:52](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L52) |
| <a id="key"></a> `key` | `string` | Unique identifier used by `InventoryHandle.setIndicator()`. | [ui/inventoryDialog.ts:46](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L46) |
| <a id="label"></a> `label` | `string` | Display label. | [ui/inventoryDialog.ts:48](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L48) |
| <a id="render"></a> `render?` | (`el`, `value`) => `void` | Custom render function — receives the container element and current value. | [ui/inventoryDialog.ts:54](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L54) |
| <a id="value"></a> `value?` | `number` \| `string` | Initial display value. | [ui/inventoryDialog.ts:50](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L50) |
