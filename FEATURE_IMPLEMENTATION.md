# Feature Implementation Plan

Organizes the migration work from `FEATURE_SOURCE_MIGRATION.md` into sequential development phases.
Each phase groups files that share the same dependency level so work within a phase can proceed in parallel.
Phase N must be complete before Phase N+1 begins.

Cross-references:
- **Migration:** `FEATURE_SOURCE_MIGRATION.md` → "Per-feature migration" section (L77–L332)
- **Sources:** `FEATURE_SOURCE_MAP.md` → per-feature source tables

---

## Phase 1 — Foundation utilities ✅ COMPLETE

**Goal:** Pure, dependency-free helpers that every other module imports.
No libold React code; no Three.js. No game constants.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/utils/rng.ts` | `src/libold/src/gameUtils.ts` → `makeRng()` | Migration: Supporting utilities |
| `src/lib/utils/geometry.ts` | `src/libold/roguelike-mazetools/src/bspHelpers.ts` (`MinHeap<T>`, `octile()`); `src/libold/src/gameUtils.ts` (`hasLineOfSight`, `cardinalDir`, `normalizeUvRect`) | Migration: Supporting utilities; BSP generator |
| `src/lib/events/eventEmitter.ts` | New — no libold source | Migration: Events (L282–L316) |

### What "done" looks like
- `makeRng(seed)` returns a deterministic `() => number` function
- `MinHeap<T>`, `octile()`, `hasLineOfSight()`, `cardinalDir()`, `normalizeUvRect()` exported from geometry
- `createEventEmitter()` returns a typed `EventEmitter` with `on`, `off`, `emit`; `GameEventMap` covers all events listed in the README Events section (damage, death, xp-gain, heal, miss, chest-open, item-pickup, turn, win, lose, audio)

### Dependencies
None.

---

## Phase 2 — Turn system types and scheduler

**Goal:** The pure turn machinery — types, cost math, the priority queue, and the event payload types.
No entity logic yet; no game rules.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/turn/types.ts` | `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` | Migration: Turn-based scheduler (L123) |
| `src/lib/turn/actionCosts.ts` | `src/libold/roguelike-mazetools/src/turn/actionCosts.ts` | Migration: Turn-based scheduler (L137) |
| `src/lib/turn/scheduler.ts` | `src/libold/roguelike-mazetools/src/turn/turnScheduler.ts` | Migration: Turn-based scheduler (L129) |
| `src/lib/turn/events.ts` | `src/libold/roguelike-mazetools/src/turn/turnEvents.ts`; extend with framework events | Migration: Turn-based scheduler (L138); Events (L282) |
| `src/lib/turn/system.ts` | `src/libold/roguelike-mazetools/src/turn/turnSystem.ts` | Migration: Turn-based scheduler (L131) |
| `src/lib/api/actions.ts` | `src/libold/roguelike-mazetools/src/actions.ts` | Migration: Supporting utilities |

### Key changes from libold
- Move `RpsEffect` out of `turnTypes.ts` → it will live in `entities/effects.ts` (Phase 4); leave a re-export stub in `turn/types.ts` until Phase 4 is complete
- Strip `defaultApplyAction` of all game-specific logic (door-opening, item pickup) — keep only the movement/wait/attack dispatch skeleton as an extensible default
- `turn/system.ts` exposes `createTurnSystemState`, `tickUntilPlayer`, `commitPlayerAction`, `defaultComputeCost`

### What "done" looks like
- `TurnScheduler` schedules, cancels, and reschedules actors correctly
- `tickUntilPlayer` runs until the next player turn without executing any game-specific side effects
- `TurnEvent` union type covers all event shapes including the new framework events

### Dependencies
- Phase 1 (uses `EventEmitter` from events module)

---

## Phase 3 — Dungeon generation

