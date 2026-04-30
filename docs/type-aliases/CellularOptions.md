[atomic-core](../README.md) / CellularOptions

# Type Alias: CellularOptions

> **CellularOptions** = `object`

Defined in: [dungeon/cellular.ts:16](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L16)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="birththreshold"></a> `birthThreshold?` | `number` | A cell becomes wall if it has >= this many wall neighbours (Moore neighbourhood). Default: 5 | [dungeon/cellular.ts:29](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L29) |
| <a id="fillprobability"></a> `fillProbability?` | `number` | Initial wall fill probability. Default: 0.45 | [dungeon/cellular.ts:22](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L22) |
| <a id="height"></a> `height` | `number` | - | [dungeon/cellular.ts:18](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L18) |
| <a id="iterations"></a> `iterations?` | `number` | Number of smoothing passes. Default: 5 | [dungeon/cellular.ts:24](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L24) |
| <a id="keepouterwalls"></a> `keepOuterWalls?` | `boolean` | - | [dungeon/cellular.ts:35](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L35) |
| <a id="seed"></a> `seed?` | `number` \| `string` | - | [dungeon/cellular.ts:19](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L19) |
| <a id="survivalthreshold"></a> `survivalThreshold?` | `number` | A wall cell survives if it has >= this many wall neighbours. Default: 4 | [dungeon/cellular.ts:33](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L33) |
| <a id="width"></a> `width` | `number` | - | [dungeon/cellular.ts:17](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L17) |
