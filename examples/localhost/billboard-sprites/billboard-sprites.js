// billboard-sprites.js — atomic-core billboard sprite demo
//
// Demonstrates the spriteMap API: camera-facing billboard quads rendered
// using named sprites from a packed texture atlas.
//
// Three enemy types are placed in the dungeon:
//   Goblin   — goblin_placeholder1.png
//   Skeleton — skel_placeholder1.png
//   Orc      — troll_placeholder1.png
//
// Each actor's `spriteMap` field activates billboard rendering automatically;
// no spriteMap = box geometry fallback.

const {
  createGame,
  createEnemy,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------

function goblinSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_goblin_base.png", opacity: 1.0 },
      {
        tile: "mob_goblin_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function skeletonSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_skel_base.png", opacity: 1.0 },
      {
        tile: "mob_skel_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function trollSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_troll_base.png", opacity: 1.0 },
      {
        tile: "mob_troll_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Entity pool
// ---------------------------------------------------------------------------

const entities = [];
let spawned = 0;
const MAX_ENTITIES = 8;

const TYPES = [
  { type: "goblin", spriteMap: goblinSpriteMap },
  { type: "skeleton", spriteMap: skeletonSpriteMap },
  { type: "troll", spriteMap: trollSpriteMap },
];

// ---------------------------------------------------------------------------
// Game setup
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 36,
    height: 36,
    seed: 0xcafe1234,
    roomMinSize: 6,
    roomMaxSize: 12,
    roomCount: 10,
  },
  player: {
    hp: 30,
    maxHp: 30,
    attack: 5,
    defense: 2,
    speed: 5,
  },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount}`, "damage");
    },
    onDeath({ entity }) {
      addLog(`${entity.type} is slain!`, "death");
    },
    onMiss({ attacker, defender }) {
      addLog(`${attacker.type} misses ${defender.type}`, "turn");
    },
  },
});

// ---------------------------------------------------------------------------
// 3D renderer — atlas loaded directly from disk (localhost only)
// ---------------------------------------------------------------------------

let renderer;

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "brick_wall_stone.png",
  });
  game.generate();
}

init();

// ---------------------------------------------------------------------------
// Spawner — places up to MAX_ENTITIES billboard-sprite enemies
// ---------------------------------------------------------------------------

attachSpawner(game, {
  onSpawn({ roomId, x, y }) {
    if (spawned >= MAX_ENTITIES) return null;
    if (roomId < 2) return null;
    if (Math.random() > 0.6) return null;

    const def = TYPES[spawned % TYPES.length];
    spawned++;

    const e = createEnemy({
      type: def.type,
      sprite: def.type,
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 5,
      danger: 1,
      xp: 10,
      spriteMap: def.spriteMap(),
    });
    entities.push(e);
    return e;
  },
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
  if (renderer) renderer.setEntities(entities);
});

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward: ["w", "W", "ArrowUp"],
    moveBackward: ["s", "S", "ArrowDown"],
    moveLeft: ["a", "A", "ArrowLeft"],
    moveRight: ["d", "D", "ArrowRight"],
    turnLeft: ["q", "Q"],
    turnRight: ["e", "E"],
    wait: [" "],
  },
  onAction(action, event) {
    event.preventDefault();
    if (!game.player.alive) {
      addLog("You are dead. Refresh to restart.", "death");
      return;
    }
    function relMove(fwd, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round(Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(fwd * fx + strafe * sx, fwd * fz + strafe * sz);
    }
    let a;
    switch (action) {
      case "moveForward":
        a = relMove(1, 0);
        break;
      case "moveBackward":
        a = relMove(-1, 0);
        break;
      case "moveLeft":
        a = relMove(0, -1);
        break;
      case "moveRight":
        a = relMove(0, 1);
        break;
      case "turnLeft":
        a = game.player.rotate(Math.PI / 2);
        break;
      case "turnRight":
        a = game.player.rotate(-Math.PI / 2);
        break;
      case "wait":
        a = game.player.wait();
        break;
    }
    if (a) game.turns.commit(a);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement("div");
  div.className = "entry" + (cls ? " " + cls : "");
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}
