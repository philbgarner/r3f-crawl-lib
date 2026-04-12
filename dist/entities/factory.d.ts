import { EntityBase } from './types';
import { RpsEffect } from './effects';
type BaseOpts = {
    type: string;
    sprite: string | number;
    x: number;
    z: number;
    faction?: string;
};
export type NpcOpts = BaseOpts & {
    hp?: number;
    maxHp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    blocksMove?: boolean;
};
/** Create a friendly or neutral NPC entity. */
export declare function createNpc(opts: NpcOpts): EntityBase;
export type EnemyOpts = BaseOpts & {
    hp?: number;
    maxHp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    blocksMove?: boolean;
    /** 0–10 scale — influences detection radius and persistence. */
    danger?: number;
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
export type DecorationOpts = BaseOpts & {
    blocksMove?: boolean;
    /** Yaw rotation in radians. */
    yaw?: number;
    /** Uniform scale multiplier. */
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