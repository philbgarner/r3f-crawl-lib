import { DungeonOutputs } from './bsp';
import { ObjectPlacement } from '../entities/types';
/** Maps DungeonOutputs channel names to the Tiled layer name to source them from. */
export interface TiledLayerMap {
    solid?: string;
    regionId?: string;
    distanceToWall?: string;
    hazards?: string;
    temperature?: string;
    floorType?: string;
    overlays?: string;
    wallType?: string;
    wallOverlays?: string;
    ceilingType?: string;
    ceilingOverlays?: string;
}
export interface TiledMapOptions {
    /**
     * Maps each DungeonOutputs channel to a Tiled layer name in the JSON.
     * Channels with no entry are zero-filled.
     */
    layers: TiledLayerMap;
    /**
     * Maps Tiled tile GID (the integer stored in tilelayer data arrays) to the
     * byte value written into the corresponding channel.
     * GID 0 (empty cell) always writes 0, regardless of this map.
     */
    tilesetMap: Record<number, number>;
    /**
     * Maps the Tiled object `type` string to an ObjectPlacement `type` key.
     * Objects whose type is absent from this map are silently skipped.
     */
    objectTypes: Record<string, string>;
    /** Name of the Tiled object-group layer to parse for entity placements. */
    objectLayer?: string;
    /** Seed embedded verbatim in the returned DungeonOutputs. Defaults to 0. */
    seed?: number;
}
export interface TiledMapOutputs extends DungeonOutputs {
    /** Entity placements parsed from the configured object layer. */
    objectPlacements: ObjectPlacement[];
}
/**
 * Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
 * superset that also carries the parsed object placements).
 *
 * @param tiledJson  Raw object from `JSON.parse` of a Tiled .tmj / .json export.
 * @param options    Developer-supplied channel map, GID→value map, and object-type map.
 */
export declare function loadTiledMap(tiledJson: unknown, options: TiledMapOptions): TiledMapOutputs;
//# sourceMappingURL=tiled.d.ts.map