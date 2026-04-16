# Inventory Dialog — Implementation Plan

## Overview

A framework-agnostic, zero-dependency inventory dialog shipped as part of the
library. The consumer calls `showInventory(options)` which imperatively mounts a
`<dialog>` element, wires up all behaviour, and returns a **handle** for runtime
manipulation. No framework required; works with React, Vue, Svelte, or plain JS
equally well.

---

## Core Architecture

### DOM Structure

```
<dialog class="inv-dialog">          ← native <dialog>; gets backdrop for free
  <canvas class="inv-bg-canvas">     ← full-bleed background layer (z-index 0)
  <div class="inv-layout">           ← CSS grid overlay (z-index 1)
    <div class="inv-col-left">       ← sizes to content
    <div class="inv-col-right">      ← sizes to content
```

The two columns are positioned inside a CSS Grid that fills the dialog interior.
Because they only span their natural content width, any unoccupied space reveals
the canvas background — allowing the artist to render a character portrait, an
atmospheric illustration, a particle effect, or anything else behind the UI panels.

Using `<dialog>` gives us:
- Native `::backdrop` element (styleable with CSS)
- `showModal()` / `close()` focus trapping for accessibility
- HTML5 drag-and-drop API works correctly inside a modal dialog

**Note:** Escape-to-close and all other key interactions are wired exclusively
through `attachKeybindings` — no hard-coded `keydown` listeners in the dialog
implementation.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    [background canvas]                       │
│  ┌───────────────────────┐  ┌────────────────────────────┐  │
│  │ LEFT COLUMN           │  │ RIGHT COLUMN               │  │
│  │ [portrait] CHARACTER  │  │                            │  │
│  │           HP  ██░░░░  │  │ [head-slot]                │  │
│  │           FOOD ████   │  │ [neck]  ~silhouette~ [ring]│  │
│  ├───────────────────────┤  │ [chest]                    │  │
│  │ inventory grid        │  │ [hand]           [offhand] │  │
│  │ [ ][ ]                │  │ [weapon]  [legs] [shield]  │  │
│  │ [ ][ ]                │  │ [boots]                    │  │
│  │ [x][ ]                │  ├────────────────────────────┤  │
│  │ [x][ ]                │  │ [indicator] [indicator]    │  │
│  │ [x][ ]                │  │ [action]    [action] [✕]  │  │
│  │ [ ][ ]                │  └────────────────────────────┘  │
│  │ [ ][ ]                │                                   │
│  └───────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

Page navigation (when more than one page is registered) renders as a decorative
curled-page corner at the bottom-right of the right column. No tabs are shown by
default. The `pageNavStyle` option exists to promote it to a visible tab strip
if the consumer prefers.

---

## Sections

### 1 — Left Column

**Profile sub-panel (top of left column)**

| Element    | Default                        | Override                           |
|------------|--------------------------------|------------------------------------|
| Portrait   | Grey placeholder silhouette    | `portrait: url \| HTMLElement`     |
| Name       | `"PLAYER"`                     | `characterName: string`            |
| Stat bars  | Single HP bar                  | `stats: StatBar[]`                 |

Each `StatBar` has `{ label, value, max, color? }`. Bars render as a `<div>` fill
with a CSS `width` transition — no canvas required.

**Inventory grid sub-panel (below profile)**

- Default: 2 columns × 7 rows = 14 slots visible per page.
- Items render as an `<img>` (from `resolveIcon`), a canvas-drawn sprite, or a
  fallback single-letter badge.
- Slots are `draggable="true"` HTML elements; see Drag-and-Drop section.
- Clicking an occupied slot fires `onSelectSlot`.
- Grid navigation (arrow keys, Enter to use/equip) is wired via `attachKeybindings`
  with a default binding set that consumers can override.
- `gridCols` and `gridRows` are configurable.

---

### 2 — Right Column

**Equipment / body panel**

A human-silhouette SVG (ships inline, no external asset) with absolutely-positioned
drop zones for each equipment slot. Positions are expressed as `{ top, left }`
percentage strings so they scale with the panel.

