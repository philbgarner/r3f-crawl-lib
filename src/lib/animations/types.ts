// src/lib/animations/types.ts
//
// Types for the turn-animation callback system.
//
// Animation events are a client-side-only layer on top of the turn loop.
// They carry EntityBase references and positional snapshots so developers
// can drive rendering effects (tweens, floating text, flashes) without
// coupling to internal actor state.

import type { EntityBase } from '../entities/types';

/** All event kinds that can be queued during a turn for animation callbacks. */
export type AnimationEventKind =
  | 'damage'
  | 'heal'
  | 'death'
  | 'move'
  | 'attack'
  | 'miss'
  | 'xp-gain';

export type AnimationEventMap = {
  /** An entity took damage. `actor` is who dealt it (if known). */
  damage: { entity: EntityBase; actor?: EntityBase; amount: number; effect?: string };
  /** An entity was healed. */
  heal: { entity: EntityBase; amount: number };
  /** An entity died. `actor` is who killed it (if known). */
  death: { entity: EntityBase; actor?: EntityBase };
  /** An entity moved from one cell to another. */
  move: { entity: EntityBase; from: { x: number; z: number }; to: { x: number; z: number } };
  /** An entity initiated an attack (resolved as hit or miss; see damage/miss for outcome). `actor` is the target. */
  attack: { entity: EntityBase; actor?: EntityBase };
  /** An attack missed. `actor` is who attacked. */
  miss: { entity: EntityBase; actor?: EntityBase };
  /** Player gained XP. */
  'xp-gain': { entity: EntityBase; amount: number };
};

export type AnimationQueueEntry = {
  [K in AnimationEventKind]: { kind: K } & AnimationEventMap[K];
}[AnimationEventKind];

export type AnimationHandler<K extends AnimationEventKind> = (
  event: AnimationEventMap[K],
) => Promise<void> | void;

/** Developer-facing handle exposed as game.animations. */
export type AnimationsHandle = {
  on<K extends AnimationEventKind>(kind: K, handler: AnimationHandler<K>): void;
  off<K extends AnimationEventKind>(kind: K, handler: AnimationHandler<K>): void;
  clear(kind: AnimationEventKind): void;
};
