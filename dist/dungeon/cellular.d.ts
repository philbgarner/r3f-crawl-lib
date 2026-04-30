import { DungeonOutputs, RoomedDungeonOutputs } from './bsp';
import * as THREE from "three";
export type { DungeonOutputs, RoomedDungeonOutputs };
export type CellularOptions = {
    width: number;
    height: number;
    seed?: number | string;
    /** Initial wall fill probability. Default: 0.45 */
    fillProbability?: number;
    /** Number of smoothing passes. Default: 5 */
    iterations?: number;
    /**
     * A cell becomes wall if it has >= this many wall neighbours (Moore neighbourhood).
     * Default: 5
     */
    birthThreshold?: number;
    /**
     * A wall cell survives if it has >= this many wall neighbours. Default: 4
     */
    survivalThreshold?: number;
    keepOuterWalls?: boolean;
};
export type CellularDungeonOutputs = RoomedDungeonOutputs & {
    textures: {
        solid: THREE.DataTexture;
        /**
         * Voronoi region ID per cell — 0 = wall, 1..N = room IDs assigned by the
         * local-maxima Voronoi decomposition of the distanceToWall field.
         * Matches startRoomId / endRoomId and the keys in `rooms`.
         */
        regionId: THREE.DataTexture;
        distanceToWall: THREE.DataTexture;
        hazards: THREE.DataTexture;
        /** Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells. */
        temperature: THREE.DataTexture;
        floorType: THREE.DataTexture;
        overlays: THREE.DataTexture;
        wallType: THREE.DataTexture;
        wallOverlays: THREE.DataTexture;
        ceilingType: THREE.DataTexture;
        ceilingOverlays: THREE.DataTexture;
        colliderFlags: THREE.DataTexture;
        floorSkirtType: THREE.DataTexture;
        ceilSkirtType: THREE.DataTexture;
    };
};
/**
 * Generate a cellular-automata cave dungeon.
 * Unlike BSP, there is no explicit room graph; use regionId for flood-fill regions.
 * Pass the output directly to generateContent() as it shares the same texture layout.
 */
export declare function generateCellularDungeon(options: CellularOptions): CellularDungeonOutputs;
//# sourceMappingURL=cellular.d.ts.map