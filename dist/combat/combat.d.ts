import { EntityBase } from '../entities/types';
import { EventEmitter } from '../events/eventEmitter';
import { FactionRegistry } from './factions';
export type CombatResult = {
    outcome: "blocked";
} | {
    outcome: "miss";
} | {
    outcome: "hit";
    damage: number;
    defenderDied: boolean;
};
/** Context passed to every CombatResolver invocation. */
export type CombatResolverContext = {
    /** Event emitter for 'damage', 'miss', 'death', 'audio', etc. */
    emit: EventEmitter;
    /** Faction registry for hostility checks. */
    factions: FactionRegistry;
};
/**
 * Developer-supplied combat resolution function.
 *
 * Receives the attacker, defender, and engine context. Returns a `CombatResult`
 * describing what happened. The engine applies the result (hp reduction, alive
 * flag) after the resolver returns.
 *
 * Because `EntityBase` uses an index signature for game-specific attributes,
 * cast to your concrete entity type inside the resolver:
 *
 * ```ts
 * type MyEntity = EntityBase & { hp: number; attack: number; defense: number };
 *
 * const myResolver: CombatResolver = (attacker, defender, ctx) => {
 *   if (!ctx.factions.isHostile(attacker.faction, defender.faction)) {
 *     return { outcome: "blocked" };
 *   }
 *   const a = attacker as MyEntity;
 *   const d = defender as MyEntity;
 *   const damage = Math.max(1, a.attack - d.defense);
 *   const defenderDied = d.hp - damage <= 0;
 *   ctx.emit.emit("damage", { entity: defender, amount: damage });
 *   if (defenderDied) ctx.emit.emit("death", { entity: defender, killer: attacker });
 *   return { outcome: "hit", damage, defenderDied };
 * };
 * ```
 */
export type CombatResolver = (attacker: EntityBase, defender: EntityBase, ctx: CombatResolverContext) => CombatResult;
export type ResolveCombatOptions = {
    attacker: EntityBase;
    defender: EntityBase;
    /** Pre-computed damage amount (computed by the caller from entity stats). */
    damage: number;
    /** Current defender HP, used to determine whether the defender dies. */
    defenderHp: number;
    /** Faction registry used to check hostility. If omitted, the attack always proceeds. */
    factions?: FactionRegistry;
    /** EventEmitter to fire 'damage', 'miss', and 'death' events. */
    emit: EventEmitter;
};
/**
 * Low-level combat resolution utility.
 *
 * Performs the faction check, event emission, and outcome computation.
 * The caller is responsible for computing `damage` and reading `defenderHp`
 * from their entity shape.
 *
 * - If `factions` is provided and attacker is NOT hostile to defender, returns `{ outcome: "blocked" }`.
 * - If `damage <= 0`, emits `miss` and returns `{ outcome: "miss" }`.
 * - Otherwise emits `damage` (and `death` if hp drops to 0) and returns `{ outcome: "hit", … }`.
 *
 * The returned `defenderDied` reflects whether hp reached 0; the caller is
 * responsible for updating entity state (this function is side-effect-free
 * aside from the EventEmitter calls).
 */
export declare function resolveCombat({ attacker, defender, damage, defenderHp, factions, emit, }: ResolveCombatOptions): CombatResult;
//# sourceMappingURL=combat.d.ts.map