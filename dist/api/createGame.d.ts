import { BspDungeonOptions, DungeonOutputs } from '../dungeon/bsp';
import { TiledMapOptions } from '../dungeon/tiled';
import { TurnAction } from '../turn/types';
import { EventEmitter } from '../events/eventEmitter';
import { FactionRegistry } from '../combat/factions';
import { DamageFormula } from '../combat/combat';
import { HiddenPassage, EntityBase } from '../entities/types';
import { DecorationEntity } from '../entities/factory';
import { PlayerHandle } from './player';
import { KeybindingsOptions } from './keybindings';
import { ActionTransport } from '../transport/types';
import { MissionsHandle } from '../missions/types';
export type PublicRoom = {
    id: number;
    type: "room" | "corridor";
    x: number;
    z: number;
    w: number;
    h: number;
    cx: number;
    cz: number;
    connections: number[];
};
export type DecorationList = {
    add(decoration: DecorationEntity): void;
    remove(id: string): void;
    list: DecorationEntity[];
};
export type PassageList = {
    toggle(id: number): void;
    list: HiddenPassage[];
};
export type DungeonHandle = {
    readonly width: number;
    readonly height: number;
    /** Available after generate(). */
    readonly rooms: Record<number, PublicRoom>;
    readonly outputs: DungeonOutputs | null;
    decorations: DecorationList;
    passages: PassageList;
    passageNear(x: number, z: number, radius?: number): HiddenPassage | null;
    paint(x: number, z: number, layers: string[]): void;
    unpaint(x: number, z: number): void;
};
export type TurnsHandle = {
    /** Current turn counter. */
    readonly turn: number;
    /** Commit a player action and run all other actors until the player's next turn. */
    commit(action: TurnAction): void;
    addActor(entity: EntityBase): void;
    removeActor(id: string): void;
};
export type CombatHandle = {
    factions: FactionRegistry;
};
export type PlayerOptions = {
    /** Override the auto-generated player ID. Required when using a transport
     *  so the local ID matches the server-assigned one. */
    id?: string;
    x?: number;
    z?: number;
    hp?: number;
    maxHp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
};
export type OnPlaceContext = {
    rooms: PublicRoom[];
    endRoom: PublicRoom;
    startRoom: PublicRoom;
    rng: {
        next(): number;
        chance(p: number): boolean;
    };
    place: PlaceAPI;
};
export type PlaceAPI = {
    object(x: number, z: number, type: string, meta?: Record<string, unknown>): void;
    npc(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    enemy(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    decoration(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    surface(x: number, z: number, layers: string[]): void;
};
export type DungeonOptions = (BspDungeonOptions & {
    tiled?: never;
    onPlace?: (ctx: OnPlaceContext) => void;
}) | {
    tiled: {
        map: unknown;
    } & Omit<TiledMapOptions, "layers"> & {
        layers?: TiledMapOptions["layers"];
    };
    onPlace?: (ctx: OnPlaceContext) => void;
};
export type CombatOptions = {
    damageFormula?: DamageFormula;
    factions?: Array<[string, string, "hostile" | "neutral" | "friendly"]>;
    onDamage?: (args: {
        attacker: EntityBase;
        defender: EntityBase;
        amount: number;
    }) => void;
    onDeath?: (args: {
        entity: EntityBase;
        killer?: EntityBase;
    }) => void;
    onMiss?: (args: {
        attacker: EntityBase;
        defender: EntityBase;
    }) => void;
};
export type PassagesOptions = {
    traversalFactor?: number;
    onToggle?: (args: {
        passage: HiddenPassage;
        enabled: boolean;
    }) => void;
    onTraverse?: (args: {
        passage: HiddenPassage;
        progress: number;
    }) => void;
};
export type TurnsOptions = {
    onAdvance?: (args: {
        turn: number;
        dt: number;
    }) => void;
};
export type RenderingOptions = {
    atlas?: string;
    atlasJson?: string;
    characterAtlas?: string;
    characterAtlasJson?: string;
    tileSize?: number;
    torch?: {
        color?: string;
        intensity?: number;
        fogNear?: number;
        fogFar?: number;
    };
};
export type GameOptions = {
    dungeon: DungeonOptions;
    player?: PlayerOptions;
    combat?: CombatOptions;
    passages?: PassagesOptions;
    turns?: TurnsOptions;
    rendering?: RenderingOptions;
    /**
     * Optional action transport. When set, game.turns.commit() forwards actions
     * to the server instead of applying them locally. The server validates each
     * action and broadcasts a state update; createGame() reconciles that update
     * back into the local turn state automatically.
     *
     * Omit for single-player — no runtime overhead at all.
     */
    transport?: ActionTransport;
};
export type GameHandle = {
    player: PlayerHandle;
    turns: TurnsHandle;
    dungeon: DungeonHandle;
    events: EventEmitter;
    combat: CombatHandle;
    /** Mission/quest system. Add evaluator-driven missions that auto-complete each turn. */
    missions: MissionsHandle;
    /** Generate the dungeon and start the game. Call after attaching all callbacks. */
    generate(): void;
    /**
     * Tear down the current dungeon, reset all spawned actors and decorations,
     * restore the player to full health, and regenerate from the current dungeon
     * config (including any seed change made before calling this).
     */
    regenerate(): void;
    /** Unmount and clean up all listeners. */
    destroy(): void;
};
type SpawnCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => EntityBase | EntityBase[] | null | undefined;
type DecoratorCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => DecorationEntity | DecorationEntity[] | null | undefined;
type SurfacePainterCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => string[] | null | undefined;
export type MinimapOptions = {
    /** Canvas size in pixels. Default: 196. */
    size?: number;
    /** Whether to draw entity positions. Default: true. */
    showEntities?: boolean;
    colors?: {
        explored?: string;
        visible?: string;
        player?: string;
        npc?: string;
        enemy?: string;
    };
};
/**
 * Create a game handle. Does not generate the dungeon — call `game.generate()`
 * after attaching callbacks.
 */
export declare function createGame(canvas: HTMLElement, options: GameOptions): GameHandle;
/**
 * Wire up a 2D canvas minimap that redraws on every `turn` event.
 */
export declare function attachMinimap(game: GameHandle, canvas: HTMLCanvasElement, opts?: MinimapOptions): void;
/**
 * Register a spawn callback. Called per room during `generate()`.
 */
export declare function attachSpawner(game: GameHandle, opts: {
    onSpawn: SpawnCallback;
}): void;
/**
 * Register a decorator callback. Called per floor tile during `generate()`.
 */
export declare function attachDecorator(game: GameHandle, opts: {
    onDecorate: DecoratorCallback;
}): void;
/**
 * Register a surface painter callback. Called per floor tile during `generate()`.
 */
export declare function attachSurfacePainter(game: GameHandle, opts: {
    onPaint: SurfacePainterCallback;
}): void;
/**
 * Install keyboard bindings. Wraps `createKeybindings` and registers the
 * handle with the game so it is cleaned up on `destroy()`.
 */
export declare function attachKeybindings(game: GameHandle, opts: KeybindingsOptions): void;
export {};
//# sourceMappingURL=createGame.d.ts.map