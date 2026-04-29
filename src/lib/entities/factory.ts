// src/lib/entities/factory.ts
//
// Single entity factory. No stat defaults — callers provide every attribute
// their game needs. The engine only cares about the explicitly typed fields on
// EntityBase; everything else is stored via the index signature.

import type { EntityBase, EntityKind, SpriteMap } from "./types";

let _nextEntityId = 1;

function nextId(prefix: string): string {
  return `${prefix}_${_nextEntityId++}`;
}

// --------------------------------
// createEntity
// --------------------------------

/**
 * Required and optional engine-level fields for createEntity().
 * Any additional keys (hp, maxHp, attack, xp, …) are passed through verbatim
 * and stored on the entity via its index signature.
 */
export type EntityCoreOpts = {
  /** Entity category — drives AI and rendering behaviour. */
  kind: EntityKind;
  /** Faction id used for stance/combat resolution. */
  faction: string;
  /** Sprite atlas name resolved through the tile-atlas resolver in the renderer. */
  spriteName: string;
  x: number;
  z: number;
  /** Whether this entity participates in the turn scheduler. Default: `true`. */
  alive?: boolean;
  /** Whether this entity blocks movement. Default: `false`. */
  blocksMove?: boolean;
  /** Turn priority; higher = acts more often. Default: `1`. */
  speed?: number;
  spriteMap?: SpriteMap;
};

/**
 * Create a game entity.
 *
 * Supply the engine-level fields via `EntityCoreOpts` plus any game-specific
 * attributes (hp, maxHp, attack, xp, …) as additional keys. All extra keys
 * are spread onto the returned entity verbatim and accessible via the index
 * signature on `EntityBase`.
 *
 * ```ts
 * const orc = createEntity({
 *   kind: "enemy", faction: "enemy", spriteName: "orc_idle", x: 8, z: 2,
 *   hp: 15, maxHp: 15, attack: 5, xp: 25,
 * });
 * ```
 */
export function createEntity(
  opts: EntityCoreOpts & Record<string, unknown>,
): EntityBase {
  const {
    kind, faction, spriteName, x, z,
    alive, blocksMove, speed, spriteMap,
    ...rest
  } = opts;

  return {
    id: nextId(kind),
    kind,
    faction,
    spriteName,
    x,
    z,
    alive: alive ?? true,
    blocksMove: blocksMove ?? false,
    speed: speed ?? 1,
    tick: 0,
    ...(spriteMap !== undefined ? { spriteMap } : {}),
    ...rest,
  };
}
