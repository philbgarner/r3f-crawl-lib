import type { HiddenPassage } from "../entities/types";
export declare const PASSAGE_NONE = 0;
export declare const PASSAGE_DISABLED = 1;
export declare const PASSAGE_ENABLED = 2;
/** Write all cells of a passage into the mask. Use PASSAGE_NONE to erase. */
export declare function stampPassageToMask(mask: Uint8Array, width: number, passage: HiddenPassage, value: 0 | 1 | 2): void;
/** Enable a passage in the mask (stamp with PASSAGE_ENABLED). */
export declare function enablePassageInMask(mask: Uint8Array, width: number, passage: HiddenPassage): void;
/** Disable a passage in the mask (stamp with PASSAGE_DISABLED). */
export declare function disablePassageInMask(mask: Uint8Array, width: number, passage: HiddenPassage): void;
/**
 * Build the initial mask from an array of HiddenPassage objects.
 * All passages start disabled.
 */
export declare function buildPassageMask(width: number, height: number, passages: HiddenPassage[]): Uint8Array;
//# sourceMappingURL=mask.d.ts.map