Default slot layout:

| Slot key   | Position              |
|------------|-----------------------|
| `head`     | Top-centre            |
| `neck`     | Upper-left            |
| `ring`     | Upper-right           |
| `chest`    | Centre torso          |
| `hand`     | Left of waist         |
| `offhand`  | Right of waist        |
| `weapon`   | Lower-left            |
| `shield`   | Lower-right           |
| `legs`     | Mid-thigh             |
| `boots`    | Bottom-centre         |

Consumers override the full set via `equipSlots: EquipSlotDef[]`.

**Indicators strip (bottom of right column)**

A horizontal row of small read-only widgets for values such as gold, food, arrows,
etc. Each indicator:

```js
{ key, label, value, icon?, render? }
// render: (el, value) => void  ← full custom widget
```

**Actions strip (bottom of right column, below indicators)**

Icon buttons for global actions. Built-in: trash (drop selected), close.
Consumers append custom actions: `{ key, label, icon, onClick: (handle) => void }`.

The decorative page-curl lives at the far right of this strip, rendered only when
more than one page is registered.

---

## Background System

Three mutually exclusive modes, set at creation and swappable via `handle.setBackground()`.

### `backgroundImage`
A CSS `background` value applied directly to the dialog. Quick and cheap.

```js
background: { image: 'url(/assets/dungeon-wall.png)' }
background: { image: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }
```

### `background9Slice`
A 9-slice panel image. Rendered as a **3×3 `<div>` grid** (not CSS `border-image`)
so each of the nine regions is an individually styleable element. This gives the
artist full control over corner piece animation, tinting, and blending — things
`border-image` cannot express cleanly.

```js
background: {
  nineSlice: {
    url: '/assets/panel.png',
    top: 16, right: 16, bottom: 16, left: 16,  // pixel insets defining slice lines
    scale: 2,   // optional: pixel-art scale factor for corner/edge tiles
  }
}
```

### `backgroundCanvas`
The `<canvas>` element behind the layout columns is exposed to the consumer.
A draw callback is called each animation frame via `requestAnimationFrame`,
receiving `(ctx, width, height, deltaTime)`. The loop runs while the dialog is
open and stops automatically on close.

```js
background: {
  canvas: (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(characterPortrait, 0, 0, w, h);
    // particle effects, animated atmosphere, etc.
  }
}
```

---

## Drag-and-Drop

HTML5 native drag-and-drop is used throughout (works correctly inside `<dialog>`).

**Draggable elements:** inventory slot cells and equipped slot cells.

**Drop targets:** inventory slot cells, equipped slot cells, the trash action.

**Custom drag image:**

```js
dragIcon: (item, defaultEl) => HTMLElement | string | null
// string  → treated as an image URL; library creates an <img> as the drag ghost
// null    → use the browser default (the dragged element itself)
// element → used directly as the drag ghost
```

The library calls `event.dataTransfer.setDragImage(image, cx, cy)` using the
resolved icon. This handles the "custom mouse icon while dragging" requirement
within the browser's drag API — no cursor CSS trickery required.

**Drag callbacks:**

```js
onDragStart: (item, fromSlot, event) => void
onDragEnter: (item, toSlot,   event) => void
onDrop:      (item, fromSlot, toSlot, event) => boolean
// returning false from onDrop cancels the move (item snaps back)
```

---

## Keybindings

