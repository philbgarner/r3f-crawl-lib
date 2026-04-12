# Feature Source

Maps each feature to the files in `src/lib` that implement it. Use this as a lookup guide when working on or debugging a specific system.

---

## Directory structure

```
src/lib/
  dungeon/
    bsp.ts
    cellular.ts
    serialize.ts
    tiled.ts
    themes.ts
  turn/
    scheduler.ts
    system.ts
    types.ts
    actionCosts.ts
    events.ts
  entities/
    types.ts
    factory.ts
    inventory.ts
    effects.ts
  ai/
    monsterAI.ts
    astar.ts
    fov.ts
    spatial.ts
  combat/
    combat.ts
    factions.ts
  passages/
    traversal.ts
    mask.ts
  rendering/
    dungeonRenderer.ts
    torchLighting.ts
    camera.ts
    tileAtlas.ts
    temperatureMask.ts
  atlas/
    atlas.ts
  events/
    eventEmitter.ts
  utils/
    rng.ts
    geometry.ts
    minimap.ts
  api/
    createGame.ts
    player.ts
    actions.ts
    keybindings.ts
  transport/
    types.ts
    websocket.ts
  index.ts
```

---

## Feature map

---

### First-person 3D dungeon rendering with torch lighting and fog

**Files:**
- `rendering/dungeonRenderer.ts` — main Three.js scene, render loop, shader uniforms
- `rendering/torchLighting.ts` — torch color, intensity, and banding constants; per-frame light computation
- `rendering/camera.ts` — camera state, `tryMove` wall-collision logic, lerp movement, EotB-style movement as secondary export
- `rendering/tileAtlas.ts` — UV coordinate helpers for sampling wall/floor/ceiling tiles from the atlas texture
- `rendering/temperatureMask.ts` — optional per-region temperature tinting, passed as a shader uniform

---

### BSP dungeon generator

**Files:**
- `dungeon/bsp.ts` — BSP tree split, room placement, corridor carving, `setupDungeon()`, `DungeonOutputs` shape
- `dungeon/cellular.ts` — cellular automata generator producing the same `DungeonOutputs` shape
- `dungeon/serialize.ts` — serialize/deserialize a `DungeonOutputs` to JSON
- `dungeon/themes.ts` — `ThemeDef` type, built-in themes (dungeon, crypt, catacomb, industrial, ruins), `registerTheme()`
- `utils/geometry.ts` — `MinHeap<T>`, `octile()` used internally by BSP helpers

---

### Tiled map import

**Files:**
- `dungeon/tiled.ts` — `loadTiledMap(tiledJson, options)` returning `DungeonOutputs`; layer-name mapping comes from caller config
- `entities/types.ts` — `ObjectPlacement`, `MobilePlacement`, `HiddenPassage` interfaces consumed by the Tiled parser

---

### Turn-based scheduler with priority queue

**Files:**
- `turn/scheduler.ts` — `TurnScheduler` class with priority queue; no game dependencies
- `turn/system.ts` — `createTurnSystemState()`, `tickUntilPlayer()`, `commitPlayerAction()`, `defaultComputeCost()`
- `turn/types.ts` — `ActorBase`, `PlayerActor`, `MonsterActor`, shared turn types
- `turn/actionCosts.ts` — default action cost table
- `turn/events.ts` — `TurnEvent` union including `damage`, `death`, `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio`
- `api/actions.ts` — `createActionPipeline()`, `ActionMiddleware`, `ActionContext`; extension point for `turns.commit()`

---

### Entity system: player, NPCs, enemies, items, chests

**Files:**
- `api/player.ts` — reactive player handle (`x`, `z`, `hp`, `facing`, `inventory`, `alive`), action methods (`move`, `rotate`, `interact`, `wait`, `pickup`, `useItem`, `dropItem`, `heal`)
- `entities/types.ts` — unified entity base interface (`id`, `kind`, `type`, `sprite`, `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed`, `alive`, `blocksMove`, `faction`, `tick`), `Decoration`, `ObjectPlacement`, `MobilePlacement`, `HiddenPassage`
- `entities/factory.ts` — `createNpc()`, `createEnemy()`, `createDecoration()`, `createMonstersFromMobiles()` (internal Tiled helper)
- `entities/inventory.ts` — `Item`, `ItemType`, `InventorySlot`, `createItem()`, `rollLoot()`
- `entities/effects.ts` — `ActiveEffect`, `applyEffect()`, `tickEffects()`, `StackMode`, `RpsEffect`