**Goal:** Produce `DungeonOutputs` from either BSP procedural generation or a Tiled JSON map.
No entity spawning or rendering yet — just the grid data.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/dungeon/bsp.ts` | `src/libold/roguelike-mazetools/src/bsp.ts` | Migration: BSP dungeon generator (L95) |
| `src/lib/dungeon/cellular.ts` | `src/libold/roguelike-mazetools/src/cellular.ts` | Migration: BSP dungeon generator (L104) |
| `src/lib/dungeon/serialize.ts` | `src/libold/roguelike-mazetools/src/serialize.ts` | Migration: BSP dungeon generator (L108) |
| `src/lib/dungeon/themes.ts` | `src/libold/src/themes.ts` | Migration: BSP dungeon generator (L106); Atlas surface painting (L250) |
| `src/lib/atlas/atlas.ts` | `src/libold/roguelike-mazetools/src/atlas.ts` | Migration: Atlas surface painting (L244) |

### Key changes from libold
- `dungeon/bsp.ts`: remove imports of `gameConstants.ts`; default theme/tile values must come from `dungeon/themes.ts` lookups, not hardcoded UV arrays
- `dungeon/themes.ts`: export `registerTheme(name, ThemeDef)` alongside the built-in `THEMES` record; the `themes` config field resolution (string | string[] | callback) lives here
- `atlas/atlas.ts`: remove any implicit knowledge of specific category names; the shape is determined entirely by the developer's `atlas.json`
- `FLOOR_TILE_MAP`, `WALL_TILE_MAP`, `CEILING_TILE_MAP` from `gameConstants.ts` are **not ported** — these are derived at runtime via `buildAtlasIndex(atlasJson)`

### What "done" looks like
- `generateBspDungeon(options)` returns a valid `BspDungeonOutputs` including all `DataTexture` channels
- `generateCellularDungeon(options)` returns a compatible `CellularDungeonOutputs`
- `serializeDungeon` / `deserializeDungeon` round-trip cleanly
- `buildAtlasIndex(atlasJson)` resolves names to entries for any arbitrary atlas JSON

### Dependencies
- Phase 1 (`MinHeap`, `octile` from `utils/geometry.ts`; `makeRng` from `utils/rng.ts`)

---

## Phase 4 — Entity types and status effects

**Goal:** Shared entity interfaces used by every subsequent module — entity base, decorations, items, inventory, and status effects.
No game logic yet, just types and lightweight factories.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/entities/types.ts` | `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` (`ActorBase`, `PlayerActor`, `MonsterActor`); `src/libold/roguelike-mazetools/src/content.ts` (`ObjectPlacement`, `MobilePlacement`, `HiddenPassage`) | Migration: Entity system (L140); Sprite billboard (L168); Hidden passages (L207) |
| `src/lib/entities/effects.ts` | `src/libold/roguelike-mazetools/src/effects.ts`; `RpsEffect` from `turnTypes.ts` | Migration: Three-faction combat (L163) |
| `src/lib/entities/inventory.ts` | `src/libold/roguelike-mazetools/src/Inventory/inventory.ts` | Migration: Chest drops (L195); Entity system (L151) |
| `src/lib/entities/factory.ts` | `src/libold/roguelike-mazetools/src/turn/createActors.ts` (without `DEFAULT_MONSTER_TEMPLATES`) | Migration: Entity system (L149); Callback-driven spawning (L220); Stationary decorations (L231) |

### Key changes from libold
- `entities/types.ts` merges `ActorBase`/`MonsterActor` with `MobilePlacement` into the unified entity base described in the README (`id`, `kind`, `type`, `sprite`, `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed`, `alive`, `blocksMove`, `faction`, `tick`)
- `entities/factory.ts` exports `createNpc(opts)`, `createEnemy(opts)`, `createDecoration(opts)` — **`DEFAULT_MONSTER_TEMPLATES` is deleted**
- `entities/inventory.ts` adds `createItem(opts)` factory and `rollLoot(lootTable, rng)` helper for chest drop resolution
- `RpsEffect` fully moves here from `turn/types.ts`; update the Phase 2 re-export stub

### What "done" looks like
- `createNpc`, `createEnemy`, `createDecoration`, `createItem` each produce correctly-typed objects with auto-generated `id`
- `rollLoot` correctly applies `chance` probability
- `applyEffect` and `tickEffects` work against any entity carrying an `ActiveEffect[]`
- No game-specific entity types exist anywhere in the framework

### Dependencies
- Phase 1 (`makeRng`)
- Phase 2 (`ActorBase`, `TurnActionKind`)

---

## Phase 5 — AI and spatial reasoning

