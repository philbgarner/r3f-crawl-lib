import { ActorId } from './types';
/** Damage dealt to any actor. */
export type DamageEvent = {
    kind: "damage";
    actorId: ActorId;
    amount: number;
    x: number;
    y: number;
};
/** An attack that failed to land. */
export type MissEvent = {
    kind: "miss";
    actorId: ActorId;
    x: number;
    y: number;
};
/** An actor died. */
export type DeathEvent = {
    kind: "death";
    actorId: ActorId;
    sourceId?: ActorId;
    x: number;
    y: number;
};
/** Player gains XP after a kill. */
export type XpGainEvent = {
    kind: "xpGain";
    amount: number;
    x: number;
    y: number;
};
/** Any actor recovers HP. */
export type HealEvent = {
    kind: "heal";
    actorId: ActorId;
    amount: number;
    x: number;
    y: number;
};
/** Fires at the start of every turn. */
export type TurnTickEvent = {
    kind: "turn";
    turn: number;
};
/** Player reached the exit or a custom win condition fired. */
export type WinEvent = {
    kind: "win";
};
/** Game over. */
export type LoseEvent = {
    kind: "lose";
    reason: string;
};
/** Spatial audio cue. `position` is optional world-space [x, z]. */
export type AudioEvent = {
    kind: "audio";
    name: string;
    position?: [number, number];
};
export type TurnEvent = DamageEvent | MissEvent | DeathEvent | XpGainEvent | HealEvent | TurnTickEvent | WinEvent | LoseEvent | AudioEvent;
//# sourceMappingURL=events.d.ts.map