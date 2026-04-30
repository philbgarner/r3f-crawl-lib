[atomic-core](../README.md) / ImportResult

# Type Alias: ImportResult

> **ImportResult** = `object`

Defined in: [dungeon/mapFile.ts:85](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L85)

Returned by importDungeonMap / dungeonMapFromJson.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="dungeon"></a> `dungeon` | [`BspDungeonOutputs`](BspDungeonOutputs.md) | - | [dungeon/mapFile.ts:86](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L86) |
| <a id="generatoroptions"></a> `generatorOptions` | `BspDungeonOptions` | - | [dungeon/mapFile.ts:87](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L87) |
| <a id="meta"></a> `meta` | [`DungeonMapMeta`](DungeonMapMeta.md) \| `undefined` | - | [dungeon/mapFile.ts:89](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L89) |
| <a id="objectplacements"></a> `objectPlacements?` | [`ObjectPlacement`](../interfaces/ObjectPlacement.md)[] | Restored stationary object placements, if the file contained them. Pass to place.billboard() inside onPlace, or to renderer.setObjects() directly. | [dungeon/mapFile.ts:101](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L101) |
| <a id="paintmap"></a> `paintMap?` | `Record`\<`string`, \{ `ceil?`: `string`[]; `floor?`: `string`[]; `wall?`: `string`[]; \}\> | Restored surface-painter overlays, if the file contained them. Re-apply via game.dungeon.paint(x, z, target) after game.generate(). | [dungeon/mapFile.ts:96](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L96) |
| <a id="rendereroptions"></a> `rendererOptions` | [`SerializedRendererOptions`](SerializedRendererOptions.md) | - | [dungeon/mapFile.ts:88](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L88) |
| <a id="version"></a> `version` | `string` | The atomic-core version that produced this file. | [dungeon/mapFile.ts:91](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L91) |
