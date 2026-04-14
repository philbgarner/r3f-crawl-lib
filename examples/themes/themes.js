// themes.js — atomic-core themes example
//
// Demonstrates per-room theming: press TAB to cycle through theme types.
// All rooms share the active theme. The seed is fixed so the layout stays the same.
//
// Each theme maps to floor/wall/ceiling tile IDs in atlas.png.
// Layers (addLayer) apply per-room tile overrides on top of the corridor base.

const {
  createGame,
  attachKeybindings,
  attachMinimap,
  createDungeonRenderer,
  resolveTheme,
  registerTheme,
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
const themeEl = document.getElementById("theme");

// ---------------------------------------------------------------------------
// Tile ID lookup — atlas.png is 512×1024 px, 64 px tiles, 8 columns.
// Tile ID = (pixelY / 64) * 8 + (pixelX / 64)
//
// Values come from atlas.json floorTypes / wallTypes / ceilingTypes entries.
// ---------------------------------------------------------------------------

const FLOOR_IDS = {
  Cobblestone: 19, // uv [192, 128]
  Flagstone: 20, // uv [256, 128]
  Concrete: 22, // uv [384, 128]
  Tile: 29, // uv [320, 192]
  Dirt: 38, // uv [384, 256]
  DiamondTile: 45,
  Grate: 46,
  WoodFloor: 6,
  ParkayFloor: 4,
};

const WALL_IDS = {
  MetalPanel: 55,
  MetalWall: 63,
  ReinforcedWall: 7,
  Cobblestone: 19, // uv [192, 128]
  Brick: 16, // uv [0,   128]
  Concrete: 22, // uv [384, 128]
  Plaster: 31, // uv [448, 192]
  Dirt: 38, // uv [384, 256]
  WoodWall: 5,
  Grate: 46,
};

const CEIL_IDS = {
  Cobblestone: 19, // uv [192, 128]
  Flagstone: 20, // uv [256, 128]
  Concrete: 22, // uv [384, 128]
  Tile: 29, // uv [320, 192]
  Dirt: 38, // uv [384, 256]
};

// Optional: register a custom theme. Its name becomes a valid ThemeSelector key.
registerTheme("void", {
  floorType: "Concrete",
  wallType: "Concrete",
  ceilingType: "Concrete",
});

// ---------------------------------------------------------------------------
// Per-theme tile palettes — arrays of tile IDs for each surface.
// The filter picks one deterministically per cell so floors/walls/ceilings
// show variety within a room rather than a single uniform tile.
// ---------------------------------------------------------------------------

const THEME_PALETTES = {
  dungeon: {
    floors: [FLOOR_IDS.Cobblestone, FLOOR_IDS.Flagstone],
    walls: [WALL_IDS.Cobblestone, WALL_IDS.Brick],
    ceils: [CEIL_IDS.Cobblestone, CEIL_IDS.Flagstone],
  },
  crypt: {
    floors: [FLOOR_IDS.Flagstone, FLOOR_IDS.Cobblestone],
    walls: [WALL_IDS.Plaster, WALL_IDS.Brick, WALL_IDS.Cobblestone],
    ceils: [CEIL_IDS.Flagstone, CEIL_IDS.Cobblestone],
  },
  catacomb: {
    floors: [FLOOR_IDS.Dirt, FLOOR_IDS.Cobblestone, FLOOR_IDS.Flagstone],
    walls: [WALL_IDS.Dirt, WALL_IDS.Cobblestone, WALL_IDS.Brick],
    ceils: [CEIL_IDS.Dirt, CEIL_IDS.Concrete, CEIL_IDS.Cobblestone],
  },
  domestic: {
    floors: [FLOOR_IDS.ParkayFloor, FLOOR_IDS.WoodFloor, FLOOR_IDS.DiamondTile],
    walls: [WALL_IDS.Plaster, WALL_IDS.WoodWall],
    ceils: [CEIL_IDS.Concrete, CEIL_IDS.Flagstone],
  },
  industrial: {
    floors: [FLOOR_IDS.DiamondTile, FLOOR_IDS.Concrete, FLOOR_IDS.Tile],
    walls: [
      WALL_IDS.Concrete,
      WALL_IDS.Brick,
      WALL_IDS.Grate,
      WALL_IDS.MetalWall,
      WALL_IDS.ReinforcedWall,
    ],
    ceils: [CEIL_IDS.Concrete, CEIL_IDS.Tile],
  },
  ruins: {
    floors: [FLOOR_IDS.Cobblestone, FLOOR_IDS.Dirt, FLOOR_IDS.Flagstone],
    walls: [WALL_IDS.Cobblestone, WALL_IDS.Brick, WALL_IDS.Dirt],
    ceils: [CEIL_IDS.Cobblestone, CEIL_IDS.Flagstone, CEIL_IDS.Dirt],
  },
  void: {
    floors: [FLOOR_IDS.Concrete],
    walls: [WALL_IDS.Concrete],
    ceils: [CEIL_IDS.Concrete],
  },
};

// Colour hints shown in the HUD per theme (cosmetic only).
const THEME_COLORS = {
  dungeon: "#a0a0b8",
  crypt: "#b060d0",
  catacomb: "#80b090",
  domestic: "#f0f090",
  industrial: "#60a0c0",
  ruins: "#c08040",
  void: "#606080",
};

function tileIdsFor(def) {
  return {
    floor: FLOOR_IDS[def.floorType] ?? 19,
    wall: WALL_IDS[def.wallType] ?? 16,
    ceil: CEIL_IDS[def.ceilingType] ?? 19,
  };
}

// ---------------------------------------------------------------------------
// cellHash — fast integer hash for deterministic per-cell tile selection.
// Returns a uint32 stable for a given (cx, cz, seed) triple.
// ---------------------------------------------------------------------------
function cellHash(cx, cz, seed) {
  let h = ((cx * 1619 + cz * 31337) ^ (seed * 1000003)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Theme cycle — TAB steps through these in order
// ---------------------------------------------------------------------------

const THEME_CYCLE = [
  "dungeon",
  "crypt",
  "catacomb",
  "domestic",
  "industrial",
  "ruins",
  "void",
];
let themeIdx = 0;

// ---------------------------------------------------------------------------
// Room → theme map, built once per generate()
// ---------------------------------------------------------------------------

const roomMap = {}; // roomId → { floor, wall, ceil, name }
let roomMapBuilt = false;

const DUNGEON_SEED = 0xdeadbeef;

function buildRoomMap(outputs) {
  for (const k of Object.keys(roomMap)) delete roomMap[k];

  const { width, height, textures } = outputs;
  const regionId = textures.regionId.image.data;
  const themeName = THEME_CYCLE[themeIdx];
  const seen = new Set();

  for (let i = 0; i < width * height; i++) {
    const rid = regionId[i];
    if (rid === 0 || seen.has(rid)) continue;
    seen.add(rid);

    const def = resolveTheme(themeName, {});
    const name = themeName;
    const ids = tileIdsFor(def);
    const palette = THEME_PALETTES[name] ?? {
      floors: [ids.floor],
      walls: [ids.wall],
      ceils: [ids.ceil],
    };
    roomMap[rid] = { ...ids, palette, name };
  }
}

function getRoomId(cx, cz) {
  const outputs = game.dungeon.outputs;
  if (!outputs) return 0;
  const { width, textures } = outputs;
  return textures.regionId.image.data[cz * width + cx] ?? 0;
}

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 60,
    height: 60,
    seed: DUNGEON_SEED,
    roomMinSize: 4,
    roomMaxSize: 7,
    roomCount: 22,
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
// Minimap
// ---------------------------------------------------------------------------

attachMinimap(game, minimapCanvas, {
  size: 196,
  showEntities: true,
  colors: {
    explored: "#334",
    visible: "#aac",
    player: "#0f0",
  },
});

// ---------------------------------------------------------------------------
// Pre-processing — must be registered BEFORE the renderer so it runs first
// on the initial turn event, letting the renderer see the populated roomMap.
// ---------------------------------------------------------------------------

game.events.on("turn", () => {
  if (roomMapBuilt) return;
  const outputs = game.dungeon.outputs;
  if (!outputs) return;
  roomMapBuilt = true;
  buildRoomMap(outputs);
});

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

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
    // Corridor base tiles — rooms override these via layers below.
    floorTileId: 19, // Cobblestone uv [192, 128]
    ceilTileId: 19,
    wallTileId: 16, // Brick       uv [0,   128]
  });

  // ── Per-room tile layers ─────────────────────────────────────────────────
  //
  // Each layer uses polygon offset so it sits in front of the base geometry.
  // Returning null from filter leaves the base corridor tile visible instead.

  renderer.addLayer({
    target: "floor",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) => {
      const rid = getRoomId(cx, cz);
      if (!rid) return null;
      const theme = roomMap[rid];
      if (!theme) return null;
      const { floors } = theme.palette;
      const tileId = floors[cellHash(cx, cz, rid ^ 0x1111) % floors.length];
      return { tileId };
    },
  });

  renderer.addLayer({
    target: "wall",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) => {
      const rid = getRoomId(cx, cz);
      if (!rid) return null;
      const theme = roomMap[rid];
      if (!theme) return null;
      const { walls } = theme.palette;
      const tileId = walls[cellHash(cx, cz, rid ^ 0x5555) % walls.length];
      return { tileId };
    },
  });

  renderer.addLayer({
    target: "ceil",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz) => {
      const rid = getRoomId(cx, cz);
      if (!rid) return null;
      const theme = roomMap[rid];
      if (!theme) return null;
      const { ceils } = theme.palette;
      const tileId = ceils[cellHash(cx, cz, rid ^ 0x9999) % ceils.length];
      return { tileId };
    },
  });

  game.generate();
};
atlasImg.src = window.ATLAS_DATA_URL;

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

// TAB — cycle through theme types (same layout each time, fixed seed).
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    themeIdx = (themeIdx + 1) % THEME_CYCLE.length;
    roomMapBuilt = false;
    if (renderer) renderer.rebuild();
    game.regenerate();
    addLog(`Theme: ${THEME_CYCLE[themeIdx]}`, "turn");
  }
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

  const rid = getRoomId(game.player.x, game.player.z);
  const theme = roomMap[rid];
  if (theme) {
    themeEl.textContent = theme.name;
    themeEl.style.color = THEME_COLORS[theme.name] ?? "#c8d0f8";
  } else {
    themeEl.textContent = "corridor";
    themeEl.style.color = "#404060";
  }
}
