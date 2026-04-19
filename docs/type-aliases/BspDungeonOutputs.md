[atomic-core](../README.md) / BspDungeonOutputs

# Type Alias: BspDungeonOutputs

> **BspDungeonOutputs** = [`DungeonOutputs`](DungeonOutputs.md) & `object`

Defined in: [dungeon/bsp.ts:114](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/dungeon/bsp.ts#L114)

## Type Declaration

### endRoomId

> **endRoomId**: `number`

Room ID (matches regionId texture values) chosen as the dungeon exit. Has exactly 1 corridor connection.

### firstCorridorRegionId

> **firstCorridorRegionId**: `number`

Lowest regionId assigned to a corridor segment.

### fullRegionIds

> **fullRegionIds**: `Uint8Array`

Copy of the regionId pixel data with corridor floor cells re-labelled into
unique connected-component IDs (starting at `firstCorridorRegionId`).
textures.regionId is left unchanged (0 = corridor) for systems that rely on it.

### rooms

> **rooms**: `Map`\<`number`, `RoomInfo`\>

Map from regionId → RoomInfo for every carved room AND every corridor segment.
Room entries have `type: "room"` and IDs matching textures.regionId values (1+).
Corridor entries have `type: "corridor"` and IDs starting at `firstCorridorRegionId`.
startRoomId and endRoomId are guaranteed keys.

### startRoomId

> **startRoomId**: `number`

Room ID furthest from endRoomId - used as the player spawn room.
