[atomic-core](../README.md) / BackgroundDef

# Type Alias: BackgroundDef

> **BackgroundDef** = `object`

Defined in: [ui/inventoryDialog.ts:79](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L79)

Background decoration for the inventory dialog panel.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="canvas"></a> `canvas?` | (`ctx`, `w`, `h`, `dt`) => `void` | Animated canvas background — called each rAF frame with elapsed time `dt` in seconds. | [ui/inventoryDialog.ts:85](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L85) |
| <a id="image"></a> `image?` | `string` | URL of a full-panel background image. | [ui/inventoryDialog.ts:81](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L81) |
| <a id="nineslice"></a> `nineSlice?` | `object` | Nine-slice image background; `top` is the pixel inset used for all four borders. | [ui/inventoryDialog.ts:83](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L83) |
| `nineSlice.top` | `number` | - | [ui/inventoryDialog.ts:83](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L83) |
| `nineSlice.url` | `string` | - | [ui/inventoryDialog.ts:83](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/ui/inventoryDialog.ts#L83) |
