// src/lib/ui/inventoryDialog.ts
//
// showInventory() — builds and opens an RPG-style inventory dialog.
//
// Default behaviour (customLayout: false) creates a full two-column layout:
// left column has a character profile + item grid; right column has an
// equipment paper-doll, optional indicator strip, and action buttons.
//
// Pass customLayout: true to receive a bare <dialog> element and build your
// own DOM inside handle.getElement().

import type { Item, InventorySlot } from '../entities/inventory';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EquipSlotDef = {
  key: string;
  label: string;
  top: string;
  left: string;
};

export type StatDef = {
  label: string;
  value: number;
  max: number;
  color?: string;
};

export type IndicatorDef = {
  key: string;
  label: string;
  value?: number | string;
  icon?: string;
  render?: (el: HTMLElement, value: unknown) => void;
};

export type ActionDef = {
  label: string;
  icon?: string;
  onClick: (handle: InventoryHandle) => void;
};

export type IconDescriptor =
  | string
  | { url: string; rot?: number }
  | { atlasCanvas: HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number; rot?: number };

export type BackgroundDef = {
  image?: string;
  nineSlice?: { url: string; top: number };
  canvas?: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;
};

export type DropTarget = InventorySlot | { equipKey: string };

export type InventoryOptions = {
  customLayout?: boolean;
  inventory?: InventorySlot[];
  equippedItems?: Record<string, Item>;
  characterName?: string;
  portrait?: string | null;
  stats?: StatDef[];
  gridCols?: number;
  gridRows?: number;
  equipSlots?: EquipSlotDef[] | null;
  indicators?: IndicatorDef[];
  actions?: ActionDef[];
  resolveIcon?: ((item: Item) => IconDescriptor | null) | null;
  dragIcon?: ((item: Item, el: HTMLElement) => string | HTMLElement | null) | null;
  keybindings?: Record<string, string[]>;
  className?: string;
  background?: BackgroundDef;
  onClose?: (() => void) | null;
  onSelectSlot?: ((slot: InventorySlot) => void) | null;
  onUseItem?: ((slot: InventorySlot) => void) | null;
  onDropItem?: ((slot: InventorySlot) => void) | null;
  onEquip?: ((key: string, slot: InventorySlot) => void) | null;
  onUnequip?: ((key: string, item: Item) => void) | null;
  onDragStart?: ((item: Item, slot: InventorySlot, e: DragEvent) => void) | null;
  onDragEnter?: ((item: Item | null, slot: InventorySlot, e: DragEvent) => void) | null;
  onDrop?: ((item: Item, fromSlot: InventorySlot, toSlot: DropTarget, e: DragEvent) => boolean | void) | null;
};

/** Core handle — always present regardless of customLayout. */
export type InventoryHandleCore = {
  close(): void;
  isOpen(): boolean;
  getElement(): HTMLDialogElement;
  on(event: string, cb: EventListener): void;
  off(event: string, cb: EventListener): void;
};

/** Extended handle — additional methods added when customLayout is false. */
export type InventoryHandle = InventoryHandleCore & {
  setInventory?(slots: InventorySlot[]): void;
  setEquipped?(equipped: Record<string, Item>): void;
  setStat?(label: string, value: number, max?: number): void;
  setIndicator?(key: string, value: unknown): void;
  setBackground?(bg: BackgroundDef): void;
  getCanvas?(): HTMLCanvasElement;
  getRegion?(name: string): HTMLElement | null;
};

// ---------------------------------------------------------------------------
// Default equip-slot layout
// ---------------------------------------------------------------------------

const DEFAULT_EQUIP_SLOTS: EquipSlotDef[] = [
  { key: 'head',    label: 'Head',    top: '12%', left: '50%' },
  { key: 'neck',    label: 'Neck',    top: '22%', left: '22%' },
  { key: 'ring',    label: 'Ring',    top: '22%', left: '78%' },
  { key: 'chest',   label: 'Chest',   top: '40%', left: '50%' },
  { key: 'hand',    label: 'Hand',    top: '55%', left: '18%' },
  { key: 'offhand', label: 'Offhand', top: '55%', left: '82%' },
  { key: 'weapon',  label: 'Weapon',  top: '72%', left: '22%' },
  { key: 'shield',  label: 'Shield',  top: '72%', left: '78%' },
  { key: 'legs',    label: 'Legs',    top: '72%', left: '50%' },
  { key: 'boots',   label: 'Boots',   top: '88%', left: '50%' },
];

