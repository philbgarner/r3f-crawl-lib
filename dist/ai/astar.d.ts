import type { DungeonOutputs } from "../dungeon/bsp";
export type GridPos = {
    x: number;
    y: number;
};
export type AStarPath = {
    path: GridPos[];
    cost: number;
} | null;
export type AStar8Options = {
    /** Extra predicate: return true to treat (x,y) as impassable at runtime. */
    isBlocked?: (x: number, y: number) => boolean;
    /**
     * Extra movement cost added when entering cell (x, y).
     * Return 0 (or omit) for normal cost. Use positive values to discourage
     * but not forbid specific cells.
     */
    cellCost?: (x: number, y: number) => number;
    /** When true, restrict movement to 4 cardinal directions only (no diagonals). */
    fourDir?: boolean;
};
/**
 * Find the shortest 8-directional path from `start` to `goal`.
 *
 * @param dungeon     Dungeon outputs (used for grid dimensions only)
 * @param isWalkable  Walkability predicate
 * @param start       Starting grid position
 * @param goal        Target grid position
 * @param opts        Optional extra options (runtime blockers, per-cell costs)
 * @returns           Path from start to goal (inclusive) and total cost, or null if unreachable.
 */
export declare function aStar8(dungeon: DungeonOutputs, isWalkable: (x: number, y: number) => boolean, start: GridPos, goal: GridPos, opts?: AStar8Options): AStarPath;
//# sourceMappingURL=astar.d.ts.map