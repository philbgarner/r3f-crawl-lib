# Feature Source

Maps each feature to the files in `src/lib` that implement it. Use this as a lookup guide when working on or debugging a specific system.

---

## Directory structure

```
src/lib/
  rendering/
    dungeonRenderer.ts
    torchLighting.ts
    basicLighting.ts
    camera.ts
    tileAtlas.ts
    temperatureMask.ts
    billboardSprites.ts
    textureLoader.ts
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
  missions/
    types.ts
    missionSystem.ts
  transport/
    types.ts
    websocket.ts
  ui/
    inventoryDialog.ts
    inventoryDialog.css
  index.ts
```

---

## Feature map

---

### Texture Loader / Sprite Packer

Two-phase system: load phase fetches a source image and a TexturePacker-format atlas JSON, unpacks each named sprite (undoing packer `rotated: true` during blit), and shelf-packs sprites into a power-of-two `OffscreenCanvas`. Runtime phase exposes a `PackedAtlas` that maps string names → UV rects, with `getByName()` / `getById()` helpers and a `resolveSprite()` utility that accepts `string | number`. `toFaceRotation()` converts the optional per-frame `rotation` field (0/90/180/270° CW) to the `FaceRotation` index. `packedAtlasResolver()` wraps a `PackedAtlas` as a `(name: string) => number` resolver for `tileNameResolver`. `spriteToUvRect()` converts a `PackedSprite`'s canvas UV to a GL-convention `UvRect` (y=0 at bottom).

**Files:**
- `rendering/textureLoader.ts` — public types (`AtlasFrame`, `TextureAtlasJson`, `PackedSprite`, `PackedAtlas`, `LoadingOptions`, `UvRect`); `computeLayout()` shelf packer (POT, 2px padding, tallest-first sort); `blitSprite()` OffscreenCanvas blit with packer-rotation undo; `loadTextureAtlas()` orchestrates fetch → pack → blit → return; `injectOverlay()` full-screen loading screen; `resolveSprite()` name-or-id lookup helper; `toFaceRotation()` degree → FaceRotation index converter; `packedAtlasResolver()` creates a tile-name resolver; `spriteToUvRect()` converts canvas UV to GL `UvRect`

**Example:**
- `examples/standalone/texture-loader/index.html`
- `examples/standalone/texture-loader/texture-loader.js` — loads `textureAtlas.png` via embedded data URL, displays the baked packed texture, lists first 20 sprite names with UV coords, demonstrates `resolveSprite()` by name and id

---

### Billboarded sprite rendering for mobile entities

Camera-facing billboard quads driven by a multi-layer sprite system. Actors declare a `spriteMap` field; its presence switches the dungeon renderer from box geometry to billboard quads automatically. Supports up to N texture layers per billboard (independent `tile` as string name or numeric index, x/y offset, scale, opacity) and up to 8 viewing angles (N/NE/E/SE/S/SW/W/NW) with per-layer tile overrides. String tile names are resolved via the optional `resolver` parameter. The box fallback remains for entities without `spriteMap`.

**Files:**
- `rendering/billboardSprites.ts` — `SpriteMap`, `SpriteLayer` (`tile: string | number`), `AngleOverride` (`tile: string | number`), `AngleKey` public types; `createBillboard()` accepts optional `resolver` param, allocates per-layer `PlaneGeometry` meshes using a custom `ShaderMaterial` (GLSL UV atlas sampling, `uTileId`/`uOpacity` uniforms, alpha discard); `BillboardHandle.update()` rotates the group to face the camera each RAF frame, selects the active angle key, resolves tile names via `resolveTile()`, and pushes uniform updates; `BillboardHandle.dispose()` cleans up geometry and materials
- `rendering/dungeonRenderer.ts` — holds a `Map<string, BillboardHandle>` alongside `entityMeshMap`; `syncEntities()` routes entities with `spriteMap` to `createBillboard()` and others to the box path; RAF loop calls `handle.update()` with the current `curYaw`; `destroy()` disposes all billboard handles and the shared atlas texture
- `entities/types.ts` — `spriteMap?: SpriteMap` optional field added to `EntityBase`

**Example:**
- `examples/standalone/billboard-sprites/index.html`
- `examples/standalone/billboard-sprites/billboard-sprites.js` — goblin (2-layer body + weapon), skeleton (4-angle variants), slime (single tile)

---

