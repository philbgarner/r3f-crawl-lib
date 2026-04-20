// src/lib/dungeon/colliderFlags.ts
//
// Bitwise flags for per-cell collision and line-of-sight behaviour.
// Stored in the `colliderFlags` DataTexture (R8 format, one byte per cell).
// Default values are derived automatically from the `solid` texture by all
// dungeon generators.  Override individual bytes after generation to model
// pits, windows, transparent barriers, etc.

/** Normal volitional movement (walk, run) is permitted on this cell. */
export const IS_WALKABLE = 0x01;

/**
 * No entity may enter this cell by any means — forced or voluntary.
 * Solid walls carry this flag.  Pits do NOT: they can be entered via forced
 * movement (e.g. a shove) even though they are not IS_WALKABLE.
 */
export const IS_BLOCKED = 0x02;

/** Light and line-of-sight rays pass through this cell unobstructed. */
export const IS_LIGHT_PASSABLE = 0x04;

/**
 * Derive a collider-flags byte from a legacy `solid` mask value.
 *   solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
 *   solid  > 0  →  wall:   IS_BLOCKED                        (0x02)
 */
export function colliderFlagsFromSolid(solid: number): number {
  return solid === 0 ? IS_WALKABLE | IS_LIGHT_PASSABLE : IS_BLOCKED;
}

/**
 * Build a colliderFlags Uint8Array from a solid mask of the same length.
 * This is the default derivation used by all dungeon generators.
 */
export function buildColliderFlags(solidMask: Uint8Array): Uint8Array {
  const flags = new Uint8Array(solidMask.length);
  for (let i = 0; i < solidMask.length; i++) {
    flags[i] = colliderFlagsFromSolid(solidMask[i]!);
  }
  return flags;
}

/** Returns true when the cell may be entered by normal walking movement. */
export function isWalkableCell(flags: number): boolean {
  return (flags & IS_WALKABLE) !== 0 && (flags & IS_BLOCKED) === 0;
}

/** Returns true when no entity may enter this cell by any means. */
export function isBlockedCell(flags: number): boolean {
  return (flags & IS_BLOCKED) !== 0;
}

/** Returns true when light/LOS passes through this cell. */
export function isLightPassableCell(flags: number): boolean {
  return (flags & IS_LIGHT_PASSABLE) !== 0;
}
