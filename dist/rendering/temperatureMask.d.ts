import { BspDungeonOutputs } from '../dungeon/bsp';
import * as THREE from "three";
export type TemperatureMask = {
    /** Per-cell temperature, 0 = cold, 255 = hot. Backed by `texture`. */
    data: Uint8Array;
    /** THREE.DataTexture (RedFormat / UnsignedByteType) sharing `data`'s buffer. */
    texture: THREE.DataTexture;
    /**
     * Region-id map with corridor cells re-labelled into unique IDs.
     * Room cells keep their original IDs (1..maxRoomId).
     * Corridor cells have IDs starting at `firstCorridorRegionId`.
     * Wall cells are 0.
     */
    fullRegionIds: Uint8Array;
    /** Lowest regionId assigned to a corridor segment. */
    firstCorridorRegionId: number;
    /** Sorted list of every unique corridor regionId. */
    corridorRegionIds: number[];
};
/**
 * Builds a combined region-id array where corridor floor cells (regionId === 0
 * in the original texture) are flood-filled into unique IDs.
 *
 * Only needed when working with a plain `DungeonOutputs` that lacks the
 * pre-computed `fullRegionIds` field.  For `BspDungeonOutputs`, prefer
 * `buildTemperatureMask` which uses the already-computed data.
 */
export declare function buildFullRegionIds(regionIdData: Uint8Array, solidData: Uint8Array, W: number, H: number, firstId: number): {
    fullRegionIds: Uint8Array;
    corridorRegionIds: number[];
};
/**
 * Wraps the temperature data already computed by `generateBspDungeon` into a
 * `TemperatureMask` for convenient runtime updates.
 *
 * The returned `data` and `texture` point directly at the dungeon's existing
 * temperature buffer - no copy is made.
 */
export declare function buildTemperatureMask(dungeon: BspDungeonOutputs): TemperatureMask;
/**
 * Sets the temperature of every cell that belongs to `regionId`.
 *
 * Works for both room regionIds (1 .. maxRoomId) and corridor regionIds
 * (firstCorridorRegionId+).
 *
 * @param mask        The TemperatureMask to modify
 * @param W           Dungeon width
 * @param H           Dungeon height
 * @param regionId    The region to update (room or corridor ID)
 * @param temperature Value in [0, 255]; 255 = hottest, 0 = coldest
 */
export declare function setRegionTemperature(mask: TemperatureMask, W: number, H: number, regionId: number, temperature: number): void;
/**
 * Convenience alias for setting a room's temperature by its roomId.
 * Room regionIds are unchanged from the original BSP output (values 1..maxRoomId).
 */
export declare const setRoomTemperature: typeof setRegionTemperature;
/**
 * Convenience alias for setting a corridor segment's temperature.
 * `corridorRegionId` must be one of the values in `mask.corridorRegionIds`.
 */
export declare const setCorridorTemperature: typeof setRegionTemperature;
/**
 * Builds a standalone TemperatureMask from raw dungeon arrays, for use with
 * plain `DungeonOutputs` that lack `fullRegionIds`.  Defaults all floor cells
 * to `defaultTemperature` (127 if not specified).
 */
export declare function buildTemperatureMaskFromArrays(regionIdData: Uint8Array, solidData: Uint8Array, W: number, H: number, maxRoomId: number, defaultTemperature?: number): TemperatureMask;
//# sourceMappingURL=temperatureMask.d.ts.map