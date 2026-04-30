[atomic-core](../README.md) / CombatResolver

# Type Alias: CombatResolver

> **CombatResolver** = (`attacker`, `defender`, `ctx`) => [`CombatResult`](CombatResult.md)

Defined in: [combat/combat.ts:60](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/combat/combat.ts#L60)

Developer-supplied combat resolution function.

Receives the attacker, defender, and engine context. Returns a `CombatResult`
describing what happened. The engine applies the result (hp reduction, alive
flag) after the resolver returns.

Because `EntityBase` uses an index signature for game-specific attributes,
cast to your concrete entity type inside the resolver:

```ts
type MyEntity = EntityBase & { hp: number; attack: number; defense: number };

const myResolver: CombatResolver = (attacker, defender, ctx) => {
  if (!ctx.factions.isHostile(attacker.faction, defender.faction)) {
    return { outcome: "blocked" };
  }
  const a = attacker as MyEntity;
  const d = defender as MyEntity;
  const damage = Math.max(1, a.attack - d.defense);
  const defenderDied = d.hp - damage <= 0;
  ctx.emit.emit("damage", { entity: defender, amount: damage });
  if (defenderDied) ctx.emit.emit("death", { entity: defender, killer: attacker });
  return { outcome: "hit", damage, defenderDied };
};
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `attacker` | [`EntityBase`](EntityBase.md) |
| `defender` | [`EntityBase`](EntityBase.md) |
| `ctx` | [`CombatResolverContext`](CombatResolverContext.md) |

## Returns

[`CombatResult`](CombatResult.md)
