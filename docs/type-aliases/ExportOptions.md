[atomic-core](../README.md) / ExportOptions

# Type Alias: ExportOptions

> **ExportOptions** = `object`

Defined in: [dungeon/mapFile.ts:61](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L61)

Options passed to exportDungeonMap.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="generatoroptions"></a> `generatorOptions` | `BspDungeonOptions` | BSP generation options used to produce this dungeon (must include seed). | [dungeon/mapFile.ts:65](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L65) |
| <a id="meta"></a> `meta?` | [`DungeonMapMeta`](DungeonMapMeta.md) | Author-supplied metadata to embed in the file. | [dungeon/mapFile.ts:63](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L63) |
| <a id="objectplacements"></a> `objectPlacements?` | readonly [`ObjectPlacement`](../interfaces/ObjectPlacement.md)[] | Supply game.dungeon.objects here to persist stationary object placements. SpriteMap data is plain JSON so no stripping is needed. | [dungeon/mapFile.ts:81](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L81) |
| <a id="paintmap"></a> `paintMap?` | `ReadonlyMap`\<`string`, \{ `ceil?`: `string`[]; `floor?`: `string`[]; `wall?`: `string`[]; \}\> | Supply game.dungeon.paintMap here to persist surface-painter overlays. The map is already plain strings so no stripping is needed. | [dungeon/mapFile.ts:76](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L76) |
| <a id="rendereroptions"></a> `rendererOptions?` | [`DungeonRendererOptions`](DungeonRendererOptions.md) | Renderer options to embed. Callbacks and non-serializable fields (packedAtlas, tileNameResolver, onCellClick, onCellHover) are stripped automatically. | [dungeon/mapFile.ts:71](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L71) |
