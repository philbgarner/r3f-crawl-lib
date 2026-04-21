import { Item, InventorySlot } from '../entities/inventory';
/** Defines a single equipment slot position on the paper-doll diagram. */
export type EquipSlotDef = {
    /** Unique identifier matching keys in `InventoryOptions.equippedItems`. */
    key: string;
    /** Display label shown inside the slot. */
    label: string;
    /** CSS `top` value for absolute positioning within the paper-doll container. */
    top: string;
    /** CSS `left` value for absolute positioning within the paper-doll container. */
    left: string;
};
/** A numeric stat bar displayed in the character profile (e.g. HP, MP). */
export type StatDef = {
    /** Display label for the stat bar. */
    label: string;
    /** Current value. */
    value: number;
    /** Maximum value (used to scale the bar). */
    max: number;
    /** Optional CSS colour for the filled portion of the bar. */
    color?: string;
};
/** A status indicator shown in the right-column strip (e.g. hunger, weight, gold). */
export type IndicatorDef = {
    /** Unique identifier used by `InventoryHandle.setIndicator()`. */
    key: string;
    /** Display label. */
    label: string;
    /** Initial display value. */
    value?: number | string;
    /** URL for an icon image shown alongside the label. */
    icon?: string;
    /** Custom render function — receives the container element and current value. */
    render?: (el: HTMLElement, value: unknown) => void;
};
/** A button shown in the right-column action strip. */
export type ActionDef = {
    /** Button label text. */
    label: string;
    /** Optional icon URL displayed to the left of the label. */
    icon?: string;
    /** Called when the button is clicked, receiving the live inventory handle. */
    onClick: (handle: InventoryHandle) => void;
};
/**
 * Describes how to render an item icon.
 * - `string` — plain image URL.
 * - `{ url, rot? }` — URL with optional CW rotation in degrees (0/90/180/270).
 * - `{ atlasCanvas, sx, sy, sw, sh, rot? }` — source-rectangle crop from a canvas atlas.
 */
export type IconDescriptor = string | {
    url: string;
    rot?: number;
} | {
    atlasCanvas: HTMLCanvasElement;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    rot?: number;
};
/** Background decoration for the inventory dialog panel. */
export type BackgroundDef = {
    /** URL of a full-panel background image. */
    image?: string;
    /** Nine-slice image background; `top` is the pixel inset used for all four borders. */
    nineSlice?: {
        url: string;
        top: number;
    };
    /** Animated canvas background — called each rAF frame with elapsed time `dt` in seconds. */
    canvas?: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;
};
/** The destination of a drag-and-drop operation — either an inventory slot or an equip slot. */
export type DropTarget = InventorySlot | {
    equipKey: string;
};
/** Options for `showInventory()`. All fields are optional with sensible defaults. */
export type InventoryOptions = {
    /** When `true`, the dialog is returned as an empty `<dialog>` element for custom DOM. Default: `false`. */
    customLayout?: boolean;
    /** Initial inventory slot array. Default: `[]`. */
    inventory?: InventorySlot[];
    /** Initial equipped-item map keyed by equip-slot key. Default: `{}`. */
    equippedItems?: Record<string, Item>;
    /** Character name displayed in the profile area. Default: `'PLAYER'`. */
    characterName?: string;
    /** URL of a portrait image shown in the character profile. Default: `null`. */
    portrait?: string | null;
    /** Stat bars shown beneath the character name (HP, MP, etc.). Default: `[]`. */
    stats?: StatDef[];
    /** Number of columns in the item grid. Default: `2`. */
    gridCols?: number;
    /** Number of rows in the item grid. Default: `7`. */
    gridRows?: number;
    /** Equipment slot definitions for the paper-doll. Pass `null` to hide the doll. Default: built-in RPG slots. */
    equipSlots?: EquipSlotDef[] | null;
    /** Status indicators shown below the paper-doll. Default: `[]`. */
    indicators?: IndicatorDef[];
    /** Action buttons shown at the bottom of the right column. Default: `[]`. */
    actions?: ActionDef[];
    /** Maps an `Item` to its icon descriptor. Return `null` to show a placeholder. Default: `null`. */
    resolveIcon?: ((item: Item) => IconDescriptor | null) | null;
    /** Returns the drag-ghost element/URL for an item. Default: `null` (uses the slot element). */
    dragIcon?: ((item: Item, el: HTMLElement) => string | HTMLElement | null) | null;
    /** Keyboard shortcuts. Keys are action names; values are arrays of key strings. */
    keybindings?: Record<string, string[]>;
    /** Extra CSS class(es) added to the `<dialog>` element. */
    className?: string;
    /** Background decoration for the dialog panel. */
    background?: BackgroundDef;
    /** Called when the dialog is closed. */
    onClose?: (() => void) | null;
    /** Called when the user selects (single-clicks) an inventory slot. */
    onSelectSlot?: ((slot: InventorySlot) => void) | null;
    /** Called when the user double-clicks or presses the use key on a slot. */
    onUseItem?: ((slot: InventorySlot) => void) | null;
    /** Called when the user drops/discards an item from a slot. */
    onDropItem?: ((slot: InventorySlot) => void) | null;
    /** Called when the user drops an item onto an equip slot. */
    onEquip?: ((key: string, slot: InventorySlot) => void) | null;
    /** Called when the user removes an item from an equip slot. */
    onUnequip?: ((key: string, item: Item) => void) | null;
    /** Called at the start of a drag operation. */
    onDragStart?: ((item: Item, slot: InventorySlot, e: DragEvent) => void) | null;
    /** Called when a dragged item enters a potential drop target. */
    onDragEnter?: ((item: Item | null, slot: InventorySlot, e: DragEvent) => void) | null;
    /** Called on drop. Return `true` to suppress the default swap behaviour. */
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
/**
 * Build and open an RPG-style inventory dialog.
 *
 * Default behaviour (`customLayout: false`) renders a two-column layout:
 * left column has a character profile + item grid; right column has an equipment
 * paper-doll, optional indicator strip, and action buttons. Full drag-and-drop
 * is supported between inventory slots and equip slots.
 *
 * Pass `customLayout: true` to receive a bare `<dialog>` element and populate it
 * yourself via `handle.getElement()`.
 *
 * @param opts  Configuration options — all fields are optional.
 * @returns     An `InventoryHandle` for programmatic updates and close control.
 *
 * @example
 * const handle = showInventory({
 *   inventory: player.inventory,
 *   equippedItems: player.equipped,
 *   stats: [{ label: 'HP', value: player.hp, max: player.maxHp }],
 *   onClose: () => resumeGame(),
 *   onUseItem: (slot) => useItem(slot.item),
 * });
 */
export declare function showInventory(opts?: InventoryOptions): InventoryHandle;
//# sourceMappingURL=inventoryDialog.d.ts.map