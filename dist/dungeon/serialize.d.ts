import { BspDungeonOptions, BspDungeonOutputs } from './bsp';
/**
 * Plain, JSON-safe snapshot of a dungeon's mutable texture data.
 * Immutable generation inputs are stored so the dungeon can be fully
 * reconstructed without the original options object.
 */
export type SerializedDungeon = {
    version: 1;
    width: number;
    height: number;
    seed: number;
    startRoomId: number;
    endRoomId: number;
    firstCorridorRegionId: number;
    /** Base64-encoded Uint8Array for each texture channel. */
    solid: string;
    regionId: string;
    distanceToWall: string;
    hazards: string;
    colliderFlags: string;
};
/**
 * Snapshot all mutable texture data into a JSON-safe object.
 * Call after generateContent() to capture placed content (doors, hazards, etc.).
 */
export declare function serializeDungeon(dungeon: BspDungeonOutputs): SerializedDungeon;
/**
 * Reconstruct a BspDungeonOutputs from a snapshot.
 * The returned object is fully usable with generateContent, aStar8, computeFov, etc.
 * The `rooms` map is empty - call rehydrateDungeon() if room graph data is needed.
 */
export declare function deserializeDungeon(data: SerializedDungeon): BspDungeonOutputs;
/**
 * Full rehydration: deserializes texture data AND reconstructs the room graph
 * by re-running BSP with the stored seed. Rooms will be identical because
 * generation is deterministic.
 */
export declare function rehydrateDungeon(data: SerializedDungeon, originalOptions: Omit<BspDungeonOptions, "seed">): BspDungeonOutputs;
/**
 * Convenience: serialize a dungeon to a JSON string.
 */
export declare function dungeonToJson(dungeon: BspDungeonOutputs): string;
/**
 * Convenience: deserialize a dungeon from a JSON string.
 * The `rooms` map will be empty; use rehydrateDungeon() for full restoration.
 */
export declare function dungeonFromJson(json: string): BspDungeonOutputs;
//# sourceMappingURL=serialize.d.ts.map