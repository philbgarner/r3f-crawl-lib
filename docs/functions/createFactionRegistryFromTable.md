[atomic-core](../README.md) / createFactionRegistryFromTable

# Function: createFactionRegistryFromTable()

> **createFactionRegistryFromTable**(`table`): [`FactionRegistry`](../type-aliases/FactionRegistry.md)

Defined in: [combat/factions.ts:58](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/combat/factions.ts#L58)

Convenience: build a registry from a stance table.

Example:
  createFactionRegistryFromTable([
    ["player", "enemy", "hostile"],
    ["enemy", "player", "hostile"],
  ])

## Parameters

| Parameter | Type |
| ------ | ------ |
| `table` | \[`string`, `string`, [`FactionStance`](../type-aliases/FactionStance.md)\][] |

## Returns

[`FactionRegistry`](../type-aliases/FactionRegistry.md)