**Goal:** Pathfinding, field of view, spatial queries, and the default monster AI decision loop.
These are pure algorithms; they receive dungeon data and return decisions — no mutation.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/ai/astar.ts` | `src/libold/roguelike-mazetools/src/astar.ts` | Migration: Supporting utilities |
| `src/lib/ai/fov.ts` | `src/libold/roguelike-mazetools/src/fov.ts` | Migration: Minimap (L183); Supporting utilities |
| `src/lib/ai/spatial.ts` | `src/libold/roguelike-mazetools/src/spatial.ts` | Migration: Supporting utilities |
| `src/lib/ai/monsterAI.ts` | `src/libold/roguelike-mazetools/src/turn/monsterAI.ts` | Migration: Callback-driven spawning (L225); Supporting utilities |
| `src/lib/utils/minimap.ts` | `src/libold/src/gameUtils.ts` → `buildInitialExploredMask()`; uses `ai/fov.ts` | Migration: Minimap (L183) |

### Key changes from libold
- `ai/monsterAI.ts` is the **default** AI used when an entity has no custom `ai` state machine. The entity `ai: { initial, states, transitions }` config object (README Entities section) is the primary extension point — the framework's turn dispatcher calls the active state function each tick
- `utils/minimap.ts` exports `createMinimapState(dungeon)` and `updateExplored(state, fovResult)`; rendering to a 2D canvas is deferred to the `attachMinimap` API call in Phase 9

### What "done" looks like
- `aStar8` finds shortest paths through a dungeon grid and respects dynamic obstacles
- `computeFov` produces a correct visibility mask from a given position and radius
- `decideChasePlayer` returns a valid `TurnAction` for a chasing monster
- Custom `ai` state machine on an entity is correctly invoked instead of the default AI

### Dependencies
- Phase 1 (`MinHeap`, `octile` from `utils/geometry.ts`)
- Phase 2 (`TurnAction` type)
- Phase 3 (`DungeonOutputs` grid shape)
- Phase 4 (`Entity` type for AI context)

---

## Phase 6 — Combat and factions

**Goal:** Faction registry, damage resolution, and status effect application — extracted from `useGameState.ts` into a standalone, configurable module.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/combat/factions.ts` | `src/libold/roguelike-mazetools/src/factions.ts` | Migration: Three-faction combat (L155) |
| `src/lib/combat/combat.ts` | `src/libold/src/hooks/useGameState.ts` (combat resolution slice) | Migration: Three-faction combat (L165) |

### Key changes from libold
- `combat.ts` exports `resolveCombat({ attacker, defender, formula, factions, emit })` — the damage formula and `onDamage`/`onDeath`/`onMiss` callbacks come from the developer's `combat` config object
- Default faction table (`player` hostile to `enemy`; `npc` hostile to `enemy`; `enemy` hostile to `player` and `npc`) is the built-in default for `createFactionRegistryFromTable()` but is fully overridable via `combat.factions` in `createGame()` options
- XP gain and loot drop on death are **events emitted**, not logic inside `combat.ts` — the developer handles them in `game.events.on('death')`

### What "done" looks like
- `resolveCombat` correctly applies the formula, checks faction hostility, emits `damage`, `miss`, `death` events via `EventEmitter`
- `createFactionRegistry()` / `createFactionRegistryFromTable()` allow arbitrary faction graphs
- No hardcoded faction names inside combat logic

### Dependencies
- Phase 1 (`EventEmitter`)
- Phase 2 (`TurnEvent` shapes)
- Phase 4 (`Entity`, `ActiveEffect`, `applyEffect`)

---

## Phase 7 — Hidden passages and Tiled import

**Goal:** Passage traversal state machine and mask; plus the Tiled JSON → `DungeonOutputs` conversion.
These depend on the dungeon grid shape (Phase 3) and entity types (Phase 4).

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/passages/mask.ts` | `src/libold/roguelike-mazetools/src/rendering/hiddenPassagesMask.ts` | Migration: Hidden passages (L207) |
| `src/lib/passages/traversal.ts` | `src/libold/roguelike-mazetools/src/turn/passageTraversal.ts` | Migration: Hidden passages (L209) |
| `src/lib/dungeon/tiled.ts` | `src/libold/src/hooks/useDungeonSetup.ts` (Tiled path) | Migration: Tiled map import (L110) |

### Key changes from libold
- `dungeon/tiled.ts` exports `loadTiledMap(tiledJson, options)` returning `DungeonOutputs`; the `layers`, `objectTypes`, and `tilesetMap` maps come entirely from developer config — no built-in layer name assumptions
- `passages/traversal.ts` is copy-as-is; `startPassageTraversal`, `consumePassageStep`, `cancelPassageTraversal` remain pure state functions
- `HiddenPassage` interface lives in `entities/types.ts` (Phase 4); both passage files import from there

### What "done" looks like
- `loadTiledMap` correctly populates `solid`, `floorType`, `wallType`, `ceilingType`, and `overlays` channels from a Tiled JSON export
- Tiled object layer entities are converted to typed placements using the developer-supplied `objectTypes` map
- `buildPassageMask` correctly initialises passage state from `HiddenPassage[]`
- `startPassageTraversal` → repeated `consumePassageStep` → player arrives at exit cell

### Dependencies
- Phase 3 (`DungeonOutputs`, `BspDungeonOutputs`)
- Phase 4 (`HiddenPassage`, `ObjectPlacement`)
- Phase 5 (`aStar8` for passage routing)

---

## Phase 8 — Rendering layer

**Goal:** Atlas UV lookup, GLSL torch lighting, first-person camera, and the temperature/surface mask.
These are the Three.js-coupled modules — everything that touches `DataTexture` or shader strings.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/rendering/tileAtlas.ts` | `src/libold/roguelike-mazetools/src/rendering/tileAtlas.ts` | Migration: Atlas surface painting (L248); First-person rendering (L90) |
| `src/lib/rendering/torchLighting.ts` | `src/libold/roguelike-mazetools/src/rendering/torchLighting.ts` | Migration: First-person rendering (L83) |
| `src/lib/rendering/camera.ts` | `src/libold/roguelike-mazetools/src/rendering/useDungeonCamera.ts`; `src/libold/src/hooks/useEotBCamera.ts` | Migration: First-person rendering (L85, L87) |
| `src/lib/rendering/temperatureMask.ts` | `src/libold/roguelike-mazetools/src/rendering/temperatureMask.ts` | Migration: Atlas surface painting (L258) |

