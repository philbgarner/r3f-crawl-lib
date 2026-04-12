import type { EntityBase } from "../entities/types";
import type { TurnAction } from "../turn/types";
import type { InventorySlot } from "../entities/inventory";
/** Mutable state bag that the player handle reads through. */
export type PlayerState = {
    entity: EntityBase;
    /** Current camera yaw in radians. */
    facing: number;
    inventory: InventorySlot[];
};
export type PlayerHandle = {
    readonly x: number;
    readonly z: number;
    readonly hp: number;
    readonly maxHp: number;
    /** Current facing yaw in radians. */
    readonly facing: number;
    readonly alive: boolean;
    readonly inventory: InventorySlot[];
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
/**
 * Wrap a live `PlayerState` in a `PlayerHandle`.
 * Mutate `state.entity`, `state.facing`, or `state.inventory` and the
 * getters will reflect those changes on the next read.
 */
export declare function createPlayerHandle(state: PlayerState): PlayerHandle;
//# sourceMappingURL=player.d.ts.map