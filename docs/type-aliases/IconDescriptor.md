[atomic-core](../README.md) / IconDescriptor

# Type Alias: IconDescriptor

> **IconDescriptor** = `string` \| \{ `rot?`: `number`; `url`: `string`; \} \| \{ `atlasCanvas`: `HTMLCanvasElement`; `rot?`: `number`; `sh`: `number`; `sw`: `number`; `sx`: `number`; `sy`: `number`; \}

Defined in: [ui/inventoryDialog.ts:73](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/ui/inventoryDialog.ts#L73)

Describes how to render an item icon.
- `string` — plain image URL.
- `{ url, rot? }` — URL with optional CW rotation in degrees (0/90/180/270).
- `{ atlasCanvas, sx, sy, sw, sh, rot? }` — source-rectangle crop from a canvas atlas.
