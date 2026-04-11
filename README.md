# r3f-crawl-lib

A composable JavaScript library built on [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for building first-person 3D dungeon crawl games in the browser.

Game logic lives entirely in your JS layer — the library provides the rendering engine, turn system, entity model, and dungeon tools. You wire them together however you like.

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
  - [Loading a Tiled map](#loading-a-tiled-map)
  - [HUD overlay with plain HTML](#hud-overlay-with-plain-html)
  - [Spawn callback](#spawn-callback)
  - [Decoration callback](#decoration-callback)
  - [Surface painting callback](#surface-painting-callback)
  - [Keybindings helper](#keybindings-helper)
  - [Script tag API surface](#script-tag-api-surface)
- [Core Concepts](#core-concepts)
  - [Dungeon](#dungeon)
    - [Tiled Map Import](#tiled-map-import)
  - [Player](#player)
  - [Turn Scheduler](#turn-scheduler)
  - [Entities](#entities)
    - [NPCs](#npcs)
    - [Enemies](#enemies)
    - [Spawn Callback](#spawn-callback-1)
  - [Decorations](#decorations)
  - [Surface Painting](#surface-painting)
  - [Combat](#combat)
  - [Items & Inventory](#items--inventory)
  - [Hidden Passages](#hidden-passages)
  - [Rendering](#rendering)
  - [Keybindings](#keybindings)
  - [Audio](#audio)
  - [Events](#events)
- [Tiled Workflow](#tiled-workflow)
- [Configuration Reference](#configuration-reference)
- [Atlas Format](#atlas-format)
- [Character Atlas Format](#character-atlas-format)
  - [Sprite assignment](#sprite-assignment)

---

## Features

- First-person 3D tile-based dungeon rendering with torch lighting and fog
- BSP dungeon generator or **Tiled map import** (`.tmj` / `.tsj` JSON exports)
- Turn-based scheduler with priority queue
- Entity system: player, NPCs, enemies, items, chests
- Three-faction combat model: `player`, `npc`, `enemy`
- Sprite billboard rendering with body/head layers
- Minimap with entity overlays
- Chest drops and item pickups
- Hidden passage traversal
- Callback-driven enemy spawning
- Stationary decoration entities (billboarded sprites for furniture, props, etc.)
- Atlas surface painting — apply tile layers to walls, floors, and ceilings per-tile
- Configurable keybindings
- Audio hooks (Howler.js compatible)
- Script tag API — no build step required

---

## Installation

### `<script>` tag (no build step)

Load dependencies from a CDN, then load the library UMD bundle. All exports are available on `window.CrawlLib`.

```html
<!-- Dependencies -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/three@0.165/build/three.min.js"></script>
<script src="https://unpkg.com/@react-three/fiber@8/dist/react-three-fiber.umd.js"></script>
<script src="https://unpkg.com/@react-three/drei@9/dist/drei.umd.js"></script>

<!-- r3f-crawl-lib UMD bundle -->
<script src="https://unpkg.com/r3f-crawl-lib/dist/r3f-crawl-lib.umd.js"></script>
```

Once loaded, `window.CrawlLib` exposes an imperative `CrawlLib.createGame()` factory you can use directly from any HTML page without JSX or a build toolchain.

---

## Quick Start

`CrawlLib.createGame()` mounts the game into a DOM element and returns a `game` handle with state objects and action methods.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #game { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/three@0.165/build/three.min.js"></script>
  <script src="https://unpkg.com/@react-three/fiber@8/dist/react-three-fiber.umd.js"></script>
  <script src="https://unpkg.com/@react-three/drei@9/dist/drei.umd.js"></script>
  <script src="https://unpkg.com/r3f-crawl-lib/dist/r3f-crawl-lib.umd.js"></script>

  <script>
    const { createGame, createNpc, createEnemy, createItem } = CrawlLib

    const game = createGame(document.getElementById('game'), {
      dungeon: {
        seed: 42,
        width: 64,
        height: 64,
        themes: 'dungeon',
        onPlace: function({ rooms, endRoom, startRoom, rng, place }) {
          place.object(endRoom.cx, endRoom.cz, 'exit')
          rooms.forEach(function(room) {
            if (rng.chance(0.4)) place.object(room.cx, room.cz, 'chest')
            if (rng.chance(0.3)) place.npc(room.cx, room.cz, 'villager')
          })
        },
      },

      player: { x: 2, z: 2, hp: 30, attack: 3, defense: 2 },

      rendering: {
        atlas:              './atlas.png',
        atlasJson:          './atlas.json',
        characterAtlas:     './characters.png',
        characterAtlasJson: './characters.json',
        torch: {
          color:     '#ff9944',
          intensity: 1,
          fogNear:   4,
          fogFar:    28,
        },
      },
    })

    // Attach callbacks before generating — spawner, decorator, surface painter, etc.
    // then call generate() to build the dungeon and start the game.
    game.generate()

    // game.dungeon, game.player, game.turns are live state objects
    console.log('Player starts at', game.player.x, game.player.z)
  </script>
</body>
</html>
```

---

## Script Tag Developer Guide

This section covers using r3f-crawl-lib entirely from a `<script>` tag — no JSX, no bundler, no build step.

### The `game` handle

`createGame(canvas, options)` mounts the renderer and returns a `game` object but does **not** generate the dungeon. Attach any callbacks (`attachSpawner`, `attachDecorator`, `attachSurfacePainter`, etc.) first, then call `game.generate()` to build the dungeon and begin the game.

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

```html
<script>
  document.addEventListener('keydown', function(e) {
    switch (e.key) {
      case 'w': case 'ArrowUp':    game.turns.commit(game.player.move(0, -1));  break
      case 's': case 'ArrowDown':  game.turns.commit(game.player.move(0,  1));  break
      case 'a':                    game.turns.commit(game.player.move(-1, 0));   break
      case 'd':                    game.turns.commit(game.player.move( 1, 0));   break
      case 'q':                    game.turns.commit(game.player.rotate(-Math.PI / 2)); break
      case 'e':                    game.turns.commit(game.player.rotate( Math.PI / 2)); break
      case 'i':                    game.turns.commit(game.player.interact(null)); break
      case '.':                    game.turns.commit(game.player.wait());        break
    }
  })
</script>
```

### Listening to game events

Use `game.events.on()` to react to anything that happens:

```html
<script>
  var hpDisplay = document.getElementById('hp')
  var logEl     = document.getElementById('log')

  game.events.on('damage', function(e) {
    logEl.textContent = e.entity.id + ' takes ' + e.amount + ' damage'
    if (e.entity === game.player) {
      hpDisplay.textContent = game.player.hp + ' / ' + game.player.maxHp
    }
  })

  game.events.on('death', function(e) {
    logEl.textContent = e.entity.id + ' is defeated!'
  })

  game.events.on('win',  function() { alert('You win!') })
  game.events.on('lose', function() { alert('Game over') })
</script>
```

### Adding entities at runtime

```html
<script>
  // NPCs are neutral towards the player; hostile only to enemies
  var villager = CrawlLib.createNpc({
    type: 'villager',
    x: 5, z: 3,
    hp: 20, attack: 2, defense: 1,
    faction: 'npc',
  })

  // Enemies are hostile to both the player and NPCs
  var goblin = CrawlLib.createEnemy({
    type: 'goblin',
    x: 10, z: 10,
    hp: 15, attack: 4, defense: 1,
    faction: 'enemy',
    xp: 20,
    drop: { id: 'gold-coin', name: 'Gold Coin', chance: 0.5 },
  })

  // Register entities with the scheduler so they act each turn
  game.turns.addActor(villager)
  game.turns.addActor(goblin)
</script>
```

### Loading a Tiled map

```html
<script>
  fetch('./maps/dungeon-level-1.tmj')
    .then(function(r) { return r.json() })
    .then(function(tiledMap) {
      var game = CrawlLib.createGame(document.getElementById('game'), {
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

        rendering: {
          atlas:     './atlas.png',
          atlasJson: './atlas.json',
        },
      })

      game.generate()
    })
</script>
```

### HUD overlay with plain HTML

The game renders into your `<canvas>`; HUD elements are just HTML on top:

```html
<style>
  #container { position: relative; width: 100vw; height: 100vh; }
  #game       { position: absolute; inset: 0; }
  #hud        { position: absolute; top: 16px; left: 16px; color: #fff;
                font: bold 16px monospace; pointer-events: none; }
  #minimap    { position: absolute; bottom: 16px; right: 16px; }
</style>

<div id="container">
  <canvas id="game"></canvas>
  <div id="hud">
    HP: <span id="hp">30</span> &nbsp; Turn: <span id="turn">0</span>
  </div>
  <canvas id="minimap" width="196" height="196"></canvas>
</div>

<script>
  var game = CrawlLib.createGame(document.getElementById('game'), { /* ... */ })

  // Enable the built-in minimap renderer pointed at a 2D canvas
  CrawlLib.attachMinimap(game, document.getElementById('minimap'), {
    size: 196,
    showEntities: true,
  })

  // Keep the text HUD in sync
  game.events.on('turn', function() {
    document.getElementById('hp').textContent   = game.player.hp
    document.getElementById('turn').textContent = game.turns.turn
  })

  // Generate the dungeon after all callbacks are attached
  game.generate()
</script>
```

### Spawn callback

> Attach all callbacks before calling `game.generate()`. The dungeon is not built until `generate()` is called, so any `attachSpawner`, `attachDecorator`, or `attachSurfacePainter` calls made beforehand are guaranteed to be in place when generation runs.

Register a callback to control enemy spawning. It is called whenever the library needs to decide whether to place an entity at a given position — on dungeon entry, room visits, or any custom trigger. Return an entity (or array of entities) to spawn, or `null` to skip.

```html
<script>
  CrawlLib.attachSpawner(game, {
    onSpawn: function({ dungeon, roomId, x, y }) {
      var room = dungeon.rooms[roomId]
      if (!room) return null

      // Only spawn in rooms far from the start
      if (room.distanceFromStart < 3) return null

      var types = ['goblin', 'orc', 'skeleton']
      var type  = types[Math.floor(Math.random() * types.length)]

      return CrawlLib.createEnemy({
        type:    type,
        faction: 'enemy',
        hp:      15,
        attack:   4,
        xp:      20,
        x:       x,
        z:       y,
        drop: { id: 'gold-coin', name: 'Gold Coin', chance: 0.4 },
      })
    },
  })
</script>
```

### Decoration callback

Register a callback to place stationary billboarded sprites (furniture, props, wall fixtures, etc.). It is called for each candidate tile position during dungeon setup. Return a decoration, an array of decorations, or `null` to skip.

```html
<script>
  CrawlLib.attachDecorator(game, {
    onDecorate: function({ dungeon, roomId, x, y }) {
      var room = dungeon.rooms[roomId]
      if (!room) return null

      // Place a barrel in the corner of every other room
      if (room.index % 2 === 0 && x === room.x + 1 && y === room.y + 1) {
        return CrawlLib.createDecoration({
          type:       'barrel',
          x:          x,
          z:          y,
          sprite:     'barrel',        // atlas sprite name
          blocksMove: true,
        })
      }

      // Place a wall torch sconce on north walls
      if (dungeon.tiles[y - 1] && dungeon.tiles[y - 1][x].solid) {
        return CrawlLib.createDecoration({
          type:       'torch-sconce',
          x:          x,
          z:          y,
          sprite:     'torch-sconce',
          blocksMove: false,
        })
      }

      return null
    },
  })
</script>
```

### Surface painting callback

Register a callback to paint atlas tile layers onto tiles. It is called per tile position and should return an array of atlas tile IDs to composite in sequence over the base tile, or `null` to leave the tile unchanged.

```html
<script>
  CrawlLib.attachSurfacePainter(game, {
    onPaint: function({ dungeon, roomId, x, y }) {
      var room = dungeon.rooms[roomId]
      if (!room) return null

      // Crypt rooms get a bone-floor base with a grime overlay
      if (room.theme === 'crypt') {
        return ['bone-floor', 'grime-overlay']
      }

      // Puddle near room centre
      if (Math.abs(x - room.cx) + Math.abs(y - room.cz) <= 1) {
        return ['wet-overlay']
      }

      return null
    },
  })
</script>
```

### Keybindings helper

Instead of writing your own `keydown` handler, use the built-in binding helper:

```html
<script>
  CrawlLib.attachKeybindings(game, {
    bindings: {
      'move-forward':   ['w', 'ArrowUp'],
      'move-back':      ['s', 'ArrowDown'],
      'strafe-left':    ['a'],
      'strafe-right':   ['d'],
      'rotate-left':    ['q'],
      'rotate-right':   ['e'],
      'interact':       ['i'],
      'wait':           ['.'],
      'toggle-passage': ['f'],
    },

    onAction: function(action) {
      if (action === 'move-forward')  game.turns.commit(game.player.move(0, -1))
      if (action === 'move-back')     game.turns.commit(game.player.move(0,  1))
      if (action === 'strafe-left')   game.turns.commit(game.player.move(-1, 0))
      if (action === 'strafe-right')  game.turns.commit(game.player.move( 1, 0))
      if (action === 'rotate-left')   game.turns.commit(game.player.rotate(-Math.PI / 2))
      if (action === 'rotate-right')  game.turns.commit(game.player.rotate( Math.PI / 2))
      if (action === 'interact')      game.turns.commit(game.player.interact(null))
      if (action === 'wait')          game.turns.commit(game.player.wait())
      if (action === 'toggle-passage') {
        var nearby = game.dungeon.passageNear(game.player.x, game.player.z)
        if (nearby) game.dungeon.passages.toggle(nearby.id)
      }
    },
  })
</script>
```

### Script tag API surface

| Function | Description |
|---|---|
| `CrawlLib.createGame(canvas, options)` | Mount the renderer; returns a `game` handle — does not generate the dungeon |
| `CrawlLib.attachMinimap(game, canvas, opts)` | Wire up a 2D canvas minimap |
| `CrawlLib.attachSpawner(game, opts)` | Register a spawn callback to control entity placement |
| `CrawlLib.attachDecorator(game, opts)` | Register a decoration callback to place stationary props |
| `CrawlLib.attachSurfacePainter(game, opts)` | Register a callback to paint atlas layers on surfaces |
| `CrawlLib.attachKeybindings(game, opts)` | Register keyboard bindings |
| `CrawlLib.createNpc(opts)` | Create an NPC entity (`faction: 'npc'`) |
| `CrawlLib.createEnemy(opts)` | Create an enemy entity (`faction: 'enemy'`) |
| `CrawlLib.createDecoration(opts)` | Create a stationary billboarded decoration |
| `CrawlLib.createItem(opts)` | Create an item |
| `CrawlLib.buildTilesetMap(tsj, opts)` | Build a `tilesetMap` from a `.tsj` object |

---

## Core Concepts

### Dungeon

The dungeon is a grid of tiles encoded as `DataTexture` maps (solid, floor type, wall type, ceiling type, overlays). It is decoupled from rendering — you can swap renderers without touching game logic.

```js
dungeon: {
  // Procedural BSP generation
  seed: 12345,
  width: 64,
  height: 64,
  minLeafSize: 8,
  maxLeafSize: 20,
  minRoomSize: 4,
  maxRoomSize: 14,
  maxDoors: 3,
  trapDensity: 0.02,

  // Theme: 'dungeon' | 'crypt' | 'catacomb' | 'industrial' | 'ruins'
  // or a callback: function({ room, rng }) { return 'crypt' }
  themes: 'dungeon',

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

    // Map Tiled tileset GIDs to atlas tile IDs
    tilesetMap: {
      1:  'cobblestone-floor',
      17: 'flagstone-floor',
      33: 'concrete-wall',
      // ...
    },
  },
}
```

Tiled tilesets (`.tsj`) can be used to build `tilesetMap` programmatically:

```js
var tilesetMap = CrawlLib.buildTilesetMap(myTileset, {
  // property name on each tile that holds the atlas tile ID
  atlasIdProperty: 'atlasId',
})
```

---

### Player

```js
player: {
  x: 2, z: 2,         // starting grid position
  hp: 30, maxHp: 30,
  attack: 4, defense: 2,
  speed: 1,            // turn cost multiplier
}
```

Reactive state and action methods on `game.player`:

```js
game.player.x          // current grid X
game.player.z          // current grid Z
game.player.hp         // current HP
game.player.facing     // yaw in radians
game.player.inventory  // array of item slots
game.player.alive      // boolean

// Imperative actions (pass to turns.commit)
game.player.move(dx, dz)
game.player.rotate(angle)       // radians
game.player.interact(entityId)
game.player.wait()
game.player.pickup(itemId)
game.player.useItem(slotIndex)
```

---

### Turn Scheduler

```js
var turns = game.turns

// Commit a player action and advance the scheduler
turns.commit(game.player.move(1, 0))

// Current turn counter
turns.turn    // number

// Add an actor dynamically
turns.addActor(entity)
turns.removeActor(entity.id)
```

The scheduler runs all registered actors (NPCs and enemies) in priority order after each player action. Each actor must expose a `speed` value and a `tick(ctx)` method that returns a `TurnAction`.

```js
// onAdvance fires each time the scheduler advances
var game = CrawlLib.createGame(canvas, {
  turns: {
    onAdvance: function({ turn, dt }) {
      // called between player inputs as other actors take their turns
    },
  },
})
```

---

### Entities

All entities share a common base interface. Extend it for custom types.

```js
// Entity base interface
{
  id:         string,     // unique identifier
  kind:       string,     // 'player' | 'npc' | 'enemy' | 'item' | ...
  type:       string,     // entity subtype — used as the sprite lookup key if sprite is not set
  sprite:     string,     // character atlas sprite name; defaults to type if omitted
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
  tick:       function,   // (ctx) => TurnAction | null
}
```

#### NPCs

NPCs are friendly to the player but will fight back against enemies.

```js
var villager = CrawlLib.createNpc({
  type:   'villager',   // used as sprite lookup key if sprite is not set
  sprite: 'villager',  // character atlas sprite name (optional — defaults to type)
  x: 5, z: 3,
  hp: 20, attack: 2, defense: 1,
  faction: 'npc',

  // Optional AI state machine
  ai: {
    initial: 'idle',
    states: {
      idle:     function(ctx) { /* return TurnAction */ },
      fleeing:  function(ctx) { /* return TurnAction */ },
    },
    transitions: function({ self, state }) {
      if (state === 'idle' && self.hp < self.maxHp * 0.3) return 'fleeing'
    },
  },
})
```

#### Enemies

Enemies are hostile to both the player and NPCs.

```js
var goblin = CrawlLib.createEnemy({
  type:   'goblin',
  sprite: 'goblin',  // character atlas sprite name (optional — defaults to type)
  x: 10, z: 10,
  hp: 15, attack: 4, defense: 1,
  xp: 20,
  faction: 'enemy',

  // Loot drop on death
  drop: { id: 'gold-coin', name: 'Gold Coin', chance: 0.5 },

  // Optional status effect applied on hit
  rpsEffect: 'poison',

  // Optional AI state machine
  ai: {
    initial: 'exploring',
    states: {
      exploring: function({ self, dungeon, rng }) { /* return TurnAction */ },
      pursuing:  function({ self, dungeon, rng }) { /* return TurnAction */ },
    },
    transitions: function({ self, state }) {
      if (state === 'exploring' && self.seesPlayer) return 'pursuing'
    },
  },
})
```

#### Spawn Callback

`attachSpawner` lets you control enemy placement with a single callback. The library calls `onSpawn` whenever it needs to evaluate whether an entity should appear at a given position. Return an entity or array of entities to place them, or `null` / `undefined` to skip.

```js
CrawlLib.attachSpawner(game, {
  onSpawn: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room || room.distanceFromStart < 2) return null

    return CrawlLib.createEnemy({
      type:    'goblin',
      faction: 'enemy',
      hp:      15,
      attack:   4,
      xp:      20,
      x:       x,
      z:       y,
      drop: { id: 'gold-coin', name: 'Gold Coin', chance: 0.4 },
    })
  },
})
```

The `onSpawn` callback receives:

| Parameter | Type | Description |
|---|---|---|
| `dungeon` | object | Full dungeon state (tiles, rooms, passages) |
| `roomId` | string | ID of the room being evaluated |
| `x` | number | Tile X coordinate of the candidate spawn point |
| `y` | number | Tile Y coordinate of the candidate spawn point |

---

### Decorations

Decorations are stationary billboarded sprites — furniture, props, wall fixtures, rubble, etc. They have no AI or combat stats. They render as sprites in the 3D world and can optionally block movement or be interactive.

```js
var barrel = CrawlLib.createDecoration({
  type:        'barrel',       // string label for your own bookkeeping
  x:           8,
  z:           5,
  sprite:      'barrel',       // atlas sprite name (character atlas)
  blocksMove:  true,           // default: false
  blocksView:  false,          // affects line-of-sight; default: false
  interactive: false,          // player can 'interact' with it; default: false
  onInteract:  function({ player, decoration }) { /* optional */ },
})
```

Decoration base interface:

```js
{
  id:          string,    // auto-generated unique ID
  kind:        'decoration',
  type:        string,
  x:           number,
  z:           number,
  sprite:      string,    // character atlas tile name
  blocksMove:  boolean,
  blocksView:  boolean,
  interactive: boolean,
  onInteract:  function | null,
}
```

Use `attachDecorator` to place decorations via a per-tile callback during dungeon setup:

```js
CrawlLib.attachDecorator(game, {
  onDecorate: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    // Scatter barrels near room walls
    if (rng.chance(0.05) && room.isNearWall(x, y)) {
      return CrawlLib.createDecoration({
        type: 'barrel', x: x, z: y, sprite: 'barrel', blocksMove: true,
      })
    }

    return null
  },
})
```

The `onDecorate` callback shares the same context shape as `onSpawn`: `{ dungeon, roomId, x, y }`. Return a single decoration, an array, or `null`.

Decorations can also be placed imperatively at any time:

```js
var pillar = CrawlLib.createDecoration({ type: 'pillar', x: 4, z: 6, sprite: 'stone-pillar', blocksMove: true })
game.dungeon.decorations.add(pillar)
game.dungeon.decorations.remove(pillar.id)
game.dungeon.decorations.list   // Decoration[]
```

---

### Surface Painting

Each tile position can have an ordered stack of atlas tile IDs composited over the base generated tile. Layers are applied in sequence — first entry is drawn first, last entry on top. This lets you apply theme-specific overlays, stains, cracks, moss, runes, or decorative borders without replacing the underlying tile data.

Use `attachSurfacePainter` to drive painting from a per-tile callback:

```js
CrawlLib.attachSurfacePainter(game, {
  onPaint: function({ dungeon, roomId, x, y }) {
    var room = dungeon.rooms[roomId]
    if (!room) return null

    if (room.theme === 'crypt') {
      return ['bone-floor', 'carved-stone-overlay']
    }

    // Puddle near room centre
    if (Math.abs(x - room.cx) + Math.abs(y - room.cz) <= 1) {
      return ['wet-overlay']
    }

    return null
  },
})
```

Return an array of atlas tile IDs to layer over the base tile, or `null` to leave it unchanged.

Surfaces can also be painted imperatively via `game.dungeon.paint()`:

```js
// Set the layer stack for a tile (replaces any previous paint at that position)
game.dungeon.paint(x, z, ['moss-overlay', 'crack-overlay'])

// Clear painted layers (reverts to generated tile)
game.dungeon.unpaint(x, z)
```

Surface paint operations in `onPlace`:

```js
onPlace: function({ rooms, place }) {
  rooms.forEach(function(room) {
    if (room.theme === 'crypt') {
      place.surface(room.cx, room.cz, ['bone-floor', 'carved-stone-overlay'])
    }
  })
},
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
  factions: {
    player: { hostile: ['enemy'] },
    npc:    { hostile: ['enemy'] },
    enemy:  { hostile: ['player', 'npc'] },
  },

  onDamage: function({ attacker, defender, amount, effect }) { /* show float */ },
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
    player.heal(15)
  },
})

// Create a weapon
var sword = CrawlLib.createItem({
  id:     'iron-sword',
  name:   'Iron Sword',
  kind:   'weapon',
  attack: 3,
})

// Chest drops — opened when the player interacts with a chest entity
game.events.on('chest-open', function(e) {
  var loot = e.chest.loot   // array of item IDs configured on the chest
  loot.forEach(function(itemId) {
    game.player.pickup(itemId)
  })
})
```

Chests placed via `onPlace` or Tiled object layers accept a `loot` array in their config:

```js
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
// The player has a configurable slot inventory
game.player.inventory   // array of item slots (null = empty)
game.player.pickup(itemId)
game.player.useItem(slotIndex)
game.player.dropItem(slotIndex)
```

---

### Hidden Passages

```js
passages: {
  // defined by the map generator or Tiled 'Passage' objects
  traversalFactor: 2,   // movement speed multiplier while inside
  onToggle:   function({ passage, enabled }) {},
  onTraverse: function({ passage, progress }) {},
}
```

```js
// Toggle nearest passage from script
var nearby = game.dungeon.passageNear(game.player.x, game.player.z)
if (nearby) game.dungeon.passages.toggle(nearby.id)

game.dungeon.passages.list   // HiddenPassage[]
```

---

### Rendering

Rendering is configured under the `rendering` key in `createGame()`. All fields are optional.

```js
rendering: {
  // Tile atlas for dungeon walls/floors/ceilings
  atlas:              './atlas.png',
  atlasJson:          './atlas.json',

  // Sprite atlas for entity billboards
  characterAtlas:     './characters.png',
  characterAtlasJson: './characters.json',

  // Tile size in world units (default: 3)
  tileSize: 3,

  // Torch / point light settings
  torch: {
    color:       '#ff9944',
    intensity:   1,
    bands:       [1.0, 0.55, 0.22, 0.10],
    flickerSpeed: 1.2,
    fogNear:     4,
    fogFar:      28,
  },

  // First-person camera
  camera: {
    fov:        75,
    moveLerpMs: 150,
  },

  // Entity sprite head-bob animation
  headBob: {
    amplitude: 0.08,
    frequency: 2,
  },

  // Override the built-in torch shader
  lightingShader: {
    uniforms: {
      uTime:       { value: 0 },
      uTorchColor: { value: new THREE.Color('#ff9944') },
    },
    vertexShader:   '/* glsl */',
    fragmentShader: '/* glsl */',
  },
}
```

---

### Keybindings

```js
CrawlLib.attachKeybindings(game, {
  bindings: {
    'move-forward':   ['w', 'ArrowUp'],
    'move-back':      ['s', 'ArrowDown'],
    'strafe-left':    ['a'],
    'strafe-right':   ['d'],
    'rotate-left':    ['q'],
    'rotate-right':   ['e'],
    'interact':       ['i'],
    'wait':           ['.'],
    'toggle-passage': ['f'],
  },

  onAction: function(action, event) {
    if (action === 'move-forward')  game.turns.commit(game.player.move(0, -1))
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
game.events.on('damage',     function(e) { /* { entity, amount, effect } */ })
game.events.on('death',      function(e) { /* { entity, killer } — spawn loot drop here */ })
game.events.on('xp-gain',    function(e) { /* { amount, x, z } */ })
game.events.on('heal',       function(e) { /* { entity, amount } */ })
game.events.on('miss',       function(e) { /* { attacker, defender } */ })
game.events.on('chest-open', function(e) { /* { chest, loot } */ })
game.events.on('item-pickup',function(e) { /* { item, entity } */ })
game.events.on('turn',       function(e) { /* { turn } — fires every turn */ })
game.events.on('win',        function()  { /* player reached the exit or custom win condition */ })
game.events.on('lose',       function(e) { /* { reason } */ })
```

---

## Tiled Workflow

1. Create your map in [Tiled](https://www.mapeditor.org/) with separate layers for `Floor`, `Walls`, `Ceiling`, `Overlays`, and an object layer `Objects`.
2. Add a custom property `atlasId` to each tile in your tileset, matching an r3f-crawl-lib atlas tile name.
3. Export as **JSON** (File > Export As > JSON Map Files `.tmj`).
4. Fetch the `.tmj` at runtime and pass it to `createGame()` under `dungeon.tiled`.

The library maps Tiled tile GIDs to atlas texture coordinates automatically. Object layer entries become entity spawn points consumed by your `onPlace` callback.

---

## Configuration Reference

All settings are passed directly to `CrawlLib.createGame()` or the relevant `attach*` helper.

| Section | Key settings |
|---|---|
| `dungeon` | `seed`, `width`, `height`, leaf/room sizes, `trapDensity`, `themes`, `onPlace` |
| `dungeon.tiled` | `map`, `layers`, `objectTypes`, `tilesetMap` |
| `player` | `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed` |
| `turns` | `actors`, `onAdvance` |
| `combat` | `damageFormula`, `factions`, `onDamage`, `onDeath`, `onMiss` |
| `rendering` | `atlas`, `atlasJson`, `characterAtlas`, `tileSize`, `torch`, `camera`, `headBob`, `lightingShader` |
| `attachSpawner` | `onSpawn` — callback receiving `{ dungeon, roomId, x, y }` |
| `attachDecorator` | `onDecorate` — callback receiving `{ dungeon, roomId, x, y }` |
| `attachSurfacePainter` | `onPaint` — callback receiving `{ dungeon, roomId, x, y }`, returns ordered array of atlas tile IDs |
| `attachKeybindings` | `bindings`, `onAction` |
| `passages` | `traversalFactor`, `onToggle`, `onTraverse` |

---

## Atlas Format

The tile atlas is a PNG sheet (default 512×1024, 64×64 tiles) with a companion JSON describing named tiles:

```json
{
  "tileSize": 64,
  "sheetWidth": 512,
  "sheetHeight": 1024,
  "tiles": {
    "cobblestone-floor": { "x": 0,   "y": 0,   "w": 64, "h": 64 },
    "flagstone-floor":   { "x": 64,  "y": 0,   "w": 64, "h": 64 },
    "concrete-wall":     { "x": 128, "y": 0,   "w": 64, "h": 64 }
  }
}
```

Point `rendering.atlas` and `rendering.atlasJson` at your files. The Tiled `tilesetMap` bridges Tiled GIDs to these tile names.

---

## Character Atlas Format

Entity and decoration sprites are looked up by name from a separate character atlas. Point `rendering.characterAtlas` and `rendering.characterAtlasJson` at your sprite sheet and its JSON descriptor.

The JSON lists each named sprite with its pixel rect on the sheet:

```json
{
  "sheetWidth":  256,
  "sheetHeight": 256,
  "sprites": {
    "goblin":        { "x": 0,   "y": 0,   "w": 48, "h": 64 },
    "orc":           { "x": 48,  "y": 0,   "w": 48, "h": 64 },
    "skeleton":      { "x": 96,  "y": 0,   "w": 48, "h": 64 },
    "villager":      { "x": 0,   "y": 64,  "w": 48, "h": 64 },
    "guard":         { "x": 48,  "y": 64,  "w": 48, "h": 64 },
    "barrel":        { "x": 0,   "y": 128, "w": 32, "h": 48 },
    "torch-sconce":  { "x": 32,  "y": 128, "w": 32, "h": 48 }
  }
}
```

Sprites do not need to be a uniform size — each entry defines its own `w`/`h`. The renderer normalises the rect to UV coordinates automatically.

### Sprite assignment

When an entity or decoration is rendered, the library resolves its sprite name in this order:

1. The explicit `sprite` field on the entity, if set
2. The entity's `type` string, used as a direct key into the character atlas

```js
// These two are equivalent if 'goblin' exists in the character atlas JSON
CrawlLib.createEnemy({ type: 'goblin', ... })
CrawlLib.createEnemy({ type: 'goblin', sprite: 'goblin', ... })

// Override: a cave-troll variant that reuses the troll sprite
CrawlLib.createEnemy({ type: 'cave-troll', sprite: 'troll', ... })
```

If neither `sprite` nor `type` resolves to a known sprite name, the entity renders with a fallback placeholder.