### Key changes from libold
- `rendering/camera.ts` merges both camera hooks into plain classes/factories: `createCamera(options)` for first-person with wall-sliding; `createEotBCamera(options)` as an alternative. No React hooks. `moveLerpMs` and `fov` are constructor options matching `rendering.camera` config.
- `rendering/torchLighting.ts`: `DEFAULT_TORCH_COLOR`, `DEFAULT_TORCH_INTENSITY`, `DEFAULT_BAND_NEAR` become named exports forming a `defaultTorchConfig` object; all values are overridable via `rendering.torch` in `createGame()` options
- `rendering/temperatureMask.ts`: copy as-is; exposed as an optional rendering detail via `rendering.lightingShader.uniforms` override
- `TILE_SIZE` / `CEILING_H` from `gameConstants.ts` become `rendering.tileSize` config (default: `3`)

### What "done" looks like
- `buildTileAtlas(atlasData)` produces correct normalised UV entries for any atlas JSON
- `makeTorchUniforms(config)` produces a valid Three.js uniform map
- `createCamera({ fov, moveLerpMs, tileSize })` updates position with wall-sliding on each frame
- All GLSL shader exports compile without errors in a test scene

### Dependencies
- Phase 1 (`normalizeUvRect` from `utils/geometry.ts`)
- Phase 3 (`DungeonOutputs` for collision grid access in camera)
- Phase 4 (entity billboard UV fields)

---

## Phase 9 — Public API wiring

