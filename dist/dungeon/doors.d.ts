export type DoorCandidate = {
    x: number;
    z: number;
    dx: number;
    dz: number;
    yaw: number;
    /** Region ID of the room this opening leads into. */
    roomId: number;
    /** All threshold cells in this opening, sorted along the corridor axis. */
    groupCells: {
        x: number;
        z: number;
    }[];
    /** Index into groupCells that is the chosen door position (median). */
    midIdx: number;
};
export type DoorRecord = {
    id: string;
    x: number;
    z: number;
    yaw: number;
    /**
     * Key ID that locks/unlocks this door. -1 means the door is not lockable
     * by a key — only by scripted triggers.
     */
    keyId: number;
    /** Region ID of the room this door guards. */
    roomId: number;
    locked: boolean;
    open: boolean;
};
/**
 * Finds door candidate locations: one per corridor-to-room opening, centered
 * in the opening. Corridor cells are identified as solid=0 with regionId=0;
 * room cells as solid=0 with regionId!=0.
 */
export declare function findDoorCandidates(regionIdData: Uint8Array, solidData: Uint8Array, W: number, H: number): DoorCandidate[];
/**
 * Walls off all non-door cells in a door opening group plus the two flanking
 * corridor cells beside the door. Modifies solidData and colliderFlagsData
 * in-place; the caller is responsible for marking textures as needsUpdate.
 */
export declare function wallOffDoorGroup(candidate: DoorCandidate, solidData: Uint8Array, colliderFlagsData: Uint8Array, regionIdData: Uint8Array, W: number, H: number): void;
//# sourceMappingURL=doors.d.ts.map