// Theme registry for dungeon generation.
// A ThemeDef maps a theme name to floor/wall/ceiling type names that match
// entries in the developer's atlas.json. Built-in themes serve as defaults;
// library consumers can add or override themes via registerTheme().

// --------------------------------
// Types
// --------------------------------

export type ThemeDef = {
  /** Name matching an entry in atlas.json `floorTypes`. */
  floorType: string;
  /** Name matching an entry in atlas.json `wallTypes`. */
  wallType: string;
  /** Name matching an entry in atlas.json `ceilingTypes`. */
  ceilingType: string;
};

/**
 * Theme selector for a dungeon config:
 * - string: a single theme key from the registry
 * - string[]: uniform random pick from the list each time a room is themed
 * - [string, number][]: weighted random pick (pairs of [key, weight])
 * - callback: called per room, receives the room id and an rng function
 */
export type ThemeSelector =
  | string
  | string[]
  | [string, number][]
  | ((ctx: { roomId: number; rng: () => number }) => string);

// --------------------------------
// Registry
// --------------------------------

const registry = new Map<string, ThemeDef>();

/** Built-in themes — available without calling registerTheme(). */
export const THEMES: Record<string, ThemeDef> = {
  dungeon: {
    floorType: "Cobblestone",
    wallType: "Cobblestone",
    ceilingType: "Cobblestone",
  },
  crypt: {
    floorType: "Flagstone",
    wallType: "Concrete",
    ceilingType: "Flagstone",
  },
  catacomb: {
    floorType: "Cobblestone",
    wallType: "Plaster",
    ceilingType: "Concrete",
  },
  industrial: {
    floorType: "Steel",
    wallType: "Concrete",
    ceilingType: "Steel",
  },
  ruins: {
    floorType: "Dirt",
    wallType: "Cobblestone",
    ceilingType: "Cobblestone",
  },
};

// Populate registry with built-ins on load
for (const [name, def] of Object.entries(THEMES)) {
  registry.set(name, def);
}

export const THEME_KEYS = Object.keys(THEMES);

/**
 * Register a custom theme (or override a built-in).
 * The `name` becomes a valid key for `ThemeSelector` string values.
 */
export function registerTheme(name: string, def: ThemeDef): void {
  registry.set(name, def);
}

/**
 * Retrieve a theme definition by name.
 * Returns `undefined` if the name is not registered.
 */
export function getTheme(name: string): ThemeDef | undefined {
  return registry.get(name);
}

/**
 * Resolve a ThemeSelector to a theme name for a given room.
 * Falls back to "dungeon" if the resolved key is not in the registry.
 */
export function resolveTheme(
  selector: ThemeSelector,
  ctx: { roomId: number; rng: () => number },
): ThemeDef {
  let key: string;

  if (typeof selector === "function") {
    key = selector(ctx);
  } else if (typeof selector === "string") {
    key = selector;
  } else if (selector.length === 0) {
    key = "dungeon";
  } else if (typeof selector[0] === "string") {
    // string[] — uniform random pick
    const arr = selector as string[];
    key = arr[Math.floor(ctx.rng() * arr.length)] ?? "dungeon";
  } else {
    // [string, number][] — weighted pick
    const weighted = selector as [string, number][];
    const total = weighted.reduce((s, [, w]) => s + w, 0);
    let r = ctx.rng() * total;
    key = weighted[weighted.length - 1]![0];
    for (const [k, w] of weighted) {
      r -= w;
      if (r <= 0) {
        key = k;
        break;
      }
    }
  }

  return registry.get(key) ?? registry.get("dungeon") ?? { floorType: "Cobblestone", wallType: "Cobblestone", ceilingType: "Cobblestone" };
}
