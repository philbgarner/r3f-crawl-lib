# Atomic-Core

A dungeon crawler library.

---

A composable JavaScript library built on [Three.js](https://threejs.org/) for building first-person 3D dungeon crawl games in the browser.

Game logic lives entirely in your JS layer — the library provides the rendering engine, turn system, entity model, and dungeon tools. You wire them together however you like. No React, no JSX, no build step required.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [`<script>` tag (no build step)](#script-tag-no-build-step)
- [Quick Start](#quick-start)
- [Script Tag Developer Guide](#script-tag-developer-guide)
  - [The `game` handle](#the-game-handle)
  - [Moving the player](#moving-the-player)
  - [Listening to game events](#listening-to-game-events)
  - [Adding entities at runtime](#adding-entities-at-runtime)
  - [3D Renderer](#3d-renderer)
  - [Surface painting callback](#surface-painting-callback)
  - [Layer system vs. surface painting](#layer-system-vs-surface-painting)
  - [Loading a Tiled map](#loading-a-tiled-map)
  - [HUD overlay with plain HTML](#hud-overlay-with-plain-html)
  - [Spawn callback](#spawn-callback)
  - [Decoration callback](#decoration-callback)
  - [Keybindings helper](#keybindings-helper)
  - [Script tag API surface](#script-tag-api-surface)
- [Core Concepts](#core-concepts)
  - [Dungeon](#dungeon)
    - [Dungeon Themes](#dungeon-themes)
    - [Cellular Automata Generator](#cellular-automata-generator)
    - [Dungeon Serialization](#dungeon-serialization)
    - [Tiled Map Import](#tiled-map-import)
  - [Ceiling & Floor Height Offsets](#ceiling--floor-height-offsets)
  - [Player](#player)
  - [Turn Scheduler](#turn-scheduler)
  - [Entities](#entities)
    - [NPCs](#npcs)
    - [Enemies](#enemies)
    - [Active Effects](#active-effects)
    - [Spawn Callback](#spawn-callback-1)
  - [Decorations](#decorations)
  - [Combat](#combat)
  - [Items & Inventory](#items--inventory)
  - [Hidden Passages](#hidden-passages)
  - [3D Renderer](#3d-renderer-1)
    - [Per-direction Tile Specs](#per-direction-tile-specs)
    - [Layer System](#layer-system)
    - [Surface Painting](#surface-painting)
    - [Layer System vs. Surface Painting](#layer-system-vs-surface-painting-1)
  - [Keybindings](#keybindings)
  - [Audio](#audio)
  - [Events](#events)
- [Multiplayer Transport](#multiplayer-transport)
- [Tiled Workflow](#tiled-workflow)
- [Configuration Reference](#configuration-reference)
- [Tile Atlas Format](#tile-atlas-format)

---

## Features

- First-person 3D tile-based dungeon rendering with linear fog and per-cell lighting (plain Three.js — no React/R3F required)
- BSP dungeon generator or cellular automata generator or **Tiled map import** (`.tmj` / `.tsj` JSON exports)
- Built-in dungeon themes (`dungeon`, `crypt`, `catacomb`, `industrial`, `ruins`) with `registerTheme()` for custom themes
- Ceiling and floor height offsets; pit markers that omit floor tiles
- Dungeon serialization — save and restore `DungeonOutputs` to/from JSON
- Renderer layer system — stack additional instanced meshes on floors, ceilings, walls, or skirts with per-face filtering
- Per-direction tile specs for walls, floor skirts, and ceiling skirts
- Turn-based scheduler with priority queue
- Entity system: player, NPCs, enemies, items, chests
- Sprite billboard rendering with separate body/head UV layers
- Active status effects with configurable stacking modes
- Three-faction combat model: `player`, `npc`, `enemy`
- Minimap with entity overlays
- Chest drops and item pickups
- Hidden passage traversal
- Callback-driven enemy spawning
- Stationary decoration entities (props, furniture, fixtures)
- Atlas surface painting — apply tile layers to walls, floors, and ceilings per-tile
- Configurable keybindings
- Audio hooks (Howler.js compatible)
- Optional multiplayer transport layer (WebSocket-based, server-authoritative)
- Script tag API — no build step required

---

## Installation

### `<script>` tag (no build step)

Load Three.js, then the library IIFE bundle. All exports are available on `window.CrawlLib`.

```html
<!-- Three.js (required) -->
<script type="module">
  import * as THREE from '/node_modules/three/build/three.module.js';
  window.THREE = THREE;
</script>

<!-- r3f-crawl-lib IIFE bundle -->
<script src="/dist/r3f-crawl-lib.iife.js" defer></script>
```

Once loaded, `window.CrawlLib` exposes the full imperative API you can use from any HTML page without JSX or a build toolchain.

---

## Quick Start

`CrawlLib.createGame()` sets up game logic and returns a `game` handle. Call `CrawlLib.createDungeonRenderer()` separately to mount the 3D viewport — this lets you attach event callbacks and a spawner before generating the dungeon.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #viewport { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <div id="viewport"></div>

  <script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    window.THREE = THREE;
  </script>
  <script src="/dist/r3f-crawl-lib.iife.js" defer></script>
  <script defer>
    const { createGame, createEnemy, attachSpawner, attachKeybindings, createDungeonRenderer } = CrawlLib

    const game = createGame(document.body, {
      dungeon: {
        seed:        0xdeadbeef,
        width:       40,
        height:      40,
        minRoomSize: 5,
        maxRoomSize: 11,
      },
      player: { hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 5 },
      combat: {
        onDamage({ attacker, defender, amount }) {
          console.log(`${attacker.type} hits ${defender.type} for ${amount}`)
        },
        onDeath({ entity }) {
          console.log(`${entity.type} is slain!`)
        },
      },
    })

    // Load the tile atlas image, then create the 3D renderer
    const atlasImg = new Image()
    atlasImg.onload = () => {
      const renderer = createDungeonRenderer(
        document.getElementById('viewport'),
        game,
        {
          atlas: {
            image:       atlasImg,
            tileWidth:   64,
            tileHeight:  64,
            sheetWidth:  512,
            sheetHeight: 1024,
            columns:     8,
          },
          floorTileId: 20,  // row-major tile index into the atlas sheet
          ceilTileId:  19,
          wallTileId:  16,
        },
      )

      // Generate the dungeon — must be called after attaching all callbacks
      game.generate()
    }
    atlasImg.src = './atlas.png'

    // Keyboard input
    attachKeybindings(game, {
      bindings: {
        moveForward:  ['w', 'ArrowUp'],
        moveBackward: ['s', 'ArrowDown'],
        moveLeft:     ['a', 'ArrowLeft'],
        moveRight:    ['d', 'ArrowRight'],
        turnLeft:     ['q', 'Q'],
        turnRight:    ['e', 'E'],
        wait:         [' '],
      },
      onAction(action, event) {
        event.preventDefault()
        if (!game.player.alive) return
        const yaw = game.player.facing
        const fx = Math.round(-Math.sin(yaw))
        const fz = Math.round(-Math.cos(yaw))
        const sx = Math.round( Math.cos(yaw))
        const sz = Math.round(-Math.sin(yaw))
        let a
        switch (action) {
          case 'moveForward':  a = game.player.move( fx,  fz); break
          case 'moveBackward': a = game.player.move(-fx, -fz); break
          case 'moveLeft':     a = game.player.move(-sx, -sz); break
          case 'moveRight':    a = game.player.move( sx,  sz); break
          case 'turnLeft':     a = game.player.rotate( Math.PI / 2); break
          case 'turnRight':    a = game.player.rotate(-Math.PI / 2); break
          case 'wait':         a = game.player.wait(); break
        }
        if (a) game.turns.commit(a)
      },
    })
  </script>
</body>
</html>
```

---

## Script Tag Developer Guide

This section covers using r3f-crawl-lib entirely from a `<script>` tag — no JSX, no bundler, no build step.

### The `game` handle

`createGame(element, options)` sets up all game systems and returns a `game` object but does **not** generate the dungeon. Attach any callbacks (`attachSpawner`, `attachDecorator`, `attachSurfacePainter`, etc.) first, create the 3D renderer, then call `game.generate()`.

| Property | Type | Description |
|---|---|---|
| `game.generate()` | function | Generate the dungeon and start the game — call after attaching all callbacks |
| `game.dungeon` | object | Dungeon state (tiles, rooms, passages) — available after `generate()` |
| `game.player` | object | Player state and action methods |
| `game.turns` | object | Turn scheduler — call `turns.commit()` to advance |
| `game.combat` | object | Combat system |
| `game.events` | EventEmitter | Subscribe to game events |
| `game.destroy()` | function | Unmount and clean up |

### Moving the player

Player action methods return turn actions. Pass them to `turns.commit()` to spend the turn and let all other actors act.

```js
document.addEventListener('keydown', function(e) {
  if (!game.player.alive) return
  // Compute facing-relative movement
  const yaw = game.player.facing
  const fx = Math.round(-Math.sin(yaw))
  const fz = Math.round(-Math.cos(yaw))
  const sx = Math.round( Math.cos(yaw))
  const sz = Math.round(-Math.sin(yaw))
  switch (e.key) {
    case 'w': case 'ArrowUp':    game.turns.commit(game.player.move(fx,  fz));  break
    case 's': case 'ArrowDown':  game.turns.commit(game.player.move(-fx, -fz)); break
    case 'a': case 'ArrowLeft':  game.turns.commit(game.player.move(-sx, -sz)); break
    case 'd': case 'ArrowRight': game.turns.commit(game.player.move(sx,  sz));  break
    case 'q':                    game.turns.commit(game.player.rotate( Math.PI / 2)); break
    case 'e':                    game.turns.commit(game.player.rotate(-Math.PI / 2)); break
    case 'i':                    game.turns.commit(game.player.interact(null)); break
    case '.':                    game.turns.commit(game.player.wait());         break
  }
})
```

### Listening to game events

Use `game.events.on()` to react to anything that happens:

```js
var hpDisplay = document.getElementById('hp')
var logEl     = document.getElementById('log')

game.events.on('turn', function({ turn }) {
  document.getElementById('turn').textContent = turn
  hpDisplay.textContent = game.player.hp + ' / ' + game.player.maxHp
})

game.events.on('audio', function({ name }) {
  console.log('[sfx]', name)
})
```

### Adding entities at runtime

```js
// NPCs are neutral towards the player; hostile only to enemies
var villager = CrawlLib.createNpc({
  type: 'villager',
  sprite: 'v',
  x: 5, z: 3,
  hp: 20, attack: 2, defense: 1,
  faction: 'npc',
})

// Enemies are hostile to both the player and NPCs
var goblin = CrawlLib.createEnemy({
  type:    'goblin',
  sprite:  'g',
  x: 10, z: 10,
  hp: 15, maxHp: 15,
  attack: 4, defense: 1,
  speed: 6,
  danger: 1,
  xp: 20,
})

// Register entities with the scheduler so they act each turn
game.turns.addActor(villager)
game.turns.addActor(goblin)
```

### 3D Renderer

The 3D renderer is created separately from the game object. This allows you to defer renderer creation until the atlas image has loaded while still attaching game callbacks synchronously.

```js
const atlasImg = new Image()
atlasImg.onload = function() {
  var renderer = CrawlLib.createDungeonRenderer(
    document.getElementById('viewport'),
    game,
    {
      // Tile atlas — pass a pre-loaded HTMLImageElement
      atlas: {
        image:       atlasImg,
        tileWidth:   64,
        tileHeight:  64,
        sheetWidth:  512,
        sheetHeight: 1024,
        columns:     8,
      },
      // Tile IDs are 0-based row-major indices into the sheet:
      //   id = (pixelY / tileHeight) * columns + (pixelX / tileWidth)
      floorTileId: 20,
      ceilTileId:  19,
      wallTileId:  16,

      // Optional overrides (all have sensible defaults)
      fov:          75,
      tileSize:     3,
      ceilingHeight: 3,
      fogNear:      5,
      fogFar:       24,
      fogColor:     '#000000',
      lerpFactor:   0.18,
      bandNear:     8,
      torchIntensity: 0.33,
    },
  )

  // After creating the renderer, generate the dungeon
  game.generate()

  // Update entity visuals each turn
  game.events.on('turn', function() {
    renderer.setEntities(enemies)
  })
}
atlasImg.src = './atlas.png'
```

`createDungeonRenderer` returns a `DungeonRenderer` handle:

| Method | Description |
|---|---|
| `renderer.setEntities(entities)` | Pass the current live entity list; call on every `'turn'` event |
| `renderer.destroy()` | Unmount the canvas and release all Three.js resources |

### Surface painting callback

Register a callback to paint atlas tile layers onto tiles per position. Return an ordered array of atlas tile IDs to composite over the base tile, or `null` to leave it unchanged.

```js
CrawlLib.attachSurfacePainter(game, {
  onPaint: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    if (Math.abs(x - room.cx) + Math.abs(y - room.cz) <= 1) {
      return ['wet-overlay']
    }

    return null
  },
})
```

### Layer system vs. surface painting

Both add visual detail on top of the base atlas tiles, but they operate at different layers of the stack.

| | `renderer.addLayer` | `attachSurfacePainter` / `dungeon.paint` |
|---|---|---|
| **Where it lives** | Renderer — instanced meshes on top of geometry | Dungeon — tile data stored per-cell |
| **Driven by** | Per-face renderer callback | Per-position dungeon callback or imperative call |
| **Serialized with dungeon** | No | Yes (via `dungeon.paint`) |
| **Best for** | Visual overlays (decals, glows, trim) wired to renderer-side flags | Tile state tied to dungeon data (biomes, wear, wetness) |
| **Update path** | `handle.rebuild()` after state changes | `game.dungeon.paint()` / `game.dungeon.unpaint()` |

**Use `addLayer`** when the overlay is purely visual and the renderer decides what to show on a per-face basis — for example, blood-splatter decals driven by a `cell.hasBlood` flag, or trim meshes along every north wall.

**Use `attachSurfacePainter`** (or `dungeon.paint`) when the overlay represents dungeon *state* — for example, wet tiles, moss growth, or biome zones — especially when that state needs to survive serialization or be shared over the network.

### Loading a Tiled map

```js
fetch('./maps/dungeon-level-1.tmj')
  .then(function(r) { return r.json() })
  .then(function(tiledMap) {
    var game = CrawlLib.createGame(document.getElementById('viewport'), {
      dungeon: {
        tiled: {
          map: tiledMap,
          layers: {
            solid:   'Collision',
            floor:   'Floor',
            wall:    'Walls',
            ceiling: 'Ceiling',
            objects: 'Objects',
          },
          objectTypes: {
            'PlayerStart':  'playerStart',
            'Chest':        'chest',
            'Exit':         'exit',
            'NPC_Villager': 'npc:villager',
            'Mob_Goblin':   'mob:goblin',
          },
          tilesetMap: {
            1:  'cobblestone-floor',
            17: 'flagstone-floor',
            33: 'concrete-wall',
          },
        },
      },
      player: { hp: 30, attack: 3, defense: 2 },
    })

    game.generate()
  })
```

### HUD overlay with plain HTML

The renderer creates its own `<canvas>` inside the viewport element. Overlay HTML on top for your HUD:

```html
<style>
  #container { position: relative; width: 100vw; height: 100vh; }
  #viewport  { position: absolute; inset: 0; }
  #hud       { position: absolute; top: 16px; left: 16px; color: #fff;
               font: bold 16px monospace; pointer-events: none; }
  #minimap   { position: absolute; bottom: 16px; right: 16px; }
</style>

<div id="container">
  <div id="viewport"></div>
  <div id="hud">
    HP: <span id="hp">30</span> &nbsp; Turn: <span id="turn">0</span>
  </div>
  <canvas id="minimap" width="196" height="196"></canvas>
</div>

<script>
  var game = CrawlLib.createGame(document.getElementById('viewport'), { /* ... */ })

  // Enable the built-in minimap renderer pointed at a 2D canvas
  CrawlLib.attachMinimap(game, document.getElementById('minimap'), {
    size: 196,
    showEntities: true,
  })

  // Keep the text HUD in sync
  game.events.on('turn', function({ turn }) {
    document.getElementById('hp').textContent   = game.player.hp
    document.getElementById('turn').textContent = turn
  })

  game.generate()
</script>
```

### Spawn callback

> Attach all callbacks before calling `game.generate()`. The dungeon is not built until `generate()` is called, so any `attachSpawner`, `attachDecorator`, or `attachSurfacePainter` calls made beforehand are guaranteed to be in place when generation runs.

Register a callback to control enemy spawning. It is called for each candidate room position during dungeon generation. Return an entity (or array of entities) to spawn, or `null` to skip.

```js
var enemies = []

CrawlLib.attachSpawner(game, {
  onSpawn: function({ dungeon, roomId, x, y }) {
    if (roomId < 2) return null                 // skip early rooms
    if (Math.random() > 0.55) return null       // random density

    var e = CrawlLib.createEnemy({
      type:    'goblin',
      sprite:  'g',
      x:       x,
      z:       y,
      hp:      8,
      maxHp:   8,
      attack:  2,
      defense: 0,
      speed:   6,
      danger:  1,
      xp:      10,
    })
    enemies.push(e)
    return e
  },
})
```

The `onSpawn` callback receives:

| Parameter | Type | Description |
|---|---|---|
| `dungeon` | object | Dungeon handle (rooms, passages, decorations) |
| `roomId` | number | ID of the room being populated |
| `x` | number | Tile X coordinate of the candidate spawn point |
| `y` | number | Tile Y coordinate of the candidate spawn point (maps to entity `z`) |

---

### Decoration callback

Register a callback to place stationary props (furniture, barrels, fixtures, etc.). Return a decoration, an array of decorations, or `null`.

```js
CrawlLib.attachDecorator(game, {
  onDecorate: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    if (Math.random() < 0.05) {
      return CrawlLib.createDecoration({
        type:       'barrel',
        x:          x,
        z:          y,
        sprite:     'barrel',
        blocksMove: true,
      })
    }

    return null
  },
})
```

### Keybindings helper

Instead of writing your own `keydown` handler, use the built-in binding helper. Action names are arbitrary strings you define:

```js
CrawlLib.attachKeybindings(game, {
  bindings: {
    moveForward:  ['w', 'ArrowUp'],
    moveBackward: ['s', 'ArrowDown'],
    moveLeft:     ['a', 'ArrowLeft'],
    moveRight:    ['d', 'ArrowRight'],
    turnLeft:     ['q', 'Q'],
    turnRight:    ['e', 'E'],
    interact:     ['i'],
    wait:         [' '],
  },

  onAction: function(action, event) {
    event.preventDefault()
    if (!game.player.alive) return
    const yaw = game.player.facing
    const fx = Math.round(-Math.sin(yaw))
    const fz = Math.round(-Math.cos(yaw))
    const sx = Math.round( Math.cos(yaw))
    const sz = Math.round(-Math.sin(yaw))
    let a
    switch (action) {
      case 'moveForward':  a = game.player.move( fx,  fz); break
      case 'moveBackward': a = game.player.move(-fx, -fz); break
      case 'moveLeft':     a = game.player.move(-sx, -sz); break
      case 'moveRight':    a = game.player.move( sx,  sz); break
      case 'turnLeft':     a = game.player.rotate( Math.PI / 2); break
      case 'turnRight':    a = game.player.rotate(-Math.PI / 2); break
      case 'interact':     a = game.player.interact(null); break
      case 'wait':         a = game.player.wait(); break
    }
    if (a) game.turns.commit(a)
  },
})
```

### Script tag API surface

| Function | Description |
|---|---|
| `CrawlLib.createGame(element, options)` | Set up game logic; returns a `game` handle — does not generate the dungeon |
| `CrawlLib.createDungeonRenderer(element, game, opts)` | Mount the Three.js first-person renderer; returns a `DungeonRenderer` handle |
| `CrawlLib.attachMinimap(game, canvas, opts)` | Wire up a 2D canvas minimap |
| `CrawlLib.attachSpawner(game, opts)` | Register a spawn callback to control entity placement |
| `CrawlLib.attachDecorator(game, opts)` | Register a decoration callback to place stationary props |
| `CrawlLib.attachSurfacePainter(game, opts)` | Register a callback to paint atlas layers on surfaces |
| `CrawlLib.attachKeybindings(game, opts)` | Register keyboard bindings |
| `CrawlLib.createNpc(opts)` | Create an NPC entity |
| `CrawlLib.createEnemy(opts)` | Create an enemy entity |
| `CrawlLib.createDecoration(opts)` | Create a stationary decoration |
| `CrawlLib.createItem(opts)` | Create an item |
| `CrawlLib.buildTilesetMap(tiledJson, options)` | Build a GID→atlas-name map from a Tiled tileset JSON |
| `CrawlLib.createWebSocketTransport(url)` | Create a browser-side WebSocket transport for multiplayer |
| `CrawlLib.registerTheme(name, def)` | Register a custom dungeon theme |

---

## Core Concepts

### Dungeon

The dungeon is a grid of tiles encoded as `DataTexture` maps (solid, floor type, wall type, ceiling type, overlays). It is decoupled from rendering — you can swap renderers without touching game logic.

```js
dungeon: {
  // Procedural BSP generation
  seed:        12345,
  width:       64,
  height:      64,
  minLeafSize: 8,
  maxLeafSize: 20,
  minRoomSize: 4,
  maxRoomSize: 14,

  // Called after generation for custom object, entity, decoration, and surface placement
  onPlace: function({ rooms, endRoom, startRoom, rng, place }) {
    place.object(endRoom.cx, endRoom.cz, 'exit')
    rooms.forEach(function(room) {
      if (rng.chance(0.4)) place.object(room.cx, room.cz, 'chest')
      if (rng.chance(0.3)) place.npc(room.cx, room.cz, 'villager')
      if (rng.chance(0.2)) place.enemy(room.cx, room.cz, 'goblin')
      if (rng.chance(0.3)) place.decoration(room.cx - 1, room.cz, 'barrel')
      // Paint atlas layers in sequence over the generated tile
      place.surface(room.cx, room.cz, ['flagstone-floor', 'crack-overlay'])
    })
  },
}
```

#### Dungeon Themes

Themes control which atlas tile types are written into the floor/wall/ceiling channels during generation. Five built-in themes are included:

| Key | Floor | Wall | Ceiling |
|---|---|---|---|
| `dungeon` | Cobblestone | Cobblestone | Cobblestone |
| `crypt` | Flagstone | Concrete | Flagstone |
| `catacomb` | Cobblestone | Plaster | Concrete |
| `industrial` | Steel | Concrete | Steel |
| `ruins` | Dirt | Cobblestone | Cobblestone |

Pass a `theme` key to the dungeon config to apply it uniformly, or use a `ThemeSelector` to vary themes per room:

```js
dungeon: {
  seed: 12345, width: 40, height: 40,
  // A single built-in theme key
  theme: 'crypt',

  // Or an array for random uniform selection
  theme: ['dungeon', 'crypt'],

  // Or weighted pairs
  theme: [['dungeon', 3], ['crypt', 1]],

  // Or a callback for full per-room control
  theme: ({ roomId, rng }) => roomId === 0 ? 'crypt' : 'dungeon',
}
```

Register custom themes at any time before `game.generate()`:

```js
CrawlLib.registerTheme('marble', {
  floorType:   'MarbleFloor',
  wallType:    'MarbleWall',
  ceilingType: 'MarbleCeiling',
})
```

---

#### Cellular Automata Generator

As an alternative to the BSP algorithm, pass `generator: 'cellular'` to produce organic cave-like layouts:

```js
dungeon: {
  generator: 'cellular',
  seed:      0xdeadbeef,
  width:     64,
  height:    64,
  // Cellular-specific options
  fillRatio:   0.45,   // initial wall density (0–1); default 0.45
  iterations:  5,      // smoothing passes; default 5
}
```

Both generators return identical `DungeonOutputs` shapes, so all other systems (rendering, themes, passages, etc.) work unchanged.

---

#### Dungeon Serialization

Save the full dungeon state to JSON and restore it later:

```js
import { serializeDungeon, deserializeDungeon } from 'r3f-crawl-lib'

// After game.generate():
const snapshot = serializeDungeon(game.dungeon.outputs)
localStorage.setItem('dungeon', JSON.stringify(snapshot))

// On reload — pass the restored outputs as dungeon.restore:
const saved = JSON.parse(localStorage.getItem('dungeon'))
const game = CrawlLib.createGame(el, {
  dungeon: { restore: deserializeDungeon(saved) },
  player:  { hp: 30 },
})
game.generate()
```

---

#### Tiled Map Import

Export your map from [Tiled](https://www.mapeditor.org/) as **JSON** (`.tmj`) and use it instead of procedural generation.

```js
dungeon: {
  tiled: {
    map: tiledMap,   // parsed JSON from a .tmj file

    // Map Tiled layer names to dungeon data channels
    layers: {
      solid:    'Collision',   // nonzero tile = impassable wall
      floor:    'Floor',
      wall:     'Walls',
      ceiling:  'Ceiling',
      overlays: 'Overlays',
      objects:  'Objects',     // object layer -> entity spawn points
    },

    // Map Tiled object type strings to r3f-crawl-lib entity types
    objectTypes: {
      'PlayerStart':  'playerStart',
      'Chest':        'chest',
      'Exit':         'exit',
      'NPC_Villager': 'npc:villager',
      'NPC_Guard':    'npc:guard',
      'Mob_Goblin':   'mob:goblin',
      'Mob_Troll':    'mob:troll',
      'Passage':      'passage',
    },

    // Map Tiled tileset GIDs to atlas tile names (used by surface painter)
    tilesetMap: {
      1:  'cobblestone-floor',
      17: 'flagstone-floor',
      33: 'concrete-wall',
      // ...
    },
  },
}
```

---

### Ceiling & Floor Height Offsets

Each cell can carry an independent floor and ceiling height offset encoded in `DungeonOutputs.floorHeightOffset` and `DungeonOutputs.ceilingHeightOffset` (R8 `DataTexture`s, 128 = no offset). The BSP and cellular generators expose an `onHeightOffset` callback to set these per-cell:

```js
dungeon: {
  seed: 12345, width: 40, height: 40,
  onHeightOffset({ x, y, roomId, rng }) {
    // Return { floor?, ceiling? } in world units (positive = raise, negative = lower)
    if (rng() < 0.05) return { floor: -1.5 }   // pit tile — floor is omitted from rendering
    if (rng() < 0.1)  return { ceiling: -0.5 }  // lower ceiling
    return null
  },
}
```

Tiles with a floor offset value of `0` are treated as **pits** — the floor mesh is omitted and the player cannot walk on them (the solid map marks them impassable). The renderer reads both textures and applies the offset as a Y translation per instance.

---

### Player

```js
player: {
  x: 2, z: 2,         // starting grid position (overridden by PlayerStart object if using Tiled)
  hp: 30, maxHp: 30,
  attack: 4, defense: 2,
  speed: 5,            // turn cost — lower = faster
}
```

Reactive state and action methods on `game.player`:

```js
game.player.x          // current grid X
game.player.z          // current grid Z
game.player.hp         // current HP
game.player.maxHp      // maximum HP
game.player.facing     // camera yaw in radians
game.player.inventory  // array of item slots
game.player.alive      // boolean

// Imperative actions (pass to turns.commit)
game.player.move(dx, dz)          // grid delta — use facing-relative math for first-person movement
game.player.rotate(angle)         // radians; positive = counter-clockwise
game.player.interact(entityId)    // pass null to interact with adjacent objects
game.player.wait()
game.player.pickup(itemId)
game.player.useItem(slotIndex)
game.player.dropItem(slotIndex)
```

---

### Turn Scheduler

```js
var turns = game.turns

// Commit a player action and advance the scheduler
turns.commit(game.player.move(1, 0))

// Current turn counter
turns.turn    // number

// Add or remove actors dynamically
turns.addActor(entity)
turns.removeActor(entity.id)
```

The scheduler runs all registered actors (NPCs and enemies) in priority order after each player action.

```js
// onAdvance fires each time the scheduler advances a tick
var game = CrawlLib.createGame(element, {
  turns: {
    onAdvance: function({ turn, dt }) {
      // called between player inputs as other actors take their turns
    },
  },
})
```

---

### Entities

All entities share a common base interface.

```js
// Entity base interface
{
  id:         string,     // auto-generated unique identifier
  kind:       string,     // 'player' | 'npc' | 'enemy' | 'decoration'
  type:       string,     // entity subtype label
  sprite:     string,     // sprite key (single character glyph or atlas name)
  x:          number,
  z:          number,
  hp:         number,
  maxHp:      number,
  attack:     number,
  defense:    number,
  speed:      number,
  alive:      boolean,
  blocksMove: boolean,
  faction:    string,     // 'player' | 'npc' | 'enemy'
}
```

#### NPCs

NPCs are friendly to the player but will fight back against enemies.

```js
var villager = CrawlLib.createNpc({
  type:    'villager',
  sprite:  'v',
  x: 5, z: 3,
  hp: 20, attack: 2, defense: 1,
  faction: 'npc',
})
```

`createNpc` options:

| Field | Type | Default |
|---|---|---|
| `type` | string | required |
| `sprite` | string \| number | required |
| `x`, `z` | number | required |
| `hp` | number | `10` |
| `maxHp` | number | `hp` |
| `attack` | number | `0` |
| `defense` | number | `0` |
| `speed` | number | `5` |
| `blocksMove` | boolean | `true` |
| `faction` | string | `'none'` |

#### Enemies

Enemies are hostile to both the player and NPCs.

```js
var goblin = CrawlLib.createEnemy({
  type:    'goblin',
  sprite:  'g',
  x: 10, z: 10,
  hp: 15, maxHp: 15,
  attack: 4, defense: 1,
  speed:  6,
  danger: 1,   // 0–10 scale; affects detection radius and persistence
  xp:     20,
})
```

`createEnemy` options (extends NPC opts):

| Field | Type | Default |
|---|---|---|
| `danger` | number | `1` |
| `xp` | number | `10` |
| `rpsEffect` | string | `'none'` |

The returned `EnemyEntity` also has `alertState: 'idle' | 'chasing' | 'searching'` and `searchTurnsLeft`.

#### Active Effects

Status effects can be applied to any entity and ticked each turn. Effects support three stacking modes: `replace` (newest wins), `stack` (additive), and `max` (keep highest value).

```js
import { applyEffect, tickEffects } from 'r3f-crawl-lib'

// Apply a poison effect to a defender after combat
game.events.on('damage', function({ defender }) {
  applyEffect(defender, {
    id:        'poison',
    duration:  5,           // turns remaining
    tickDamage: 2,
    stackMode: 'stack',     // 'replace' | 'stack' | 'max'
  })
})

// Advance effects each turn — returns events for any effect damage / expiry
game.turns.onAdvance = function({ entities }) {
  for (const e of entities) {
    const events = tickEffects(e)
    for (const ev of events) {
      if (ev.type === 'effect-damage') game.events.emit('damage', ev)
    }
  }
}
```

---

#### Spawn Callback

`attachSpawner` lets you control enemy placement with a single callback. The library calls `onSpawn` for each candidate room tile during generation. Return an entity or array of entities to place them, or `null` / `undefined` to skip.

```js
CrawlLib.attachSpawner(game, {
  onSpawn: function({ dungeon, roomId, x, y }) {
    if (roomId < 2) return null   // skip spawn rooms near the start

    return CrawlLib.createEnemy({
      type:    'goblin',
      sprite:  'g',
      x:       x,
      z:       y,
      hp:      8, maxHp: 8,
      attack:  2, defense: 0,
      speed:   6, danger: 1, xp: 10,
    })
  },
})
```

---

### Decorations

Decorations are stationary props — furniture, barrels, wall fixtures, etc. They have no AI or combat stats and are not alive in the turn sense.

```js
var barrel = CrawlLib.createDecoration({
  type:       'barrel',
  x:          8,
  z:          5,
  sprite:     'barrel',
  blocksMove: true,    // default: false
  yaw:        0,       // rotation in radians
  scale:      1,       // uniform scale multiplier
})
```

Decoration fields on the returned entity:

```js
{
  id:         string,     // auto-generated
  kind:       'decoration',
  type:       string,
  x:          number,
  z:          number,
  sprite:     string,
  blocksMove: boolean,
  alive:      false,      // decorations are never alive
  yaw:        number,
  scale:      number,
}
```

Use `attachDecorator` to place decorations via a per-tile callback during dungeon setup:

```js
CrawlLib.attachDecorator(game, {
  onDecorate: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    if (Math.random() < 0.05) {
      return CrawlLib.createDecoration({
        type: 'barrel', x: x, z: y, sprite: 'barrel', blocksMove: true,
      })
    }

    return null
  },
})
```

Decorations can also be placed imperatively at any time:

```js
var pillar = CrawlLib.createDecoration({ type: 'pillar', x: 4, z: 6, sprite: 'stone-pillar', blocksMove: true })
game.dungeon.decorations.add(pillar)
game.dungeon.decorations.remove(pillar.id)
game.dungeon.decorations.list   // DecorationEntity[]
```

---

### Combat

The library uses three factions. Enemies are hostile to everyone; NPCs and the player fight back only against enemies.

```js
combat: {
  // Damage formula (default: max(1, attacker.attack - defender.defense))
  damageFormula: function({ attacker, defender }) {
    return Math.max(1, attacker.attack - defender.defense)
  },

  // Faction hostility rules
  factions: [
    ['player', 'enemy',  'hostile'],
    ['npc',    'enemy',  'hostile'],
    ['enemy',  'player', 'hostile'],
    ['enemy',  'npc',    'hostile'],
  ],

  onDamage: function({ attacker, defender, amount }) { /* show float */ },
  onDeath:  function({ entity, killer }) { /* drop loot, award XP */ },
  onMiss:   function({ attacker, defender }) {},
}
```

---

### Items & Inventory

```js
// Create a generic item
var healthPotion = CrawlLib.createItem({
  id:   'health-potion',
  name: 'Health Potion',
  kind: 'consumable',
  onUse: function({ player }) {
    // apply effect
  },
})

// Chest drops — configured via onPlace or object layer
place.object(room.cx, room.cz, 'chest', {
  loot: [
    { id: 'health-potion', name: 'Health Potion', chance: 1.0 },
    { id: 'iron-sword',    name: 'Iron Sword',    chance: 0.3 },
    { id: 'gold-coin',     name: 'Gold Coin',     chance: 0.8, quantity: [1, 5] },
  ],
})
```

**Inventory:**

```js
game.player.inventory   // array of item slots (null = empty)
game.player.pickup(itemId)
game.player.useItem(slotIndex)
game.player.dropItem(slotIndex)
```

---

### Hidden Passages

```js
passages: {
  traversalFactor: 2,   // movement cost multiplier while inside a passage
  onToggle:   function({ passage, enabled }) {},
  onTraverse: function({ passage, progress }) {},
}

// Toggle nearest passage from script
var nearby = game.dungeon.passageNear(game.player.x, game.player.z)
if (nearby) game.dungeon.passages.toggle(nearby.id)

game.dungeon.passages.list   // HiddenPassage[]
```

---

### 3D Renderer

`createDungeonRenderer(element, game, options)` mounts a plain Three.js first-person renderer into any `HTMLElement`. It listens for `'turn'` events internally to keep the camera in sync.

```js
var renderer = CrawlLib.createDungeonRenderer(viewportEl, game, {
  // ── Tile atlas ──────────────────────────────────────────────────────────────
  atlas: {
    image:       atlasImg,   // pre-loaded HTMLImageElement
    tileWidth:   64,
    tileHeight:  64,
    sheetWidth:  512,
    sheetHeight: 1024,
    columns:     8,
  },

  // Tile IDs are 0-based row-major indices: id = row * columns + col
  // where row = pixelY / tileHeight, col = pixelX / tileWidth
  floorTileId:   20,
  ceilTileId:    19,
  wallTileId:    16,

  // ── Camera ────────────────────────────────────────────────────────────────
  fov:          75,          // degrees; default 75
  lerpFactor:   0.18,        // camera smoothing (0 = instant); default 0.18

  // ── Geometry ─────────────────────────────────────────────────────────────
  tileSize:      3,          // world units per grid cell; default 3
  ceilingHeight: 3,          // world-unit room height; default 3

  // ── Fog ──────────────────────────────────────────────────────────────────
  fogNear:  5,               // default 5
  fogFar:   24,              // default 24
  fogColor: '#000000',       // CSS colour string; default '#000000'

  // ── Torch lighting ────────────────────────────────────────────────────────
  bandNear:       8,         // world units before falloff begins; default 8
  torchColor:     new THREE.Color(1.0, 0.85, 0.4),  // warm yellow default
  torchIntensity: 0.33,      // 0–2 multiplier; default 0.33
})

// Update entities on every turn
game.events.on('turn', function() {
  renderer.setEntities(enemies)
})

// Clean up when done
renderer.destroy()
```

If no `atlas` is provided the renderer falls back to plain-coloured `MeshStandardMaterial` — useful for prototyping before an atlas is ready.

---

#### Per-direction Tile Specs

By default `floorTileId`, `ceilTileId`, and `wallTileId` apply to every face. For finer control, pass `wallTiles`, `floorSkirtTiles`, and `ceilSkirtTiles` as `DirectionFaceMap` objects to specify per-direction tile IDs and optional UV rotation:

```js
var renderer = CrawlLib.createDungeonRenderer(el, game, {
  atlas: { /* ... */ },
  floorTileId: 20,
  ceilTileId:  19,
  wallTileId:  16,

  // Per-direction overrides for wall faces
  wallTiles: {
    north: { tileId: 16, rotation: 0 },
    south: { tileId: 17, rotation: 0 },
    east:  { tileId: 16, rotation: 1 },  // rotation: 0–3 in 90° steps
    west:  { tileId: 16, rotation: 3 },
  },

  // Skirt panels visible at floor/ceiling junctions
  floorSkirtTiles: { north: { tileId: 18 }, south: { tileId: 18 } },
  ceilSkirtTiles:  { north: { tileId: 19 }, south: { tileId: 19 } },
})
```

`FaceTileSpec` fields: `tileId` (number) and optional `rotation` (0–3, clockwise 90° steps).

---

#### Layer System

The renderer supports stacking additional instanced meshes on top of any surface via `renderer.addLayer(spec)`. This is the primary way to add details such as decals, trim, glows, or overlays without a custom renderer.

```js
var handle = renderer.addLayer({
  target:   'floor',       // 'floor' | 'ceil' | 'wall' | 'floorSkirt' | 'ceilSkirt'
  tileId:   22,            // atlas tile index for this layer
  yOffset:  0.01,          // nudge up/down in world units to avoid z-fighting
  filter({ x, z, face, dungeon }) {
    // Return { visible: true } to show this layer on this face, or null to hide it
    const cell = dungeon.getCell(x, z)
    return cell.hasBlood ? { visible: true } : null
  },
})

// Remove a layer at any time
handle.remove()

// Force the layer to rebuild after dungeon state changes
handle.rebuild()
```

`LayerSpec` fields:

| Field | Type | Description |
|---|---|---|
| `target` | `LayerTarget` | Surface to attach to: `'floor'`, `'ceil'`, `'wall'`, `'floorSkirt'`, `'ceilSkirt'` |
| `tileId` | number | Atlas tile index to render on this layer |
| `yOffset` | number | World-unit Y offset (useful to prevent z-fighting) |
| `filter` | function | Per-face callback — return `{ visible: true }` or `null` |

---

### Surface Painting

Each tile position can have an ordered stack of atlas tile IDs composited over the base generated tile. Use `attachSurfacePainter` to drive painting from a per-tile callback, or paint imperatively via `game.dungeon.paint()`.

```js
CrawlLib.attachSurfacePainter(game, {
  onPaint: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    // Puddle near room centre
    if (Math.abs(x - room.cx) + Math.abs(y - room.cz) <= 1) {
      return ['wet-overlay']
    }

    return null
  },
})

// Imperative painting (replaces any previous paint at that position)
game.dungeon.paint(x, z, ['moss-overlay', 'crack-overlay'])
game.dungeon.unpaint(x, z)
```

---

### Layer System vs. Surface Painting

Both add visual detail on top of the base atlas tiles, but they operate at different layers of the stack.

| | Layer System (`addLayer`) | Surface Painting (`attachSurfacePainter` / `dungeon.paint`) |
|---|---|---|
| **Where it lives** | Renderer — instanced meshes on top of geometry | Dungeon — tile data stored per-cell |
| **Driven by** | Per-face renderer callback | Per-position dungeon callback or imperative call |
| **Serialized with dungeon** | No | Yes (via `dungeon.paint`) |
| **Best for** | Visual overlays (decals, glows, trim) wired to renderer-side flags | Tile state tied to dungeon data (biomes, wear, wetness) |
| **Update path** | `handle.rebuild()` after state changes | `game.dungeon.paint()` / `game.dungeon.unpaint()` |

**Use `addLayer`** when the overlay is purely visual and the renderer decides what to show on a per-face basis — for example, blood-splatter decals driven by a `cell.hasBlood` flag, or trim meshes along every north wall.

**Use `attachSurfacePainter`** (or `dungeon.paint`) when the overlay represents dungeon *state* — for example, wet tiles, moss growth, or biome zones — especially when that state needs to survive serialization or be shared over the network.

---

### Keybindings

```js
CrawlLib.attachKeybindings(game, {
  bindings: {
    // keys are arbitrary action names; values are arrays of KeyboardEvent.key strings
    moveForward:  ['w', 'ArrowUp'],
    moveBackward: ['s', 'ArrowDown'],
    moveLeft:     ['a', 'ArrowLeft'],
    moveRight:    ['d', 'ArrowRight'],
    turnLeft:     ['q', 'Q'],
    turnRight:    ['e', 'E'],
    wait:         [' '],
  },

  onAction: function(action, event) {
    // action is the key from bindings; event is the raw KeyboardEvent
    if (action === 'moveForward') game.turns.commit(game.player.move(/* ... */))
    // ...
  },
})
```

---

### Audio

The library emits named audio events you can hook into Howler (or any audio library):

```js
game.events.on('audio', function({ name, position }) {
  // name: 'footstep' | 'hit' | 'death' | 'xp-pickup' | 'item-pickup'
  //       | 'chest-open' | 'door-open' | 'passage-toggle' | ...
  if (sounds[name]) {
    sounds[name].pos(position ? position.x : 0, 0, position ? position.z : 0).play()
  }
})
```

---

### Events

Subscribe to game events via `game.events.on(name, handler)`:

```js
game.events.on('turn',       function({ turn }) { /* fires every turn */ })
game.events.on('damage',     function({ attacker, defender, amount }) {})
game.events.on('death',      function({ entity, killer }) { /* spawn loot drop here */ })
game.events.on('xp-gain',    function({ amount, x, z }) {})
game.events.on('heal',       function({ entity, amount }) {})
game.events.on('miss',       function({ attacker, defender }) {})
game.events.on('chest-open', function({ chest, loot }) {})
game.events.on('item-pickup',function({ item, entity }) {})
game.events.on('audio',      function({ name, position }) {})
```

---

## Multiplayer Transport

The library includes an optional server-authoritative multiplayer layer. When a `transport` is provided to `createGame`, all player actions are forwarded to the server instead of applied locally. The server validates each action, updates canonical state, and broadcasts a `ServerStateUpdate` to all connected clients. Single-player code paths are completely unaffected when no transport is set.

### Browser side

```js
const game = CrawlLib.createGame(el, {
  dungeon: { /* ... */ },
  player: {
    id: 'player-abc',   // stable player ID for reconnections
    hp: 30,
  },
  transport: CrawlLib.createWebSocketTransport('wss://your-server/game'),
})
```

`createWebSocketTransport(url)` returns an `ActionTransport` that:
- Sends every `turns.commit()` call to the server as a JSON message
- Listens for `ServerStateUpdate` messages and patches local turn state automatically
- Re-emits the `'turn'` event so UI updates work without any extra wiring

### Server side

The server entry point (`src/server/index.js`) is an Express + `ws` server that:
- Generates the dungeon server-side from the host player's config so the solid map is authoritative
- Validates every player move before accepting it
- Broadcasts state to all peers in the room
- Serves the multiplayer example and static assets on a single port

A minimal Three.js shim (`src/server/three-shim.js`) lets `bsp.ts` run in Node without a real GPU context.

### Network types

| Type | Description |
|---|---|
| `ActionTransport` | Interface for custom transport implementations |
| `ServerStateUpdate` | Payload broadcast to all room peers after each validated action |
| `PlayerNetState` | Per-player position and stats included in each update |
| `DungeonInitPayload` | Sent by the server to new connections to bootstrap dungeon state |

---

## Tiled Workflow

1. Create your map in [Tiled](https://www.mapeditor.org/) with separate layers for `Floor`, `Walls`, `Ceiling`, `Overlays`, and an object layer `Objects`.
2. Export as **JSON** (File > Export As > JSON Map Files `.tmj`).
3. Fetch the `.tmj` at runtime and pass it to `createGame()` under `dungeon.tiled`.
4. Use `tilesetMap` to bridge Tiled tile GIDs to your atlas tile IDs for surface painting.

Object layer entries become entity spawn points consumed by your `onPlace` callback via the `objectTypes` map.

---

## Configuration Reference

All settings are passed directly to `CrawlLib.createGame()` or the relevant `attach*` helper.

| Section | Key settings |
|---|---|
| `dungeon` | `seed`, `width`, `height`, `minLeafSize`, `maxLeafSize`, `minRoomSize`, `maxRoomSize`, `generator` (`'bsp'` \| `'cellular'`), `theme` (string / array / weighted pairs / callback), `onPlace`, `onHeightOffset`, `restore` |
| `dungeon` (cellular) | `fillRatio`, `iterations` |
| `dungeon.tiled` | `map`, `layers`, `objectTypes`, `tilesetMap` |
| `player` | `id`, `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed` |
| `turns` | `onAdvance` |
| `combat` | `damageFormula`, `factions`, `onDamage`, `onDeath`, `onMiss` |
| `passages` | `traversalFactor`, `onToggle`, `onTraverse` |
| `transport` | `ActionTransport` instance (e.g. from `createWebSocketTransport`) |
| `createDungeonRenderer` | `atlas`, `floorTileId`, `ceilTileId`, `wallTileId`, `wallTiles`, `floorSkirtTiles`, `ceilSkirtTiles`, `fov`, `tileSize`, `ceilingHeight`, `fogNear`, `fogFar`, `fogColor`, `lerpFactor`, `bandNear`, `torchColor`, `torchIntensity` |
| `renderer.addLayer` | `target`, `tileId`, `yOffset`, `filter` |
| `attachSpawner` | `onSpawn` — callback receiving `{ dungeon, roomId, x, y }` |
| `attachDecorator` | `onDecorate` — callback receiving `{ dungeon, roomId, x, y }` |
| `attachSurfacePainter` | `onPaint` — callback receiving `{ dungeon, roomId, x, y }`, returns ordered array of atlas tile name strings |
| `attachKeybindings` | `bindings`, `onAction` |

---

## Tile Atlas Format

The tile atlas is a PNG sprite sheet. Each tile is addressed by a **0-based row-major index**:

```
tileId = (pixelY / tileHeight) * columns + (pixelX / tileWidth)
```

Pass the atlas as a pre-loaded `HTMLImageElement` along with its dimensions to `createDungeonRenderer`:

```js
const atlasImg = new Image()
atlasImg.onload = function() {
  var renderer = CrawlLib.createDungeonRenderer(el, game, {
    atlas: {
      image:       atlasImg,
      tileWidth:   64,     // px per tile
      tileHeight:  64,
      sheetWidth:  512,    // total sheet width in px
      sheetHeight: 1024,
      columns:     8,      // sheetWidth / tileWidth
    },
    floorTileId: 20,       // tile at row 2, col 4 of an 8-column sheet
    ceilTileId:  19,       // tile at row 2, col 3
    wallTileId:  16,       // tile at row 2, col 0
  })
}
atlasImg.src = './atlas.png'
```

Example layout for a 512×1024 sheet with 64×64 tiles (8 columns):

| Tile ID | Row | Col | Example use |
|---|---|---|---|
| 0–7 | 0 | 0–7 | First row of tiles |
| 16 | 2 | 0 | Brick wall |
| 19 | 2 | 3 | Cobblestone ceiling |
| 20 | 2 | 4 | Flagstone floor |

The renderer uses nearest-neighbour filtering and per-face UV clamping to prevent atlas bleed at tile edges.

### Embedding the atlas as a Base64 data URL

When serving examples directly from the filesystem (`file://`) or in sandboxed environments where external image fetches are blocked, you can embed the atlas image as a Base64 data URL in a plain JS file and load it with a `<script>` tag.

Two helper scripts in `utils/` automate this conversion:

**Linux / macOS (Bash):**
```bash
chmod +x utils/imageToBase64Js.sh
./utils/imageToBase64Js.sh assets/atlas.png examples/basic/atlas-data.js
```

**Windows (PowerShell):**
```powershell
.\utils\image.ToBase64Js.ps1 assets\atlas.png examples\basic\atlas-data.js
```

Both scripts accept the image path as the first argument and the output JS path as the second. Running either script without arguments prints full usage help. The generated file assigns the data URL to `window.ATLAS_DATA_URL`:

```js
window.ATLAS_DATA_URL = "data:image/png;base64,iVBORw0K...";
```

Include it before your main script and use `ATLAS_DATA_URL` as the image `src`:

```html
<script src="atlas-data.js"></script>
<script>
  const atlasImg = new Image()
  atlasImg.onload = function () {
    var renderer = CrawlLib.createDungeonRenderer(el, game, { atlas: { image: atlasImg, ... }, ... })
  }
  atlasImg.src = window.ATLAS_DATA_URL
</script>
```
