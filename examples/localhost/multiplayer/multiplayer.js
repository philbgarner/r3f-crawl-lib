// multiplayer.js — atomic-core multiplayer example
//
// Compared to basic.js, the only differences are:
//  1. Connect to the server first (async, before createGame).
//  2. Pass player.id (server-assigned) and transport into createGame options.
//  3. Host sends the solid map to the server after generate() so the server
//     can validate moves.
//  4. Listen to 'network-state' events to render other players as entities.
//     The renderer is also updated on every network-state event (not just on
//     the local player's turn) so remote moves are visible in real-time.
//  5. Player list panel and in-viewport chat overlay with modal input.

const {
  createGame,
  createEnemy,
  attachSpawner,
  attachKeybindings,
  attachMinimap,
  createDungeonRenderer,
  createWebSocketTransport,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------

function rogueSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_rogue_base.png", opacity: 1.0 },
      {
        tile: "mob_rogue_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function warriorSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_warrior_base.png", opacity: 1.0 },
      {
        tile: "mob_warrior_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function mageSpriteMap() {
  return {
    frameSize: { w: 128, h: 64 },
    layers: [
      { tile: "mob_mage_base.png", opacity: 1.0 },
      {
        tile: "mob_mage_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

const SPRITE_MAPS = {
  rogue: rogueSpriteMap,
  warrior: warriorSpriteMap,
  mage: mageSpriteMap,
};

function spriteForPlayer(ps) {
  const key = ps.meta?.sprite;
  const fn = SPRITE_MAPS[key] ?? rogueSpriteMap;
  return fn();
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const minimapCanvas = document.getElementById("minimap");
const connectScreen = document.getElementById("connect-screen");
const connectBtn = document.getElementById("connect-btn");
const serverUrlEl = document.getElementById("server-url");
const connectError = document.getElementById("connect-error");
const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");
const playerCountEl = document.getElementById("player-count");
const playerListEl = document.getElementById("player-list");
const chatOverlayEl = document.getElementById("chat-overlay");
const chatModalEl = document.getElementById("chat-modal");
const chatInputEl = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send");

// ---------------------------------------------------------------------------
// Connection flow
// ---------------------------------------------------------------------------

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectError.style.display = "none";

  const url = serverUrlEl.value.trim();
  const transport = createWebSocketTransport(url);
  const chosenSprite =
    document.querySelector('input[name="sprite"]:checked')?.value ?? "rogue";

  let info;
  try {
    info = await transport.connect({ sprite: chosenSprite });
  } catch (err) {
    connectError.textContent = "Could not connect: " + (err?.message ?? err);
    connectError.style.display = "block";
    connectBtn.disabled = false;
    return;
  }

  connectScreen.style.display = "none";
  startGame(transport, info, chosenSprite);
});

// ---------------------------------------------------------------------------
// Dungeon config (same seed → same dungeon on every client)
// ---------------------------------------------------------------------------

const MY_DUNGEON_CONFIG = {
  width: 40,
  height: 40,
  seed: 0xdeadbeef,
  roomMinSize: 5,
  roomMaxSize: 11,
  roomCount: 12,
};

// ---------------------------------------------------------------------------
// Entity tracking (enemies spawned on the host, synced via server state)
// ---------------------------------------------------------------------------

const enemies = [];
let spawned = 0;
const MAX_ENEMIES = 2;

// Other connected players — updated on every network-state event
let otherPlayerEntities = [];

// ---------------------------------------------------------------------------
// Chat state
// ---------------------------------------------------------------------------

let chatModalOpen = false;

function openChatModal() {
  chatModalOpen = true;
  chatModalEl.style.display = "flex";
  chatInputEl.value = "";
  chatInputEl.focus();
}

function closeChatModal() {
  chatModalOpen = false;
  chatModalEl.style.display = "none";
}

function addChatMessage(senderId, text) {
  const isServer = senderId === "server";
  const div = document.createElement("div");
  div.className = "chat-msg" + (isServer ? " server-msg" : "");
  div.textContent = isServer ? text : `${senderId}: ${text}`;
  chatOverlayEl.prepend(div);
  // Remove the element after the CSS animation ends so the DOM stays tidy
  setTimeout(() => div.remove(), 6500);
}

// ---------------------------------------------------------------------------
// Player list
// ---------------------------------------------------------------------------

function updatePlayerList(players, myPlayerId) {
  playerListEl.innerHTML = "";
  const entries = Object.entries(players);
  playerCountEl.textContent = String(entries.length);
  for (const [pid, ps] of entries) {
    const isSelf = pid === myPlayerId;
    const div = document.createElement("div");
    div.className =
      "player-entry" + (isSelf ? " self" : "") + (!ps.alive ? " dead" : "");
    div.textContent =
      (isSelf ? "► " : "  ") + pid + "  " + ps.hp + "/" + ps.maxHp;
    playerListEl.appendChild(div);
  }
}

// ---------------------------------------------------------------------------
// Main game setup
// ---------------------------------------------------------------------------

async function startGame(
  transport,
  { playerId, isHost, dungeonConfig },
  chosenSprite = "rogue",
) {
  addLog(
    `Connected as ${playerId} (${isHost ? "host" : "peer"}) — ${chosenSprite}`,
    "turn",
  );

  // Non-host clients receive the dungeon config from the server so they
  // generate the identical dungeon (same seed). Host uses its own config.
  const dungeon = isHost
    ? MY_DUNGEON_CONFIG
    : (dungeonConfig ?? MY_DUNGEON_CONFIG);

  const game = createGame(document.body, {
    dungeon,
    player: {
      id: playerId, // <-- match server-assigned id so reconciliation aligns
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
    transport,
  });

  // ── Minimap ──────────────────────────────────────────────────────────────

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

  // ── 3D renderer ──────────────────────────────────────────────────────────

  let renderer;

  {
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

    // ── Spawner — must be registered before generate() ────────────────────

    attachSpawner(game, {
      onSpawn({ roomId, x, y }) {
        if (!isHost) return null;
        if (spawned >= MAX_ENEMIES) return null;
        if (roomId < 2) return null;
        if (Math.random() > 0.75) return null;
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
          spriteMap: {
            frameSize: { w: 64, h: 64 },
            layers: [
              { tile: "mob_goblin_base.png", opacity: 1.0 },
              {
                tile: "mob_goblin_happy_head.png",
                opacity: 1.0,
                bob: { amplitudeY: 0.015, speed: 2 },
              },
            ],
          },
        });
        enemies.push(e);
        return e;
      },
    });

    game.generate();

    {
      const allRooms = Object.values(game.dungeon.rooms);
      const roomCount = allRooms.filter((r) => r.type === "room").length;
      const corridorCount = allRooms.filter((r) => r.type === "corridor").length;
      const seed = dungeon.seed.toString(16).toUpperCase();
      addLog(
        `Dungeon 0x${seed} — ${roomCount} rooms, ${corridorCount} corridors, ${spawned} enemies`,
        "turn",
      );
    }

    // Host sends solid map to server so it can validate all players' moves
    if (isHost) {
      const solid = Array.from(game.dungeon.outputs.textures.solid.image.data);
      transport.initDungeon({
        solid,
        width: game.dungeon.width,
        height: game.dungeon.height,
        config: MY_DUNGEON_CONFIG,
      });
      // Send initial monster positions so clients that connect later see them.
      transport.sendMonsterState(enemies.map(monsterNetState));
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  game.events.on("turn", ({ turn }) => {
    turnEl.textContent = String(turn);
    hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
    posEl.textContent = `${game.player.x}, ${game.player.z}`;
    if (renderer) renderer.setEntities([...enemies, ...otherPlayerEntities]);
    // Sync monster state to server so connected clients stay up to date.
    if (isHost) transport.sendMonsterState(enemies.map(monsterNetState));
  });

  // 'network-state' fires whenever the server pushes a state update —
  // including when OTHER players move. Update the renderer immediately so
  // remote movement is visible in real-time, not deferred to the local turn.
  game.events.on("network-state", (update) => {
    const allPlayers = Object.entries(update.players);

    updatePlayerList(update.players, playerId);

    otherPlayerEntities = allPlayers
      .filter(([pid]) => pid !== playerId)
      .map(([pid, ps]) => ({
        id: pid,
        kind: "npc",
        type: "player",
        sprite: "player",
        x: ps.x,
        z: ps.y,
        hp: ps.hp,
        maxHp: ps.maxHp,
        alive: ps.alive,
        attack: 0,
        defense: 0,
        speed: 0,
        blocksMove: false,
        faction: "player",
        tick: 0,
        spriteMap: spriteForPlayer(ps),
      }));

    // Non-host clients have no local enemy simulation — populate from server.
    if (!isHost && Array.isArray(update.monsters)) {
      enemies.length = 0;
      enemies.push(...update.monsters);
    }

    if (renderer) renderer.setEntities([...enemies, ...otherPlayerEntities]);
  });

  // Chat messages received from the server
  transport.onChat(({ playerId: senderId, text }) => {
    addChatMessage(senderId, text);
  });

  game.events.on("audio", ({ name }) => {
    addLog(`[sfx] ${name}`, "audio");
  });

  // ── Chat modal ───────────────────────────────────────────────────────────

  function sendChat() {
    const text = chatInputEl.value.trim();
    closeChatModal();
    if (!text) return;
    transport.sendChat(text);
  }

  chatSendBtn.addEventListener("click", sendChat);

  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChat();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeChatModal();
    }
    e.stopPropagation(); // prevent game keybindings from firing while typing
  });

  // Open chat on Enter when the modal is not already open
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !chatModalOpen) {
      e.preventDefault();
      openChatModal();
    }
    if (e.key === "Escape" && chatModalOpen) {
      e.preventDefault();
      closeChatModal();
    }
  });

  // ── Keyboard input ───────────────────────────────────────────────────────

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
      // Block movement while the chat modal is open
      if (chatModalOpen) return;

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
}

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

function monsterNetState(e) {
  return {
    id: e.id,
    kind: "enemy",
    type: e.type,
    sprite: e.sprite,
    x: e.x,
    z: e.z,
    hp: e.hp,
    maxHp: e.maxHp,
    alive: e.alive,
    attack: e.attack,
    defense: e.defense,
    speed: e.speed,
    blocksMove: e.blocksMove,
    faction: e.faction,
    tick: e.tick,
    spriteMap: e.spriteMap,
  };
}
