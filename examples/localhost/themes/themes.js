// themes.js — atomic-core themes example
//
// Demonstrates per-room theming: press TAB to cycle through theme types.
// All rooms share the active theme. The seed is fixed so the layout stays the same.
//
// Each theme maps to floor/wall/ceiling sprite names from the packed atlas.
// Layers (addLayer) apply per-room tile overrides on top of the corridor base.

const {
  createGame,
  attachKeybindings,
  attachMinimap,
  createDungeonRenderer,
  resolveTheme,
  registerTheme,
  loadTextureAtlas,
  packedAtlasResolver,
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
// Sprite name lookup — textureAtlas.png named sprites
// ---------------------------------------------------------------------------

const FLOOR_NAMES = {
  Cobblestone: "flagstone_colored_stone.png",
  Flagstone:   "flagstone_floor_stone.png",
  Concrete:    "concrete_stone.png",
  Tile:        "fancy_tile_floor_stone.png",
  Dirt:        "floor_dirt.png",
  DiamondTile: "flagstone_colored_fancy_stone.png",
  Grate:       "grille_metal.png",
  WoodFloor:   "plank_floor_wood.png",
  ParkayFloor: "parquet_floor_wood.png",
};

const WALL_NAMES = {
  MetalPanel:    "scifi_simple_panel_metal.png",
  MetalWall:     "scifi_wall_metal.png",
  ReinforcedWall:"alt_brick_wall_stone.png",
  Cobblestone:   "cobble_wall_stone.png",
  Brick:         "brick_wall_stone.png",
  Concrete:      "concrete_stone.png",
  Plaster:       "plaster_ceiling.png",
  Dirt:          "floor_dirt.png",
  WoodWall:      "jacobean_panel_wall_wood.png",
  Grate:         "grille_metal.png",
};

const CEIL_NAMES = {
  Cobblestone: "plaster_ceiling.png",
  Flagstone:   "flagstone_floor_stone.png",
  Concrete:    "concrete_stone.png",
  Tile:        "fancy_tile_floor_stone.png",
  Dirt:        "floor_dirt.png",
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
    floors: [FLOOR_NAMES.Cobblestone, FLOOR_NAMES.Flagstone],
    walls:  [WALL_NAMES.Cobblestone, WALL_NAMES.Brick],
    ceils:  [CEIL_NAMES.Cobblestone, CEIL_NAMES.Flagstone],
  },
  crypt: {
    floors: [FLOOR_NAMES.Flagstone, FLOOR_NAMES.Cobblestone],
    walls:  [WALL_NAMES.Plaster, WALL_NAMES.Brick, WALL_NAMES.Cobblestone],
    ceils:  [CEIL_NAMES.Flagstone, CEIL_NAMES.Cobblestone],
  },
  catacomb: {
    floors: [FLOOR_NAMES.Dirt, FLOOR_NAMES.Cobblestone, FLOOR_NAMES.Flagstone],
    walls:  [WALL_NAMES.Dirt, WALL_NAMES.Cobblestone, WALL_NAMES.Brick],
    ceils:  [CEIL_NAMES.Dirt, CEIL_NAMES.Concrete, CEIL_NAMES.Cobblestone],
  },
  domestic: {
    floors: [FLOOR_NAMES.ParkayFloor, FLOOR_NAMES.WoodFloor, FLOOR_NAMES.DiamondTile],
    walls:  [WALL_NAMES.Plaster, WALL_NAMES.WoodWall],
    ceils:  [CEIL_NAMES.Concrete, CEIL_NAMES.Flagstone],
  },
  industrial: {
    floors: [FLOOR_NAMES.DiamondTile, FLOOR_NAMES.Concrete, FLOOR_NAMES.Tile],
    walls:  [WALL_NAMES.Concrete, WALL_NAMES.Brick, WALL_NAMES.Grate, WALL_NAMES.MetalWall, WALL_NAMES.ReinforcedWall],
    ceils:  [CEIL_NAMES.Concrete, CEIL_NAMES.Tile],
  },
  ruins: {
    floors: [FLOOR_NAMES.Cobblestone, FLOOR_NAMES.Dirt, FLOOR_NAMES.Flagstone],
    walls:  [WALL_NAMES.Cobblestone, WALL_NAMES.Brick, WALL_NAMES.Dirt],
    ceils:  [CEIL_NAMES.Cobblestone, CEIL_NAMES.Flagstone, CEIL_NAMES.Dirt],
  },
  void: {
    floors: [FLOOR_NAMES.Concrete],
    walls:  [WALL_NAMES.Concrete],
    ceils:  [CEIL_NAMES.Concrete],
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

function tileNamesFor(def) {
  return {
    floor: FLOOR_NAMES[def.floorType] ?? "flagstone_floor_stone.png",
    wall:  WALL_NAMES[def.wallType]   ?? "brick_wall_stone.png",
    ceil:  CEIL_NAMES[def.ceilingType] ?? "plaster_ceiling.png",
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
    const names = tileNamesFor(def);
    const palette = THEME_PALETTES[name] ?? {
      floors: [names.floor],
      walls:  [names.wall],
      ceils:  [names.ceil],
    };
    roomMap[rid] = { ...names, palette, name };
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

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    // Corridor base tiles — rooms override these via layers below.
    floorTile: "flagstone_colored_stone.png",
    ceilTile:  "plaster_ceiling.png",
    wallTile:  "brick_wall_stone.png",
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
      const tile = floors[cellHash(cx, cz, rid ^ 0x1111) % floors.length];
      return { tile };
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
      const tile = walls[cellHash(cx, cz, rid ^ 0x5555) % walls.length];
      return { tile };
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
      const tile = ceils[cellHash(cx, cz, rid ^ 0x9999) % ceils.length];
      return { tile };
    },
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