// ---------------------------------------------------------------------------
// showInventory
// ---------------------------------------------------------------------------

export function showInventory(opts: InventoryOptions = {}): InventoryHandle {
  // ── Defaults ───────────────────────────────────────────────────────────────
  const o = {
    customLayout:  false,
    inventory:     [] as InventorySlot[],
    equippedItems: {} as Record<string, Item>,
    characterName: 'PLAYER',
    portrait:      null as string | null,
    stats:         [] as StatDef[],
    gridCols:      2,
    gridRows:      7,
    equipSlots:    null as EquipSlotDef[] | null,
    indicators:    [] as IndicatorDef[],
    actions:       [] as ActionDef[],
    resolveIcon:   null as ((item: Item) => IconDescriptor | null) | null,
    dragIcon:      null as ((item: Item, el: HTMLElement) => string | HTMLElement | null) | null,
    keybindings:   {} as Record<string, string[]>,
    className:     '',
    background:    undefined as BackgroundDef | undefined,
    onClose:       null as (() => void) | null,
    onSelectSlot:  null as ((slot: InventorySlot) => void) | null,
    onUseItem:     null as ((slot: InventorySlot) => void) | null,
    onDropItem:    null as ((slot: InventorySlot) => void) | null,
    onEquip:       null as ((key: string, slot: InventorySlot) => void) | null,
    onUnequip:     null as ((key: string, item: Item) => void) | null,
    onDragStart:   null as ((item: Item, slot: InventorySlot, e: DragEvent) => void) | null,
    onDragEnter:   null as ((item: Item | null, slot: InventorySlot, e: DragEvent) => void) | null,
    onDrop:        null as ((item: Item, fromSlot: InventorySlot, toSlot: DropTarget, e: DragEvent) => boolean | void) | null,
    ...opts,
  };

  const equipSlots = o.equipSlots ?? DEFAULT_EQUIP_SLOTS;

  // ── Dialog element ─────────────────────────────────────────────────────────

  const dialog = document.createElement('dialog');
  dialog.className = 'inv-dialog' + (o.className ? ' ' + o.className : '');

  // ── Shared state ───────────────────────────────────────────────────────────

  let currentInventory = o.inventory.slice();
  let currentEquipped  = { ...o.equippedItems };
  let rafId: number | null = null;

  function stopBgLoop(): void {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ── Keybindings ────────────────────────────────────────────────────────────

  const defaultBindings: Record<string, string[]> = {
    close:        ['Escape'],
    navUp:        ['ArrowUp'],
    navDown:      ['ArrowDown'],
    navLeft:      ['ArrowLeft'],
    navRight:     ['ArrowRight'],
    useSelected:  ['Enter'],
    dropSelected: ['Delete', 'Backspace'],
  };

  const mergedBindings = { ...defaultBindings };
  for (const [action, keys] of Object.entries(o.keybindings)) {
    mergedBindings[action] = keys;
  }

  const keyToAction = new Map<string, string>();
  for (const [action, keys] of Object.entries(mergedBindings)) {
    for (const key of keys) keyToAction.set(key, action);
  }

  // selectedSlotIndex and renderGrid are set by the default layout block.
  let selectedSlotIndex = -1;
  let renderGrid: ((inv: InventorySlot[]) => void) | null = null;

  function handleDialogKey(e: KeyboardEvent): void {
    const action = keyToAction.get(e.key);
    if (!action) return;
    e.preventDefault();
    switch (action) {
      case 'close': closeDialog(); break;
      case 'navRight':
        selectedSlotIndex = Math.min(selectedSlotIndex + 1, o.gridCols * o.gridRows - 1);
        renderGrid?.(currentInventory);
        break;
      case 'navLeft':
        selectedSlotIndex = Math.max(selectedSlotIndex - 1, 0);
        renderGrid?.(currentInventory);
        break;
      case 'navDown':
        selectedSlotIndex = Math.min(selectedSlotIndex + o.gridCols, o.gridCols * o.gridRows - 1);
        renderGrid?.(currentInventory);
        break;
      case 'navUp':
        selectedSlotIndex = Math.max(selectedSlotIndex - o.gridCols, 0);
        renderGrid?.(currentInventory);
        break;
      case 'useSelected': {
        const slot = currentInventory[selectedSlotIndex];
        if (slot?.item) o.onUseItem?.(slot);
        break;
      }
      case 'dropSelected': {
        const slot = currentInventory[selectedSlotIndex];
        if (slot?.item) o.onDropItem?.(slot);
        break;
      }
    }
  }

  // ── Close ──────────────────────────────────────────────────────────────────

  function closeDialog(): void {
    stopBgLoop();
    document.removeEventListener('keydown', handleDialogKey);
    dialog.close();
    o.onClose?.();
    dialog.addEventListener('animationend', () => dialog.remove(), { once: true });
    setTimeout(() => { if (dialog.parentNode) dialog.remove(); }, 300);
  }

  // ── Core handle ────────────────────────────────────────────────────────────

  const handle: InventoryHandle = {
    close:      closeDialog,
    isOpen:     () => dialog.open,
    getElement: () => dialog,
    on(event, cb)  { dialog.addEventListener('inv:' + event, cb); },
    off(event, cb) { dialog.removeEventListener('inv:' + event, cb); },
  };

  // ── Default layout ─────────────────────────────────────────────────────────
  // Skipped when customLayout: true — caller builds their own DOM inside
  // the dialog element returned by handle.getElement().

  if (!o.customLayout) {
    const inner = document.createElement('div');
    inner.className = 'inv-inner';

    const bgCanvas = document.createElement('canvas');
    bgCanvas.className = 'inv-bg-canvas';

    const layout = document.createElement('div');
    layout.className = 'inv-layout';

    const colLeft  = document.createElement('div');
    colLeft.className = 'inv-col-left';
    const colRight = document.createElement('div');
    colRight.className = 'inv-col-right';

    // ── Profile ───────────────────────────────────────────────────────────────

    const profile = document.createElement('div');
    profile.className = 'inv-profile';

    const portraitEl = document.createElement('div');
    portraitEl.className = 'inv-portrait';
    if (o.portrait) {
      const img = document.createElement('img');
      img.src = o.portrait;
      portraitEl.appendChild(img);
    } else {
      portraitEl.textContent = '?';
    }

    const charInfo = document.createElement('div');
    charInfo.className = 'inv-char-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'inv-char-name';
    nameEl.textContent = o.characterName;
    charInfo.appendChild(nameEl);

    const statBarEls: Record<string, { fill: HTMLElement; stat: StatDef }> = {};
    const allStats = o.stats.length ? o.stats : [{ label: 'HP', value: 10, max: 10 }];
    for (const stat of allStats) {
      const row   = document.createElement('div');  row.className   = 'inv-stat-bar';
      const lbl   = document.createElement('div');  lbl.className   = 'inv-stat-label';
      lbl.textContent = stat.label;
      const track = document.createElement('div');  track.className = 'inv-stat-track';
      const fill  = document.createElement('div');  fill.className  = 'inv-stat-fill';
      fill.style.width = stat.max > 0 ? (stat.value / stat.max * 100) + '%' : '0%';
      if (stat.color) fill.style.background = stat.color;
      track.appendChild(fill);
      row.appendChild(lbl);
      row.appendChild(track);
      charInfo.appendChild(row);
      statBarEls[stat.label] = { fill, stat: { ...stat } };
    }

    profile.appendChild(portraitEl);
    profile.appendChild(charInfo);

    // ── Icon helpers ──────────────────────────────────────────────────────────

    function applyRot(ctx: CanvasRenderingContext2D, size: number, rot: number, drawFn: () => void): void {
      if (!rot) { drawFn(); return; }
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(rot * Math.PI / 2);
      ctx.translate(-size / 2, -size / 2);
      drawFn();
      ctx.restore();
    }

    function renderItemIcon(item: Item): HTMLElement | null {
      if (!item) return null;
      const descriptor = o.resolveIcon ? o.resolveIcon(item) : null;
      if (!descriptor) {
        const badge = document.createElement('div');
        badge.style.cssText = 'width:80%;height:80%;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--inv-text-dim)';
        badge.textContent = (item.name || item.type || '?').charAt(0).toUpperCase();
        return badge;
      }
      const cvs = document.createElement('canvas');
      cvs.className = 'inv-slot-icon';
      cvs.width  = 32;
      cvs.height = 32;
      const ctx = cvs.getContext('2d')!;
      if (typeof descriptor === 'string') {
        const img = new Image();
        img.onload = () => applyRot(ctx, 32, 0, () => ctx.drawImage(img, 0, 0, 32, 32));
        img.src = descriptor;
      } else if ('url' in descriptor) {
        const img = new Image();
        img.onload = () => applyRot(ctx, 32, descriptor.rot ?? 0, () => ctx.drawImage(img, 0, 0, 32, 32));
        img.src = descriptor.url;
      } else if ('atlasCanvas' in descriptor) {
        applyRot(ctx, 32, descriptor.rot ?? 0, () => {
          ctx.drawImage(descriptor.atlasCanvas, descriptor.sx, descriptor.sy, descriptor.sw, descriptor.sh, 0, 0, 32, 32);
        });
      }
      return cvs;
    }

    // ── Inventory grid ────────────────────────────────────────────────────────

    const grid = document.createElement('div');
    grid.className = 'inv-grid';
    grid.style.gridTemplateColumns = `repeat(${o.gridCols}, var(--inv-slot-size))`;

    const slotEls: HTMLElement[] = [];

    renderGrid = function(inventory: InventorySlot[]): void {
      grid.innerHTML = '';
      slotEls.length = 0;
      const totalSlots = o.gridCols * o.gridRows;
      for (let i = 0; i < totalSlots; i++) {
        const slot = inventory[i] ?? { index: i, item: null, quantity: 0 };
        const cell = document.createElement('div');
        cell.className = 'inv-slot' + (i === selectedSlotIndex ? ' selected' : '');
        cell.dataset.index = String(i);

        if (slot.item) {
          cell.draggable = true;
          const icon = renderItemIcon(slot.item);
          if (icon) cell.appendChild(icon);
          if (slot.quantity > 1) {
            const qty = document.createElement('div');
            qty.className = 'inv-slot-qty';
            qty.textContent = String(slot.quantity);
            cell.appendChild(qty);
          }
          cell.addEventListener('dragstart', (e: DragEvent) => {
            e.dataTransfer!.setData('text/plain', JSON.stringify({ fromSlot: i, kind: 'inventory' }));
            if (o.dragIcon && slot.item) {
              const ghost = o.dragIcon(slot.item, cell);
              if (ghost) {
                const el = typeof ghost === 'string' ? Object.assign(new Image(), { src: ghost }) : ghost;
                e.dataTransfer!.setDragImage(el, 24, 24);
              }
            }
            if (slot.item) o.onDragStart?.(slot.item, slot, e);
          });
        }

        cell.addEventListener('click', () => {
          selectedSlotIndex = i;
          renderGrid!(currentInventory);
          if (slot.item) o.onSelectSlot?.(slot);
        });

        cell.addEventListener('dblclick', () => {
          if (slot.item) o.onUseItem?.(slot);
        });

        cell.addEventListener('dragover', (e: DragEvent) => {
          e.preventDefault();
          cell.classList.add('drag-over');
          o.onDragEnter?.(null, slot, e);
        });

        cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));

        cell.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault();
          cell.classList.remove('drag-over');
          const data = JSON.parse(e.dataTransfer!.getData('text/plain') || '{}');
          const fromSlot = currentInventory[data.fromSlot] ?? null;
          const proceed = o.onDrop && fromSlot?.item
            ? o.onDrop(fromSlot.item, fromSlot, slot, e)
            : true;
          if (proceed === false) return;
          const fromIdx: number = data.fromSlot;
          if (fromIdx !== undefined && fromIdx !== i) {
            currentInventory[fromIdx] ??= { index: fromIdx, item: null, quantity: 0 };
            currentInventory[i]       ??= { index: i,       item: null, quantity: 0 };
            const fromEntry = currentInventory[fromIdx]!;
            const toEntry   = currentInventory[i]!;
            const tmpItem = fromEntry.item;
            const tmpQty  = fromEntry.quantity;
            fromEntry.item     = toEntry.item;
            fromEntry.quantity = toEntry.quantity ?? 0;
            toEntry.item     = tmpItem;
            toEntry.quantity = tmpQty;
            renderGrid!(currentInventory);
          }
        });

        slotEls.push(cell);
        grid.appendChild(cell);
      }
    };

    // ── Equipment panel ───────────────────────────────────────────────────────

    const equipPanel = document.createElement('div');
    equipPanel.className = 'inv-equipment';

    equipPanel.innerHTML = `
      <svg class="inv-silhouette" viewBox="0 0 100 200" fill="none"
           stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="18" rx="14" ry="16"/>
        <rect x="44" y="32" width="12" height="8" rx="2"/>
        <path d="M28 40 Q24 60 26 90 L36 90 L36 130 L64 130 L64 90 L74 90 Q76 60 72 40 Z"/>
        <path d="M28 42 Q14 55 16 80 L26 78 Q24 58 36 48"/>
        <path d="M72 42 Q86 55 84 80 L74 78 Q76 58 64 48"/>
        <path d="M36 130 L32 170 L42 170 L46 130"/>
        <path d="M64 130 L68 170 L58 170 L54 130"/>
      </svg>
    `;

    const equipSlotEls: Record<string, HTMLElement> = {};
    for (const def of equipSlots) {
      const cell = document.createElement('div');
      cell.className = 'inv-equip-slot';
      cell.title = def.label;
      cell.style.top  = def.top;
      cell.style.left = def.left;

      const initial = o.equippedItems[def.key];
      if (initial) { const icon = renderItemIcon(initial); if (icon) cell.appendChild(icon); }

      cell.addEventListener('click', () => {
        const equipped = currentEquipped[def.key];
        if (!equipped) return;
        const totalSlots = o.gridCols * o.gridRows;
        let emptyIdx = -1;
        for (let i = 0; i < totalSlots; i++) {
          if (!currentInventory[i]?.item) { emptyIdx = i; break; }
        }
        if (emptyIdx === -1) return;
        o.onUnequip?.(def.key, equipped);
        currentInventory[emptyIdx] ??= { index: emptyIdx, item: null, quantity: 0 };
        const emptySlot = currentInventory[emptyIdx]!;
        emptySlot.item = equipped;
        emptySlot.quantity = 1;
        currentEquipped[def.key] = null as unknown as Item;
        cell.innerHTML = '';
        renderGrid!(currentInventory);
      });

      cell.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));

      cell.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        const data = JSON.parse(e.dataTransfer!.getData('text/plain') || '{}');
        if (data.kind === 'inventory' && data.fromSlot !== undefined) {
          const slot = currentInventory[data.fromSlot];
          if (!slot?.item) return;
          const proceed = o.onDrop ? o.onDrop(slot.item, slot, { equipKey: def.key }, e) : true;
          if (proceed === false) return;
          o.onEquip?.(def.key, slot);
          const equippedItem = slot.item!;
          currentEquipped[def.key] = equippedItem;
          slot.item = null;
          slot.quantity = 0;
          cell.innerHTML = '';
          const icon = renderItemIcon(equippedItem);
          if (icon) cell.appendChild(icon);
          renderGrid!(currentInventory);
        }
      });

      equipSlotEls[def.key] = cell;
      equipPanel.appendChild(cell);
    }

    // ── Indicators ────────────────────────────────────────────────────────────

    const indicatorsEl = document.createElement('div');
    indicatorsEl.className = 'inv-indicators';

    const indicatorEls: Record<string, HTMLElement> = {};
    for (const ind of o.indicators) {
      const wrap = document.createElement('div');
      wrap.className = 'inv-indicator';
      if (ind.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'inv-indicator-icon';
        iconEl.textContent = ind.icon;
        wrap.appendChild(iconEl);
      }
      const lbl = document.createElement('span'); lbl.textContent = ind.label + ':';
      const val = document.createElement('span'); val.className = 'inv-indicator-val';
      val.textContent = String(ind.value ?? '—');
      wrap.appendChild(lbl);
      wrap.appendChild(val);
      ind.render?.(wrap, ind.value);
      indicatorEls[ind.key] = val;
      indicatorsEl.appendChild(wrap);
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    const actionsEl = document.createElement('div');
    actionsEl.className = 'inv-actions';

    const trashBtn = document.createElement('button');
    trashBtn.className = 'inv-action-btn';
    trashBtn.title = 'Drag item here to drop it';
    trashBtn.textContent = '🗑';
    trashBtn.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); trashBtn.classList.add('drag-over'); });
    trashBtn.addEventListener('dragleave', () => trashBtn.classList.remove('drag-over'));
    trashBtn.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      trashBtn.classList.remove('drag-over');
      const data = JSON.parse(e.dataTransfer!.getData('text/plain') || '{}');
      if (data.kind === 'inventory' && data.fromSlot !== undefined) {
        const slot = currentInventory[data.fromSlot];
        if (!slot?.item) return;
        o.onDropItem?.(slot);
        slot.item = null;
        slot.quantity = 0;
        renderGrid!(currentInventory);
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'inv-action-btn';
    closeBtn.title = 'Close (Escape)';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => closeDialog());

    actionsEl.appendChild(trashBtn);
    actionsEl.appendChild(closeBtn);

    for (const action of o.actions) {
      const btn = document.createElement('button');
      btn.className = 'inv-action-btn';
      btn.title = action.label;
      btn.textContent = action.icon ?? action.label.charAt(0);
      btn.addEventListener('click', () => action.onClick(handle));
      actionsEl.appendChild(btn);
    }

    const pageCurl = document.createElement('div');
    pageCurl.className = 'inv-pagecurl';
    pageCurl.innerHTML = `
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4 H24 V20 L20 28 H4 Z" fill="rgba(30,30,58,0.9)" stroke="#5a5a8a" stroke-width="1.5"/>
        <path d="M20 20 L28 20 L20 28 Z" fill="#3a3a6a" stroke="#5a5a8a" stroke-width="1.5"/>
        <path d="M20 20 Q22 22 20 28 Q18 24 20 20 Z" fill="#2a2a4a"/>
        <text x="8" y="14" font-family="monospace" font-size="8" fill="#9a9acc">▶</text>
      </svg>
    `;
    actionsEl.appendChild(pageCurl);

    // ── Background ────────────────────────────────────────────────────────────

    function startBgLoop(): void {
      if (!o.background?.canvas) return;
      let prev = performance.now();
      function frame(now: number): void {
        const dt = now - prev; prev = now;
        bgCanvas.width  = inner.offsetWidth;
        bgCanvas.height = inner.offsetHeight;
        o.background!.canvas!(bgCanvas.getContext('2d')!, bgCanvas.width, bgCanvas.height, dt);
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function applyBackground(bg: BackgroundDef | undefined): void {
      if (!bg) return;
      if (bg.image)     { dialog.style.background  = bg.image; }
      if (bg.nineSlice) { dialog.style.borderImage = `url(${bg.nineSlice.url}) ${bg.nineSlice.top} stretch`; }
      // canvas mode handled by startBgLoop
    }

    // ── Assemble DOM ──────────────────────────────────────────────────────────

    colLeft.appendChild(profile);
    colLeft.appendChild(grid);
    colRight.appendChild(equipPanel);
    if (o.indicators.length) colRight.appendChild(indicatorsEl);
    colRight.appendChild(actionsEl);
    layout.appendChild(colLeft);
    layout.appendChild(colRight);
    inner.appendChild(bgCanvas);
    inner.appendChild(layout);
    dialog.appendChild(inner);

    applyBackground(o.background);
    renderGrid(currentInventory);
    startBgLoop();

    // ── Layout methods added to handle ────────────────────────────────────────

    handle.setInventory = (slots) => {
      currentInventory = slots.slice();
      renderGrid!(currentInventory);
    };

    handle.setEquipped = (equipped) => {
      currentEquipped = { ...equipped };
      for (const def of equipSlots) {
        const cell = equipSlotEls[def.key];
        if (!cell) continue;
        cell.innerHTML = '';
        const item = currentEquipped[def.key];
        if (item) { const icon = renderItemIcon(item); if (icon) cell.appendChild(icon); }
      }
    };

    handle.setStat = (label, value, max) => {
      const entry = statBarEls[label];
      if (!entry) return;
      if (max !== undefined) entry.stat.max = max;
      entry.stat.value = value;
      entry.fill.style.width = (entry.stat.max > 0 ? (value / entry.stat.max * 100) : 0) + '%';
    };

    handle.setIndicator = (key, value) => {
      const el = indicatorEls[key];
      if (el) el.textContent = String(value ?? '—');
    };

    handle.setBackground = (bg) => {
      stopBgLoop();
      applyBackground(bg);
      if (bg?.canvas) startBgLoop();
    };

    handle.getCanvas = () => bgCanvas;

    handle.getRegion = (name) => {
      const map: Record<string, HTMLElement> = {
        left: colLeft, right: colRight, profile,
        grid, equipment: equipPanel,
        indicators: indicatorsEl, actions: actionsEl,
      };
      return map[name] ?? null;
    };
  }

  // ── Show ───────────────────────────────────────────────────────────────────

  document.body.appendChild(dialog);
  dialog.showModal();
  document.addEventListener('keydown', handleDialogKey);

  return handle;
}
