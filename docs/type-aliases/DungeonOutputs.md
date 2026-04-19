[atomic-core](../README.md) / DungeonOutputs

# Type Alias: DungeonOutputs

> **DungeonOutputs** = `object`

Defined in: [dungeon/bsp.ts:11](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L11)

Minimum shape required by generateContent, aStar8, computeFov, and generateCellularDungeon.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="height"></a> `height` | `number` | - | [dungeon/bsp.ts:13](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L13) |
| <a id="seed"></a> `seed` | `number` | - | [dungeon/bsp.ts:14](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L14) |
| <a id="textures"></a> `textures` | `object` | - | [dungeon/bsp.ts:15](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L15) |
| `textures.ceilingHeightOffset?` | `THREE.DataTexture` | Per-cell ceiling height offset (R8). Encoding is inverted relative to floor: 128 = no offset, 127 = +1 step up (ceiling raised), 129 = +1 step down (ceiling lowered). One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5). All floor cells default to 128. Wall cells are 128. Not present for cellular/tiled dungeon outputs. | [dungeon/bsp.ts:68](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L68) |
| `textures.ceilingOverlays` | `THREE.DataTexture` | Per-cell overlay bit-flags for ceiling cells (RGBA). Same encoding as `overlays`. IDs correspond to the `id` field in atlas.json `ceilingOverlays`. All zeros by default. | [dungeon/bsp.ts:52](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L52) |
| `textures.ceilingType` | `THREE.DataTexture` | Per-cell ceiling type index (R8). Value matches the `id` field in atlas.json `ceilingTypes`. 0 = no ceiling type assigned. Floor cells default to 1 (Cobblestone). | [dungeon/bsp.ts:47](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L47) |
| `textures.distanceToWall` | `THREE.DataTexture` | - | [dungeon/bsp.ts:18](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L18) |
| `textures.floorHeightOffset?` | `THREE.DataTexture` | Per-cell floor height offset (R8). Encoding: 128 = no offset, 129 = +1 step up, 127 = -1 step down, 0 = pit (floor tile omitted entirely). One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5). All floor cells default to 128. Wall cells are 128. Not present for cellular/tiled dungeon outputs. | [dungeon/bsp.ts:60](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L60) |
| `textures.floorType` | `THREE.DataTexture` | Per-cell floor type index (R8). Value matches the `id` field in atlas.json `floorTypes`. 0 = wall/no floor. Corridors inherit the floor type of the nearest room. | [dungeon/bsp.ts:26](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L26) |
| `textures.hazards` | `THREE.DataTexture` | - | [dungeon/bsp.ts:19](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L19) |
| `textures.overlays` | `THREE.DataTexture` | Per-cell overlay bit-flags for floor cells (RGBA). Each channel stores 8 overlay slots as individual bits. R = overlay IDs 1–8, G = 9–16, B = 17–24, A = 25–32. IDs correspond to the `id` field in atlas.json `overlays`. All zeros by default. | [dungeon/bsp.ts:32](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L32) |
| `textures.regionId` | `THREE.DataTexture` | - | [dungeon/bsp.ts:17](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L17) |
| `textures.solid` | `THREE.DataTexture` | - | [dungeon/bsp.ts:16](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L16) |
| `textures.temperature` | `THREE.DataTexture` | Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells. | [dungeon/bsp.ts:21](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L21) |
| `textures.wallOverlays` | `THREE.DataTexture` | Per-cell overlay bit-flags for wall cells (RGBA). Same encoding as `overlays`. IDs correspond to the `id` field in atlas.json `wallOverlays`. All zeros by default. | [dungeon/bsp.ts:42](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L42) |
| `textures.wallType` | `THREE.DataTexture` | Per-cell wall type index (R8). Value matches the `id` field in atlas.json `wallTypes`. 0 = floor/no wall. Wall cells inherit the type of the nearest floor cell. | [dungeon/bsp.ts:37](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L37) |
| <a id="width"></a> `width` | `number` | - | [dungeon/bsp.ts:12](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L12) |
