[atomic-core](../README.md) / BspDungeonOutputs

# Type Alias: BspDungeonOutputs

> **BspDungeonOutputs** = [`DungeonOutputs`](DungeonOutputs.md) & `object`

Defined in: [dungeon/bsp.ts:135](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/dungeon/bsp.ts#L135)

## Type Declaration

### endRoomId

> **endRoomId**: `number`

Room ID (matches regionId texture values) chosen as the dungeon exit. Has exactly 1 corridor connection.

### firstCorridorRegionId

> **firstCorridorRegionId**: `number`

Lowest regionId assigned to a corridor segment.

### fullRegionIds

> **fullRegionIds**: `Uint8Array`

Region-id array with unique IDs for every cell: room cells keep their
original IDs (1..maxRoomId), corridor cells have IDs starting at
`firstCorridorRegionId`, wall cells are 0.
Identical in content to `textures.regionId`.

### rooms

> **rooms**: `Map`\<`number`, `RoomInfo`\>

Map from regionId → RoomInfo for every carved room AND every corridor segment.
Room entries have `type: "room"` and IDs matching textures.regionId values (1+).
Corridor entries have `type: "corridor"` and IDs starting at `firstCorridorRegionId`.
startRoomId and endRoomId are guaranteed keys.

### startRoomId

> **startRoomId**: `number`

Room ID furthest from endRoomId - used as the player spawn room.