---

### Three-faction combat model

**Files:**
- `combat/factions.ts` — `FactionRegistry`, `FactionStance`, `createFactionRegistry()`, `createFactionRegistryFromTable()`; default table: player/npc hostile to enemy, enemy hostile to player/npc
- `combat/combat.ts` — `resolveCombat({ attacker, defender, formula, factions, emit })`; damage formula, faction check, death handling, event emission
- `entities/effects.ts` — `RpsEffect` and status effect application called from combat resolution
- `turn/events.ts` — `DamageEvent`, `MissEvent`, `DeathEvent`, `XpGainEvent`, `HealEvent` emitted by combat

---

### Sprite billboard rendering with body/head layers

**Files:**
- `atlas/atlas.ts` — `AtlasData`, `AtlasEntry`, `AtlasSpriteEntry`, `AtlasTypedEntry`, `AtlasIndex`, `buildAtlasIndex()`
- `entities/types.ts` — `uvRectBody`, `uvRectHead`, `tileIndex`, `suppressBob` fields on entity billboard data
- `utils/geometry.ts` — `normalizeUvRect()` pure utility

---

### Minimap with entity overlays

**Files:**
- `utils/minimap.ts` — `createMinimapState(dungeon)`, explored mask (`Uint8Array`), `updateExplored(fovResult)`; `CrawlLib.attachMinimap(game, canvas, opts)` renders to a 2D canvas
- `ai/fov.ts` — `computeFov()`, `createVisibilityMask()`; used for minimap reveal and AI line-of-sight

---

### Chest drops and item pickups

**Files:**
- `entities/inventory.ts` — `rollLoot(lootTable, rng)` for chest drop resolution; `Item`, `ItemType`, `InventorySlot`
- `entities/types.ts` — optional `drop: { id, name, chance }` field on enemy entities
- `api/createGame.ts` — chest open → roll loot → emit `chest-open` event; developer's handler calls `game.player.pickup(itemId)`

---

### Hidden passage traversal

**Files:**
- `passages/traversal.ts` — `startPassageTraversal()`, `consumePassageStep()`, `cancelPassageTraversal()`, `PassageTraversalState`
- `passages/mask.ts` — `buildPassageMask()`, `enablePassageInMask()`, `disablePassageInMask()`, `stampPassageToMask()`
- `entities/types.ts` — `HiddenPassage` interface
- `api/createGame.ts` — `game.dungeon.passages` object; `toggle(id)`, `.list`, `passageNear(x, z)` API methods

---

### Callback-driven enemy spawning

**Files:**
- `entities/factory.ts` — `createNpc()`, `createEnemy()`, `createMonstersFromMobiles()` internal helper; no built-in monster templates
- `api/createGame.ts` — `CrawlLib.attachSpawner(game, { onSpawn })`; game loop calls `onSpawn({ dungeon, roomId, x, y })` and adds returned entities via `turns.addActor()`

---

### Stationary decoration entities

**Files:**
- `entities/types.ts` — `Decoration` interface (`id`, `kind: 'decoration'`, `type`, `x`, `z`, `sprite`, `blocksMove`, `blocksView`, `interactive`, `onInteract`)
- `entities/factory.ts` — `createDecoration()` factory with auto-generated `id`
- `api/createGame.ts` — `CrawlLib.attachDecorator(game, { onDecorate })`; `game.dungeon.decorations.add()`, `.remove()`, `.list`

---

### Atlas surface painting (walls, floors, ceilings per-tile)

**Files:**
- `atlas/atlas.ts` — `buildAtlasIndex(atlasJson)` resolves all atlas tile IDs at runtime from the developer's own atlas file
- `dungeon/bsp.ts` — `floorType`, `wallType`, `ceilingType`, `overlays`, `wallOverlays` channels in `DungeonOutputs`; `onPaint` callback result written into these channels
- `rendering/tileAtlas.ts` — tile UV lookup at render time
- `dungeon/themes.ts` — theme resolution writes initial floor/wall/ceiling type IDs into `DungeonOutputs` textures
- `api/createGame.ts` — `CrawlLib.attachSurfacePainter(game, { onPaint })`; `game.dungeon.paint(x, z, layers)` / `unpaint(x, z)`

