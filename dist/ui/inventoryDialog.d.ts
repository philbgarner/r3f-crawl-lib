import { Item, InventorySlot } from '../entities/inventory';
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
export type BackgroundDef = {
    image?: string;
    nineSlice?: {
        url: string;
        top: number;
    };
    canvas?: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;
};
export type DropTarget = InventorySlot | {
    equipKey: string;
};
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
export declare function showInventory(opts?: InventoryOptions): InventoryHandle;
//# sourceMappingURL=inventoryDialog.d.ts.map