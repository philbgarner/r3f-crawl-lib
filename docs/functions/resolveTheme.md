[atomic-core](../README.md) / resolveTheme

# Function: resolveTheme()

> **resolveTheme**(`selector`, `ctx`): [`ThemeDef`](../type-aliases/ThemeDef.md)

Defined in: [dungeon/themes.ts:94](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/dungeon/themes.ts#L94)

Resolve a ThemeSelector to a theme name for a given room.
Falls back to "dungeon" if the resolved key is not in the registry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `selector` | [`ThemeSelector`](../type-aliases/ThemeSelector.md) |
| `ctx` | \{ `rng`: () => `number`; `roomId`: `number`; \} |
| `ctx.rng` | () => `number` |
| `ctx.roomId` | `number` |

## Returns

[`ThemeDef`](../type-aliases/ThemeDef.md)
