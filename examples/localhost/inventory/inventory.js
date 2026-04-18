// inventory.js — atomic-core inventory dialog example
//
// showInventory() lives in the library: src/lib/ui/inventoryDialog.ts
// It is exported via AtomicCore.showInventory in the IIFE build.

const {
  createGame,
  createEnemy,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  createItem,
  showInventory,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// ─── Game setup ─────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById('viewport');
const logEl      = document.getElementById('log');
const hpEl       = document.getElementById('hp');
const turnEl     = document.getElementById('turn');
const posEl      = document.getElementById('pos');

// ---------------------------------------------------------------------------
// Mock item data for the demo
// ---------------------------------------------------------------------------

const MOCK_ITEMS = [
  { id: 'sword1',  name: 'Iron Sword',    type: 'weapon'  },
  { id: 'shield1', name: 'Wooden Shield', type: 'shield'  },
  { id: 'potion1', name: 'Health Potion', type: 'potion'  },
  { id: 'helm1',   name: 'Leather Helm',  type: 'head'    },
  { id: 'potion2', name: 'Health Potion', type: 'potion'  },
];

// Build InventorySlot array
const mockInventory = MOCK_ITEMS.map((item, i) => ({
  index: i,
  item,
  quantity: item.type === 'potion' ? 3 : 1,
}));

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
    hp: 22,
    maxHp: 30,
    attack: 5,
    defense: 2,
    speed: 5,
  },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount}`, 'damage');
    },
    onDeath({ entity }) {
      addLog(`${entity.type} is slain!`, 'death');
    },
  },
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
    floorTile: "flagstone_floor_stone.png",
    ceilTile:  "plaster_ceiling.png",
    wallTile:  "brick_wall_stone.png",
  });
  game.generate();
}

init();

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on('turn', ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
});

// ---------------------------------------------------------------------------
// Keyboard input — movement
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward:   ['w', 'W', 'ArrowUp'],
    moveBackward:  ['s', 'S', 'ArrowDown'],
    moveLeft:      ['a', 'A', 'ArrowLeft'],
    moveRight:     ['d', 'D', 'ArrowRight'],
    turnLeft:      ['q', 'Q'],
    turnRight:     ['e', 'E'],
    wait:          [' '],
    openInventory: ['i', 'I'],
  },
  onAction(action, event) {
    // Don't intercept keys while the inventory dialog is open.
    if (document.querySelector('dialog[open]')) return;

    event.preventDefault();
    if (!game.player.alive) {
      addLog('You are dead. Refresh to restart.', 'death');
      return;
    }

    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round( Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(forward * fx + strafe * sx, forward * fz + strafe * sz);
    }

    let a;
    switch (action) {
      case 'moveForward':    a = relativeMove(1, 0);  break;
      case 'moveBackward':   a = relativeMove(-1, 0); break;
      case 'moveLeft':       a = relativeMove(0, -1); break;
      case 'moveRight':      a = relativeMove(0, 1);  break;
      case 'turnLeft':       a = game.player.rotate( Math.PI / 2); break;
      case 'turnRight':      a = game.player.rotate(-Math.PI / 2); break;
      case 'wait':           a = game.player.wait();  break;
      case 'openInventory':  openInventory(); return;
    }
    if (a) game.turns.commit(a);
  },
});

// ---------------------------------------------------------------------------
// Inventory dialog
//
// Uses the default layout (customLayout omitted → false).
// The handle exposes setInventory, setEquipped, setStat, setIndicator,
// setBackground, getCanvas, and getRegion for live updates and DOM access.
//
// To use a fully custom layout instead:
//   const handle = showInventory({ customLayout: true, ... });
//   const dialog = handle.getElement();
//   // build your own DOM inside dialog
// ---------------------------------------------------------------------------

function openInventory() {
  const handle = showInventory({
    inventory:     mockInventory,
    equippedItems: { weapon: MOCK_ITEMS[0], head: MOCK_ITEMS[3] },
    characterName: 'ADVENTURER',

    stats: [
      { label: 'HP',   value: game.player.hp, max: game.player.maxHp },
      { label: 'Food', value: 18, max: 24, color: '#44cc44' },
    ],

    indicators: [
      { key: 'gold',   label: 'Gold',  value: 42, icon: '★' },
      { key: 'arrows', label: 'Arrow', value: 12, icon: '→' },
    ],

    // 'I' toggles the dialog open/closed
    keybindings: {
      close: ['Escape', 'i', 'I'],
    },

    onUseItem(slot)  { addLog(`Used: ${slot.item.name}`, 'inv'); },
    onDropItem(slot) { addLog(`Dropped: ${slot.item.name}`, 'inv'); },

    onEquip(equipKey, slot) {
      addLog(`Equipped ${slot.item.name} → ${equipKey}`, 'inv');
    },

    onUnequip(equipKey) {
      addLog(`Unequipped from ${equipKey}`, 'inv');
    },

    onDrop(item) {
      addLog(`Moved ${item.name}`, 'inv');
      return true;
    },

    onClose() { addLog('Inventory closed', 'inv'); },
  });

  // Keep the HP bar live while the dialog is open
  const updateHp = () => handle.setStat('HP', game.player.hp);
  game.events.on('damage', updateHp);
  handle.on('close', () => game.events.off('damage', updateHp));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement('div');
  div.className = 'entry' + (cls ? ' ' + cls : '');
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
