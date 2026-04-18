[atomic-core](../README.md) / LayerSpec

# Type Alias: LayerSpec

> **LayerSpec** = `object`

Defined in: [rendering/dungeonRenderer.ts:124](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L124)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="filter"></a> `filter?` | (`cx`, `cz`, `direction?`) => [`LayerFaceResult`](LayerFaceResult.md) | Called for each candidate face. Return an object to include the face (optionally overriding `tile` and `rotation`), or a falsy value to skip. `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets. Default: include every face with tileId 0, rotation 0. | [rendering/dungeonRenderer.ts:135](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L135) |
| <a id="material"></a> `material` | `THREE.Material` | Three.js material for this layer's instanced mesh. | [rendering/dungeonRenderer.ts:128](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L128) |
| <a id="polygonoffset"></a> `polygonOffset?` | `boolean` | Enable `THREE.Material.polygonOffset` on the layer material so it renders on top of the base geometry without z-fighting. Default: `true`. | [rendering/dungeonRenderer.ts:150](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L150) |
| <a id="target"></a> `target` | [`LayerTarget`](LayerTarget.md) | Which geometry class to add the layer on top of. | [rendering/dungeonRenderer.ts:126](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L126) |
| <a id="useatlas"></a> `useAtlas?` | `boolean` | Whether to attach atlas shader attributes (aTileId, aUvRotation, etc.) to the instanced geometry. Defaults to `true` when an atlas was passed to `createDungeonRenderer`, `false` otherwise. | [rendering/dungeonRenderer.ts:145](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/dungeonRenderer.ts#L145) |
