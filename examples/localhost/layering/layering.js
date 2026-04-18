// layering.js — atomic-core layering example
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
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");

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
  const solid = textures.solid.image.data;
  const dist = textures.distanceToWall.image.data;
  const floorOff = textures.floorHeightOffset.image.data;
  const ceilOff = textures.ceilingHeightOffset.image.data;

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
  textures.floorHeightOffset.needsUpdate = true;
  textures.ceilingHeightOffset.needsUpdate = true;
});

// ---------------------------------------------------------------------------
// 3D renderer
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
    floorTile: "fancy_tile_floor_stone.png",
    floorSkirtTiles: {
      north: { tile: "cobble_wall_stone.png", rotation: 0 },
      south: { tile: "cobble_wall_stone.png", rotation: 0 },
      east: { tile: "cobble_wall_stone.png", rotation: 0 },
      west: { tile: "cobble_wall_stone.png", rotation: 0 },
    },
    ceilTile: "flagstone_floor_stone.png",
    ceilSkirtTiles: {
      north: { tile: "flagstone_floor_stone.png", rotation: 0 },
      south: { tile: "flagstone_floor_stone.png", rotation: 0 },
      east: { tile: "flagstone_floor_stone.png", rotation: 1 },
      west: { tile: "flagstone_floor_stone.png", rotation: 3 },
    },
    wallTile: "cobble_wall_stone.png", // corridor base; room walls use brick via a layer
  });

  // ── Layers ────────────────────────────────────────────────────────────────
  //
  // textures.regionId: 0 = corridor cell, >0 = room cell.
  //
  // Base wallTile (cobble) covers all walls.  Three layers refine this:
  //   1. Room walls → brick_wall_stone.png
  //   2. Room walls, odd coords → alt_brick_wall_stone.png overlay
  //   3. Corridor walls → concrete_stone.png overlay
  //
  // For N/S walls the face runs along X, so oddness is checked on cx.
  // For E/W walls the face runs along Z, so oddness is checked on cz.

  function isRoom(cx, cz) {
    const outputs = game.dungeon.outputs;
    if (!outputs) return false;
    const { width, textures } = outputs;
    const regionId = textures.regionId.image.data;
    return regionId[cz * width + cx] !== 0;
  }

  function isOdd(cx, cz, direction) {
    return direction === "north" || direction === "south"
      ? cx % 2 !== 0
      : cz % 2 !== 0;
  }

  // Layer 1 — room base: brick over all room wall faces.
  renderer.addLayer({
    target: "wall",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) =>
      isRoom(cx, cz) ? { tile: "brick_wall_stone.png" } : null,
  });

  // Layer 2 — room overlay: alternate brick on odd-coordinate room wall faces.
  renderer.addLayer({
    target: "wall",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz, direction) =>
      isRoom(cx, cz) && isOdd(cx, cz, direction)
        ? { tile: "brick_column.png" }
        : null,
  });

  // Layer 3 — corridor overlay: concrete on corridor wall faces.
  renderer.addLayer({
    target: "wall",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) =>
      !isRoom(cx, cz) ? { tile: "jacobean_panel_wall_wood.png" } : null,
  });

  // Layer 4 — corridor ceiling: concrete.
  renderer.addLayer({
    target: "ceil",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) =>
      !isRoom(cx, cz) ? { tile: "plaster_ceiling.png" } : null,
  });

  // Layer 5 — corridor floor: wood planks.
  renderer.addLayer({
    target: "floor",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) =>
      !isRoom(cx, cz) ? { tile: "plank_floor_wood.png" } : null,
  });

  game.generate();
}

init();

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
