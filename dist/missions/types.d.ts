import { EventEmitter } from '../events/eventEmitter';
import { PlayerHandle } from '../api/player';
import { DungeonHandle } from '../api/createGame';
export type MissionStatus = 'active' | 'complete' | 'failed';
export type Mission = {
    /** Developer-assigned unique identifier. */
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly status: MissionStatus;
    /** Turn number at which the mission was completed. undefined while active. */
    readonly completedAt: number | undefined;
    /**
     * Arbitrary key/value bag owned by the developer. The evaluator and
     * onComplete callback can read and mutate this freely (e.g. incrementing a
     * kill counter across turns). Cast to a concrete shape in your evaluator.
     */
    metadata: Record<string, unknown>;
};
export type MissionContext = {
    /** Current turn number. */
    turn: number;
    /** Live player handle — position, hp, inventory, etc. */
    player: PlayerHandle;
    /** Live dungeon handle — rooms, outputs, decorations, etc. */
    dungeon: DungeonHandle;
    /** Game event emitter — subscribe to events from within the evaluator. */
    events: EventEmitter;
    /** Read-only snapshot of the mission being evaluated. */
    mission: Readonly<Mission>;
};
/**
 * Called once per turn for every active mission. Return `true` to mark the
 * mission as complete. Synchronous only — kick off any async work from
 * `onComplete` rather than here.
 */
export type MissionEvaluator = (ctx: MissionContext) => boolean;
/**
 * Optional callback invoked immediately after the mission transitions to
 * 'complete'. Use this to run bookkeeping, manipulate game state, update the
 * UI, log messages, or anything else that should happen exactly once when the
 * condition is met.
 */
export type MissionCompleteCallback = (mission: Mission) => void;
export type MissionDef = {
    /** Must be unique within the game session. */
    id: string;
    name: string;
    description?: string;
    /**
     * Evaluated once per turn. Return true when the mission condition is met.
     */
    evaluator: MissionEvaluator;
    /**
     * Called once, synchronously, when the evaluator first returns true.
     * Optional — omit if you only need the `mission-complete` event.
     */
    onComplete?: MissionCompleteCallback;
    /**
     * Seed data for the metadata bag. Evaluators can accumulate cross-turn state
     * here (e.g. `{ kills: 0 }`).
     */
    metadata?: Record<string, unknown>;
};
export type MissionsHandle = {
    /**
     * Register a new mission. The evaluator is called every turn until the
     * mission completes or is removed.
     */
    add(def: MissionDef): void;
    /**
     * Unregister a mission by ID. Has no effect if the mission does not exist.
     */
    remove(id: string): void;
    /** Retrieve a mission by ID. Returns undefined if not found. */
    get(id: string): Mission | undefined;
    /** All registered missions (active and complete). */
    readonly list: Mission[];
    /** Only missions whose status is 'active'. */
    readonly active: Mission[];
    /** Only missions whose status is 'complete'. */
    readonly completed: Mission[];
    /**
     * Internal: evaluate all active missions against the current turn context.
     * Called automatically by createGame — do not call this from userland.
     * @internal
     */
    _tick(ctx: MissionContext): void;
};
//# sourceMappingURL=types.d.ts.map