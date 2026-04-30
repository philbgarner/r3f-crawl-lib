[atomic-core](../README.md) / CellularDungeonOutputs

# Type Alias: CellularDungeonOutputs

> **CellularDungeonOutputs** = [`RoomedDungeonOutputs`](RoomedDungeonOutputs.md) & `object`

Defined in: [dungeon/cellular.ts:38](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/dungeon/cellular.ts#L38)

## Type Declaration

### textures

> **textures**: `object`

#### Type Declaration

#### textures.ceilingOverlays

> **ceilingOverlays**: `THREE.DataTexture`

#### textures.ceilingType

> **ceilingType**: `THREE.DataTexture`

#### textures.ceilSkirtType

> **ceilSkirtType**: `THREE.DataTexture`

#### textures.colliderFlags

> **colliderFlags**: `THREE.DataTexture`

#### textures.distanceToWall

> **distanceToWall**: `THREE.DataTexture`

#### textures.floorSkirtType

> **floorSkirtType**: `THREE.DataTexture`

#### textures.floorType

> **floorType**: `THREE.DataTexture`

#### textures.hazards

> **hazards**: `THREE.DataTexture`

#### textures.overlays

> **overlays**: `THREE.DataTexture`

#### textures.regionId

> **regionId**: `THREE.DataTexture`

Voronoi region ID per cell — 0 = wall, 1..N = room IDs assigned by the
local-maxima Voronoi decomposition of the distanceToWall field.
Matches startRoomId / endRoomId and the keys in `rooms`.

#### textures.solid

> **solid**: `THREE.DataTexture`

#### textures.temperature

> **temperature**: `THREE.DataTexture`

Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells.

#### textures.wallOverlays

> **wallOverlays**: `THREE.DataTexture`

#### textures.wallType

> **wallType**: `THREE.DataTexture`
