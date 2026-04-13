export { createGame, attachMinimap, attachSpawner, attachDecorator, attachSurfacePainter, attachKeybindings, } from './api/createGame';
export { createNpc, createEnemy, createDecoration } from './entities/factory';
export { createItem } from './entities/inventory';
export { loadTiledMap } from './dungeon/tiled';
export { createDungeonRenderer } from './rendering/dungeonRenderer';
export { THEMES, THEME_KEYS, resolveTheme, registerTheme, getTheme } from './dungeon/themes';
export type { ThemeDef, ThemeSelector } from './dungeon/themes';
export type { DungeonRendererOptions, DungeonRenderer, FaceTileSpec, DirectionFaceMap, LayerTarget, LayerFaceResult, LayerSpec, LayerHandle } from './rendering/dungeonRenderer';
export { createWebSocketTransport } from './transport/websocket';
export type { ActionTransport, ServerStateUpdate, PlayerNetState, DungeonInitPayload } from './transport/types';
export type { Mission, MissionStatus, MissionContext, MissionEvaluator, MissionCompleteCallback, MissionDef, MissionsHandle } from './missions/types';
export type { GameEventMap, EventEmitter } from './events/eventEmitter';
export type { DungeonOutputs, BspDungeonOutputs } from './dungeon/bsp';
export type { EntityBase, HiddenPassage } from './entities/types';
export type { DecorationEntity } from './entities/factory';
export type { Item, InventorySlot } from './entities/inventory';
export type { TurnAction, TurnActionKind } from './turn/types';
//# sourceMappingURL=index.d.ts.map