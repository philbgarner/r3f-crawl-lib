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
import type { BspDungeonOptions, BspDungeonOutputs, RoomedDungeonOutputs, DungeonOutputs, RoomInfo } from "../dungeon/bsp";
import { generateCellularDungeon } from "../dungeon/cellular";
import type { CellularOptions, CellularDungeonOutputs } from "../dungeon/cellular";
import { loadTiledMap } from "../dungeon/tiled";
import type { TiledMapOptions, TiledMapOutputs } from "../dungeon/tiled";
import { createTurnSystemState, commitPlayerAction, tickUntilPlayer } from "../turn/system";
import type { TurnSystemState, TurnSystemDeps } from "../turn/system";
import { defaultComputeCost } from "../turn/system";
import type { PlayerActor, MonsterActor, ActorId, TurnAction } from "../turn/types";
import { createEventEmitter } from "../events/eventEmitter";
import type { EventEmitter } from "../events/eventEmitter";
import { createFactionRegistry } from "../combat/factions";
import type { FactionRegistry } from "../combat/factions";
import type { CombatResolver, CombatResult } from "../combat/combat";
import { decideChasePlayer } from "../ai/monsterAI";
import { computeFov } from "../ai/fov";
import { createMinimapState, updateExplored } from "../utils/minimap";
import type { MinimapState } from "../utils/minimap";
import { buildPassageMask, enablePassageInMask, disablePassageInMask } from "../passages/mask";
import type { HiddenPassage, ObjectPlacement } from "../entities/types";
import type { EntityBase } from "../entities/types";
import type { SpriteMap } from "../rendering/billboardSprites";
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
  add(decoration: EntityBase): void;
  remove(id: string): void;
  list: EntityBase[];
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
  /** Read-only list of all stationary object placements (including billboard sprites). */
  readonly objects: readonly ObjectPlacement[];
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
  /**
   * Place a stationary camera-facing billboard sprite at a grid cell.
   * The placement is stored in `game.dungeon.objects` and rendered when passed
   * to `renderer.setObjects(game.dungeon.objects)`.
   */
  billboard(
    x: number,
    z: number,
    type: string,
    spriteMap: SpriteMap,
    opts?: Pick<ObjectPlacement, "offsetX" | "offsetZ" | "offsetY" | "yaw" | "scale" | "meta">,
  ): void;
  npc(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  enemy(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  decoration(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
  surface(x: number, z: number, layers: SurfacePaintTarget): void;
};

export type SpawnChooserContext = {
  rooms: PublicRoom[];
  startRoom: PublicRoom;
  endRoom: PublicRoom;
};

export type DungeonOptions =
  | (BspDungeonOptions & {
      cellular?: never;
      tiled?: never;
      onPlace?: (ctx: OnPlaceContext) => void;
      /** Return a roomId to override the default spawn room (furthest from exit). */
      onChooseSpawn?: (ctx: SpawnChooserContext) => number;
    })
  | (CellularOptions & {
      cellular: true;
      tiled?: never;
      onPlace?: (ctx: OnPlaceContext) => void;
      /** Return a roomId to override the default spawn room. */
      onChooseSpawn?: (ctx: SpawnChooserContext) => number;
    })
  | {
      tiled: { map: unknown } & Omit<TiledMapOptions, "layers"> & {
        layers?: TiledMapOptions["layers"];
      };
      cellular?: never;
      onPlace?: (ctx: OnPlaceContext) => void;
      onChooseSpawn?: never;
    };

export type CombatOptions = {
  /**
   * Custom combat resolver. Receives attacker, defender, and engine context;
   * returns a CombatResult. The engine applies hp reduction and alive flag
   * from the result. When omitted, the engine performs a faction-stance check
   * only — non-hostile attacks are blocked, hostile attacks produce no damage.
   */
  resolver?: CombatResolver;
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
  /** Faction registry — set stances at runtime before or after generate(). */
  factions: FactionRegistry;
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
}) => EntityBase | EntityBase[] | null | undefined;

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
  dungeonOutputs: RoomedDungeonOutputs | TiledMapOutputs | null;
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
  decorations: EntityBase[];

  // Stationary object placements (including billboard sprites)
  objectPlacements: ObjectPlacement[];

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
  (entity as Record<string, unknown>).hp = actor.hp;
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
  const ev = e as Record<string, unknown>;
  return {
    id: e.id,
    kind: "monster",
    name: (ev.type as string | undefined) ?? e.kind,
    glyph: ((ev.type as string | undefined)?.[0]) ?? e.kind[0] ?? "?",
    x: e.x,
    y: e.z,
    speed: e.speed > 0 ? e.speed : 5,
    alive: e.alive,
    blocksMovement: e.blocksMove,
    hp: (ev.hp as number | undefined) ?? 0,
    maxHp: (ev.maxHp as number | undefined) ?? 0,
    attack: (ev.attack as number | undefined) ?? 0,
    defense: (ev.defense as number | undefined) ?? 0,
    xp: (ev.xp as number | undefined) ?? 0,
    danger: (ev.danger as number | undefined) ?? 1,
    alertState: "idle",
    rpsEffect: "none",
    searchTurnsLeft: 0,
    lastKnownPlayerPos: null,
  };
}

