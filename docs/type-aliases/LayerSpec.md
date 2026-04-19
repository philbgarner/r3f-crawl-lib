[atomic-core](../README.md) / LayerSpec

# Type Alias: LayerSpec

> **LayerSpec** = `object`

Defined in: [rendering/dungeonRenderer.ts:134](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L134)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="filter"></a> `filter?` | (`cx`, `cz`, `direction?`) => [`LayerFaceResult`](LayerFaceResult.md) | Called for each candidate face. Return an object to include the face (optionally overriding `tile` and `rotation`), or a falsy value to skip. `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets. Default: include every face with tileId 0, rotation 0. | [rendering/dungeonRenderer.ts:145](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L145) |
| <a id="material"></a> `material` | `THREE.Material` | Three.js material for this layer's instanced mesh. | [rendering/dungeonRenderer.ts:138](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L138) |
| <a id="polygonoffset"></a> `polygonOffset?` | `boolean` | Enable `THREE.Material.polygonOffset` on the layer material so it renders on top of the base geometry without z-fighting. Default: `true`. | [rendering/dungeonRenderer.ts:160](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L160) |
| <a id="target"></a> `target` | [`LayerTarget`](LayerTarget.md) | Which geometry class to add the layer on top of. | [rendering/dungeonRenderer.ts:136](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L136) |
| <a id="useatlas"></a> `useAtlas?` | `boolean` | Whether to attach atlas shader attributes (aTileId, aUvRotation, etc.) to the instanced geometry. Defaults to `true` when an atlas was passed to `createDungeonRenderer`, `false` otherwise. | [rendering/dungeonRenderer.ts:155](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/rendering/dungeonRenderer.ts#L155) |
