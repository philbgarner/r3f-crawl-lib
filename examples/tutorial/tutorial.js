// tutorial.js — r3f-crawl-lib mission system example
//
// Demonstrates the mission/quest system with two chained tutorial missions:
//
//   Mission 1 — "First Steps"
//     Evaluator: count actual grid moves by tracking position changes across
//     turns via mission.metadata. Complete after 5 distinct moves.
//
//   Mission 2 — "Into the Dark" (unlocked when mission 1 completes)
//     Evaluator: detect when the player steps into any corridor directly
//     connected to the starting room. Uses startRoomId from the BSP output to
//     identify valid corridors, captured in a closure at mission-add time.
//
// Key points shown:
//   - game.missions.add() with evaluator + onComplete callbacks
//   - metadata bag for cross-turn state accumulation
//   - Chaining missions: mission 2 is registered inside mission 1's onComplete
//   - game.events.on('mission-complete') for UI feedback
//   - game.dungeon.outputs.startRoomId to query BSP dungeon structure

const {
  createGame,
  attachKeybindings,
  createDungeonRenderer,
} = CrawlLib;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl   = document.getElementById('viewport');
const logEl        = document.getElementById('log');
const hpEl         = document.getElementById('hp');
const turnEl       = document.getElementById('turn');
const posEl        = document.getElementById('pos');
const missionsList = document.getElementById('missions-list');
const bannerEl     = document.getElementById('banner');

// ---------------------------------------------------------------------------
// Create game — no enemies, so the tutorial focus stays on movement
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 48,
    height: 48,
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
      tileWidth: 64,
      tileHeight: 64,
      sheetWidth: 512,
      sheetHeight: 1024,
      columns: 8,
    },
    floorTileId: 20,
    ceilTileId:  19,
    wallTileId:  16,
  });

  game.generate();

  // Wire up missions now that the dungeon is generated and we know
  // startRoomId, room rects, and the player's starting position.
  setupTutorialMissions();
};
atlasImg.src = '/examples/basic/atlas.png';

// ---------------------------------------------------------------------------
// Tutorial missions
// ---------------------------------------------------------------------------

function setupTutorialMissions() {
  // Mission 1 — First Steps
  // Track actual grid moves by comparing position each turn.
  // metadata.lastX / lastZ start as null to handle the initial turn event
  // that fires at generate() time without counting it as a move.
  game.missions.add({
    id: 'first-steps',
    name: 'First Steps',
    description: 'Move 5 times to get your bearings.',
    metadata: { moves: 0, lastX: null, lastZ: null },

    evaluator({ player, mission }) {
      const m = mission.metadata;

      if (m.lastX === null) {
        // First evaluator call — record starting position, don't count as move.
        m.lastX = player.x;
        m.lastZ = player.z;
        return false;
      }

      const moved = m.lastX !== player.x || m.lastZ !== player.z;
      if (moved) {
        m.moves += 1;
        m.lastX = player.x;
        m.lastZ = player.z;
      }

      return m.moves >= 5;
    },

    onComplete(mission) {
      addLog('Mission complete: First Steps!', 'mission');
      showBanner('First Steps complete!');
      renderMissions();

      // Chain mission 2: find corridors directly connected to the start room
      // using the BSP output's startRoomId and room connection graph.
      const outputs    = game.dungeon.outputs;
      const startRoomId = outputs && 'startRoomId' in outputs
        ? outputs.startRoomId
        : null;

      const rooms = game.dungeon.rooms;

      // Collect all corridors that border the start room.
      // Corridor entries list the rooms they touch in their own `connections`
      // array — the start room's `connections` are room-to-room only.
      const connectedCorridors = startRoomId !== null
        ? Object.values(rooms).filter(
            r => r.type === 'corridor' && r.connections.includes(startRoomId)
          )
        : [];

      if (connectedCorridors.length === 0) {
        // Degenerate dungeon with no adjacent corridors — skip mission 2.
        addLog('No corridors found from start room — tutorial complete!', 'mission');
        return;
      }

      // Mission 2 — Into the Dark
      // Captured corridors are closed over so the evaluator needs no metadata.
      game.missions.add({
        id: 'into-the-dark',
        name: 'Into the Dark',
        description: 'Step through a passage leading from your starting room.',

        evaluator({ player }) {
          return connectedCorridors.some(corridor =>
            player.x >= corridor.x &&
            player.x <  corridor.x + corridor.w &&
            player.z >= corridor.z &&
            player.z <  corridor.z + corridor.h
          );
        },

        onComplete() {
          addLog('Mission complete: Into the Dark!', 'mission');
          showBanner('Tutorial complete!');
          renderMissions();
          addLog('--- Tutorial finished. Explore freely! ---', 'mission');
        },
      });

      renderMissions();
    },
  });

  renderMissions();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on('turn', ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
  renderMissions();
});

