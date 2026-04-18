import { EntityBase } from '../entities/types';
import { PackedAtlas } from './textureLoader';
import * as THREE from "three";
export type AngleKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export interface SpriteLayer {
    /** Atlas tile: string name (resolved via resolver) or numeric tile index. */
    tile: string | number;
    /** Horizontal offset from billboard center, in world units. Default 0. */
    offsetX?: number;
    /** Vertical offset from billboard center, in world units. Default 0. */
    offsetY?: number;
    /** Uniform scale multiplier. Default 1. */
    scale?: number;
    /** Alpha multiplier [0,1]. Default 1. */
    opacity?: number;
}
export interface AngleOverride {
    /** Which layer index this override targets. */
    layerIndex: number;
    /** Replacement tile for this angle: string name or numeric tile index. */
    tile: string | number;
    /** Replacement opacity (optional). */
    opacity?: number;
}
/**
 * Describes how to render an entity as a camera-facing billboard.
 * Presence of this field on an EntityBase switches the renderer from
 * box geometry to billboard quads.
 */
export interface SpriteMap {
    /** Pixel dimensions of a single sprite cell in the atlas. */
    frameSize: {
        w: number;
        h: number;
    };
    /** Ordered layers composited back-to-front (index 0 = bottommost). */
    layers: SpriteLayer[];
    /**
     * Per-angle layer overrides. Key is a cardinal/intercardinal direction.
     * When the viewer's bearing falls within 45° of a key, that override
     * takes precedence over the base layer for the targeted layer index.
     */
    angles?: Partial<Record<AngleKey, AngleOverride[]>>;
}
export interface BillboardHandle {
    /** Update position, orientation, and angle-variant uniforms each frame. */
    update(entity: EntityBase, cameraYaw: number, tileSize: number, ceilingH: number): void;
    /** Remove meshes from scene and dispose GPU resources. */
    dispose(): void;
}
/**
 * Create a per-entity billboard handle. Call `handle.update()` each RAF frame.
 * The atlas texture should already be created and cached by the caller.
 */
export declare function createBillboard(entity: EntityBase & {
    spriteMap: SpriteMap;
}, packedAtlas: PackedAtlas, scene: THREE.Scene, resolver?: (name: string) => number): BillboardHandle;
//# sourceMappingURL=billboardSprites.d.ts.map