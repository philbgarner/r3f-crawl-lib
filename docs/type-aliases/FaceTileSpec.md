[atomic-core](../README.md) / FaceTileSpec

# Type Alias: FaceTileSpec

> **FaceTileSpec** = `object`

Defined in: [rendering/tileAtlas.ts:9](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/tileAtlas.ts#L9)

Specifies which atlas tile to use for a single face, with an optional UV rotation.
Rotation is applied within the tile bounds, so the same source tile can be reused
on all four directions without visible seams.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="rotation"></a> `rotation?` | `FaceRotation` | UV rotation within the tile (0–3). Default: 0. | [rendering/tileAtlas.ts:13](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/tileAtlas.ts#L13) |
| <a id="tile"></a> `tile` | `string` \| `number` | Atlas tile: pass a string name (resolved via tileNameResolver) or a numeric id directly. | [rendering/tileAtlas.ts:11](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/rendering/tileAtlas.ts#L11) |