// mission-complete is also a good place to drive UI — here we use the
// callbacks instead, but this shows how to subscribe to the event directly.
game.events.on('mission-complete', ({ name, turn }) => {
  // Already handled in onComplete above; logged here as a demonstration.
  addLog(`[event] mission-complete: "${name}" on turn ${turn}`, 'turn');
});

// ---------------------------------------------------------------------------
// Keyboard input
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward:  ['w', 'W', 'ArrowUp'],
    moveBackward: ['s', 'S', 'ArrowDown'],
    moveLeft:     ['a', 'A', 'ArrowLeft'],
    moveRight:    ['d', 'D', 'ArrowRight'],
    turnLeft:     ['q', 'Q'],
    turnRight:    ['e', 'E'],
    wait:         [' '],
  },
  onAction(action, event) {
    event.preventDefault();
    if (!game.player.alive) {
      addLog('You are dead. Refresh to restart.', 'death');
      return;
    }

    // Compute grid-relative step from facing yaw.
    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx  = Math.round(-Math.sin(yaw));
      const fz  = Math.round(-Math.cos(yaw));
      const sx  = Math.round( Math.cos(yaw));
      const sz  = Math.round(-Math.sin(yaw));
      return game.player.move(
        forward * fx + strafe * sx,
        forward * fz + strafe * sz,
      );
    }

    let a;
    switch (action) {
      case 'moveForward':  a = relativeMove( 1,  0); break;
      case 'moveBackward': a = relativeMove(-1,  0); break;
      case 'moveLeft':     a = relativeMove( 0, -1); break;
      case 'moveRight':    a = relativeMove( 0,  1); break;
      case 'turnLeft':     a = game.player.rotate( Math.PI / 2); break;
      case 'turnRight':    a = game.player.rotate(-Math.PI / 2); break;
      case 'wait':         a = game.player.wait(); break;
    }
    if (a) game.turns.commit(a);
  },
});

// ---------------------------------------------------------------------------
// Helpers — UI
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement('div');
  div.className = 'entry' + (cls ? ' ' + cls : '');
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}

function updateStats() {
  hpEl.textContent  = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}

// Re-render the missions panel from current game.missions state.
function renderMissions() {
  missionsList.innerHTML = '';

  const all = game.missions.list;
  if (all.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:7px;color:var(--muted);padding:4px 0';
    empty.textContent = 'No missions yet.';
    missionsList.appendChild(empty);
    return;
  }

  for (const mission of all) {
    const item = document.createElement('div');
    item.className = `mission-item ${mission.status}`;

    const icon = document.createElement('span');
    icon.className = 'mission-icon';

    const body = document.createElement('span');
    body.className = 'mission-body';

    const name = document.createElement('span');
    name.className = 'mission-name';
    name.textContent = mission.name;

    const desc = document.createElement('span');
    desc.className = 'mission-desc';
    desc.textContent = mission.description;

    // Show move progress for the first-steps mission while active.
    if (mission.id === 'first-steps' && mission.status === 'active') {
      const moves = mission.metadata.moves ?? 0;
      desc.textContent = `${mission.description} (${moves}/5)`;
    }

    body.appendChild(name);
    body.appendChild(desc);
    item.appendChild(icon);
    item.appendChild(body);
    missionsList.appendChild(item);
  }
}

// Flash the completion banner for 2.5 seconds.
let _bannerTimer = null;
function showBanner(text) {
  bannerEl.textContent = text;
  bannerEl.classList.add('visible');
  if (_bannerTimer) clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(() => {
    bannerEl.classList.remove('visible');
    _bannerTimer = null;
  }, 2500);
}
