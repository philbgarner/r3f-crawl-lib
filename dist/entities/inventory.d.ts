/** A single item instance. */
export interface Item {
    /** Auto-generated unique id. */
    id: string;
    /** Display name. */
    name: string;
    /** Specific item type key (e.g. "health_potion", "sword"). */
    type: string;
    /** Arbitrary item-specific state (charges, durability, etc.). */
    state?: Record<string, unknown>;
}
/** Static definition of an item type (shared across all instances). */
export interface ItemType {
    maxStack: number;
    onUse?: (item: Item, quantity: number) => void;
    initializeQuantity?: () => number;
}
/** A single slot in a character's inventory grid. */
export interface InventorySlot {
    /** Slot position index (0-based). */
    index: number;
    /** The item occupying this slot, or `null` if empty. */
    item: Item | null;
    /** Stack count. 1 for non-stackable items. */
    quantity: number;
}
export interface InventoryProps {
    inventory: InventorySlot[];
    inventoryName: string;
    itemTypeRegistry: Record<string, ItemType>;
    isOpen: boolean;
    onToggle: () => void;
    onUseItem?: (slot: InventorySlot) => void;
    onRemoveItem?: (slot: InventorySlot) => void;
}
/** Options for `createItem()`. */
export type ItemOpts = {
    /** Display name. */
    name: string;
    /** Item type key (e.g. `'health_potion'`, `'sword'`). */
    type: string;
    /** Arbitrary initial item state (charges, durability, etc.). */
    state?: Record<string, unknown>;
};
/** Create an item with an auto-generated id. */
export declare function createItem(opts: ItemOpts): Item;
export type LootEntry = {
    /** Item type key passed to createItem. */
    itemType: string;
    /** Display name for the dropped item. */
    name: string;
    /** Drop probability in [0, 1]. */
    chance: number;
    /** Fixed quantity; defaults to 1. */
    quantity?: number;
    /** Passed through to Item.state. */
    state?: Record<string, unknown>;
};
/**
 * Resolve a loot table into a list of dropped items.
 * Each entry is independently rolled against its `chance`.
 * Uses the seeded RNG returned by makeRng (a `() => number` function).
 */
export declare function rollLoot(lootTable: LootEntry[], rng: () => number): Item[];
//# sourceMappingURL=inventory.d.ts.map