[atomic-core](../README.md) / LayerFaceResult

# Type Alias: LayerFaceResult

> **LayerFaceResult** = \{ `rotation?`: `number`; `tile?`: `string` \| `number`; \} \| `null` \| `false` \| `undefined`

Defined in: [rendering/dungeonRenderer.ts:128](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L128)

Return value from a `LayerSpec.filter` callback.
Return an object (optionally overriding `tile`/`rotation`) to include the
face, or a falsy value to exclude it.
