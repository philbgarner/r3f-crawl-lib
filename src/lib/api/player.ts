// src/lib/api/player.ts
//
// Player handle — reactive getters + action method builders.
// Wraps a mutable PlayerState so all getters reflect live values without
// recreating the handle.  The turn system mutates playerState.entity in place;
// the handle reads through on every access.

import type { EntityBase } from "../entities/types";
import type { TurnAction } from "../turn/types";
import type { InventorySlot } from "../entities/inventory";

// ---------------------------------------------------------------------------
// PlayerState — mutable cell owned by createGame
// ---------------------------------------------------------------------------

/** Mutable state bag that the player handle reads through. */
export type PlayerState = {
  entity: EntityBase;
  /** Current camera yaw in radians. */
  facing: number;
  inventory: InventorySlot[];
};

// ---------------------------------------------------------------------------
// PlayerHandle — the public developer-facing API
// ---------------------------------------------------------------------------

export type PlayerHandle = {
  // Reactive state (reads from live PlayerState each call)
  readonly x: number;
  readonly z: number;
  readonly hp: number;
  readonly maxHp: number;
  /** Current facing yaw in radians. */
  readonly facing: number;
  readonly alive: boolean;
  readonly inventory: InventorySlot[];

  // Action builders — each returns a TurnAction; pass to turns.commit()
  move(dx: number, dz: number): TurnAction;
  /** Rotate by `angle` radians (positive = clockwise). */
  rotate(angle: number): TurnAction;
  interact(entityId: string | null): TurnAction;
  wait(): TurnAction;
  pickup(itemId: string): TurnAction;
  useItem(slotIndex: number): TurnAction;
  dropItem(slotIndex: number): TurnAction;

  /** Internal: direct access to the live state for the engine. Not part of the public API. */
  _state: PlayerState;
};

// ---------------------------------------------------------------------------
// createPlayerHandle
// ---------------------------------------------------------------------------

/**
 * Wrap a live `PlayerState` in a `PlayerHandle`.
 * Mutate `state.entity`, `state.facing`, or `state.inventory` and the
 * getters will reflect those changes on the next read.
 */
export function createPlayerHandle(state: PlayerState): PlayerHandle {
  return {
    get x()         { return state.entity.x; },
    get z()         { return state.entity.z; },
    get hp()        { return (state.entity as Record<string, unknown>).hp as number ?? 0; },
    get maxHp()     { return (state.entity as Record<string, unknown>).maxHp as number ?? 0; },
    get facing()    { return state.facing; },
    get alive()     { return state.entity.alive; },
    get inventory() { return state.inventory; },

    move(dx, dz) {
      return { kind: "move", dx, dy: dz };
    },

    rotate(angle) {
      return { kind: "interact", meta: { rotate: angle } };
    },

    interact(entityId) {
      return entityId != null
        ? { kind: "interact" as const, targetId: entityId }
        : { kind: "interact" as const };
    },

    wait() {
      return { kind: "wait" };
    },

    pickup(itemId) {
      return { kind: "interact", meta: { pickup: itemId } };
    },

    useItem(slotIndex) {
      return { kind: "interact", meta: { useItem: slotIndex } };
    },

    dropItem(slotIndex) {
      return { kind: "interact", meta: { dropItem: slotIndex } };
    },

    _state: state,
  };
}
