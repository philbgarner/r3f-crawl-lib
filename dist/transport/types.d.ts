import type { TurnAction } from '../turn/types';
export type PlayerNetState = {
    /** Grid X position. */
    x: number;
    /** Grid Y position (row — maps to entity.z on the client). */
    y: number;
    hp: number;
    maxHp: number;
    alive: boolean;
    /** Yaw in radians. Optional — omit when server doesn't track facing. */
    facing?: number;
};
/** Broadcast by the server after every accepted action. */
export type ServerStateUpdate = {
    /** Canonical state for every connected player. */
    players: Record<string, PlayerNetState>;
    turn: number;
};
/** Sent by the host client after generate() so the server can validate moves. */
export type DungeonInitPayload = {
    /** Flat Uint8Array contents: 0 = walkable, >0 = solid. */
    solid: number[];
    width: number;
    height: number;
    /** Original dungeon config so the server can share it with late-joiners. */
    config: Record<string, unknown>;
};
export type ActionTransport = {
    /**
     * Connect to the server. Resolves with the server-assigned player ID and
     * whether this client is the room host (first to join). Non-host clients
     * also receive the dungeon config so they can generate the same dungeon.
     */
    connect(): Promise<{
        playerId: string;
        isHost: boolean;
        dungeonConfig?: Record<string, unknown>;
    }>;
    /**
     * Send a player action to the authoritative server instead of applying it
     * locally. Called automatically by game.turns.commit() when a transport is
     * configured.
     */
    send(action: TurnAction): void;
    /**
     * Register a handler that fires whenever the server pushes a state update.
     * Multiple handlers are supported — each call appends a new subscriber.
     * createGame() registers one internally for reconciliation; the example can
     * register another to track other players for rendering.
     */
    onStateUpdate(handler: (update: ServerStateUpdate) => void): void;
    /**
     * Send the dungeon solid map and config to the server. Called by the host
     * client after game.generate() completes so the server can validate moves
     * and share the config with late-joining clients.
     */
    initDungeon(payload: DungeonInitPayload): void;
    disconnect(): void;
    /** Server-assigned player ID. Null before connect() resolves. */
    readonly playerId: string | null;
    /**
     * Send a chat message to all players in the room.
     */
    sendChat(text: string): void;
    /**
     * Register a handler that fires whenever a chat message is received.
     */
    onChat(handler: (msg: {
        playerId: string;
        text: string;
    }) => void): void;
};
//# sourceMappingURL=types.d.ts.map