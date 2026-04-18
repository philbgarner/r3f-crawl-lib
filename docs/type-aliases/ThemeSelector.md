[atomic-core](../README.md) / ThemeSelector

# Type Alias: ThemeSelector

> **ThemeSelector** = `string` \| `string`[] \| \[`string`, `number`\][] \| ((`ctx`) => `string`)

Defined in: [dungeon/themes.ts:26](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/dungeon/themes.ts#L26)

Theme selector for a dungeon config:
- string: a single theme key from the registry
- string[]: uniform random pick from the list each time a room is themed
- [string, number][]: weighted random pick (pairs of [key, weight])
- callback: called per room, receives the room id and an rng function
