import { DungeonOutputs } from './bsp';
import * as THREE from "three";
export type { DungeonOutputs };
export type GridPos = {
    x: number;
    y: number;
};
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
export type CellularDungeonOutputs = DungeonOutputs & {
    /**
     * The largest connected floor region, chosen as the playable area.
     * Cells outside it are re-solidified so the output is always fully connected.
     */
    textures: {
        solid: THREE.DataTexture;
        /** Region flood-fill ID per cell - 0 = wall, 1 = the single remaining region. */
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
    };
    /** Floor cell closest to the centroid of the largest region - good spawn point. */
    startPos: GridPos;
};
/**
 * Generate a cellular-automata cave dungeon.
 * Unlike BSP, there is no explicit room graph; use regionId for flood-fill regions.
 * Pass the output directly to generateContent() as it shares the same texture layout.
 */
export declare function generateCellularDungeon(options: CellularOptions): CellularDungeonOutputs;
//# sourceMappingURL=cellular.d.ts.map