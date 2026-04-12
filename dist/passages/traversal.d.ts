import type { HiddenPassage } from "../entities/types";
export type PassageTraversalState = {
    kind: "idle";
} | {
    kind: "active";
    passageId: number;
    /** Remaining cells to walk (index 0 = next cell to step into). */
    remainingCells: Array<{
        x: number;
        y: number;
    }>;
};
/**
 * Begin a traversal from the player's current position.
 * Player must be standing at passage.start or passage.end.
 * Returns null if the player is not at either mouth.
 */
export declare function startPassageTraversal(passage: HiddenPassage, playerPos: {
    x: number;
    y: number;
}): PassageTraversalState | null;
/**
 * Consume the next step from an active traversal.
 * Returns the cell to move into and the updated state.
 */
export declare function consumePassageStep(state: PassageTraversalState & {
    kind: "active";
}): {
    cell: {
        x: number;
        y: number;
    };
    next: PassageTraversalState;
};
export declare function cancelPassageTraversal(): PassageTraversalState;
//# sourceMappingURL=traversal.d.ts.map