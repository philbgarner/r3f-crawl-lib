// ---------------------------------------------------------------------------
// GameEventMap — payload types for all named game events
// ---------------------------------------------------------------------------

/** Minimal entity shape used in event payloads. Full entity types live in Phase 4. */
export interface EventEntity {
  id: string;
  [key: string]: unknown;
}

/** Minimal item shape used in event payloads. Full item types live in Phase 4. */
export interface EventItem {
  id: string;
  [key: string]: unknown;
}

export interface GameEventMap {
  /** An entity received damage. `effect` is the status effect or attack type that caused it. */
  damage: { entity: EventEntity; amount: number; effect?: string };
  /** An entity died. `killer` is undefined for environmental deaths. */
  death: { entity: EventEntity; killer?: EventEntity };
  /** The player gained XP at grid position (x, z). */
  'xp-gain': { amount: number; x: number; z: number };
  /** An entity was healed. */
  heal: { entity: EventEntity; amount: number };
  /** An attack missed. */
  miss: { attacker: EventEntity; defender: EventEntity };
  /** A chest was opened. `loot` is the array of items inside. */
  'chest-open': { chest: EventEntity; loot: EventItem[] };
  /** An entity picked up an item. */
  'item-pickup': { item: EventItem; entity: EventEntity };
  /** Fires at the start of every turn. */
  turn: { turn: number };
  /** Player reached the exit or a custom win condition fired. */
  win: void;
  /** Game over. `reason` is a developer-supplied string. */
  lose: { reason: string };
  /** Spatial audio cue. `position` is optional world-space [x, z]. */
  audio: { name: string; position?: [number, number] };
}

// ---------------------------------------------------------------------------
// EventEmitter
// ---------------------------------------------------------------------------

type Handler<T> = T extends void ? () => void : (payload: T) => void;
type HandlerMap = { [K in keyof GameEventMap]?: Set<Handler<GameEventMap[K]>> };

export interface EventEmitter {
  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void;
  off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void;
  emit<K extends keyof GameEventMap>(
    ...args: GameEventMap[K] extends void ? [event: K] : [event: K, payload: GameEventMap[K]]
  ): void;
}

export function createEventEmitter(): EventEmitter {
  const handlers: HandlerMap = {};

  return {
    on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void {
      if (!handlers[event]) {
        (handlers as Record<string, Set<unknown>>)[event] = new Set();
      }
      (handlers[event] as Set<Handler<GameEventMap[K]>>).add(handler);
    },

    off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void {
      (handlers[event] as Set<Handler<GameEventMap[K]>> | undefined)?.delete(handler);
    },

    emit<K extends keyof GameEventMap>(
      ...args: GameEventMap[K] extends void ? [event: K] : [event: K, payload: GameEventMap[K]]
    ): void {
      const [event, payload] = args as [K, GameEventMap[K]];
      const set = handlers[event] as Set<Handler<GameEventMap[K]>> | undefined;
      if (!set) return;
      for (const h of set) {
        (h as (p: GameEventMap[K]) => void)(payload);
      }
    },
  };
}
