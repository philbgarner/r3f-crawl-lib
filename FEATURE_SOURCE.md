# Feature Source

Maps each feature to the files in `src/lib` that implement it. Use this as a lookup guide when working on or debugging a specific system.

---

## Directory structure

```
src/lib/
  animations/
    types.ts
    animationRegistry.ts
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
    colliderFlags.ts
    serialize.ts
    mapFile.ts
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
- `rendering/dungeonRenderer.ts` — holds a `Map<string, BillboardHandle>` alongside `entityMeshMap`; `syncEntities()` routes entities with `spriteMap` to `createBillboard()` and others to the box path; `setObjects(objects)` syncs a separate `objectBillboardMap` for stationary `ObjectPlacement` billboards; RAF loop calls `handle.update()` with the current `curYaw` for both entity and object billboards; `destroy()` disposes all billboard handles
- `entities/types.ts` — `spriteMap?: SpriteMap` optional field on `EntityBase`; `spriteMap?: SpriteMap` optional field on `ObjectPlacement` enabling stationary billboard rendering

**Example:**
- `examples/standalone/billboard-sprites/index.html`
- `examples/standalone/billboard-sprites/billboard-sprites.js` — goblin (2-layer body + weapon), skeleton (4-angle variants), slime (single tile)

---

### First-person 3D dungeon rendering with lighting and fog

**Files:**
- `rendering/dungeonRenderer.ts` — main Three.js scene, render loop, shader uniforms; `floorTile`/`ceilTile`/`wallTile` options accept `string | number` resolved via `tileNameResolver`; `LayerFaceResult.tile` is `string | number`; per-direction tile specs via `wallTiles`, `floorSkirtTiles`, `ceilSkirtTiles` options; per-cell skirt type lookup: edge skirts resolve `floorSkirtType`/`ceilSkirtType` at build time (overrides base tile), wall-adjacent skirts composite the override in fragment shader via `uSkirtLookup` + `aSkirtDirChannel`; wall-adjacent floor and ceiling skirts use separate instanced meshes (`floorWallSkirtMesh`, `ceilWallSkirtMesh`) with their own materials so each can carry a distinct skirt lookup texture; `ambientOcclusion` option (`boolean | number`, default false) enables vertex AO — `computeFaceAO()` samples the solid map for each face's 4 corners during `buildDungeon()` and packs the result into a `Float32Array` passed as `aAoCorners` instanced attribute; recomputed on every `rebuild()` so dynamic wall changes stay correct; AO applies to floor, ceiling, and all four wall directions; skirt/edge faces default to aAoCorners=1.0 (fully lit); public `setAmbientOcclusion(intensity)` updates `uAoIntensity` on all atlas materials at runtime (clamped to [0,1], takes effect next frame); `surfaceLighting` option (`{ floor?, ceiling?, wallMin?, wallMax? }`) tunes directional surface lighting multipliers at creation time (defaults: floor=0.85, ceiling=0.95, wallMin=0.9, wallMax=1.1) — values are forwarded to `uSurfaceLight`, `uWallLightMin`, `uWallLightMax` uniforms; public `addLayer(spec)` API for stacking additional instanced meshes on floors, ceilings, walls, or skirts with per-face filtering and deferred application; public `worldToScreen(gridX, gridZ, worldY?)` projects a grid cell to pixel coords relative to the container element (returns `null` when behind the camera or out of bounds); uses `basicLighting.ts` shaders; routes entities with `spriteMap` to `billboardSprites.ts` (passing resolver); exports `LayerTarget`, `LayerFaceResult`, `LayerSpec`, `LayerHandle`, `SpriteMap`
- `rendering/billboardSprites.ts` — see "Billboarded sprite rendering" feature entry above
- `rendering/basicLighting.ts` — minimal atlas and object shaders: texture sampling + linear fog; WebGL slot budget: 6 built-ins (position+uv+instanceMatrix) + 4 custom = 10/16 — 6 slots remain; custom attributes are packed into 4 vec2/vec3/vec4 slots: `aUvRect` (vec4) = atlas UV origin+size, `aSurface` (vec3) = heightOffset/uvRotation/uvHeightScale, `aAoCorners` (vec4) = pre-baked AO corners (tl/tr/bl/br, [0,1]), `aCellFace` (vec4) = grid cell xy + XZ face normal zw; `aSurface.y` (uvRotation) rotates UVs in 90° steps (0–3); `aSurface.z` (uvHeightScale) clips UVs to the top fraction of a tile so partial-height skirt panels keep brick aspect ratio; `aCellFace.xy` drives the overlay UV; 4-slot surface-painter overlay composited in fragment shader; `uSkirtLookup` uniform provides 4 additional overlay slots for skirt meshes (same RGBA encoding, defaults to 1×1 zero texture = no-op); `aAoCorners` per-instance vec4 carries pre-baked AO corner values; vertex shader selects the correct corner per vertex using raw UV and outputs `vAo`; fragment shader darkens by `mix(1 - uAoIntensity, 1, vAo)` before fog; `uAoIntensity=0` disables AO at zero cost; directional surface lighting: `aCellFace.zw` encodes the XZ outward normal for wall faces; `uSurfaceLight` uniform (`>= 0` = fixed multiplier for floor/ceiling, `< 0` = camera-angle formula); `uCamDir` uniform (XZ camera forward, updated per frame); `uWallLightMin`/`uWallLightMax` drive the formula `uWallLightMin + abs(dot(normal, camFwd)) * (uWallLightMax - uWallLightMin)`; all four values configurable via `surfaceLighting` option (defaults: floor=0.85, ceiling=0.95, wallMin=0.9, wallMax=1.1); used by `dungeonRenderer.ts`
- `rendering/torchLighting.ts` — torch color, intensity, banding constants, and flickering GLSL chunks; available for custom renderers that want animated torch lighting
- `rendering/camera.ts` — camera state, `tryMove` wall-collision logic, lerp movement, EotB-style movement as secondary export
- `rendering/tileAtlas.ts` — UV coordinate helpers; exports `FaceRotation`, `FaceTileSpec` (`tile: string | number`), `DirectionFaceMap` types for per-face tile and rotation overrides; `resolveTile()` helper resolves string names via an optional resolver function
- `rendering/temperatureMask.ts` — optional per-region temperature tinting, passed as a shader uniform

---

### Ceiling and floor height offsets

**Files:**
- `dungeon/bsp.ts` — generates `floorHeightOffset` and `ceilingHeightOffset` R8 DataTextures (128 = no offset, 0 = pit marker for floor); encoding described in `DungeonOutputs`
- `rendering/dungeonRenderer.ts` — reads offset textures in `buildDungeon()`, populates the `aSurface.x` component (heightOffset) of the packed `aSurface` vec3 attribute; vertex shader applies the world-space Y offset; floor tiles with value 0 are omitted (pit)

---

### BSP dungeon generator

**Files:**
- `dungeon/bsp.ts` — BSP tree split, room placement, corridor carving, `setupDungeon()`, `DungeonOutputs` shape; produces `floorHeightOffset`, `ceilingHeightOffset`, `colliderFlags`, `floorSkirtType`, and `ceilSkirtType` textures; `setFloorSkirtTiles()` / `setCeilSkirtTiles()` per-cell skirt tile helpers
- `dungeon/cellular.ts` — cellular automata generator producing the same `DungeonOutputs` shape including `colliderFlags`, `floorSkirtType`, and `ceilSkirtType`
- `dungeon/colliderFlags.ts` — `IS_WALKABLE`, `IS_BLOCKED`, `IS_LIGHT_PASSABLE` constants; `buildColliderFlags()` deriver; `isWalkableCell()`, `isBlockedCell()`, `isLightPassableCell()` predicates
- `dungeon/serialize.ts` — `SerializedDungeon` type (version, width, height, seed, startRoomId, endRoomId, firstCorridorRegionId, plus Base64 channels for solid/regionId/distanceToWall/hazards/colliderFlags/floorSkirtType?/ceilSkirtType?/floorHeightOffset?/ceilingHeightOffset?, and optional `paintMap` Record for surface-painter overlays); `serializeDungeon(dungeon, paintMap?)` snapshots all mutable texture data including optional height offsets and paint map; `deserializeDungeon()` reconstructs a `BspDungeonOutputs` restoring height textures when present; `rehydrateDungeon()` does full restoration including room graph by re-running BSP deterministically with the stored seed, then overlays height textures; `dungeonToJson()` / `dungeonFromJson()` JSON string convenience wrappers
- `dungeon/themes.ts` — `ThemeDef` type with optional `floorSkirtType?` / `ceilSkirtType?` tile name fields; `ThemeSelector` union (string | string[] | weighted array | callback); built-in themes (dungeon, crypt, catacomb, industrial, ruins); public exports `THEMES`, `THEME_KEYS`, `resolveTheme()`, `registerTheme()`, `getTheme()`
- `utils/geometry.ts` — `MinHeap<T>`, `octile()` used internally by BSP helpers

---

### Collider flags (per-cell movement and LOS)

Bitwise flags stored in `DungeonOutputs.textures.colliderFlags` (R8 DataTexture). Default values are derived from the `solid` texture by all generators. Drives `isWalkable` in the turn system, A* pathfinding, monster AI, FOV/LOS, and both camera types.

| Flag | Bit | Meaning |
|---|---|---|
| `IS_WALKABLE` | `0x01` | Normal volitional movement permitted |
| `IS_BLOCKED` | `0x02` | No entry by any means (forced or voluntary) |
| `IS_LIGHT_PASSABLE` | `0x04` | LOS/light rays pass through |

**Files:**
- `dungeon/colliderFlags.ts` — constants, `buildColliderFlags()`, `isWalkableCell()`, `isBlockedCell()`, `isLightPassableCell()`
- `dungeon/bsp.ts` — populates `colliderFlags` in `generateBspDungeon()`
- `dungeon/cellular.ts` — populates `colliderFlags` in `generateCellularDungeon()`
- `dungeon/tiled.ts` — populates `colliderFlags` (from optional layer or derived from solid)
- `dungeon/serialize.ts` — includes `colliderFlags` in `SerializedDungeon`; restored verbatim on both `deserializeDungeon()` and `rehydrateDungeon()`
- `api/createGame.ts` — stores `colliderFlagsData`; drives `isWalkable` and `isOpaque` callbacks
- `rendering/camera.ts` — both `createCamera` and `createEotBCamera` accept optional `colliderFlagsData`; `setColliderFlagsData()` method on each

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
- `entities/types.ts` — `Decoration` interface (`id`, `kind: 'decoration'`, `type`, `x`, `z`, `sprite`, `blocksMove`, `blocksView`, `interactive`, `onInteract`); `ObjectPlacement` interface with optional `spriteMap?` field enabling billboard rendering via `renderer.setObjects()`
- `entities/factory.ts` — `createDecoration()` factory with auto-generated `id`
- `api/createGame.ts` — `CrawlLib.attachDecorator(game, { onDecorate })`; `game.dungeon.decorations.add()`, `.remove()`, `.list`; `place.billboard(x, z, type, spriteMap, opts?)` places a stationary billboard sprite stored in `game.dungeon.objects`; `game.dungeon.objects` read-only `ObjectPlacement[]` list reset on `regenerate()`
- `rendering/dungeonRenderer.ts` — `renderer.setObjects(objects)` syncs stationary billboard objects; creates `BillboardHandle` for each `ObjectPlacement` with `spriteMap`; RAF loop calls `handle.update()` each frame so sprites always face the camera

---

### Per-cell skirt tile customization

Two RGBA DataTextures (`floorSkirtType`, `ceilSkirtType`) on `DungeonOutputs` provide 4 overlay slots per cell for skirt geometry — same encoding as `overlays`/`wallOverlays`/`ceilingOverlays` (R=slot1, G=slot2, B=slot3, A=slot4, value 0 = empty). All non-zero slots are composited on top of the skirt base tile in the fragment shader via `uSkirtLookup`, identical to how the surface painter works. Applies to all four skirt mesh types: floor edge, ceiling edge, floor wall-adjacent, ceiling wall-adjacent. `ThemeDef` accepts optional `floorSkirtType?` / `ceilSkirtType?` tile name fields.

**Files:**
- `dungeon/bsp.ts` — `floorSkirtType` and `ceilSkirtType` RGBA DataTextures in `DungeonOutputs`; `setFloorSkirtTiles(outputs, cx, cz, tiles[])` / `setCeilSkirtTiles(outputs, cx, cz, tiles[])` per-cell overlay slot write helpers
- `dungeon/cellular.ts` — same channels in `CellularDungeonOutputs`
- `dungeon/tiled.ts` — zero-filled channels to satisfy `DungeonOutputs` shape
- `dungeon/themes.ts` — optional `floorSkirtType?` / `ceilSkirtType?` string fields on `ThemeDef`
- `dungeon/serialize.ts` — optional `floorSkirtType?` / `ceilSkirtType?` Base64 RGBA fields in `SerializedDungeon`; `deserializeDungeon()` zero-fills missing skirt channels for backwards compatibility; `rehydrateDungeon()` applies stored skirt data over freshly generated textures when present
- `rendering/basicLighting.ts` — `uSkirtLookup` uniform; fragment shader composites all 4 non-zero slots from `uSkirtLookup` on top of the base tile (same pattern as `uOverlayLookup`)
- `rendering/dungeonRenderer.ts` — `floorEdgeMesh` gets its own `floorEdgeMat` (separated from `floorMat`) so its `uSkirtLookup` can be set independently; wall-adjacent skirts split into `floorWallSkirtMesh` / `ceilWallSkirtMesh` each with its own material; `syncSkirtLookupUniforms()` wires `floorSkirtType`/`ceilSkirtType` to the four skirt materials after dungeon build
- `index.ts` — exports `setFloorSkirtTiles`, `setCeilSkirtTiles`

---

### Atlas surface painting (walls, floors, ceilings per-tile)

Per-cell shader overlay system. Up to 4 overlay tile names can be assigned per cell; the renderer composites them on top of the base tile in the fragment shader with no extra geometry or draw calls.

**Files:**
- `api/createGame.ts` — exports `SurfacePaintTarget = { floor?, wall?, ceil? }` (up to 4 tile names per surface); `attachSurfacePainter(game, { onPaint })` registers a per-cell callback called during `generate()` returning `SurfacePaintTarget`; `game.dungeon.paint(x, z, target)` / `unpaint(x, z)` update the paintMap and emit a `'cell-paint'` event; `game.dungeon.paintMap` exposes the full map read-only
- `events/eventEmitter.ts` — `'cell-paint': { x, z, floor?, wall?, ceil? }` event; emitted by `paint()`/`unpaint()` for dynamic updates
- `rendering/dungeonRenderer.ts` — builds `uTileUvLookup` (1D float DataTexture: tile ID → atlas UV rect) once from the packed atlas; builds **three** W×H Uint8 RGBA overlay DataTextures (floor, wall, ceil) after each `generate()`; each material receives its own surface's texture (`floorMat`/`floorEdgeMesh` → floor, `wallMat` → wall, `ceilMat`/`ceilEdgeMat` → ceil); listens to `'cell-paint'` to update only the changed surface(s) in-place; adds `aCellX`/`aCellZ` per-instance attributes to all base geometry meshes
- `rendering/basicLighting.ts` — `BASIC_ATLAS_VERT` forwards `aCellX`/`aCellZ` as `vOverlayUv` (cell-normalised UV into `uOverlayLookup`) and exposes `vLocalUv` (rotated face UV used for overlay tile sampling); `BASIC_ATLAS_FRAG` samples all 4 overlay slots and alpha-composites them over the base colour; new uniforms: `uOverlayLookup`, `uTileUvLookup`, `uTileUvCount`, `uDungeonSize`; `makeBasicAtlasUniforms()` accepts optional overlay params with safe 1×1 zero-texture defaults
- `atlas/atlas.ts` — `buildAtlasIndex(atlasJson)` resolves all atlas tile IDs at runtime from the developer's own atlas file
- `dungeon/bsp.ts` — `floorType`, `wallType`, `ceilingType`, `overlays`, `wallOverlays` channels in `DungeonOutputs`
- `dungeon/themes.ts` — theme resolution writes initial floor/wall/ceiling type IDs into `DungeonOutputs` textures

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

Dependency-injection layer that makes the server authoritative for all player actions and monster AI. When `GameOptions.transport` is set, `game.turns.commit()` forwards actions to the server instead of applying them locally; the server validates each action, runs monster AI (chase + 4-directional movement + melee combat), updates canonical state, and broadcasts a `ServerStateUpdate` to all connected clients. `createGame` registers a reconciliation handler that patches local turn state, auto-registers monster entities in `entityById` for non-host clients, and re-emits the `"turn"` event. Initial state messages buffered during `connect()` are replayed when the first `onStateUpdate` handler registers so late-joining clients see current monster positions immediately. Single-player code paths are completely unaffected.

**Files:**
- `transport/types.ts` — `ActionTransport` interface, `ServerStateUpdate`, `PlayerNetState`, `DungeonInitPayload`
- `transport/websocket.ts` — `createWebSocketTransport(url)` browser-side factory; buffers `state` messages before `onStateUpdate` is registered and replays them on first handler registration
- `api/createGame.ts` — `GameOptions.transport`, `PlayerOptions.id`, commit intercept, reconciliation wiring; auto-registers and syncs monster entities from state updates

**Server:**
- `src/server/index.js` — Express + `ws` authoritative server; generates the dungeon server-side; validates player moves (including monster-blocking); resolves player→monster and monster→player melee combat; runs `runMonsterAI()` (4-directional chase, one step per player action) after each accepted action; broadcasts full state to all peers
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

### Turn-animation callback system

Async callback layer that fires between turn resolution and entity-position sync. Developers register handlers on `game.animations` for specific event kinds (`damage`, `death`, `move`, `attack`, `miss`, `heal`, `xp-gain`). After each `game.turns.commit()` the engine awaits all queued handlers in turn order before syncing entity positions to the render layer, so motion tweens, floating text, and hit-flash effects see entities at their pre-move positions. Works in both single-player (events collected during the turn loop) and multiplayer (events reconstructed by diffing the `ServerStateUpdate` against the previous actor state).

**Files:**
- `animations/types.ts` — `AnimationEventKind`, `AnimationEventMap`, `AnimationQueueEntry`, `AnimationHandler`, `AnimationsHandle` public types
- `animations/animationRegistry.ts` — `createAnimationRegistry()` factory; internal `_enqueue()` / `_flush()` methods used by `createGame`; `on`, `off`, `clear` on the public handle
- `api/createGame.ts` — `makeApplyAction` emits animation events via optional `onAnimEvent` callback; `turns.commit()` is now `async`, flushes registry after the turn loop; `onStateUpdate` diffs old vs. new actor state to synthesize animation events in multiplayer; exposes `game.animations`

---

### Dungeon map file import/export

Self-contained save/load layer that wraps a `SerializedDungeon` with all settings needed to reproduce the exact dungeon and renderer in a new session. The embedded `version` field matches the atomic-core npm package version at export time (injected via Vite `define`) and is intended for backward-compatibility gating on import. Non-serializable renderer fields (packedAtlas, tileNameResolver, event callbacks) are stripped at export; re-supply them when creating the renderer after load.

**Files:**
- `dungeon/mapFile.ts` — `DungeonMapFile` wrapper type (`version`, `exportedAt`, `meta?`, `generatorOptions`, `rendererOptions`, `dungeon`, `objectPlacements?`); `DungeonMapMeta` optional author metadata type; `SerializedRendererOptions` = `DungeonRendererOptions` minus callbacks/PackedAtlas; `ExportOptions` caller input type (includes optional `paintMap` forwarded to `serializeDungeon`, optional `objectPlacements` array); `ImportResult` return type (includes optional `paintMap` for re-application via `game.dungeon.paint()`, optional `objectPlacements` for re-application via `place.billboard()` or `renderer.setObjects()`); `exportDungeonMap(dungeon, opts)` builds the wrapper; `dungeonMapToJson()` convenience JSON string; `importDungeonMap(data)` reconstructs `BspDungeonOutputs` + all settings including paintMap and objectPlacements; `dungeonMapFromJson(json)` convenience parse wrapper
- `index.ts` — exports `exportDungeonMap`, `dungeonMapToJson`, `importDungeonMap`, `dungeonMapFromJson` and all associated types

---

### Public API surface

**Files:**
- `api/createGame.ts` — `CrawlLib.createGame(canvas, options)`; instantiates all subsystems and returns the `game` handle
- `api/player.ts` — player handle and action methods
- `api/actions.ts` — action pipeline middleware
- `api/keybindings.ts` — DOM keybinding attachment
- `index.ts` — re-exports the public `CrawlLib` namespace: `createGame`, `attachMinimap`, `attachSpawner`, `attachDecorator`, `attachSurfacePainter`, `attachKeybindings`, `createNpc`, `createEnemy`, `createDecoration`, `createItem`, `buildTilesetMap`, `createWebSocketTransport`, `packedAtlasResolver`
