// src/lib/entities/types.ts
//
// Unified entity base for all game entities (players, NPCs, enemies, decorations).
// Merges ActorBase/MonsterActor (turn system) with MobilePlacement (content system).

import type { SpriteMap } from "../rendering/billboardSprites";
export type { SpriteMap } from "../rendering/billboardSprites";

// --------------------------------
// Core entity types
// --------------------------------

export type EntityKind = "player" | "npc" | "enemy" | "decoration";

/**
 * Unified base for every game entity.
 *
 * Engine fields (id, kind, faction, spriteName, x, z, alive, blocksMove, speed,
 * tick, spriteMap) are explicitly typed. All game-specific attributes — hp,
 * maxHp, attack, defense, xp, etc. — are stored via the index signature and
 * typed as `unknown`; cast them to the concrete type your game uses.
 */
export type EntityBase = {
  id: string;
  /** Category of entity. */
  kind: EntityKind;
  /** Faction id used for stance/combat resolution. */
  faction: string;
  /** Sprite atlas name resolved through the tile-atlas resolver in the renderer. */
  spriteName: string;
  x: number;
  /** Ground-plane axis (maps to world Z in the 3-D renderer). */
  z: number;
  /** >0; higher speed = acts more often in the turn scheduler. */
  speed: number;
  alive: boolean;
  blocksMove: boolean;
  /** Turn-scheduler tick counter; incremented by the scheduler on each action. */
  tick: number;
  /**
   * When present, switches the dungeon renderer from box geometry to a
   * camera-facing billboard quad with layered sprite support.
   */
  spriteMap?: SpriteMap;
  /** Developer-defined attributes (hp, maxHp, attack, xp, etc.). */
  [key: string]: unknown;
};

// --------------------------------
// Alert state (used by enemy entities)
// --------------------------------

/**
 * Alert state machine:
 *   idle      – unaware of player
 *   chasing   – actively pursuing
 *   searching – lost sight; counting down before giving up
 */
export type MonsterAlertState = "idle" | "chasing" | "searching";

// --------------------------------
// Placement types (content pipeline)
// --------------------------------

/** A static object placed in the world (chest, lever, torch, etc.). */
export interface ObjectPlacement {
  /** Grid column (2-D grid X). */
  x: number;
  /** Grid row (2-D grid Y → world Z). */
  z: number;
  /** Factory key resolved by the renderer's ObjectRegistry. */
  type: string;
  /** Fine-grained world-space offset from cell centre (in cell units). */
  offsetX?: number;
  offsetZ?: number;
  offsetY?: number;
  /** Yaw rotation in radians. */
  yaw?: number;
  /** Uniform scale multiplier. */
  scale?: number;
  /** Arbitrary metadata for game logic. */
  meta?: Record<string, unknown>;
  /**
   * When present, renders this placement as a camera-facing billboard sprite
   * via the dungeon renderer's `setObjects()` method.
   */
  spriteMap?: SpriteMap;
}

/** A mobile (billboard sprite) placed in the world. */
export interface MobilePlacement {
  x: number;
  z: number;
  type: string;
  /** Tile index into the SpriteAtlas texture. Used as fallback when uvRectBody is absent. */
  tileId: number;
  /**
   * Explicit UV rect [x, y, w, h] in normalized (0–1) texture space for the body layer.
   */
  uvRectBody?: [number, number, number, number];
  /**
   * Explicit UV rect for the head layer, rendered on top with a bobbing animation.
   */
  uvRectHead?: [number, number, number, number];
  /** When true, the head bobbing animation is suppressed. */
  unconscious?: boolean;
  /** Current satiation value; used to determine face state (angry when ≤ 0). */
  satiation?: number;
  /**
   * Billboard geometry size in map cells [width, height].
   * A map cell is 3×3 world units. Defaults to [1, 1].
   */
  geometrySize?: [number, number];
  /**
   * RGBA outline colour [r, g, b, a] in 0–1 range.
   */
  outlineColor?: [number, number, number, number];
  meta?: Record<string, unknown>;
}

/** A hidden passage connecting two dungeon regions through wall cells. */
export interface HiddenPassage {
  /** Unique id within this dungeon floor. */
  id: number;
  /** Entry cell (floor cell adjacent to the tunnel entrance). */
  start: { x: number; y: number };
  /** Exit cell (floor cell at the far end of the tunnel). */
  end: { x: number; y: number };
  /**
   * Ordered list of cells from start to end (inclusive of both endpoints).
   */
  cells: Array<{ x: number; y: number }>;
  /** Whether the passage can currently be used. Toggled by lever/button. */
  enabled: boolean;
}