**Goal:** Assemble all modules into the `game` handle and implement the `CrawlLib.*` attach functions.
This is where the imperative developer-facing API from the README is built.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/api/player.ts` | `src/libold/src/player.ts`; player slice of `useGameState.ts` | Migration: Entity system (L142) |
| `src/lib/api/keybindings.ts` | `src/libold/src/hooks/useEotBCamera.ts` (`MoveActions`); key handler from `useGameState.ts` | Migration: Configurable keybindings (L259) |
| `src/lib/api/createGame.ts` | New — no libold source | Migration: New files (L345) |

### Responsibilities of `createGame.ts`

`CrawlLib.createGame(canvas, options)` must:

1. Parse and validate options (dungeon, player, rendering, combat, passages, turns)
2. Call `generateBspDungeon` or `loadTiledMap` depending on config
3. Instantiate: `TurnScheduler`, `TurnSystem`, `FactionRegistry`, `Camera`, `EventEmitter`, minimap state
4. Build the `game.player` handle (action methods + reactive getters)
5. Wire combat: `resolveCombat` is called from inside `applyAction` with callbacks from `combat` config
6. Wire passage toggle/traversal with `onToggle` / `onTraverse` callbacks
7. Wire `onPlace` / `dungeon.decorations.add` / `dungeon.paint` / `dungeon.passages.toggle`
8. Return the full `game` handle with: `player`, `turns`, `dungeon`, `events`

### Attach functions wired in `createGame.ts`

| Function | What it wires |
|---|---|
| `CrawlLib.attachMinimap(game, canvas, opts)` | Calls `createMinimapState`; registers a `turn` event listener that redraws the canvas |
| `CrawlLib.attachSpawner(game, { onSpawn })` | Registers callback; called by game loop when evaluating spawn points |
| `CrawlLib.attachDecorator(game, { onDecorate })` | Registers callback; called per tile during dungeon setup |
| `CrawlLib.attachSurfacePainter(game, { onPaint })` | Registers callback; called per tile during dungeon setup; result written to `overlays` texture |
| `CrawlLib.attachKeybindings(game, { bindings, onAction })` | Adds `keydown` listener on `document`; dispatches to `onAction(action, event)` |

### What "done" looks like
- `createGame(canvas, options)` returns a game handle matching the README API surface table (L480–L495)
- `game.turns.commit(game.player.move(1, 0))` triggers a full turn cycle including monster AI ticks
- `game.events.on('damage', handler)` fires correctly when combat resolves
- `game.dungeon.decorations.add/remove/list` work imperatively
- `game.dungeon.paint/unpaint` update the overlay texture in real time
- `attachMinimap` renders explored tiles and entity positions onto a 2D canvas

### Dependencies
- All previous phases (Phase 1–8)

---

## Phase 10 — Public surface and audio events

**Goal:** Export the complete `CrawlLib` namespace; wire audio event emission throughout all modules; validate the full README API.

### Files to create

| Target | Source | Migration ref |
|---|---|---|
| `src/lib/index.ts` | New — no libold source | Migration: New files (L354) |

### Audio event wiring

No dedicated audio source exists in libold. Add `emit('audio', { name, position })` calls at the following points:

| Trigger point | Audio event name | Module |
|---|---|---|
| Player moves to new tile | `footstep` | `api/player.ts` |
| Attack lands | `hit` | `combat/combat.ts` |
| Entity dies | `death` | `combat/combat.ts` |
| XP collected | `xp-pickup` | `api/createGame.ts` |
| Item picked up | `item-pickup` | `entities/inventory.ts` |
| Chest opened | `chest-open` | `api/createGame.ts` |
| Door interacted with | `door-open` | `api/createGame.ts` |
| Passage toggled | `passage-toggle` | `passages/traversal.ts` |

### `index.ts` exports

```ts
export {
  createGame,
  attachMinimap,
  attachSpawner,
  attachDecorator,
  attachSurfacePainter,
  attachKeybindings,
} from './api/createGame'

export { createNpc, createEnemy, createDecoration } from './entities/factory'
export { createItem }                                from './entities/inventory'
export { buildTilesetMap }                           from './dungeon/tiled'

// Type exports
export type { GameEventMap, EventEmitter }           from './events/eventEmitter'
export type { DungeonOutputs, BspDungeonOutputs }    from './dungeon/bsp'
export type { Entity, Decoration, HiddenPassage }    from './entities/types'
export type { Item, InventorySlot }                  from './entities/inventory'
export type { TurnAction, TurnActionKind }            from './turn/types'
```

### What "done" looks like
- `import CrawlLib from 'r3f-crawl-lib'` exposes the full API table from README L480–L495
- `game.events.on('audio', handler)` fires for every audio trigger listed above
- A minimal smoke-test page (script tag, no build step) runs without errors using the Quick Start example from README L101–L159

### Dependencies
- Phase 9 (all modules assembled)

---

## Phase summary

| Phase | Area | Key deliverables | Depends on |
|---|---|---|---|
| 1 | Foundation | `utils/rng`, `utils/geometry`, `events/eventEmitter` | — |
| 2 | Turn system | `turn/types`, `turn/scheduler`, `turn/system`, `turn/actionCosts`, `turn/events`, `api/actions` | 1 |
| 3 | Dungeon generation | `dungeon/bsp`, `dungeon/cellular`, `dungeon/serialize`, `dungeon/themes`, `atlas/atlas` | 1 |
| 4 | Entity types | `entities/types`, `entities/effects`, `entities/inventory`, `entities/factory` | 1, 2 |
| 5 | AI & spatial | `ai/astar`, `ai/fov`, `ai/spatial`, `ai/monsterAI`, `utils/minimap` | 1, 2, 3, 4 |
| 6 | Combat | `combat/factions`, `combat/combat` | 1, 2, 4 |
| 7 | Passages & Tiled | `passages/mask`, `passages/traversal`, `dungeon/tiled` | 3, 4, 5 |
| 8 | Rendering | `rendering/tileAtlas`, `rendering/torchLighting`, `rendering/camera`, `rendering/temperatureMask` | 1, 3, 4 |
| 9 | API wiring | `api/player`, `api/keybindings`, `api/createGame` | 1–8 |
| 10 | Public surface | `index.ts` + audio event wiring | 9 |
