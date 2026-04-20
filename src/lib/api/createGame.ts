// src/lib/api/createGame.ts
//
// Public API entry point: assembles all engine modules into the `game` handle.
//
// Usage:
//   const game = createGame(canvas, options)
//   attachSpawner(game, { onSpawn })
//   game.generate()
//
// See README §Script Tag Developer Guide for full option shapes.

import { generateBspDungeon } from "../dungeon/bsp";
import type { BspDungeonOptions, BspDungeonOutputs, DungeonOutputs, RoomInfo } from "../dungeon/bsp";
import { loadTiledMap } from "../dungeon/tiled";
import type { TiledMapOptions, TiledMapOutputs } from "../dungeon/tiled";
import { createTurnSystemState, commitPlayerAction, tickUntilPlayer } from "../turn/system";
import type { TurnSystemState, TurnSystemDeps } from "../turn/system";
import { defaultComputeCost } from "../turn/system";
import type { PlayerActor, MonsterActor, ActorId, TurnAction } from "../turn/types";
import { createEventEmitter } from "../events/eventEmitter";
import type { EventEmitter } from "../events/eventEmitter";
import { createFactionRegistryFromTable, DEFAULT_FACTION_TABLE } from "../combat/factions";
import type { FactionRegistry } from "../combat/factions";
import { resolveCombat } from "../combat/combat";
import type { DamageFormula } from "../combat/combat";
import { decideChasePlayer } from "../ai/monsterAI";
import { computeFov } from "../ai/fov";
import { createMinimapState, updateExplored } from "../utils/minimap";
import type { MinimapState } from "../utils/minimap";
import { buildPassageMask, enablePassageInMask, disablePassageInMask } from "../passages/mask";
import type { HiddenPassage } from "../entities/types";
import type { EntityBase } from "../entities/types";
import type { DecorationEntity } from "../entities/factory";
import { createPlayerHandle } from "./player";
import type { PlayerHandle, PlayerState } from "./player";
import { createKeybindings } from "./keybindings";
import type { KeybindingsOptions, KeybindingsHandle } from "./keybindings";
import { makeRng } from "../utils/rng"
import { isWalkableCell, isLightPassableCell } from "../dungeon/colliderFlags"
import type { ActionTransport } from "../transport/types";
import { createMissionSystem } from "../missions/missionSystem";
import type { MissionsHandle } from "../missions/types";
import { createAnimationRegistry } from "../animations/animationRegistry";
import type { AnimationRegistry } from "../animations/animationRegistry";
import type { AnimationQueueEntry, AnimationsHandle } from "../animations/types";

// ---------------------------------------------------------------------------
// Public room shape (player-facing subset of RoomInfo)
// ---------------------------------------------------------------------------

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

function toPublicRoom(id: number, info: RoomInfo): PublicRoom {
  return {
    id,
    type: info.type,
    x: info.rect.x,
    z: info.rect.y,
    w: info.rect.w,
    h: info.rect.h,
    cx: Math.floor(info.rect.x + info.rect.w / 2),
    cz: Math.floor(info.rect.y + info.rect.h / 2),
    connections: info.connections,
  };
}

// ---------------------------------------------------------------------------
// DungeonHandle — game.dungeon
// ---------------------------------------------------------------------------

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
  /** Apply per-surface overlay tile names to a cell. */
  paint(x: number, z: number, layers: SurfacePaintTarget): void;
  unpaint(x: number, z: number): void;
  /** Read-only view of the current per-cell surface paint map. Keys are "x,z" strings. */
  readonly paintMap: ReadonlyMap<string, SurfacePaintTarget>;
};

// ---------------------------------------------------------------------------
// TurnsHandle — game.turns
// ---------------------------------------------------------------------------

export type TurnsHandle = {
  /** Current turn counter. */
  readonly turn: number;
  /**
   * Commit a player action and run all other actors until the player's next turn.
   * Resolves after all registered animation handlers have completed.
   * In multiplayer mode resolves immediately after the action is forwarded to
   * the server; animation handlers fire from the onStateUpdate reconciliation path.
   */
  commit(action: TurnAction): Promise<void>;
  addActor(entity: EntityBase): void;
  removeActor(id: string): void;
};

// ---------------------------------------------------------------------------
// CombatHandle — game.combat
// ---------------------------------------------------------------------------

export type CombatHandle = {
  factions: FactionRegistry;
};

// ---------------------------------------------------------------------------
// createGame options
// ---------------------------------------------------------------------------

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
  rng: { next(): number; chance(p: number): boolean };
  place: PlaceAPI;
};

