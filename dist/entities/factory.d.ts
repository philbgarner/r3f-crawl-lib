import { EntityBase, SpriteMap } from './types';
import { RpsEffect } from './effects';
type BaseOpts = {
    type: string;
    sprite: string | number;
    x: number;
    z: number;
    faction?: string;
    spriteMap?: SpriteMap;
};
/** Options for `createNpc()`. Extends the shared base (type, sprite, x, z). */
export type NpcOpts = BaseOpts & {
    /** Starting HP. Defaults to `maxHp`. */
    hp?: number;
    /** Maximum HP. Default: 10. */
    maxHp?: number;
    /** Attack stat. Default: 0 (non-combatant). */
    attack?: number;
    /** Defense stat. Default: 0. */
    defense?: number;
    /** Turn speed (lower = acts more often). Default: 5. */
    speed?: number;
    /** Whether this NPC blocks player movement. Default: `true`. */
    blocksMove?: boolean;
};
/** Create a friendly or neutral NPC entity. */
export declare function createNpc(opts: NpcOpts): EntityBase;
/** Options for `createEnemy()`. Extends the shared base (type, sprite, x, z). */
export type EnemyOpts = BaseOpts & {
    /** Starting HP. Defaults to `maxHp`. */
    hp?: number;
    /** Maximum HP. Default: 10. */
    maxHp?: number;
    /** Attack stat. Default: 3. */
    attack?: number;
    /** Defense stat. Default: 0. */
    defense?: number;
    /** Turn speed (lower = acts more often). Default: 7. */
    speed?: number;
    /** Whether this enemy blocks player movement. Default: `true`. */
    blocksMove?: boolean;
    /** 0–10 scale — influences detection radius and persistence. Default: 1. */
    danger?: number;
    /** XP awarded on kill. Default: 10. */
    xp?: number;
    rpsEffect?: RpsEffect;
};
/**
 * An EnemyEntity is an EntityBase with additional combat fields stored in
 * a typed extension. The core EntityBase fields cover hp/attack/defense/speed.
 */
export type EnemyEntity = EntityBase & {
    danger: number;
    xp: number;
    rpsEffect: RpsEffect;
    alertState: "idle" | "chasing" | "searching";
    searchTurnsLeft: number;
    lastKnownPlayerPos: {
        x: number;
        y: number;
    } | null;
};
/** Create an enemy entity. */
export declare function createEnemy(opts: EnemyOpts): EnemyEntity;
/** Options for `createDecoration()`. Extends the shared base (type, sprite, x, z). */
export type DecorationOpts = BaseOpts & {
    /** Whether this decoration blocks player movement. Default: `false`. */
    blocksMove?: boolean;
    /** Yaw rotation in radians. Default: 0. */
    yaw?: number;
    /** Uniform scale multiplier. Default: 1. */
    scale?: number;
};
/** A stationary decoration entity (torch, pillar, furniture, etc.). */
export type DecorationEntity = EntityBase & {
    yaw: number;
    scale: number;
};
/** Create a stationary decoration entity. Decorations are not alive in the turn sense. */
export declare function createDecoration(opts: DecorationOpts): DecorationEntity;
export {};
//# sourceMappingURL=factory.d.ts.map