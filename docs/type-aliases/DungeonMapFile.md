[atomic-core](../README.md) / DungeonMapFile

# Type Alias: DungeonMapFile

> **DungeonMapFile** = `object`

Defined in: [dungeon/mapFile.ts:43](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L43)

Self-contained dungeon map file. Contains everything needed to reproduce
the same dungeon and renderer state exactly, except the packed sprite atlas
and any runtime callbacks (re-supply those at load time).

The `version` field matches the atomic-core npm package version at export
time and can be used to gate backward-compatibility logic on import.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="dungeon"></a> `dungeon` | `SerializedDungeon` | Serialized dungeon texture data. | [dungeon/mapFile.ts:55](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L55) |
| <a id="exportedat"></a> `exportedAt` | `string` | ISO 8601 timestamp of export. | [dungeon/mapFile.ts:47](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L47) |
| <a id="generatoroptions"></a> `generatorOptions` | `BspDungeonOptions` | BSP options used to generate this dungeon, including the resolved seed. | [dungeon/mapFile.ts:51](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L51) |
| <a id="meta"></a> `meta?` | [`DungeonMapMeta`](DungeonMapMeta.md) | Optional author-supplied metadata. | [dungeon/mapFile.ts:49](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L49) |
| <a id="objectplacements"></a> `objectPlacements?` | [`ObjectPlacement`](../interfaces/ObjectPlacement.md)[] | Stationary object placements, including billboard sprites. | [dungeon/mapFile.ts:57](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L57) |
| <a id="rendereroptions"></a> `rendererOptions` | [`SerializedRendererOptions`](SerializedRendererOptions.md) | JSON-safe renderer options (callbacks and PackedAtlas excluded). | [dungeon/mapFile.ts:53](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L53) |
| <a id="version"></a> `version` | `string` | atomic-core npm package version at export time. | [dungeon/mapFile.ts:45](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/mapFile.ts#L45) |
