import { TurnScheduler } from "./scheduler";
import type { ActorId, PlayerActor, MonsterActor, TurnAction, ActionCost } from "./types";
import type { TurnEvent } from "./events";
export type DecideResult = {
    action: TurnAction;
    /** Partial patch applied to the monster before the action executes. */
    monsterPatch: Partial<MonsterActor>;
};
export type TurnSystemState = {
    actors: Record<ActorId, PlayerActor | MonsterActor>;
    playerId: ActorId;
    scheduler: TurnScheduler;
    awaitingPlayerInput: boolean;
    activeActorId: ActorId | null;
};
export type TurnSystemDeps = {
    isWalkable: (x: number, y: number) => boolean;
    /** AI callback: decide what a monster does this turn. */
    monsterDecide: (state: TurnSystemState, monsterId: ActorId) => DecideResult;
    /** Cost callback: how much time does this action cost? */
    computeCost: (actorId: ActorId, action: TurnAction) => ActionCost;
    /** Apply an action: returns new TurnSystemState. */
    applyAction: (state: TurnSystemState, actorId: ActorId, action: TurnAction, deps: TurnSystemDeps) => TurnSystemState;
    /**
     * Called whenever the scheduler advances to a new time (between actor turns).
     */
    onTimeAdvanced?: (args: {
        prevTime: number;
        nextTime: number;
        activeActorId: ActorId;
        state: TurnSystemState;
    }) => void;
    /**
     * Emit a game event (damage, death, xp gain, etc.) to the React layer.
     * Called synchronously — callers must NOT setState directly from here.
     */
    onEvent?: (event: TurnEvent) => void;
};
/**
 * Build the initial TurnSystemState from a player + monster list.
 */
export declare function createTurnSystemState(player: PlayerActor, monsters: MonsterActor[]): TurnSystemState;
/**
 * Advance the schedule until it is the player's turn.
 * Mutates the scheduler in-place; returns new state for actors/flags.
 */
export declare function tickUntilPlayer(state: TurnSystemState, deps: TurnSystemDeps): TurnSystemState;
/**
 * Commit the player's chosen action, advance the turn, then run monsters until
 * the player's next turn.
 *
 * Precondition: state.awaitingPlayerInput === true
 */
export declare function commitPlayerAction(state: TurnSystemState, deps: TurnSystemDeps, action: TurnAction): TurnSystemState;
/**
 * Default computeCost using actionDelay.
 */
export declare function defaultComputeCost(actorId: ActorId, action: TurnAction, actors: Record<ActorId, PlayerActor | MonsterActor>): ActionCost;
/**
 * Default applyAction: moves actor if dx/dy are set and target tile is walkable.
 * No game-specific side effects (no door-opening, item pickup, etc.) —
 * register an ActionPipeline middleware (see api/actions.ts) for those.
 */
export declare function defaultApplyAction(state: TurnSystemState, actorId: ActorId, action: TurnAction, deps: TurnSystemDeps): TurnSystemState;
/**
 * Stub monster AI: always waits. Replace with Phase 5 AI via deps.monsterDecide.
 */
export declare function waitAI(_state: TurnSystemState, _monsterId: ActorId): DecideResult;
//# sourceMappingURL=system.d.ts.map