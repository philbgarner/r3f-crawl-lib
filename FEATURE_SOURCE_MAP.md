# Feature → Source File Map

Maps each README feature to the `src/libold` files that contain the relevant implementation.
Use this as a guide when porting code into the new library.

---

## First-person 3D tile-based dungeon rendering with torch lighting and fog

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/rendering/torchLighting.ts` | GLSL shader chunks: torch uniforms, band-based fog, flicker math, object vert/frag shaders; `makeTorchUniforms()` |
| `src/libold/roguelike-mazetools/src/rendering/useDungeonCamera.ts` | `useDungeonCamera()` — first-person camera with wall-sliding collision; `CameraState` type |
| `src/libold/roguelike-mazetools/src/rendering/tileAtlas.ts` | `TileAtlas`, `buildTileAtlas()`, `uvToTileId()` — normalised UV lookup for tile rendering |
| `src/libold/src/hooks/useEotBCamera.ts` | `useEotBCamera()` — Eye-of-the-Beholder style camera hook; `MoveActions`, `CameraState` |
| `src/libold/src/gameConstants.ts` | `TILE_SIZE`, `CEILING_H`, `TILE_PX`, atlas sheet dimensions, default UV constants |

---

## BSP dungeon generator

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/bsp.ts` | `BspDungeonOptions`, `BspDungeonOutputs`, `DungeonOutputs` — main BSP generator entry point; per-cell texture channels (solid, floorType, wallType, ceilingType, overlays, etc.) |
| `src/libold/roguelike-mazetools/src/bspHelpers.ts` | `MinHeap<T>`, `octile()` — priority queue and heuristic used by BSP and pathfinding |
| `src/libold/roguelike-mazetools/src/cellular.ts` | `generateCellularDungeon()`, `CellularOptions` — alternative cave-style generator sharing `DungeonOutputs` shape |
| `src/libold/src/hooks/useDungeonSetup.ts` | `useDungeonSetup()`, `DungeonSetupSettings` — React hook that wires BSP/Tiled output to scene state |
| `src/libold/roguelike-mazetools/src/serialize.ts` | `serializeDungeon()`, `deserializeDungeon()`, `dungeonToJson()`, `dungeonFromJson()` — save/load dungeon state |

### Tiled map import

| File | What it provides |
|------|-----------------|
| `src/libold/src/hooks/useDungeonSetup.ts` | Tiled map loading path within dungeon setup hook |
| `src/libold/roguelike-mazetools/src/content.ts` | `ObjectPlacement`, `MobilePlacement`, `HiddenPassage` — typed representations of Tiled object layer entities |

---

## Turn-based scheduler with priority queue

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/turn/turnScheduler.ts` | `TurnScheduler` class — schedule, cancel, reschedule actors by time cost |
| `src/libold/roguelike-mazetools/src/turn/turnSystem.ts` | `createTurnSystemState()`, `tickUntilPlayer()`, `commitPlayerAction()`, `defaultComputeCost()`, `defaultApplyAction()` |
| `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` | `ActorBase`, `PlayerActor`, `MonsterActor`, `TurnAction`, `TurnActionKind`, `ActionCost`, `ActorKind`, `RpsEffect` |
| `src/libold/roguelike-mazetools/src/turn/actionCosts.ts` | `BASE_TIME`, `actionDelay()` — speed-based action cost math |
| `src/libold/roguelike-mazetools/src/turn/turnEvents.ts` | `DamageEvent`, `MissEvent`, `DeathEvent`, `XpGainEvent`, `HealEvent`, `TurnEvent` union |

---

## Entity system: player, NPCs, enemies, items, chests

| File | What it provides |
|------|-----------------|
| `src/libold/src/player.ts` | `Player` interface — base player stats shape |
| `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` | `PlayerActor`, `MonsterActor` — runtime actor types with HP, speed, faction, alert state |
| `src/libold/roguelike-mazetools/src/turn/createActors.ts` | `createPlayerActor()`, `createMonsterFromPlacement()`, `createMonstersFromMobiles()`, `DEFAULT_MONSTER_TEMPLATES` |
| `src/libold/roguelike-mazetools/src/content.ts` | `ObjectPlacement` (decorations/chests), `MobilePlacement` (NPCs/enemies with sprite layers), `HiddenPassage` |
| `src/libold/roguelike-mazetools/src/Inventory/inventory.ts` | `Item`, `ItemType`, `InventorySlot`, `InventoryProps` |
| `src/libold/src/hooks/useGameState.ts` | Full game-state hook — entity tracking, loot pickup, NPC/enemy AI dispatch, chest interaction |

---

## Three-faction combat model: `player`, `npc`, `enemy`

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/factions.ts` | `FactionRegistry`, `FactionStance`, `createFactionRegistry()`, `createFactionRegistryFromTable()` |
| `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` | `RpsEffect` type (`bleeding`, `freezing`, `poisoned`) used for rock-paper-scissors combat effects |
| `src/libold/roguelike-mazetools/src/effects.ts` | `ActiveEffect`, `applyEffect()`, `tickEffects()`, `StackMode` — status effect application and tick system |
| `src/libold/roguelike-mazetools/src/turn/turnEvents.ts` | `DamageEvent`, `MissEvent` — combat event payloads |
| `src/libold/src/hooks/useGameState.ts` | Combat resolution logic (attack, counterattack, damage formula application) |

---