All keyboard interactions are registered via `attachKeybindings`. The dialog
creates its own internal binding handle (scoped to the dialog's open state) and
destroys it when the dialog closes. Consumers receive the binding handle inside
the returned `InventoryHandle` and may call `handle.keybindings.destroy()` to
detach early or replace it entirely.

**Default bindings:**

| Action            | Default keys             |
|-------------------|--------------------------|
| `close`           | `Escape`                 |
| `navUp`           | `ArrowUp`                |
| `navDown`         | `ArrowDown`              |
| `navLeft`         | `ArrowLeft`              |
| `navRight`        | `ArrowRight`             |
| `useSelected`     | `Enter`                  |
| `dropSelected`    | `Delete`, `Backspace`    |
| `nextPage`        | `Tab`                    |

Consumers override any or all bindings:

```js
const handle = showInventory({
  // ...
  keybindings: {
    close:       ['Escape', 'i', 'I'],
    useSelected: ['Enter', 'u', 'U'],
    nextPage:    ['n', 'N'],
  }
});
```

---

## `resolveIcon`

```js
resolveIcon: (item) => IconDescriptor | string | null
```

`IconDescriptor` allows the artist to blit a sprite from a packed atlas canvas
with an optional rotation to reorient sprites that were packed sideways:

```js
{
  // Option A — plain image URL
  url: '/assets/icons/sword.png',

  // Option B — atlas blit
  atlasCanvas: HTMLCanvasElement,  // or HTMLImageElement
  sx: number,    // source x in pixels
  sy: number,    // source y in pixels
  sw: number,    // source width in pixels
  sh: number,    // source height in pixels

  // Optional for both modes
  rot: 0 | 1 | 2 | 3,
  // 0 = no rotation (default)
  // 1 = 90° clockwise
  // 2 = 180°
  // 3 = 270° clockwise
  // Applied as a CSS transform on the rendered element, or as a canvas
  // rotation when blitting, so packed sideways sprites appear upright in slots.
}
```

The library renders each resolved icon into a small `<canvas>` (slot-sized) so
atlas blitting and rotation work uniformly regardless of whether the source is an
atlas canvas, an image URL, or a `<canvas>` element.

---

## `PlayerHandle` additions

The existing `PlayerHandle` gains one new method alongside `useItem` / `dropItem`:

```typescript
equip(slotIndex: number, equipSlotKey: string): TurnAction
// Produces { kind: "interact", meta: { equip: slotIndex, equipSlot: equipSlotKey } }
```

This is dispatched via `game.turns.commit()` the same way as any other action,
keeping equip fully turn-aware and middleware-compatible.

---

## `showInventory` Options

```js
import { showInventory } from 'atomic-core';

const handle = showInventory({

  // ── Data ─────────────────────────────────────────────────────────────────
  inventory:     [],          // InventorySlot[]
  equippedItems: {},          // Record<slotKey, Item|null>

  // ── Profile panel ──────────────────────────────────────────────────────
  characterName: 'PLAYER',
  portrait:      null,        // string (URL) | HTMLElement | null
  stats: [
    { label: 'HP', value: 10, max: 10 }
  ],

  // ── Background ─────────────────────────────────────────────────────────
  background: null,           // see Background System above

  // ── Grid ───────────────────────────────────────────────────────────────
  gridCols: 2,
  gridRows: 7,

  // ── Equipment panel ────────────────────────────────────────────────────
  equipSlots:     null,       // EquipSlotDef[] | null  (null = use defaults)
  bodySilhouette: null,       // string (URL) | SVGElement | null (null = built-in)

  // ── Pages ──────────────────────────────────────────────────────────────
  pages: [
    { key: 'equipment', label: 'Equipment', content: 'equipment' },
  ],
  // pageNavStyle only matters when pages.length > 1:
  pageNavStyle: 'pagecurl',   // 'pagecurl' | 'tabs'
  activePage:   'equipment',

  // ── Indicators ─────────────────────────────────────────────────────────
  indicators: [],             // IndicatorDef[]

  // ── Actions ────────────────────────────────────────────────────────────
  actions: [],                // ActionDef[] appended after built-in trash+close

  // ── Icon resolution ────────────────────────────────────────────────────
  resolveIcon: null,          // (item) => IconDescriptor | string | null

  // ── Drag-and-drop ──────────────────────────────────────────────────────
  dragIcon:   null,           // (item, defaultEl) => HTMLElement | string | null
  touchDrag:  false,          // deferred

  // ── Keybindings ────────────────────────────────────────────────────────
  keybindings: {},            // partial override of default binding map

  // ── Callbacks ──────────────────────────────────────────────────────────
  onClose:     null,
  onSelectSlot: null,         // (slot: InventorySlot) => void
  onUseItem:   null,          // (slot: InventorySlot) => void
  onDropItem:  null,          // (slot: InventorySlot) => void
  onEquip:     null,          // (equipKey: string, slot: InventorySlot) => void
  onUnequip:   null,          // (equipKey: string, item: Item) => void
  onDragStart: null,          // (item, fromSlot, event) => void
  onDragEnter: null,          // (item, toSlot, event) => void
  onDrop:      null,          // (item, fromSlot, toSlot, event) => boolean

  // ── Style ──────────────────────────────────────────────────────────────
  className: null,            // extra class added to <dialog>
  width:     null,            // CSS value, e.g. '480px'  (default: auto)
  height:    null,            // CSS value                (default: auto)
});
```

---

## Handle API

```js
// Lifecycle
handle.close();                          // closes the dialog; fires onClose
handle.isOpen();                         // → boolean

// Data updates (re-renders the affected region only)
handle.setInventory(slots);              // InventorySlot[]
handle.setEquipped(equippedItems);       // Record<key, Item|null>
handle.setStat(label, value, max?);      // update one stat bar in place
handle.setIndicator(key, value);         // update one indicator widget

// Background
handle.setBackground(bgOptions);        // swap background mode at runtime
handle.getCanvas();                      // → HTMLCanvasElement (the bg canvas)

// Pages
handle.setPage(key);                     // navigate to a page programmatically
handle.addPage(pageDef);                 // add a page at runtime
handle.removePage(key);                  // remove a page at runtime

// Keybindings
handle.keybindings;                      // the KeybindingsHandle — call .destroy() to detach

// Events (mirrors the callback options; addable after creation)
handle.on(event, callback);
handle.off(event, callback);
// Events: 'close' | 'selectSlot' | 'useItem' | 'dropItem' |
//         'equip' | 'unequip' | 'dragStart' | 'dragEnter' | 'drop' | 'pageChange'

// DOM escape hatch
handle.getElement();                     // → <dialog> element
handle.getRegion(name);
// name: 'left' | 'right' | 'profile' | 'grid' | 'equipment' | 'indicators' | 'actions'
```

---

## Styling

All CSS custom properties are scoped to `.inv-dialog` so they never leak into the
host page. Sensible retro defaults ship out of the box.

```css
.inv-dialog {
  --inv-bg:          #3a3a5c;
  --inv-panel:       #2a2a4a;
  --inv-border:      #6a6a9a;
  --inv-border-hi:   #aaaadd;
  --inv-text:        #e0e0ff;
  --inv-text-dim:    #8888aa;
  --inv-accent:      #ddaa00;   /* selected slot, active tab */
  --inv-accent-dim:  #887700;
  --inv-slot-size:   48px;
  --inv-slot-gap:    4px;
  --inv-font:        'Press Start 2P', monospace;
  --inv-font-size:   8px;
  --inv-radius:      4px;
}
```

Override any variable on `.inv-dialog` directly or via the `className` prop:

```css
.my-game .inv-dialog { --inv-accent: #ff6644; --inv-slot-size: 56px; }
```

**Slot states:**

| State      | Visual                                          |
|------------|-------------------------------------------------|
| Empty      | `--inv-panel` fill, `--inv-border` border       |
| Occupied   | Item icon centred; quantity badge bottom-right  |
| Hover      | `--inv-border-hi` border                        |
| Selected   | `--inv-accent` border + inner glow              |
| Drag-over  | `--inv-accent` pulsing border                   |

`image-rendering: pixelated` is applied to all `<img>` and `<canvas>` elements
inside `.inv-dialog`. Consumers disable per-element if needed.

`::backdrop { background: rgba(0,0,0,0.6); }` — overridable.

---

## File Plan

```
src/lib/
└── ui/
    ├── inventoryDialog.js     # showInventory(); mounts dialog, returns handle
    ├── inventoryDialog.css    # all styles; scoped to .inv-dialog
    ├── profilePanel.js        # portrait, name, stat bars
    ├── inventoryGrid.js       # slot grid with pagination
    ├── equipmentPanel.js      # silhouette SVG + drop zones
    ├── pageNav.js             # page-curl + optional tab strip
    ├── indicators.js          # indicator + action strips
    ├── background.js          # image / 9-slice / canvas background modes
    ├── dragDrop.js            # HTML5 DnD wiring + custom drag image helper
    ├── handle.js              # InventoryHandle class
    ├── defaultEquipSlots.js   # built-in 10-slot layout definitions
    └── defaults.js            # full default options object
```

Exported from `src/lib/index.ts`:

```typescript
export { showInventory } from './ui/inventoryDialog.js';
export type {
  InventoryHandle, InventoryOptions,
  StatBar, EquipSlotDef, IndicatorDef, ActionDef,
  InventoryPage, BackgroundOptions, IconDescriptor,
} from './ui/types';
```

---

## Integration Example (plain JS)

```js
import { showInventory, attachKeybindings } from 'atomic-core';

// Wire "I" key on the game to open the dialog.
// The dialog manages its own internal keybindings (Escape, arrow keys, etc.)
// via a separate attachKeybindings call it owns for the duration it is open.
attachKeybindings(game, {
  bindings: { openInventory: ['i', 'I'] },
  onAction(action) {
    if (action === 'openInventory') openInventory();
  },
});

function openInventory() {
  const handle = showInventory({
    inventory:     game.player.inventory,
    equippedItems: game.player.equipped,
    characterName: 'Dinsa',
    portrait:      '/assets/dinsa.png',

    stats: [
      { label: 'HP',   value: game.player.hp,   max: game.player.maxHp },
      { label: 'FOOD', value: game.player.food, max: 100, color: '#44cc44' },
    ],

    background: {
      canvas: (ctx, w, h) => {
        ctx.drawImage(characterPortraitImg, 0, 0, w, h);
      }
    },

    indicators: [
      { key: 'gold',   label: 'Gold',   value: game.player.gold,   icon: '⚙' },
      { key: 'arrows', label: 'Arrows', value: game.player.arrows, icon: '→' },
    ],

    resolveIcon(item) {
      return {
        atlasCanvas: atlasEl,
        sx: item.atlasX, sy: item.atlasY,
        sw: 16, sh: 16,
        rot: item.atlasRot ?? 0,   // reorient packed sideways sprites
      };
    },

    dragIcon: (item) => `/assets/icons/${item.type}.png`,

    keybindings: {
      close: ['Escape', 'i', 'I'],  // let "I" also close
    },

    onUseItem:  (slot) => game.turns.commit(game.player.useItem(slot.index)),
    onDropItem: (slot) => game.turns.commit(game.player.dropItem(slot.index)),
    onEquip:    (key, slot) => game.turns.commit(game.player.equip(slot.index, key)),
    onUnequip:  (key)       => game.turns.commit(game.player.unequip(key)),
    onClose:    ()          => game.resumeTurns(),
  });

  // Keep data live while open
  game.events.on('item-pickup', () => handle.setInventory(game.player.inventory));
  game.events.on('damage',      () => handle.setStat('HP', game.player.hp));
  game.events.on('turn',        () => handle.setIndicator('gold', game.player.gold));
}
```

---

## Resolved Decisions

| # | Decision                    | Resolution                                                      |
|---|-----------------------------|-----------------------------------------------------------------|
| 1 | `equip` action              | Added `equip(slotIndex, equipSlotKey)` to `PlayerHandle`        |
| 2 | 9-slice implementation      | 3×3 `<div>` grid — full artist control, animatable regions      |
| 3 | `resolveIcon` + rotation    | `IconDescriptor` with `rot: 0\|1\|2\|3` (quarter turns CW)     |
| 4 | Touch drag                  | Deferred                                                        |
| 5 | Page navigation default     | No tabs shown unless `pages.length > 1`; default style `pagecurl` |
| 6 | Keyboard navigation         | All keys via `attachKeybindings`; no hard-coded listeners       |
