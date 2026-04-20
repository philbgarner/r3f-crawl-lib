/** Normal volitional movement (walk, run) is permitted on this cell. */
export declare const IS_WALKABLE = 1;
/**
 * No entity may enter this cell by any means — forced or voluntary.
 * Solid walls carry this flag.  Pits do NOT: they can be entered via forced
 * movement (e.g. a shove) even though they are not IS_WALKABLE.
 */
export declare const IS_BLOCKED = 2;
/** Light and line-of-sight rays pass through this cell unobstructed. */
export declare const IS_LIGHT_PASSABLE = 4;
/**
 * Derive a collider-flags byte from a legacy `solid` mask value.
 *   solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
 *   solid  > 0  →  wall:   IS_BLOCKED                        (0x02)
 */
export declare function colliderFlagsFromSolid(solid: number): number;
/**
 * Build a colliderFlags Uint8Array from a solid mask of the same length.
 * This is the default derivation used by all dungeon generators.
 */
export declare function buildColliderFlags(solidMask: Uint8Array): Uint8Array;
/** Returns true when the cell may be entered by normal walking movement. */
export declare function isWalkableCell(flags: number): boolean;
/** Returns true when no entity may enter this cell by any means. */
export declare function isBlockedCell(flags: number): boolean;
/** Returns true when light/LOS passes through this cell. */
export declare function isLightPassableCell(flags: number): boolean;
//# sourceMappingURL=colliderFlags.d.ts.map