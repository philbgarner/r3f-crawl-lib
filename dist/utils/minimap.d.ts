import type { BspDungeonOutputs } from "../dungeon/bsp";
export type MinimapState = {
    width: number;
    height: number;
    /** 1 = explored at some point; 0 = never seen. Persists across turns. */
    explored: Uint8Array;
    /** 1 = currently visible this turn; 0 = not visible. Reset each turn. */
    visible: Uint8Array;
};
/**
 * Build the initial minimap state for a new dungeon.
 * Pre-explores the start room (endRoomId), the first monster's room, and the
 * corridor path connecting them — matching the classic roguelike "you know
 * where you started" reveal.
 */
export declare function createMinimapState(dungeon: BspDungeonOutputs): MinimapState;
/**
 * Merge an FOV result into the minimap state (mutates in place).
 * Pass the visible mask produced by `computeFov` / `createVisibilityMask`.
 */
export declare function updateExplored(state: MinimapState, fovResult: Uint8Array): void;
//# sourceMappingURL=minimap.d.ts.map