### First-person 3D dungeon rendering with lighting and fog

**Files:**
- `rendering/dungeonRenderer.ts` — main Three.js scene, render loop, shader uniforms; `floorTile`/`ceilTile`/`wallTile` options accept `string | number` resolved via `tileNameResolver`; `LayerFaceResult.tile` is `string | number`; per-direction tile specs via `wallTiles`, `floorSkirtTiles`, `ceilSkirtTiles` options; public `addLayer(spec)` API for stacking additional instanced meshes on floors, ceilings, walls, or skirts with per-face filtering and deferred application; uses `basicLighting.ts` shaders; routes entities with `spriteMap` to `billboardSprites.ts` (passing resolver); exports `LayerTarget`, `LayerFaceResult`, `LayerSpec`, `LayerHandle`, `SpriteMap`
- `rendering/billboardSprites.ts` — see "Billboarded sprite rendering" feature entry above
- `rendering/basicLighting.ts` — minimal atlas and object shaders: texture sampling + linear fog; `aUvRotation` rotates UVs in 90° steps (0–3); `aUvHeightScale` clips UVs to the top fraction of a tile (top-aligned) so partial-height skirt panels keep brick aspect ratio; no torch flicker or tint bands; used by `dungeonRenderer.ts`
- `rendering/torchLighting.ts` — torch color, intensity, banding constants, and flickering GLSL chunks; available for custom renderers that want animated torch lighting
- `rendering/camera.ts` — camera state, `tryMove` wall-collision logic, lerp movement, EotB-style movement as secondary export
- `rendering/tileAtlas.ts` — UV coordinate helpers; exports `FaceRotation`, `FaceTileSpec` (`tile: string | number`), `DirectionFaceMap` types for per-face tile and rotation overrides; `resolveTile()` helper resolves string names via an optional resolver function
- `rendering/temperatureMask.ts` — optional per-region temperature tinting, passed as a shader uniform

---

### Ceiling and floor height offsets

**Files:**
- `dungeon/bsp.ts` — generates `floorHeightOffset` and `ceilingHeightOffset` R8 DataTextures (128 = no offset, 0 = pit marker for floor); encoding described in `DungeonOutputs`
- `rendering/dungeonRenderer.ts` — reads offset textures in `buildDungeon()`, populates `aHeightOffset` per-instance attribute; vertex shader applies the world-space Y offset; floor tiles with value 0 are omitted (pit)

---

### BSP dungeon generator

**Files:**
- `dungeon/bsp.ts` — BSP tree split, room placement, corridor carving, `setupDungeon()`, `DungeonOutputs` shape; produces `floorHeightOffset` and `ceilingHeightOffset` textures defaulting to 128
- `dungeon/cellular.ts` — cellular automata generator producing the same `DungeonOutputs` shape
- `dungeon/serialize.ts` — serialize/deserialize a `DungeonOutputs` to JSON
- `dungeon/themes.ts` — `ThemeDef` type; `ThemeSelector` union (string | string[] | weighted array | callback); built-in themes (dungeon, crypt, catacomb, industrial, ruins); public exports `THEMES`, `THEME_KEYS`, `resolveTheme()`, `registerTheme()`, `getTheme()`
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
- `entities/types.ts` — unified entity base interface (`id`, `kind`, `type`, `sprite`, `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed`, `alive`, `blocksMove`, `faction`, `tick`, optional `spriteMap`), `Decoration`, `ObjectPlacement`, `MobilePlacement`, `HiddenPassage`; re-exports `SpriteMap` from `rendering/billboardSprites.ts`
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
- `events/eventEmitter.ts` — typed `EventEmitter` with `on`, `off`, `emit`; `GameEventMap` covering `damage`, `death`, `xp-gain`, `heal`, `miss`, `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio`, `mission-complete`, `mission-peer-complete`
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

**Build-time scripts (in `utils/`):**
- `utils/imageToBase64Js.sh` — Bash script: converts an image to a Base64 JS data-URL file (`window.ATLAS_DATA_URL = "data:..."`)
- `utils/image.ToBase64Js.ps1` — PowerShell equivalent of the above, for Windows

---

### Mission / quest system