## Sprite billboard rendering with body/head layers

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/content.ts` | `MobilePlacement` — `uvRectBody`, `uvRectHead`, `tileIndex`, `suppressBob`, `satiation` fields |
| `src/libold/roguelike-mazetools/src/atlas.ts` | `AtlasSpriteEntry` (non-square sprite support), `AtlasIndex`, `buildAtlasIndex()` |
| `src/libold/src/gameConstants.ts` | `CHAR_SHEET_W`, `CHAR_SHEET_H` — character atlas sheet dimensions |
| `src/libold/src/gameUtils.ts` | `normalizeUvRect()` — convert pixel UV to normalised 0–1 space for shader upload |

---

## Minimap with entity overlays

| File | What it provides |
|------|-----------------|
| `src/libold/src/hooks/useGameState.ts` | Game state (entity positions, explored mask) that drives minimap rendering |
| `src/libold/src/gameUtils.ts` | `buildInitialExploredMask()` — initialise FOV-based explored map |
| `src/libold/roguelike-mazetools/src/fov.ts` | `computeFov()`, `createVisibilityMask()` — field-of-view used to reveal minimap tiles |

---

## Chest drops and item pickups

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/Inventory/inventory.ts` | `Item`, `ItemType`, `InventorySlot`, `InventoryProps` |
| `src/libold/roguelike-mazetools/src/turn/createActors.ts` | `MonsterTemplate.drop` — per-enemy loot table definition |
| `src/libold/src/hooks/useGameState.ts` | Loot drop logic, item pickup on player step, chest interaction handling |

---

## Hidden passage traversal

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/turn/passageTraversal.ts` | `startPassageTraversal()`, `consumePassageStep()`, `cancelPassageTraversal()`, `PassageTraversalState` |
| `src/libold/roguelike-mazetools/src/rendering/hiddenPassagesMask.ts` | `buildPassageMask()`, `enablePassageInMask()`, `disablePassageInMask()`, `stampPassageToMask()` |
| `src/libold/roguelike-mazetools/src/content.ts` | `HiddenPassage` interface — entry/exit cells, traversal cells, enabled flag |

---

## Callback-driven enemy spawning

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/turn/createActors.ts` | `createMonstersFromMobiles()`, `createMonsterFromPlacement()` — factory functions called by spawn callbacks |
| `src/libold/roguelike-mazetools/src/turn/turnTypes.ts` | `MonsterActor` — shape returned from spawn factory |
| `src/libold/src/hooks/useGameState.ts` | Round-based spawn scheduling, `onSpawn` callback dispatch |

---

## Stationary decoration entities

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/content.ts` | `ObjectPlacement` — grid position, factory key, offset, yaw, scale, metadata |
| `src/libold/src/hooks/useGameState.ts` | Decoration tracking, `onDecorate` callback integration |
| `src/libold/src/gameUtils.ts` | `makeDoorProto()` — prototype mesh for door decoration objects |

---

## Atlas surface painting (walls, floors, ceilings per-tile)

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/atlas.ts` | `AtlasData` (floorTypes, wallTypes, ceilingTypes, overlays), `buildAtlasIndex()`, `AtlasIndex` |
| `src/libold/roguelike-mazetools/src/bsp.ts` | `DungeonOutputs` texture channels: `floorType`, `wallType`, `ceilingType`, `overlays`, `wallOverlays` |
| `src/libold/roguelike-mazetools/src/rendering/tileAtlas.ts` | `TileAtlas`, `buildTileAtlas()` — UV lookup table per tile ID |
| `src/libold/src/themes.ts` | `ThemeDef`, `THEMES` — named floor/wall/ceiling combinations (dungeon, cave, etc.) |
| `src/libold/src/gameConstants.ts` | `FLOOR_TILE_MAP`, `WALL_TILE_MAP`, `CEILING_TILE_MAP` — ID-to-atlas index arrays |
| `src/libold/roguelike-mazetools/src/rendering/temperatureMask.ts` | `buildTemperatureMask()`, `setRegionTemperature()` — per-region temperature data texture for surface tinting |

---

## Configurable keybindings

| File | What it provides |
|------|-----------------|
| `src/libold/src/hooks/useEotBCamera.ts` | `MoveActions` type — action-name-to-key mapping consumed by camera hook |
| `src/libold/src/hooks/useGameState.ts` | Key event handling wired to turn actions |

---

## Audio hooks (Howler.js compatible)

No dedicated audio file found in `src/libold`. Audio integration will need to be implemented fresh, using turn events (`TurnEvent` from `turnEvents.ts`) as the trigger surface.

---

## Supporting utilities (used across multiple features)

| File | What it provides |
|------|-----------------|
| `src/libold/roguelike-mazetools/src/astar.ts` | `aStar8()` — 8-directional A* pathfinding used by monster AI and passage routing |
| `src/libold/roguelike-mazetools/src/turn/monsterAI.ts` | `decideChasePlayer()`, `computeChasePathToPlayer()`, `monsterAlertConfig()` — monster decision logic |
| `src/libold/roguelike-mazetools/src/actions.ts` | `createActionPipeline()`, `ActionMiddleware` — middleware pipeline for extensible action handling |
| `src/libold/roguelike-mazetools/src/spatial.ts` | `tilesInRadius()`, `tilesInCone()`, `tilesInLine()`, `visitTilesInRadius()` — spatial queries |
| `src/libold/roguelike-mazetools/src/fov.ts` | `computeFov()`, `createVisibilityMask()` — shadowcasting FOV |
| `src/libold/src/gameUtils.ts` | `makeRng()`, `hasLineOfSight()`, `cardinalDir()`, `loadAtlasTexture()`, `buildInitialExploredMask()` |
