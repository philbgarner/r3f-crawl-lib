// src/lib/entities/factory.ts
//
// Lightweight entity factories. Each produces a correctly-typed EntityBase with
// an auto-generated id. No DEFAULT_MONSTER_TEMPLATES — callers supply all opts.

import type { EntityBase, EntityKind, SpriteMap } from "./types";
import type { RpsEffect } from "./effects";

let _nextEntityId = 1;

function nextId(prefix: string): string {
  return `${prefix}_${_nextEntityId++}`;
}

// --------------------------------
// Shared option helpers
// --------------------------------

type BaseOpts = {
  type: string;
  sprite: string | number;
  x: number;
  z: number;
  faction?: string;
  spriteMap?: SpriteMap;
};

function makeBase(
  kind: EntityKind,
  opts: BaseOpts,
  overrides: Partial<EntityBase>,
): EntityBase {
  return {
    id: nextId(kind),
    kind,
    type: opts.type,
    sprite: opts.sprite,
    x: opts.x,
    z: opts.z,
    hp: 0,
    maxHp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    alive: true,
    blocksMove: false,
    faction: opts.faction ?? "none",
    tick: 0,
    ...(opts.spriteMap !== undefined ? { spriteMap: opts.spriteMap } : {}),
    ...overrides,
  };
}

// --------------------------------
// createNpc
// --------------------------------

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
export function createNpc(opts: NpcOpts): EntityBase {
  const maxHp = opts.maxHp ?? 10;
  return makeBase("npc", opts, {
    id: nextId("npc"),
    hp: opts.hp ?? maxHp,
    maxHp,
    attack: opts.attack ?? 0,
    defense: opts.defense ?? 0,
    speed: opts.speed ?? 5,
    blocksMove: opts.blocksMove ?? true,
  });
}

// --------------------------------
// createEnemy
// --------------------------------

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
  lastKnownPlayerPos: { x: number; y: number } | null;
};

/** Create an enemy entity. */
export function createEnemy(opts: EnemyOpts): EnemyEntity {
  const maxHp = opts.maxHp ?? 10;
  const base = makeBase("enemy", opts, {
    id: nextId("enemy"),
    hp: opts.hp ?? maxHp,
    maxHp,
    attack: opts.attack ?? 3,
    defense: opts.defense ?? 0,
    speed: opts.speed ?? 7,
    blocksMove: opts.blocksMove ?? true,
  });
  return {
    ...base,
    danger: opts.danger ?? 1,
    xp: opts.xp ?? 10,
    rpsEffect: opts.rpsEffect ?? "none",
    alertState: "idle",
    searchTurnsLeft: 0,
    lastKnownPlayerPos: null,
  };
}

// --------------------------------
// createDecoration
// --------------------------------

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
export function createDecoration(opts: DecorationOpts): DecorationEntity {
  const base = makeBase("decoration", opts, {
    id: nextId("decoration"),
    alive: false,
    blocksMove: opts.blocksMove ?? false,
    speed: 0,
  });
  return {
    ...base,
    yaw: opts.yaw ?? 0,
    scale: opts.scale ?? 1,
  };
}
