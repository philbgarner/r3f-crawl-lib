import type { EntityBase } from "../entities/types";
import type { EventEmitter } from "../events/eventEmitter";
import type { FactionRegistry } from "./factions";
/**
 * A damage formula receives attacker and defender and returns the raw damage
 * amount (before any clamping). Return 0 to signal a miss (the 'miss' event
 * will be emitted instead of 'damage').
 */
export type DamageFormula = (attacker: EntityBase, defender: EntityBase) => number;
/** Default formula: max(1, attacker.attack − defender.defense). Never misses. */
export declare const defaultDamageFormula: DamageFormula;
export type ResolveCombatOptions = {
    attacker: EntityBase;
    defender: EntityBase;
    /** Damage formula. Defaults to defaultDamageFormula. */
    formula?: DamageFormula;
    /** Faction registry used to check hostility. If omitted, the attack always proceeds. */
    factions?: FactionRegistry;
    /** EventEmitter to fire 'damage', 'miss', and 'death' events. */
    emit: EventEmitter;
};
export type CombatResult = {
    outcome: "blocked";
} | {
    outcome: "miss";
} | {
    outcome: "hit";
    damage: number;
    defenderDied: boolean;
};
/**
 * Resolve one attack from `attacker` against `defender`.
 *
 * - If `factions` is provided and attacker is NOT hostile to defender, returns `{ outcome: "blocked" }`.
 * - If the formula returns 0, emits `miss` and returns `{ outcome: "miss" }`.
 * - Otherwise emits `damage` (and `death` if hp drops to 0) and returns `{ outcome: "hit", ... }`.
 *
 * The returned `defenderDied` flag reflects whether hp reached 0; the caller is
 * responsible for updating entity state (this function is pure/side-effect-free
 * aside from the EventEmitter calls).
 */
export declare function resolveCombat({ attacker, defender, formula, factions, emit, }: ResolveCombatOptions): CombatResult;
//# sourceMappingURL=combat.d.ts.map