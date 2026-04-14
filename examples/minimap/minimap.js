// minimap.js — atomic-core minimap example
// Extends the basic example with attachMinimap to render a 2D canvas minimap
// overlaid in the bottom-right corner of the viewport. The minimap shows
// explored cells (dim) and currently-visible cells (bright) around the player.

const {
  createGame,
  createEnemy,
  attachSpawner,
  attachKeybindings,
  attachMinimap,
  createDungeonRenderer,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const minimapCanvas = document.getElementById("minimap");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");

// ---------------------------------------------------------------------------
// Entity tracking
// ---------------------------------------------------------------------------

const enemies = [];
let spawned = 0;
const MAX_ENEMIES = 6;

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 40,
    height: 40,
    seed: 0xdeadbeef,
    roomMinSize: 5,
    roomMaxSize: 11,
    roomCount: 12,
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
      addLog(
        `${attacker.type} hits ${defender.type} for ${amount} dmg`,
        "damage",
      );
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
// Minimap — wire up the canvas overlay
// ---------------------------------------------------------------------------
//
// attachMinimap listens for the 'turn' event and redraws the canvas each turn.
// The canvas element must already exist in the DOM with the desired pixel size.
//
// MinimapOptions:
//   size         — logical size (pixels); defaults to 196.
//   showEntities — whether to draw player / enemy dots; defaults to true.
//   colors       — override any of: explored, visible, player, npc, enemy.

attachMinimap(game, minimapCanvas, {
  size: 196,
  showEntities: true,
  colors: {
    explored: "#334",
    visible: "#aac",
    player: "#0f0",
    enemy: "#f44",
  },
});

// ---------------------------------------------------------------------------
// 3D renderer — with tile atlas
// ---------------------------------------------------------------------------
//
// atlas.png: 512×1024 px, 64 px tiles → 8 columns.
// Tile ID = (pixelY / 64) * 8 + (pixelX / 64)  (row-major, top-left origin).
//
// atlas.json entries used (uv = [pixelX, pixelY]):
//   Floor   – Flagstone   uv [256, 128] → id 20
//   Ceiling – Cobblestone uv [192, 128] → id 19
//   Wall    – Brick       uv [0,   128] → id 16

let renderer;

// Use the preloaded base64 data URL (set by atlas-data.js) so WebGL can
// upload the texture when running directly from file://.
const atlasImg = new Image();
atlasImg.onload = () => {
  renderer = createDungeonRenderer(viewportEl, game, {
    atlas: {
      image: atlasImg,
      tileWidth: 64,
      tileHeight: 64,
      sheetWidth: 512,
      sheetHeight: 1024,
      columns: 8,
    },
    floorTileId: 20, // Flagstone   uv [256, 128]
    ceilTileId: 19,  // Cobblestone uv [192, 128]
    wallTileId: 16,  // Brick       uv [0,   128]
  });
  game.generate();
};
atlasImg.src = window.ATLAS_DATA_URL;

// ---------------------------------------------------------------------------
// Spawn enemies — one per room, capped, skipping early rooms
// ---------------------------------------------------------------------------

attachSpawner(game, {
  onSpawn({ roomId, x, y }) {
    if (spawned >= MAX_ENEMIES) return null;
    if (roomId < 2) return null;
    if (Math.random() > 0.55) return null;
    spawned++;
    const e = createEnemy({
      type: "goblin",
      sprite: "g",
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 6,
      danger: 1,
      xp: 10,
    });
    enemies.push(e);
    return e;
  },
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
  if (renderer) renderer.setEntities(enemies);
});

game.events.on("audio", ({ name }) => {
  addLog(`[sfx] ${name}`, "audio");
});

// ---------------------------------------------------------------------------
// Keyboard input
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
    // Compute grid-relative step from facing angle.
    // facing is yaw in radians; sin/cos give the forward vector in (x, z) grid space.
    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round(Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(
        forward * fx + strafe * sx,
        forward * fz + strafe * sz,
      );
    }
    let a;
    switch (action) {
      case "moveForward":
        a = relativeMove(1, 0);
        break;
      case "moveBackward":
        a = relativeMove(-1, 0);
        break;
      case "moveLeft":
        a = relativeMove(0, -1);
        break;
      case "moveRight":
        a = relativeMove(0, 1);
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

// game.generate() is called inside the TextureLoader callback above.

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

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