---

### Configurable keybindings

**Files:**
- `api/keybindings.ts` — `KeyBinding` map (`Record<string, string[]>`), default binding set, `attachKeybindings(game, { bindings, onAction })` adds/removes a `keydown` listener on `document`

---

### Audio hooks

**Files:**
- `events/eventEmitter.ts` — emits `'audio'` event with `{ name, position }` at appropriate moments (footstep, hit, death); audio event name constants exported for discoverability
- `api/createGame.ts` — wires `game.events.on('audio', handler)` into the game handle

---

### Event system

**Files:**
- `events/eventEmitter.ts` — typed `EventEmitter` with `on`, `off`, `emit`; `GameEventMap` covering `damage`, `death`, `xp-gain`, `heal`, `miss`, `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio`
- All internal modules (`combat`, `inventory`, `passages`, `turn`) receive the emitter at construction time

---

### Supporting utilities

**Files:**
- `ai/astar.ts` — A* pathfinding
- `ai/fov.ts` — field-of-view computation and visibility mask
- `ai/spatial.ts` — spatial hash / proximity queries
- `ai/monsterAI.ts` — default chase behaviours (`decideChasePlayer`, `computeChasePathToPlayer`, `monsterAlertConfig`); developers supply custom AI via per-entity state machines
- `utils/rng.ts` — `makeRng(seed)` seeded PRNG
- `utils/geometry.ts` — `hasLineOfSight`, `cardinalDir`, `normalizeUvRect`, `MinHeap<T>`, `octile()`
- `utils/minimap.ts` — explored mask state and minimap canvas rendering

---

### Multiplayer action transport (optional middleware)

Dependency-injection layer that makes the server authoritative for all player actions. When `GameOptions.transport` is set, `game.turns.commit()` forwards actions to the server instead of applying them locally; the server validates each action, updates canonical state, and broadcasts a `ServerStateUpdate` to all connected clients. `createGame` registers a reconciliation handler on the transport that patches the local turn state and re-emits the `"turn"` event automatically. Single-player code paths are completely unaffected — zero overhead when no transport is provided.

**Files:**
- `transport/types.ts` — `ActionTransport` interface, `ServerStateUpdate`, `PlayerNetState`, `DungeonInitPayload`
- `transport/websocket.ts` — `createWebSocketTransport(url)` browser-side factory
- `api/createGame.ts` — `GameOptions.transport`, `PlayerOptions.id`, commit intercept, reconciliation wiring

**Server:**
- `src/server/index.js` — Express + `ws` authoritative server; generates the dungeon server-side from the host's config so the solid map and spawn position are authoritative; validates moves; broadcasts state to all room peers; serves the multiplayer example and static assets on a single port
- `src/server/dungeon-entry.ts` — thin build entry that re-exports `generateBspDungeon` for the server build
- `src/server/three-shim.js` — minimal `THREE.DataTexture` shim so `bsp.ts` runs in Node without a real GPU or browser context; only `image.data` is needed server-side
- `vite.config.server.ts` — separate Vite config that compiles the server dungeon module with `three` aliased to the shim; outputs `dist/server/dungeon.js`

**Example:**
- `examples/multiplayer/` — mirrors the basic example but connects to the server first; host sends solid data after `generate()`; other players rendered as billboard entities via `"network-state"` events

---

### Public API surface

**Files:**
- `api/createGame.ts` — `CrawlLib.createGame(canvas, options)`; instantiates all subsystems and returns the `game` handle
- `api/player.ts` — player handle and action methods
- `api/actions.ts` — action pipeline middleware
- `api/keybindings.ts` — DOM keybinding attachment
- `index.ts` — re-exports the public `CrawlLib` namespace: `createGame`, `attachMinimap`, `attachSpawner`, `attachDecorator`, `attachSurfacePainter`, `attachKeybindings`, `createNpc`, `createEnemy`, `createDecoration`, `createItem`, `buildTilesetMap`, `createWebSocketTransport`