export type PlaceAPI = {
  object(x: number, z: number, type: string, meta?: Record<string, unknown>): void;
  npc(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  enemy(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  decoration(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  surface(x: number, z: number, layers: SurfacePaintTarget): void;
};

export type DungeonOptions =
  | (BspDungeonOptions & {
      tiled?: never;
      onPlace?: (ctx: OnPlaceContext) => void;
    })
  | {
      tiled: { map: unknown } & Omit<TiledMapOptions, "layers"> & {
        layers?: TiledMapOptions["layers"];
      };
      onPlace?: (ctx: OnPlaceContext) => void;
    };

export type CombatOptions = {
  damageFormula?: DamageFormula;
  factions?: Array<[string, string, "hostile" | "neutral" | "friendly"]>;
  onDamage?: (args: { attacker: EntityBase; defender: EntityBase; amount: number }) => void;
  onDeath?: (args: { entity: EntityBase; killer?: EntityBase }) => void;
  onMiss?: (args: { attacker: EntityBase; defender: EntityBase }) => void;
};

export type PassagesOptions = {
  traversalFactor?: number;
  onToggle?: (args: { passage: HiddenPassage; enabled: boolean }) => void;
  onTraverse?: (args: { passage: HiddenPassage; progress: number }) => void;
};

export type TurnsOptions = {
  onAdvance?: (args: { turn: number; dt: number }) => void;
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

// ---------------------------------------------------------------------------
// GameHandle — the developer-facing game object
// ---------------------------------------------------------------------------

export type GameHandle = {
  player: PlayerHandle;
  turns: TurnsHandle;
  dungeon: DungeonHandle;
  events: EventEmitter;
  combat: CombatHandle;
  /** Mission/quest system. Add evaluator-driven missions that auto-complete each turn. */
  missions: MissionsHandle;
  /**
   * Register async animation handlers that fire after each turn, before entity
   * positions are synced to the render layer. Works in both single-player and
   * multiplayer (multiplayer events are reconstructed from state diffs).
   */
  animations: AnimationsHandle;
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

// ---------------------------------------------------------------------------
// Attach callback registrations
// ---------------------------------------------------------------------------

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

/** Per-surface overlay tile names for a single cell. Each key is optional. */
export type SurfacePaintTarget = {
  /** Tile names to overlay on the floor face of this cell. Up to 4. */
  floor?: string[];
  /** Tile names to overlay on wall faces of this cell. Up to 4. */
  wall?: string[];
  /** Tile names to overlay on the ceiling face of this cell. Up to 4. */
  ceil?: string[];
};

type SurfacePainterCallback = (ctx: {
  dungeon: DungeonHandle;
  roomId: number;
  x: number;
  y: number;
}) => SurfacePaintTarget | null | undefined;

// ---------------------------------------------------------------------------
// Internal state (shared mutable bag)
// ---------------------------------------------------------------------------

type GameInternal = {
  options: GameOptions;
  canvas: HTMLElement;
  events: EventEmitter;
  factions: FactionRegistry;

  // Set during generate()
  dungeonOutputs: BspDungeonOutputs | TiledMapOutputs | null;
  solidData: Uint8Array | null;
  colliderFlagsData: Uint8Array | null;
  turnState: TurnSystemState | null;
  playerActorId: string;

  // Player
  playerState: PlayerState;
  playerHandle: PlayerHandle;

  // Entities (EntityBase by id — includes player + all actors)
  entityById: Map<string, EntityBase>;

  // Decorations
  decorations: DecorationEntity[];

  // Surface paint map: "${x},${z}" -> per-surface overlay tile names
  paintMap: Map<string, SurfacePaintTarget>;

  // Passages
  passages: HiddenPassage[];
  passageMask: Uint8Array | null;

  // Turn counter
  turnCounter: number;

  // Minimap
  minimapState: MinimapState | null;

  // Registered callbacks (set by attach* functions before generate)
  spawnerCb: SpawnCallback | null;
  decoratorCb: DecoratorCallback | null;
  surfacePainterCb: SurfacePainterCallback | null;
  keybindingsHandles: KeybindingsHandle[];

  // Missions
  missions: MissionsHandle;

  // Animation registry
  animationRegistry: AnimationRegistry;

  // Cleanup
  destroyed: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSolid(
  x: number,
  y: number,
  solidData: Uint8Array,
  width: number,
  height: number,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return true;
  return (solidData[y * width + x] ?? 0) > 0;
}

function getCellFlags(
  x: number,
  y: number,
  flagsData: Uint8Array,
  width: number,
  height: number,
): number {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0x02; // IS_BLOCKED for OOB
  return flagsData[y * width + x] ?? 0x02;
}

function syncEntityFromActor(entity: EntityBase, actor: PlayerActor | MonsterActor): void {
  entity.x = actor.x;
  entity.z = actor.y;
  entity.hp = actor.hp;
  entity.alive = actor.alive;
}

function buildPlayerActor(id: string, opts: PlayerOptions): PlayerActor {
  return {
    id,
    kind: "player",
    x: opts.x ?? 1,
    y: opts.z ?? 1,
    speed: opts.speed ?? 5,
    alive: true,
    blocksMovement: true,
    hp: opts.hp ?? 30,
    maxHp: opts.maxHp ?? opts.hp ?? 30,
    attack: opts.attack ?? 3,
    defense: opts.defense ?? 1,
  };
}

function entityToMonsterActor(e: EntityBase): MonsterActor {
  return {
    id: e.id,
    kind: "monster",
    name: e.type,
    glyph: e.type[0] ?? "?",
    x: e.x,
    y: e.z,
    speed: e.speed > 0 ? e.speed : 5,
    alive: e.alive,
    blocksMovement: e.blocksMove,
    hp: e.hp,
    maxHp: e.maxHp,
    attack: e.attack,
    defense: e.defense,
    xp: (e as Record<string, unknown>).xp as number ?? 0,
    danger: (e as Record<string, unknown>).danger as number ?? 1,
    alertState: "idle",
    rpsEffect: "none",
    searchTurnsLeft: 0,
    lastKnownPlayerPos: null,
  };
}

// ---------------------------------------------------------------------------
// Custom applyAction — wires combat
// ---------------------------------------------------------------------------

function makeApplyAction(
  internal: GameInternal,
  combatOpts: CombatOptions | undefined,
  onAnimEvent?: (entry: AnimationQueueEntry) => void,
) {
  return function customApplyAction(
    state: TurnSystemState,
    actorId: ActorId,
    action: TurnAction,
    deps: TurnSystemDeps,
  ): TurnSystemState {
    // Rotation — update player facing, don't advance grid position
    if (action.kind === "interact" && action.meta?.rotate !== undefined) {
      if (actorId === internal.playerActorId) {
        internal.playerState.facing =
          ((internal.playerState.facing + (action.meta.rotate as number)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      }
      return state;
    }

    // Handle non-rotate interact actions: pickup, chest-open, door-open
    if (action.kind === "interact") {
      const actor = state.actors[actorId];
      if (actor) {
        if (action.meta?.pickup !== undefined) {
          const itemId = action.meta.pickup as string;
          const actorEntity = internal.entityById.get(actorId);
          if (actorEntity) {
            internal.events.emit("item-pickup", { item: { id: itemId }, entity: actorEntity });
          }
          internal.events.emit("audio", { name: "item-pickup", position: [actor.x, actor.y] });
        }
        if (action.targetId !== undefined) {
          const target = internal.entityById.get(action.targetId);
          if (target) {
            if (target.type === "chest") {
              internal.events.emit("chest-open", { chest: target, loot: [] });
              internal.events.emit("audio", { name: "chest-open", position: [target.x, target.z] });
            } else if (target.type === "door") {
              internal.events.emit("audio", { name: "door-open", position: [target.x, target.z] });
            }
          }
        }
      }
      return state;
    }

    if (action.kind !== "move" || action.dx == null || action.dy == null) {
      return state;
    }

    const actor = state.actors[actorId];
    if (!actor || !actor.alive) return state;

    const nx = actor.x + action.dx;
    const ny = actor.y + action.dy;

    // Collision check against other alive actors
    const targetActor = Object.values(state.actors).find(
      (a) => a.id !== actorId && a.alive && a.blocksMovement && a.x === nx && a.y === ny,
    );

    if (targetActor) {
      const attackerEntity = internal.entityById.get(actorId);
      const defenderEntity = internal.entityById.get(targetActor.id);

      if (attackerEntity && defenderEntity) {
        const result = resolveCombat({
          attacker: attackerEntity,
          defender: defenderEntity,
          ...(combatOpts?.damageFormula ? { formula: combatOpts.damageFormula } : {}),
          factions: internal.factions,
          emit: internal.events,
        });

        if (result.outcome === "hit") {
          defenderEntity.hp = Math.max(0, defenderEntity.hp - result.damage);
          if (result.defenderDied) defenderEntity.alive = false;

          onAnimEvent?.({ kind: 'attack', entity: attackerEntity, actor: defenderEntity });
          onAnimEvent?.({ kind: 'damage', entity: defenderEntity, actor: attackerEntity, amount: result.damage });

          combatOpts?.onDamage?.({ attacker: attackerEntity, defender: defenderEntity, amount: result.damage });
          if (result.defenderDied) {
            onAnimEvent?.({ kind: 'death', entity: defenderEntity, actor: attackerEntity });
            combatOpts?.onDeath?.({ entity: defenderEntity, killer: attackerEntity });
            if (actorId === internal.playerActorId) {
              const xp = (defenderEntity as Record<string, unknown>).xp as number ?? 0;
              if (xp > 0) {
                onAnimEvent?.({ kind: 'xp-gain', entity: attackerEntity, amount: xp });
                internal.events.emit("xp-gain", { amount: xp, x: defenderEntity.x, z: defenderEntity.z });
              }
              internal.events.emit("audio", { name: "xp-pickup", position: [defenderEntity.x, defenderEntity.z] });
            }
          }

          const updatedDefender = {
            ...state.actors[targetActor.id]!,
            hp: defenderEntity.hp,
            alive: defenderEntity.alive,
          };
          return {
            ...state,
            actors: { ...state.actors, [targetActor.id]: updatedDefender as typeof targetActor },
          };
        } else if (result.outcome === "miss") {
          onAnimEvent?.({ kind: 'miss', entity: defenderEntity, actor: attackerEntity });
          combatOpts?.onMiss?.({ attacker: attackerEntity, defender: defenderEntity });
        }
      }
      return state;
    }

    // Walkability check
    if (!internal.colliderFlagsData || !internal.dungeonOutputs) return state;
    if (!isWalkableCell(getCellFlags(nx, ny, internal.colliderFlagsData, internal.dungeonOutputs.width, internal.dungeonOutputs.height))) {
      return state;
    }

    // Decoration block check
    const blockedByDecoration = internal.decorations.some(
      (d) => d.blocksMove && d.x === nx && d.z === ny,
    );
    if (blockedByDecoration) return state;

    if (actorId === internal.playerActorId) {
      internal.events.emit("audio", { name: "footstep", position: [nx, ny] });
    }

    const movingEntity = internal.entityById.get(actorId);
    if (movingEntity) {
      onAnimEvent?.({ kind: 'move', entity: movingEntity, from: { x: actor.x, z: actor.y }, to: { x: nx, z: ny } });
    }

    return {
      ...state,
      actors: { ...state.actors, [actorId]: { ...actor, x: nx, y: ny } },
    };
  };
}

// ---------------------------------------------------------------------------
// FOV + minimap update after each player move
// ---------------------------------------------------------------------------

const FOV_RADIUS = 12;

function updateFovAndMinimap(internal: GameInternal): void {
  if (!internal.minimapState || !internal.dungeonOutputs || !internal.colliderFlagsData) return;

  const { width, height } = internal.dungeonOutputs;
  const flags = internal.colliderFlagsData;
  const player = internal.playerState.entity;

  const fovMask = new Uint8Array(width * height);
  computeFov(player.x, player.z, {
    isOpaque: (x, y) => !isLightPassableCell(getCellFlags(x, y, flags, width, height)),
    visit: (x, y) => {
      if (x >= 0 && y >= 0 && x < width && y < height) {
        fovMask[y * width + x] = 1;
      }
    },
    radius: FOV_RADIUS,
  });

  updateExplored(internal.minimapState, fovMask);
}

// ---------------------------------------------------------------------------
// Post-commit sync: bring EntityBase in line with actor state
// ---------------------------------------------------------------------------

function syncAllEntitiesFromTurnState(internal: GameInternal): void {
  if (!internal.turnState) return;
  for (const [id, actor] of Object.entries(internal.turnState.actors)) {
    const entity = internal.entityById.get(id);
    if (entity) syncEntityFromActor(entity, actor);
  }
}

// ---------------------------------------------------------------------------
// Dungeon handle factory
// ---------------------------------------------------------------------------

function makeDungeonHandle(internal: GameInternal): DungeonHandle {
  let _roomsCache: Record<number, PublicRoom> | null = null;

  return {
    get width() { return internal.dungeonOutputs?.width ?? 0; },
    get height() { return internal.dungeonOutputs?.height ?? 0; },
    get rooms() {
      if (!_roomsCache && internal.dungeonOutputs && "rooms" in internal.dungeonOutputs) {
        _roomsCache = {};
        for (const [id, info] of (internal.dungeonOutputs as BspDungeonOutputs).rooms) {
          _roomsCache[id] = toPublicRoom(id, info);
        }
      }
      return _roomsCache ?? {};
    },
    get outputs() { return internal.dungeonOutputs; },

    decorations: {
      get list() { return internal.decorations; },
      add(decoration: DecorationEntity) {
        internal.decorations.push(decoration);
      },
      remove(id: string) {
        const idx = internal.decorations.findIndex((d) => d.id === id);
        if (idx !== -1) internal.decorations.splice(idx, 1);
      },
    },

    passages: {
      get list() { return internal.passages; },
      toggle(id: number) {
        const passage = internal.passages.find((p) => p.id === id);
        if (!passage || !internal.passageMask || !internal.dungeonOutputs) return;
        passage.enabled = !passage.enabled;
        if (passage.enabled) {
          enablePassageInMask(internal.passageMask, internal.dungeonOutputs.width, passage);
        } else {
          disablePassageInMask(internal.passageMask, internal.dungeonOutputs.width, passage);
        }
        internal.options.passages?.onToggle?.({ passage, enabled: passage.enabled });
        internal.events.emit("audio", { name: "passage-toggle", position: [passage.start.x, passage.start.y] });
      },
    },

    passageNear(x: number, z: number, radius = 1.5): HiddenPassage | null {
      let best: HiddenPassage | null = null;
      let bestDist = Infinity;
      for (const p of internal.passages) {
        const ds = Math.hypot(p.start.x - x, p.start.y - z);
        const de = Math.hypot(p.end.x - x, p.end.y - z);
        const d = Math.min(ds, de);
        if (d <= radius && d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      return best;
    },

    paint(x: number, z: number, layers: SurfacePaintTarget) {
      const existing = internal.paintMap.get(`${x},${z}`) ?? {};
      const merged: SurfacePaintTarget = { ...existing, ...layers };
      internal.paintMap.set(`${x},${z}`, merged);
      writePaintToOverlayTexture(internal, x, z);
      internal.events.emit('cell-paint', { x, z, ...layers });
    },

    unpaint(x: number, z: number) {
      internal.paintMap.delete(`${x},${z}`);
      writePaintToOverlayTexture(internal, x, z);
      internal.events.emit('cell-paint', { x, z, floor: [], wall: [], ceil: [] });
    },

    get paintMap(): ReadonlyMap<string, SurfacePaintTarget> {
      return internal.paintMap;
    },
  };
}

// ---------------------------------------------------------------------------
// Overlay texture paint helper
// ---------------------------------------------------------------------------

function writePaintToOverlayTexture(
  internal: GameInternal,
  x: number,
  z: number,
): void {
  const dungeon = internal.dungeonOutputs;
  if (!dungeon) return;
  const { width, height } = dungeon;
  if (x < 0 || z < 0 || x >= width || z >= height) return;

  // Overlays texture is RGBA, 1 bit per overlay ID.
  // The atlas name→ID mapping is deferred to the renderer (Phase 10).
  // Here we just mark the texture as needing an update.
  const tex = dungeon.textures.overlays;
  if (tex) tex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// TurnsHandle factory
// ---------------------------------------------------------------------------

function makeTurnsHandle(internal: GameInternal, dungeonHandle: DungeonHandle): TurnsHandle {
  return {
    get turn() { return internal.turnCounter; },

    async commit(action: TurnAction): Promise<void> {
      // When a transport is configured, forward the action to the server.
      // The server validates it, updates canonical state, and broadcasts a
      // ServerStateUpdate. createGame() wires onStateUpdate() to reconcile
      // that update back into internal state and re-emit the "turn" event.
      // Animation handlers fire from the onStateUpdate diff path in that case.
      if (internal.options.transport) {
        internal.options.transport.send(action);
        return;
      }

      if (!internal.turnState || !internal.dungeonOutputs) return;

      const flags = internal.colliderFlagsData!;
      const { width, height } = internal.dungeonOutputs;
      const dungOut = internal.dungeonOutputs;

      const onAnimEvent = (e: AnimationQueueEntry) => internal.animationRegistry._enqueue(e);

      const deps: TurnSystemDeps = {
        isWalkable: (x, y) => isWalkableCell(getCellFlags(x, y, flags, width, height)),
        monsterDecide: (state, monsterId) =>
          decideChasePlayer(
            state,
            monsterId,
            dungOut,
            (x, y) => isWalkableCell(getCellFlags(x, y, flags, width, height)),
            (x, y) => !isLightPassableCell(getCellFlags(x, y, flags, width, height)),
          ),
        computeCost: (actorId, a) =>
          defaultComputeCost(actorId, a, internal.turnState!.actors),
        applyAction: makeApplyAction(internal, internal.options.combat, onAnimEvent),
        onTimeAdvanced: ({ nextTime, prevTime, state }) => {
          if (nextTime > prevTime) {
            internal.turnCounter += 1;
            // Sync player position from the current turn state so that
            // game.player.x/z are up-to-date when "turn" listeners fire.
            const playerActor = state.actors[internal.playerActorId];
            if (playerActor) syncEntityFromActor(internal.playerState.entity, playerActor);
            internal.events.emit("turn", { turn: internal.turnCounter });
            internal.options.turns?.onAdvance?.({
              turn: internal.turnCounter,
              dt: nextTime - prevTime,
            });
          }
        },
      };

      internal.turnState = commitPlayerAction(internal.turnState, deps, action);
      // Flush animations while entities are still at pre-commit positions.
      await internal.animationRegistry._flush();
      syncAllEntitiesFromTurnState(internal);
      updateFovAndMinimap(internal);
    },

    addActor(entity: EntityBase) {
      if (!internal.turnState) {
        // Store for when generate() runs
        internal.entityById.set(entity.id, entity);
        return;
      }
      const actor = entityToMonsterActor(entity);
      internal.entityById.set(entity.id, entity);
      internal.turnState = {
        ...internal.turnState,
        actors: { ...internal.turnState.actors, [entity.id]: actor },
      };
      internal.turnState.scheduler.add(entity.id, actor.speed > 0 ? Math.floor(100 / actor.speed) : 10);
    },

    removeActor(id: string) {
      internal.entityById.delete(id);
      if (!internal.turnState) return;
      internal.turnState.scheduler.remove(id);
      const { [id]: _removed, ...rest } = internal.turnState.actors;
      internal.turnState = { ...internal.turnState, actors: rest as typeof internal.turnState.actors };
    },
  };
}

// ---------------------------------------------------------------------------
// generate() — build dungeon + init turn system
// ---------------------------------------------------------------------------

function runGenerate(
  internal: GameInternal,
  dungeonHandle: DungeonHandle,
  turnsHandle: TurnsHandle,
): void {
  const dungeonOpts = internal.options.dungeon;

  // 1. Build dungeon
  let dungeonOut: BspDungeonOutputs | TiledMapOutputs;
  if ("tiled" in dungeonOpts && dungeonOpts.tiled) {
    const tiledCfg = dungeonOpts.tiled;
    dungeonOut = loadTiledMap(tiledCfg.map, {
      layers: tiledCfg.layers ?? {},
      tilesetMap: tiledCfg.tilesetMap ?? {},
      objectTypes: tiledCfg.objectTypes ?? {},
      ...(tiledCfg.objectLayer !== undefined ? { objectLayer: tiledCfg.objectLayer } : {}),
      ...(tiledCfg.seed !== undefined ? { seed: tiledCfg.seed } : {}),
    });
  } else {
    const bspOpts = dungeonOpts as BspDungeonOptions;
    dungeonOut = generateBspDungeon(bspOpts);
  }

  internal.dungeonOutputs = dungeonOut;

  // Extract solid data from the texture (Uint8Array backing the DataTexture)
  // Three DataTexture stores image.data as Uint8ClampedArray; use the raw data.
  const rawSolid = dungeonOut.textures.solid.image.data as Uint8Array;
  internal.solidData = rawSolid;
  internal.colliderFlagsData = dungeonOut.textures.colliderFlags.image.data as Uint8Array;

  // 2. Place player at start room centre if BSP
  const playerOpts = internal.options.player ?? {};
  let playerX = playerOpts.x ?? 1;
  let playerZ = playerOpts.z ?? 1;

  if ("startRoomId" in dungeonOut && dungeonOut.rooms) {
    const bspOut = dungeonOut as BspDungeonOutputs;
    const startRoom = bspOut.rooms.get(bspOut.startRoomId);
    if (startRoom && playerOpts.x == null) {
      playerX = Math.floor(startRoom.rect.x + startRoom.rect.w / 2);
      playerZ = Math.floor(startRoom.rect.y + startRoom.rect.h / 2);
    }
  }

  // Update player state
  internal.playerState.entity.x = playerX;
  internal.playerState.entity.z = playerZ;

  // 3. Init passages
  if ("startRoomId" in dungeonOut) {
    internal.passageMask = buildPassageMask(
      dungeonOut.width,
      dungeonOut.height,
      internal.passages,
    );
  } else {
    internal.passageMask = new Uint8Array(dungeonOut.width * dungeonOut.height);
  }

  // 4. Minimap state (BSP only — Tiled maps don't have rooms)
  if ("startRoomId" in dungeonOut) {
    internal.minimapState = createMinimapState(dungeonOut as BspDungeonOutputs);
  }

  // 5. Build player actor and init turn system
  const playerActor = buildPlayerActor(internal.playerActorId, {
    ...playerOpts,
    x: playerX,
    z: playerZ,
  });
  internal.entityById.set(internal.playerActorId, internal.playerState.entity);

  // Collect any pre-added actors (addActor called before generate)
  const preActors: MonsterActor[] = [];
  for (const [id, entity] of internal.entityById) {
    if (id === internal.playerActorId) continue;
    if (entity.alive && entity.speed > 0) {
      preActors.push(entityToMonsterActor(entity));
    }
  }

  internal.turnState = createTurnSystemState(playerActor, preActors);

  // 6. Run onPlace callback (BSP only for now)
  if ("startRoomId" in dungeonOut && dungeonOpts.onPlace) {
    const bspOut = dungeonOut as BspDungeonOutputs;
    const rngFn = makeRng(typeof bspOut.seed === "number" ? bspOut.seed : 0x12345678);
    const rng = {
      next: rngFn,
      chance: (p: number) => rngFn() < p,
    };

    const roomList: PublicRoom[] = [];
    for (const [id, info] of bspOut.rooms) {
      if (info.type === "room") roomList.push(toPublicRoom(id, info));
    }

    const endRoom = toPublicRoom(bspOut.endRoomId, bspOut.rooms.get(bspOut.endRoomId)!);
    const startRoom = toPublicRoom(bspOut.startRoomId, bspOut.rooms.get(bspOut.startRoomId)!);

    const place: PlaceAPI = {
      object(x, z, type, meta) {
        dungeonHandle.decorations.add({
          id: `obj_${type}_${x}_${z}`,
          kind: "decoration",
          type,
          sprite: type,
          x,
          z,
          hp: 0, maxHp: 0, attack: 0, defense: 0,
          speed: 0, alive: false, blocksMove: false,
          faction: "none", tick: 0,
          yaw: 0, scale: 1,
          ...(meta ?? {}),
        } as DecorationEntity);
      },
      npc(x, z, type, opts) {
        const entity: EntityBase = {
          id: `npc_${type}_${x}_${z}`,
          kind: "npc",
          type,
          sprite: type,
          x,
          z,
          hp: (opts?.hp as number) ?? 10,
          maxHp: (opts?.maxHp as number) ?? 10,
          attack: (opts?.attack as number) ?? 0,
          defense: (opts?.defense as number) ?? 0,
          speed: (opts?.speed as number) ?? 5,
          alive: true,
          blocksMove: true,
          faction: "npc",
          tick: 0,
        };
        turnsHandle.addActor(entity);
      },
      enemy(x, z, type, opts) {
        const entity: EntityBase = {
          id: `enemy_${type}_${x}_${z}`,
          kind: "enemy",
          type,
          sprite: type,
          x,
          z,
          hp: (opts?.hp as number) ?? 10,
          maxHp: (opts?.maxHp as number) ?? 10,
          attack: (opts?.attack as number) ?? 3,
          defense: (opts?.defense as number) ?? 0,
          speed: (opts?.speed as number) ?? 7,
          alive: true,
          blocksMove: true,
          faction: "enemy",
          tick: 0,
        };
        turnsHandle.addActor(entity);
      },
      decoration(x, z, type, opts) {
        dungeonHandle.decorations.add({
          id: `deco_${type}_${x}_${z}`,
          kind: "decoration",
          type,
          sprite: type,
          x,
          z,
          hp: 0, maxHp: 0, attack: 0, defense: 0,
          speed: 0, alive: false,
          blocksMove: (opts?.blocksMove as boolean) ?? false,
          faction: "none", tick: 0,
          yaw: (opts?.yaw as number) ?? 0,
          scale: (opts?.scale as number) ?? 1,
        } as DecorationEntity);
      },
      surface(x, z, layers: SurfacePaintTarget) {
        dungeonHandle.paint(x, z, layers);
      },
    };

    dungeonOpts.onPlace({ rooms: roomList, endRoom, startRoom, rng, place });
  }

  // 7. Run spawner callback per room
  if (internal.spawnerCb && "startRoomId" in dungeonOut) {
    const bspOut = dungeonOut as BspDungeonOutputs;
    for (const [id, info] of bspOut.rooms) {
      if (info.type !== "room") continue;
      const result = internal.spawnerCb({
        dungeon: dungeonHandle,
        roomId: id,
        x: Math.floor(info.rect.x + info.rect.w / 2),
        y: Math.floor(info.rect.y + info.rect.h / 2),
      });
      if (result) {
        const entities = Array.isArray(result) ? result : [result];
        for (const e of entities) turnsHandle.addActor(e);
      }
    }
  }

  // 8. Run decorator callback per floor cell
  if (internal.decoratorCb && internal.solidData) {
    const { width, height } = dungeonOut;
    const solid = internal.solidData;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (solid[y * width + x] !== 0) continue; // skip walls

        const roomId = ("startRoomId" in dungeonOut)
          ? (dungeonOut.textures.regionId.image.data as Uint8Array)[y * width + x] ?? 0
          : 0;

        const result = internal.decoratorCb({
          dungeon: dungeonHandle,
          roomId,
          x,
          y,
        });
        if (result) {
          const decos = Array.isArray(result) ? result : [result];
          for (const d of decos) dungeonHandle.decorations.add(d);
        }
      }
    }
  }

  // 9. Run surface painter callback per floor cell
  if (internal.surfacePainterCb && internal.solidData) {
    const { width, height } = dungeonOut;
    const solid = internal.solidData;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (solid[y * width + x] !== 0) continue;

        const roomId = ("startRoomId" in dungeonOut)
          ? (dungeonOut.textures.regionId.image.data as Uint8Array)[y * width + x] ?? 0
          : 0;

        const layers = internal.surfacePainterCb({ dungeon: dungeonHandle, roomId, x, y });
        if (layers && (layers.floor?.length || layers.wall?.length || layers.ceil?.length)) {
          dungeonHandle.paint(x, y, layers);
        }
      }
    }
  }

  // 10. Tick until player's first turn
  if (internal.turnState) {
    const deps: TurnSystemDeps = {
      isWalkable: (x, y) => isWalkableCell(getCellFlags(x, y, internal.colliderFlagsData!, dungeonOut.width, dungeonOut.height)),
      monsterDecide: (state, monsterId) =>
        decideChasePlayer(
          state,
          monsterId,
          dungeonOut,
          (x, y) => isWalkableCell(getCellFlags(x, y, internal.colliderFlagsData!, dungeonOut.width, dungeonOut.height)),
          (x, y) => !isLightPassableCell(getCellFlags(x, y, internal.colliderFlagsData!, dungeonOut.width, dungeonOut.height)),
        ),
      computeCost: (actorId, a) =>
        defaultComputeCost(actorId, a, internal.turnState!.actors),
      applyAction: makeApplyAction(internal, internal.options.combat),
    };
    internal.turnState = tickUntilPlayer(internal.turnState, deps);
  }

  // 11. Initial FOV + minimap
  updateFovAndMinimap(internal);

  // 12. Emit initial turn event
  internal.events.emit("turn", { turn: internal.turnCounter });
}

// ---------------------------------------------------------------------------
// Minimap drawing
// ---------------------------------------------------------------------------

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

function drawMinimap(
  internal: GameInternal,
  canvas: HTMLCanvasElement,
  opts: MinimapOptions,
): void {
  const minimap = internal.minimapState;
  if (!minimap || !internal.dungeonOutputs) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = opts.size ?? 196;
  const { width, height } = minimap;
  const cellW = size / width;
  const cellH = size / height;

  const colors = opts.colors ?? {};
  const exploredColor = colors.explored ?? "#555";
  const visibleColor  = colors.visible  ?? "#bbb";
  const playerColor   = colors.player   ?? "#0f0";
  const npcColor      = colors.npc      ?? "#08f";
  const enemyColor    = colors.enemy    ?? "#f44";

  ctx.clearRect(0, 0, size, size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (minimap.visible[i]) {
        ctx.fillStyle = visibleColor;
      } else if (minimap.explored[i]) {
        ctx.fillStyle = exploredColor;
      } else {
        continue;
      }
      ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
  }

  if (opts.showEntities !== false && internal.turnState) {
    for (const actor of Object.values(internal.turnState.actors)) {
      if (!actor.alive) continue;
      const entity = internal.entityById.get(actor.id);
      if (!entity) continue;

      if (actor.id === internal.playerActorId) {
        ctx.fillStyle = playerColor;
      } else if (entity.kind === "npc") {
        ctx.fillStyle = npcColor;
      } else {
        ctx.fillStyle = enemyColor;
      }

      ctx.fillRect(
        actor.x * cellW,
        actor.y * cellH,
        Math.max(2, Math.ceil(cellW)),
        Math.max(2, Math.ceil(cellH)),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------

/**
 * Create a game handle. Does not generate the dungeon — call `game.generate()`
 * after attaching callbacks.
 */
export function createGame(canvas: HTMLElement, options: GameOptions): GameHandle {
  const events = createEventEmitter();

  // Factions
  const factionTable = options.combat?.factions ?? DEFAULT_FACTION_TABLE;
  const factions = createFactionRegistryFromTable(
    factionTable as Array<[string, string, "hostile" | "neutral" | "friendly"]>,
  );

  // Player entity
  const playerOpts = options.player ?? {};
  const playerActorId = playerOpts.id ?? "player";
  const playerEntity: EntityBase = {
    id: playerActorId,
    kind: "player",
    type: "player",
    sprite: "player",
    x: playerOpts.x ?? 1,
    z: playerOpts.z ?? 1,
    hp: playerOpts.hp ?? 30,
    maxHp: playerOpts.maxHp ?? playerOpts.hp ?? 30,
    attack: playerOpts.attack ?? 3,
    defense: playerOpts.defense ?? 1,
    speed: playerOpts.speed ?? 5,
    alive: true,
    blocksMove: true,
    faction: "player",
    tick: 0,
  };

  const playerState: PlayerState = {
    entity: playerEntity,
    facing: 0,
    inventory: [],
  };

  const missionsHandle = createMissionSystem(events, options.transport);
  const animationRegistry = createAnimationRegistry();

  const internal: GameInternal = {
    options,
    canvas,
    events,
    factions,
    dungeonOutputs: null,
    solidData: null,
    colliderFlagsData: null,
    turnState: null,
    playerActorId,
    playerState,
    playerHandle: createPlayerHandle(playerState),
    entityById: new Map([[playerActorId, playerEntity]]),
    decorations: [],
    paintMap: new Map(),
    passages: [],
    passageMask: null,
    turnCounter: 0,
    minimapState: null,
    spawnerCb: null,
    decoratorCb: null,
    surfacePainterCb: null,
    keybindingsHandles: [],
    missions: missionsHandle,
    animationRegistry,
    destroyed: false,
  };

  let dungeonHandle: DungeonHandle;
  let turnsHandle: TurnsHandle;
  let generated = false;

  dungeonHandle = makeDungeonHandle(internal);
  turnsHandle = makeTurnsHandle(internal, dungeonHandle);

  // Forward heal game events into the animation queue so game.animations.on('heal')
  // fires regardless of which subsystem or developer code applied the healing.
  events.on("heal", ({ entity, amount }) => {
    if (internal.destroyed) return;
    const fullEntity = internal.entityById.get(entity.id);
    if (fullEntity) internal.animationRegistry._enqueue({ kind: 'heal', entity: fullEntity, amount });
  });

  // Wire mission tick to the turn event. Runs after every turn (local and
  // networked) so active missions are evaluated against the latest game state.
  events.on("turn", ({ turn }) => {
    if (internal.destroyed) return;
    missionsHandle._tick({
      turn,
      player: internal.playerHandle,
      dungeon: dungeonHandle,
      events,
      // mission is set per-record inside _tick; this placeholder is overwritten
      mission: null as never,
    });
  });

  // Wire transport reconciliation. Runs on every server state broadcast and
  // patches canonical positions/hp into the local turn state, then re-emits
  // the "turn" event so the UI and renderer stay in sync.
  if (options.transport) {
    options.transport.onStateUpdate(async (update) => {
      if (internal.destroyed) return;

      if (internal.turnState) {
        const oldActors = internal.turnState.actors;

        // Diff player states to synthesize animation events before patching.
        for (const [pid, ps] of Object.entries(update.players)) {
          const old = oldActors[pid];
          if (!old) continue;
          const entity = internal.entityById.get(pid);
          if (!entity) continue;
          if (old.x !== ps.x || old.y !== ps.y) {
            internal.animationRegistry._enqueue({
              kind: 'move', entity,
              from: { x: old.x, z: old.y },
              to:   { x: ps.x, z: ps.y },
            });
          }
          if (ps.hp < old.hp) {
            internal.animationRegistry._enqueue({ kind: 'damage', entity, amount: old.hp - ps.hp });
          }
          if (old.alive && !ps.alive) {
            internal.animationRegistry._enqueue({ kind: 'death', entity });
          }
        }

        // Diff monster states — auto-register entities for non-host clients
        // who never call addActor() and so have empty entityById/actors maps.
        if (update.monsters) {
          for (const mn of update.monsters) {
            // Register on first sight so animations work on all clients.
            let entity = internal.entityById.get(mn.id);
            if (!entity) {
              entity = {
                id: mn.id, kind: 'enemy', type: mn.type,
                sprite: mn.sprite as string | number,
                x: mn.x, z: mn.z, hp: mn.hp, maxHp: mn.maxHp, alive: mn.alive,
                attack: mn.attack, defense: mn.defense, speed: mn.speed,
                blocksMove: mn.blocksMove, faction: mn.faction, tick: mn.tick,
              };
              if (mn.spriteMap) (entity as Record<string, unknown>).spriteMap = mn.spriteMap;
              internal.entityById.set(mn.id, entity);
            }

            const old = oldActors[mn.id];
            if (old) {
              if (old.x !== mn.x || old.y !== mn.z) {
                internal.animationRegistry._enqueue({
                  kind: 'move', entity,
                  from: { x: old.x, z: old.y },
                  to:   { x: mn.x, z: mn.z },
                });
              }
              if (mn.hp < (old as { hp: number }).hp) {
                internal.animationRegistry._enqueue({ kind: 'damage', entity, amount: (old as { hp: number }).hp - mn.hp });
              }
              if (old.alive && !mn.alive) {
                internal.animationRegistry._enqueue({ kind: 'death', entity });
              }
            }

            // Keep entity fields current so animation positions are correct.
            entity.x = mn.x;
            entity.z = mn.z;
            entity.hp = mn.hp;
            entity.alive = mn.alive;
          }
        }

        // Patch actor state — players then monsters.
        let actors = { ...oldActors };
        for (const [pid, ps] of Object.entries(update.players)) {
          const actor = actors[pid];
          if (actor) {
            actors[pid] = { ...actor, x: ps.x, y: ps.y, hp: ps.hp, alive: ps.alive };
          }
        }
        for (const mn of (update.monsters ?? [])) {
          const existing = actors[mn.id] as MonsterActor | undefined;
          if (existing) {
            actors[mn.id] = { ...existing, x: mn.x, y: mn.z, hp: mn.hp, alive: mn.alive };
          } else {
            actors[mn.id] = {
              id: mn.id, kind: 'monster', name: mn.type, glyph: mn.type[0] ?? '?',
              x: mn.x, y: mn.z, speed: mn.speed, alive: mn.alive,
              blocksMovement: mn.blocksMove,
              hp: mn.hp, maxHp: mn.maxHp, attack: mn.attack, defense: mn.defense,
              xp: 0, danger: 1, alertState: 'idle', rpsEffect: 'none',
              searchTurnsLeft: 0, lastKnownPlayerPos: null,
            } as MonsterActor;
          }
        }
        internal.turnState = {
          ...internal.turnState,
          actors,
          awaitingPlayerInput: true,
        };
      }

      // Flush animation queue while entities are still at pre-update positions.
      await internal.animationRegistry._flush();

      // Sync own player's reactive state
      const myState = update.players[internal.playerActorId];
      if (myState) {
        internal.playerState.entity.x = myState.x;
        internal.playerState.entity.z = myState.y;
        internal.playerState.entity.hp = myState.hp;
        internal.playerState.entity.alive = myState.alive;
        if (myState.facing !== undefined) {
          internal.playerState.facing = myState.facing;
        }
      }

      syncAllEntitiesFromTurnState(internal);
      internal.turnCounter = update.turn;
      internal.events.emit("turn", { turn: update.turn });
      // Also broadcast the raw network state so examples can render other players
      internal.events.emit("network-state" as Parameters<typeof internal.events.emit>[0], update as never);
      updateFovAndMinimap(internal);
    });

    // When a peer completes a mission the server broadcasts mission_complete.
    // Translate that into the local mission-peer-complete event.
    options.transport.onMissionComplete?.((msg) => {
      if (internal.destroyed) return;
      internal.events.emit("mission-peer-complete", {
        missionId: msg.missionId,
        name: msg.name,
        playerId: msg.playerId,
      });
    });
  }

  const game: GameHandle = {
    get player() { return internal.playerHandle; },
    get turns()  { return turnsHandle; },
    get dungeon() { return dungeonHandle; },
    get events()  { return events; },
    get combat() {
      return { factions: internal.factions };
    },
    get missions() { return internal.missions; },
    get animations() { return internal.animationRegistry; },

    generate() {
      if (generated) return;
      generated = true;
      runGenerate(internal, dungeonHandle, turnsHandle);
    },

    regenerate() {
      // Clear entities accumulated from the previous run — keep only the player.
      internal.entityById.clear();
      internal.entityById.set(internal.playerActorId, internal.playerState.entity);
      // Clear decorations and surface paint.
      internal.decorations.length = 0;
      internal.paintMap.clear();
      // Reset turn counter.
      internal.turnCounter = 0;
      // Restore the player to full health for the new run.
      const playerOpts = internal.options.player ?? {};
      internal.playerState.entity.hp    = playerOpts.maxHp ?? playerOpts.hp ?? 30;
      internal.playerState.entity.alive = true;
      internal.playerState.facing       = 0;
      // Re-run generation.
      generated = false;
      generated = true;
      runGenerate(internal, dungeonHandle, turnsHandle);
    },

    destroy() {
      if (internal.destroyed) return;
      internal.destroyed = true;
      for (const h of internal.keybindingsHandles) h.destroy();
      internal.keybindingsHandles.length = 0;
    },
  };

  // Expose internal state for attach functions via a non-enumerable property
  Object.defineProperty(game, "_internal", { value: internal, enumerable: false });

  return game;
}

// ---------------------------------------------------------------------------
// Attach functions
// ---------------------------------------------------------------------------

/**
 * Wire up a 2D canvas minimap that redraws on every `turn` event.
 */
export function attachMinimap(
  game: GameHandle,
  canvas: HTMLCanvasElement,
  opts: MinimapOptions = {},
): void {
  // Access internal via the dungeon handle — need a backdoor to internal state.
  // We use a closure trick: the event emitter is on the game object directly.
  // The minimap state itself is accessed via the `_internal` symbol set on the
  // game by createGame — but since we don't expose that, we draw using the
  // turn event and capture internal via closure in createGame-attached helpers.
  //
  // Design note: createGame itself calls attachMinimap-compatible setup, but
  // the public function works by registering a 'turn' event listener.
  // Internal state is not exposed on GameHandle; we cast via a hidden property.
  const _internal: GameInternal | undefined = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (!_internal) {
    // Fallback: register a no-op to avoid errors when called on a foreign game object
    return;
  }

  function redraw() {
    drawMinimap(_internal!, canvas, opts);
  }

  game.events.on("turn", redraw);
}

/**
 * Register a spawn callback. Called per room during `generate()`.
 */
export function attachSpawner(
  game: GameHandle,
  opts: { onSpawn: SpawnCallback },
): void {
  const _internal = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (_internal) _internal.spawnerCb = opts.onSpawn;
}

/**
 * Register a decorator callback. Called per floor tile during `generate()`.
 */
export function attachDecorator(
  game: GameHandle,
  opts: { onDecorate: DecoratorCallback },
): void {
  const _internal = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (_internal) _internal.decoratorCb = opts.onDecorate;
}

/**
 * Register a surface painter callback. Called per floor tile during `generate()`.
 */
export function attachSurfacePainter(
  game: GameHandle,
  opts: { onPaint: SurfacePainterCallback },
): void {
  const _internal = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (_internal) _internal.surfacePainterCb = opts.onPaint;
}

/**
 * Install keyboard bindings. Wraps `createKeybindings` and registers the
 * handle with the game so it is cleaned up on `destroy()`.
 */
export function attachKeybindings(
  game: GameHandle,
  opts: KeybindingsOptions,
): void {
  const handle = createKeybindings(opts);
  const _internal = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (_internal) {
    _internal.keybindingsHandles.push(handle);
  }
}