// ---------------------------------------------------------------------------
// Fallback combat — stance-check only, no damage
// ---------------------------------------------------------------------------

function fallbackCombat(
  attacker: EntityBase,
  defender: EntityBase,
  factions: FactionRegistry,
): CombatResult {
  if (!factions.isHostile(attacker.faction, defender.faction)) {
    return { outcome: "blocked" };
  }
  return { outcome: "miss" };
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
            const targetType = (target as Record<string, unknown>).type as string | undefined;
            if (targetType === "chest") {
              internal.events.emit("chest-open", { chest: target, loot: [] });
              internal.events.emit("audio", { name: "chest-open", position: [target.x, target.z] });
            } else if (targetType === "door") {
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
        const ctx = { emit: internal.events, factions: internal.factions };
        const result = combatOpts?.resolver
          ? combatOpts.resolver(attackerEntity, defenderEntity, ctx)
          : fallbackCombat(attackerEntity, defenderEntity, internal.factions);

        if (result.outcome === "hit") {
          const defEv = defenderEntity as Record<string, unknown>;
          const currentHp = (defEv.hp as number | undefined) ?? 0;
          defEv.hp = Math.max(0, currentHp - result.damage);
          if (result.defenderDied) defenderEntity.alive = false;

          onAnimEvent?.({ kind: 'attack', entity: attackerEntity, actor: defenderEntity });
          onAnimEvent?.({ kind: 'damage', entity: defenderEntity, actor: attackerEntity, amount: result.damage });

          combatOpts?.onDamage?.({ attacker: attackerEntity, defender: defenderEntity, amount: result.damage });
          if (result.defenderDied) {
            onAnimEvent?.({ kind: 'death', entity: defenderEntity, actor: attackerEntity });
            combatOpts?.onDeath?.({ entity: defenderEntity, killer: attackerEntity });
            if (actorId === internal.playerActorId) {
              const xp = (defEv.xp as number | undefined) ?? 0;
              if (xp > 0) {
                onAnimEvent?.({ kind: 'xp-gain', entity: attackerEntity, amount: xp });
                internal.events.emit("xp-gain", { amount: xp, x: defenderEntity.x, z: defenderEntity.z });
              }
              internal.events.emit("audio", { name: "xp-pickup", position: [defenderEntity.x, defenderEntity.z] });
            }
          }

          const updatedDefender = {
            ...state.actors[targetActor.id]!,
            hp: (defEv.hp as number | undefined) ?? 0,
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
        for (const [id, info] of (internal.dungeonOutputs as RoomedDungeonOutputs).rooms) {
          _roomsCache[id] = toPublicRoom(id, info);
        }
      }
      return _roomsCache ?? {};
    },
    get outputs() { return internal.dungeonOutputs; },

    get objects(): readonly ObjectPlacement[] { return internal.objectPlacements; },

    decorations: {
      get list() { return internal.decorations; },
      add(decoration: EntityBase) {
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
      await internal.animationRegistry._flush();
      syncAllEntitiesFromTurnState(internal);
      updateFovAndMinimap(internal);
    },

    addActor(entity: EntityBase) {
      if (!internal.turnState) {
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
  let dungeonOut: RoomedDungeonOutputs | TiledMapOutputs;
  if ("tiled" in dungeonOpts && dungeonOpts.tiled) {
    const tiledCfg = dungeonOpts.tiled;
    dungeonOut = loadTiledMap(tiledCfg.map, {
      layers: tiledCfg.layers ?? {},
      tilesetMap: tiledCfg.tilesetMap ?? {},
      objectTypes: tiledCfg.objectTypes ?? {},
      ...(tiledCfg.objectLayer !== undefined ? { objectLayer: tiledCfg.objectLayer } : {}),
      ...(tiledCfg.seed !== undefined ? { seed: tiledCfg.seed } : {}),
    });
  } else if ("cellular" in dungeonOpts && dungeonOpts.cellular) {
    dungeonOut = generateCellularDungeon(dungeonOpts as CellularOptions);
  } else {
    dungeonOut = generateBspDungeon(dungeonOpts as BspDungeonOptions);
  }

  internal.dungeonOutputs = dungeonOut;

  const rawSolid = dungeonOut.textures.solid.image.data as Uint8Array;
  internal.solidData = rawSolid;
  internal.colliderFlagsData = dungeonOut.textures.colliderFlags.image.data as Uint8Array;

  // 2. Place player at the spawn room centre (default: startRoomId, overridable via onChooseSpawn)
  const playerOpts = internal.options.player ?? {};
  let playerX = playerOpts.x ?? 1;
  let playerZ = playerOpts.z ?? 1;

  if ("startRoomId" in dungeonOut && dungeonOut.rooms && playerOpts.x == null) {
    const rOut = dungeonOut as RoomedDungeonOutputs;
    let spawnRoomId = rOut.startRoomId;

    const onChooseSpawn = (dungeonOpts as { onChooseSpawn?: (ctx: SpawnChooserContext) => number }).onChooseSpawn;
    if (onChooseSpawn) {
      const roomList: PublicRoom[] = [];
      for (const [id, info] of rOut.rooms) {
        if (info.type === "room") roomList.push(toPublicRoom(id, info));
      }
      const startRoom = toPublicRoom(rOut.startRoomId, rOut.rooms.get(rOut.startRoomId)!);
      const endRoom   = toPublicRoom(rOut.endRoomId,   rOut.rooms.get(rOut.endRoomId)!);
      spawnRoomId = onChooseSpawn({ rooms: roomList, startRoom, endRoom });
    }

    const spawnRoom = rOut.rooms.get(spawnRoomId);
    if (spawnRoom) {
      playerX = Math.floor(spawnRoom.rect.x + spawnRoom.rect.w / 2);
      playerZ = Math.floor(spawnRoom.rect.y + spawnRoom.rect.h / 2);
    }
  }

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

  // 4. Minimap state (roomed dungeons only)
  if ("startRoomId" in dungeonOut) {
    internal.minimapState = createMinimapState(dungeonOut as RoomedDungeonOutputs);
  }

  // 5. Build player actor and init turn system
  const playerActor = buildPlayerActor(internal.playerActorId, {
    ...playerOpts,
    x: playerX,
    z: playerZ,
  });
  internal.entityById.set(internal.playerActorId, internal.playerState.entity);

  const preActors: MonsterActor[] = [];
  for (const [id, entity] of internal.entityById) {
    if (id === internal.playerActorId) continue;
    if (entity.alive && entity.speed > 0) {
      preActors.push(entityToMonsterActor(entity));
    }
  }

  internal.turnState = createTurnSystemState(playerActor, preActors);

  // 6. Run onPlace callback (roomed dungeons)
  if ("startRoomId" in dungeonOut && dungeonOpts.onPlace) {
    const rOut = dungeonOut as RoomedDungeonOutputs;
    const rngFn = makeRng(typeof rOut.seed === "number" ? rOut.seed : 0x12345678);
    const rng = {
      next: rngFn,
      chance: (p: number) => rngFn() < p,
    };

    const roomList: PublicRoom[] = [];
    for (const [id, info] of rOut.rooms) {
      if (info.type === "room") roomList.push(toPublicRoom(id, info));
    }

    const endRoom   = toPublicRoom(rOut.endRoomId,   rOut.rooms.get(rOut.endRoomId)!);
    const startRoom = toPublicRoom(rOut.startRoomId, rOut.rooms.get(rOut.startRoomId)!);

    const place: PlaceAPI = {
      object(x, z, type, meta) {
        dungeonHandle.decorations.add({
          id: `obj_${type}_${x}_${z}`,
          kind: "decoration",
          spriteName: type,
          faction: "none",
          x,
          z,
          speed: 0,
          alive: false,
          blocksMove: false,
          tick: 0,
          type,
          ...(meta ?? {}),
        });
      },
      billboard(x, z, type, spriteMap, opts) {
        internal.objectPlacements.push({ x, z, type, spriteMap, ...(opts ?? {}) });
      },
      npc(x, z, type, opts) {
        const entity: EntityBase = {
          id: `npc_${type}_${x}_${z}`,
          kind: "npc",
          spriteName: (opts?.spriteName as string | undefined) ?? type,
          faction: (opts?.faction as string | undefined) ?? "npc",
          x,
          z,
          speed: (opts?.speed as number | undefined) ?? 5,
          alive: true,
          blocksMove: true,
          tick: 0,
          type,
          ...opts,
        };
        turnsHandle.addActor(entity);
      },
      enemy(x, z, type, opts) {
        const entity: EntityBase = {
          id: `enemy_${type}_${x}_${z}`,
          kind: "enemy",
          spriteName: (opts?.spriteName as string | undefined) ?? type,
          faction: (opts?.faction as string | undefined) ?? "enemy",
          x,
          z,
          speed: (opts?.speed as number | undefined) ?? 7,
          alive: true,
          blocksMove: true,
          tick: 0,
          type,
          ...opts,
        };
        turnsHandle.addActor(entity);
      },
      decoration(x, z, type, opts) {
        dungeonHandle.decorations.add({
          id: `deco_${type}_${x}_${z}`,
          kind: "decoration",
          spriteName: (opts?.spriteName as string | undefined) ?? type,
          faction: "none",
          x,
          z,
          speed: 0,
          alive: false,
          blocksMove: (opts?.blocksMove as boolean | undefined) ?? false,
          tick: 0,
          type,
          ...opts,
        });
      },
      surface(x, z, layers: SurfacePaintTarget) {
        dungeonHandle.paint(x, z, layers);
      },
    };

    (dungeonOpts as { onPlace?: (ctx: OnPlaceContext) => void }).onPlace!({ rooms: roomList, endRoom, startRoom, rng, place });
  }

  // 7. Run spawner callback per room
  if (internal.spawnerCb && "startRoomId" in dungeonOut) {
    const rOut = dungeonOut as RoomedDungeonOutputs;
    for (const [id, info] of rOut.rooms) {
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
        if (solid[y * width + x] !== 0) continue;

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
    /** Floor in current LOS. Default: "#aab" */
    floor?: string;
    /** Floor explored but outside LOS. Default: "#445" */
    floorDim?: string;
    /** Wall adjacent to a visible cell. Default: "#777" */
    wall?: string;
    /** Wall adjacent to explored-only cells. Default: "#333" */
    wallDim?: string;
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
  const floorColor    = colors.floor    ?? "#aab";
  const floorDimColor = colors.floorDim ?? "#445";
  const wallColor     = colors.wall     ?? "#777";
  const wallDimColor  = colors.wallDim  ?? "#333";
  const playerColor   = colors.player   ?? "#0f0";
  const npcColor      = colors.npc      ?? "#08f";
  const enemyColor    = colors.enemy    ?? "#f44";

  ctx.clearRect(0, 0, size, size);

  const flags = internal.colliderFlagsData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isVisible  = minimap.visible[i]  !== 0;
      const isExplored = minimap.explored[i] !== 0;
      if (!isVisible && !isExplored) continue;

      const isFloor = !flags || isWalkableCell(flags[i] ?? 0x02);
      if (isFloor) {
        ctx.fillStyle = isVisible ? floorColor : floorDimColor;
      } else {
        ctx.fillStyle = isVisible ? wallColor : wallDimColor;
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

  // Faction registry starts empty — dev defines all stances via game.factions
  const factions = createFactionRegistry();

  // Player entity
  const playerOpts = options.player ?? {};
  const playerActorId = playerOpts.id ?? "player";
  const playerEntity: EntityBase = {
    id: playerActorId,
    kind: "player",
    spriteName: "player",
    faction: "player",
    x: playerOpts.x ?? 1,
    z: playerOpts.z ?? 1,
    speed: playerOpts.speed ?? 5,
    alive: true,
    blocksMove: true,
    tick: 0,
    hp: playerOpts.hp ?? 30,
    maxHp: playerOpts.maxHp ?? playerOpts.hp ?? 30,
    attack: playerOpts.attack ?? 3,
    defense: playerOpts.defense ?? 1,
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
    objectPlacements: [],
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

  events.on("heal", ({ entity, amount }) => {
    if (internal.destroyed) return;
    const fullEntity = internal.entityById.get(entity.id);
    if (fullEntity) internal.animationRegistry._enqueue({ kind: 'heal', entity: fullEntity, amount });
  });

  events.on("turn", ({ turn }) => {
    if (internal.destroyed) return;
    missionsHandle._tick({
      turn,
      player: internal.playerHandle,
      dungeon: dungeonHandle,
      events,
      mission: null as never,
    });
  });

  if (options.transport) {
    options.transport.onStateUpdate(async (update) => {
      if (internal.destroyed) return;

      if (internal.turnState) {
        const oldActors = internal.turnState.actors;

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

        if (update.monsters) {
          for (const mn of update.monsters) {
            let entity = internal.entityById.get(mn.id);
            if (!entity) {
              entity = {
                id: mn.id,
                kind: 'enemy',
                spriteName: mn.spriteName ?? (mn.sprite as string | undefined) ?? mn.type ?? mn.id,
                faction: mn.faction,
                x: mn.x,
                z: mn.z,
                speed: mn.speed,
                alive: mn.alive,
                blocksMove: mn.blocksMove,
                tick: mn.tick,
                hp: mn.hp,
                maxHp: mn.maxHp,
                attack: mn.attack,
                defense: mn.defense,
                // backward-compat shims — present only when received from an older host
                ...(mn.type !== undefined ? { type: mn.type } : {}),
                ...(mn.sprite !== undefined ? { sprite: mn.sprite } : {}),
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
              const oldHp = (old as { hp: number }).hp;
              if (mn.hp < oldHp) {
                internal.animationRegistry._enqueue({ kind: 'damage', entity, amount: oldHp - mn.hp });
              }
              if (old.alive && !mn.alive) {
                internal.animationRegistry._enqueue({ kind: 'death', entity });
              }
            }

            entity.x = mn.x;
            entity.z = mn.z;
            (entity as Record<string, unknown>).hp = mn.hp;
            entity.alive = mn.alive;
          }
        }

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
              id: mn.id, kind: 'monster', name: mn.type ?? mn.spriteName, glyph: (mn.type ?? mn.spriteName)[0] ?? '?',
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

      await internal.animationRegistry._flush();

      const myState = update.players[internal.playerActorId];
      if (myState) {
        internal.playerState.entity.x = myState.x;
        internal.playerState.entity.z = myState.y;
        (internal.playerState.entity as Record<string, unknown>).hp = myState.hp;
        internal.playerState.entity.alive = myState.alive;
        if (myState.facing !== undefined) {
          internal.playerState.facing = myState.facing;
        }
      }

      syncAllEntitiesFromTurnState(internal);
      internal.turnCounter = update.turn;
      internal.events.emit("turn", { turn: update.turn });
      internal.events.emit("network-state" as Parameters<typeof internal.events.emit>[0], update as never);
      updateFovAndMinimap(internal);
    });

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
    get factions() { return internal.factions; },
    get missions() { return internal.missions; },
    get animations() { return internal.animationRegistry; },

    generate() {
      if (generated) return;
      generated = true;
      runGenerate(internal, dungeonHandle, turnsHandle);
    },

    regenerate() {
      internal.entityById.clear();
      internal.entityById.set(internal.playerActorId, internal.playerState.entity);
      internal.decorations.length = 0;
      internal.objectPlacements.length = 0;
      internal.paintMap.clear();
      internal.turnCounter = 0;
      const playerOpts = internal.options.player ?? {};
      const maxHp = playerOpts.maxHp ?? playerOpts.hp ?? 30;
      (internal.playerState.entity as Record<string, unknown>).hp = maxHp;
      internal.playerState.entity.alive = true;
      internal.playerState.facing = 0;
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
  const _internal: GameInternal | undefined = (game as Record<string, unknown>)._internal as GameInternal | undefined;
  if (!_internal) return;

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
