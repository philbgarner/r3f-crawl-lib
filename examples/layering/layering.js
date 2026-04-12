// layering.js — r3f-crawl-lib layering example
//
// Demonstrates ceiling and floor height offsets driven by the distanceToWall mask:
//   - Ceiling rises toward the center of rooms (vaulted effect).
//   - Floor tiles with distanceToWall > 3 are omitted entirely (pit).
//
// Height offset encoding in the DataTexture (R8):
//   128 = no offset (flat)
//   < 128 = raised for ceiling / lowered for floor
//   > 128 = lowered for ceiling / raised for floor
//   0 = pit (floor tile omitted by the renderer)
//
// One offset step = tileSize * 0.5 = 1.5 world units (default tileSize 3).

const {
  createGame,
  attachKeybindings,
  createDungeonRenderer,
} = CrawlLib;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const logEl      = document.getElementById("log");
const hpEl       = document.getElementById("hp");
const turnEl     = document.getElementById("turn");
const posEl      = document.getElementById("pos");

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 50,
    height: 50,
    seed: 0xcafe1234,
    roomMinSize: 6,
    roomMaxSize: 14,
    roomCount: 14,
  },
  player: {
    hp: 30,
    maxHp: 30,
    attack: 5,
    defense: 2,
    speed: 5,
  },
});

// ---------------------------------------------------------------------------
// Height offset post-processing
//
// Register this listener BEFORE creating the renderer so it runs first on the
// initial 'turn' event and the renderer sees the modified texture data when
// it calls buildDungeon().
// ---------------------------------------------------------------------------

let heightsProcessed = false;

game.events.on("turn", () => {
  if (heightsProcessed) return;
  const outputs = game.dungeon.outputs;
  if (!outputs) return;
  heightsProcessed = true;

  const { width, height, textures } = outputs;
  const solid     = textures.solid.image.data;
  const dist      = textures.distanceToWall.image.data;
  const floorOff  = textures.floorHeightOffset.image.data;
  const ceilOff   = textures.ceilingHeightOffset.image.data;

  for (let i = 0; i < width * height; i++) {
    if (solid[i] !== 0) continue; // skip wall cells

    const d = dist[i]; // distance to nearest wall (BFS steps)

    // --- Ceiling: vault effect — ceiling rises as distance increases.
    //   d=1: value 128 (no offset, flush to normal height)
    //   d=2: value 127 (1 step up  = +1.5 world units)
    //   d=3: value 126 (2 steps up = +3.0 world units)
    //   d≥4: value 125 (3 steps up = +4.5 world units)
    const ceilSteps = Math.min(Math.max(d - 1, 0), 3);
    ceilOff[i] = 128 - ceilSteps;

    // --- Floor: pit if the cell is deep enough inside a room (distanceToWall > 3).
    //   Value 0 is the pit marker — the renderer omits the floor tile entirely.
    if (d > 3) {
      floorOff[i] = 0;
    }
    // else: leave as 128 (flat floor, set by default in generateBspDungeon)
  }

  // Mark textures as dirty so any future GPU upload picks up the changes.
  textures.floorHeightOffset.needsUpdate  = true;
  textures.ceilingHeightOffset.needsUpdate = true;
});

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

let renderer;

const atlasImg = new Image();
atlasImg.onload = () => {
  renderer = createDungeonRenderer(viewportEl, game, {
    atlas: {
      image: atlasImg,
      tileWidth:   64,
      tileHeight:  64,
      sheetWidth:  512,
      sheetHeight: 1024,
      columns: 8,
    },
    floorTileId: 20, // Flagstone   uv [256, 128]
    ceilTileId:  19, // Cobblestone uv [192, 128]
    wallTileId:  16, // Brick       uv [0,   128]
  });
  game.generate();
};
atlasImg.src = "/examples/basic/atlas.png";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
});

// ---------------------------------------------------------------------------
// Keyboard input
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward:  ["w", "W", "ArrowUp"],
    moveBackward: ["s", "S", "ArrowDown"],
    moveLeft:     ["a", "A", "ArrowLeft"],
    moveRight:    ["d", "D", "ArrowRight"],
    turnLeft:     ["q", "Q"],
    turnRight:    ["e", "E"],
    wait:         [" "],
  },
  onAction(action, event) {
    event.preventDefault();
    if (!game.player.alive) {
      addLog("You are dead. Refresh to restart.", "death");
      return;
    }
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
      case "moveForward":  a = relativeMove(1,  0); break;
      case "moveBackward": a = relativeMove(-1, 0); break;
      case "moveLeft":     a = relativeMove(0, -1); break;
      case "moveRight":    a = relativeMove(0,  1); break;
      case "turnLeft":     a = game.player.rotate( Math.PI / 2); break;
      case "turnRight":    a = game.player.rotate(-Math.PI / 2); break;
      case "wait":         a = game.player.wait(); break;
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

function updateStats() {
  hpEl.textContent  = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