Evaluator-driven mission system that hooks into the turn loop. The developer registers missions with `game.missions.add()`, providing an evaluator callback and an optional `onComplete` callback. The evaluator is called once per turn for every active mission; returning `true` marks the mission complete. Completion emits a `mission-complete` event on the game event emitter and calls `onComplete` synchronously. In multiplayer sessions the completion is broadcast to all peers via the transport, causing each peer to emit a `mission-peer-complete` event. Single-player games are completely unaffected — the transport path is gated behind optional interface methods.

**Files:**
- `missions/types.ts` — `Mission`, `MissionStatus`, `MissionContext`, `MissionEvaluator`, `MissionCompleteCallback`, `MissionDef`, `MissionsHandle`
- `missions/missionSystem.ts` — `createMissionSystem(events, transport)` factory; internal mutable `MissionRecord` map, per-turn `_tick()` evaluator loop, completion sequencing (event → callback → transport broadcast)
- `events/eventEmitter.ts` — `mission-complete` and `mission-peer-complete` entries in `GameEventMap`
- `transport/types.ts` — optional `sendMissionComplete()` and `onMissionComplete()` methods on `ActionTransport`
- `transport/websocket.ts` — sends `{ type: 'mission_complete', missionId, name }` client→server; receives and routes the server broadcast to registered `onMissionComplete` handlers
- `api/createGame.ts` — instantiates mission system, wires `_tick` to the `turn` event, wires `onMissionComplete` to emit `mission-peer-complete`, exposes `game.missions`

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

### Tutorial / mission example

Demonstrates ten core systems through a set of chained and parallel missions. Missions 1 and 2 are chained (mission 2 registered in mission 1's `onComplete`); missions 3–10 are registered upfront so multiple objectives are visible simultaneously.

| # | Mission | System demonstrated |
|---|---------|---------------------|
| 1 | First Steps | `missions.add`, metadata accumulation, position tracking |
| 2 | Into the Dark | BSP room graph, `startRoomId`, corridor detection via `onComplete` chain |
| 3 | Wait and Watch | Per-action flag (`_lastAction`) set before `turns.commit()`, consecutive-turn tracking |
| 4 | Open a Chest | `dungeon.onPlace` for chest placement, `decorations.list` proximity search, `chest-open` event |
| 5 | Pick Up an Item | `createItem`, `item-pickup` event, tutorial-bag flag |
| 6 | Use an Item | Custom `useItem` keybinding, `_hasPotionInBag` flag |
| 7 | First Blood | `combat.onDamage` callback, `defender.faction` check |
| 8 | Enemy Slain | `combat.onDeath` callback, enemy placed via `place.enemy` in `onPlace` |
| 9 | Explorer | `_solidData` cached post-generate, radius-3 FoV approximation via `_visitedCells` Set |
| 10 | Find the Exit | `endRoomId` from BSP output, `_endRoom` captured in `onPlace`, bounding-rect player check |

Also adds: `attachMinimap` on a `<canvas>` overlay; per-mission progress display in `renderMissions()`; F / U keybindings for interact and use-item.

**Files:**
- `examples/tutorial/index.html`
- `examples/tutorial/styles.css`
- `examples/tutorial/tutorial.js`

---

### Inventory dialog UI

RPG-style inventory dialog with a two-column layout: character profile + item grid on the left, equipment paper-doll + indicators + action buttons on the right. Supports drag-and-drop between inventory and equip slots, keyboard navigation, custom backgrounds, and a `customLayout` escape hatch for fully custom DOM.

**Files:**
- `ui/inventoryDialog.ts` — `showInventory(opts)` factory; builds and opens a `<dialog>` with the full default layout or a bare shell for `customLayout: true`; returns an `InventoryHandle`
- `ui/inventoryDialog.css` — all `.inv-*` styles and CSS custom properties; emitted as `dist/atomic-core.css`; consumers import via `atomic-core/style.css` or link the dist file directly

---

### Public API surface

**Files:**
- `api/createGame.ts` — `CrawlLib.createGame(canvas, options)`; instantiates all subsystems and returns the `game` handle
- `api/player.ts` — player handle and action methods
- `api/actions.ts` — action pipeline middleware
- `api/keybindings.ts` — DOM keybinding attachment
- `index.ts` — re-exports the public `CrawlLib` namespace: `createGame`, `attachMinimap`, `attachSpawner`, `attachDecorator`, `attachSurfacePainter`, `attachKeybindings`, `createNpc`, `createEnemy`, `createDecoration`, `createItem`, `buildTilesetMap`, `createWebSocketTransport`, `packedAtlasResolver`
