// src/lib/index.ts
//
// Public surface of r3f-crawl-lib. Re-exports the full CrawlLib API.

export {
  createGame,
  attachMinimap,
  attachSpawner,
  attachDecorator,
  attachSurfacePainter,
  attachKeybindings,
} from './api/createGame'

export { createNpc, createEnemy, createDecoration } from './entities/factory'
export { createItem }                                from './entities/inventory'
export { loadTiledMap }                              from './dungeon/tiled'

export { createDungeonRenderer } from './rendering/dungeonRenderer'
export type { DungeonRendererOptions, DungeonRenderer, FaceTileSpec, DirectionFaceMap } from './rendering/dungeonRenderer'

// Transport
export { createWebSocketTransport }                  from './transport/websocket'
export type { ActionTransport, ServerStateUpdate, PlayerNetState, DungeonInitPayload } from './transport/types'

// Type exports
export type { GameEventMap, EventEmitter }           from './events/eventEmitter'
export type { DungeonOutputs, BspDungeonOutputs }    from './dungeon/bsp'
export type { EntityBase, HiddenPassage }            from './entities/types'
export type { DecorationEntity }                     from './entities/factory'
export type { Item, InventorySlot }                  from './entities/inventory'
export type { TurnAction, TurnActionKind }           from './turn/types'
