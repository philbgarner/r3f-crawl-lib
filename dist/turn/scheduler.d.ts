import { ActorId } from './types';
export declare class TurnScheduler {
    private heap;
    private now;
    private seq;
    private cancelled;
    /** Schedule an actor to act at now + delay. */
    add(actorId: ActorId, delay: number): void;
    /** Lazily remove an actor from the schedule. */
    remove(actorId: ActorId): void;
    /** Re-add a cancelled actor (un-cancels it too). */
    restore(actorId: ActorId): void;
    /**
     * Pop the next actor whose turn it is.
     * Advances now to the actor's scheduled time.
     * Returns null if the schedule is empty.
     */
    next(): {
        actorId: ActorId;
        now: number;
    } | null;
    /** Re-schedule an actor after it has acted. */
    reschedule(actorId: ActorId, delay: number): void;
    getNow(): number;
    get size(): number;
}
//# sourceMappingURL=scheduler.d.ts.map