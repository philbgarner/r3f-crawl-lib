import { GridPos } from './astar';
export type SpatialShape = "chebyshev" | "euclidean" | "manhattan";
/**
 * Returns all grid positions within `radius` of (cx, cy) using the chosen metric.
 * Does NOT perform bounds-checking - callers are responsible for clamping.
 *
 * "chebyshev"  - square neighbourhood, the standard roguelike "range"
 * "euclidean"  - circular neighbourhood
 * "manhattan"  - diamond neighbourhood
 */
export declare function tilesInRadius(cx: number, cy: number, radius: number, shape?: SpatialShape): GridPos[];
/**
 * Returns all grid positions in a cone originating at (ox, oy).
 * directionRad: angle in radians (0 = east, positive = counter-clockwise in math coords).
 * halfAngle: half-width of the cone in radians (e.g. Math.PI/4 for a 90° cone).
 * range: Chebyshev reach.
 */
export declare function tilesInCone(ox: number, oy: number, directionRad: number, halfAngle: number, range: number): GridPos[];
/**
 * Returns all grid cells intersected by a Bresenham line from `from` to `to`,
 * inclusive of both endpoints. Useful for projectile paths and area scans.
 */
export declare function tilesInLine(from: GridPos, to: GridPos): GridPos[];
/**
 * Callback variant of tilesInRadius - avoids allocating an array.
 * Calls visit(x, y) for each cell; return false from visit to stop early.
 */
export declare function visitTilesInRadius(cx: number, cy: number, radius: number, visit: (x: number, y: number) => boolean | void, shape?: SpatialShape): void;
//# sourceMappingURL=spatial.d.ts.map