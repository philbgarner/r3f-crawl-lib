// src/lib/transport/websocket.ts
//
// Browser-side WebSocket transport. Pass the result to createGame() via
// GameOptions.transport to make the server authoritative for all actions.
//
// Usage:
//   const transport = createWebSocketTransport('ws://localhost:3001')
//   const { playerId, isHost, dungeonConfig } = await transport.connect()
//   const game = createGame(el, { ..., player: { id: playerId }, transport })
//   if (isHost) {
//     game.generate()
//     const solid = Array.from(game.dungeon.outputs.textures.solid.image.data)
//     transport.initDungeon({ solid, width: game.dungeon.width,
//                             height: game.dungeon.height, config: myConfig })
//   } else {
//     // dungeonConfig received from server — generate same dungeon
//     game.generate()
//   }

import type {
  ActionTransport,
  ServerStateUpdate,
  DungeonInitPayload,
} from './types';
import type { TurnAction } from '../turn/types';

export function createWebSocketTransport(url: string): ActionTransport {
  let ws: WebSocket | null = null;
  let _playerId: string | null = null;
  const updateHandlers: Array<(update: ServerStateUpdate) => void> = [];
  const chatHandlers: Array<(msg: { playerId: string; text: string }) => void> = [];
  const missionCompleteHandlers: Array<(msg: { playerId: string; missionId: string; name: string }) => void> = [];

  function dispatch(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    if (msg.type === 'state') {
      const update = msg as unknown as ServerStateUpdate & { type: string };
      for (const h of updateHandlers) h(update);
    }

    if (msg.type === 'chat') {
      const payload = { playerId: msg.playerId as string, text: msg.text as string };
      for (const h of chatHandlers) h(payload);
    }

    if (msg.type === 'mission_complete') {
      const payload = {
        playerId: msg.playerId as string,
        missionId: msg.missionId as string,
        name: msg.name as string,
      };
      for (const h of missionCompleteHandlers) h(payload);
    }
  }

  return {
    get playerId() {
      return _playerId;
    },

    connect(meta?: Record<string, unknown>) {
      return new Promise((resolve, reject) => {
        ws = new WebSocket(url);

        ws.onopen = () => {
          ws!.send(JSON.stringify({ type: 'join', roomId: 'default', meta: meta ?? {} }));
        };

        ws.onmessage = (evt) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(evt.data as string) as Record<string, unknown>;
          } catch {
            return;
          }

          if (msg.type === 'welcome') {
            _playerId = msg.playerId as string;
            const resolved: { playerId: string; isHost: boolean; dungeonConfig?: Record<string, unknown> } = {
              playerId: msg.playerId as string,
              isHost: msg.isHost as boolean,
            };
            const cfg = msg.dungeonConfig as Record<string, unknown> | undefined;
            if (cfg !== undefined) resolved.dungeonConfig = cfg;
            resolve(resolved);
            return;
          }

          dispatch(evt.data as string);
        };

        ws.onerror = (e) => reject(e);
        ws.onclose = () => {};
      });
    },

    send(action: TurnAction) {
      if (!ws || !_playerId) return;
      ws.send(JSON.stringify({ type: 'action', action }));
    },

    onStateUpdate(handler: (update: ServerStateUpdate) => void) {
      updateHandlers.push(handler);
    },

    initDungeon(payload: DungeonInitPayload) {
      if (!ws || !_playerId) return;
      ws.send(JSON.stringify({ type: 'dungeon_init', ...payload }));
    },

    disconnect() {
      ws?.close();
      ws = null;
    },

    sendChat(text: string) {
      if (!ws || !_playerId) return;
      ws.send(JSON.stringify({ type: 'chat', text }));
    },

    sendMeta(meta: Record<string, unknown>) {
      if (!ws || !_playerId) return;
      ws.send(JSON.stringify({ type: 'player_meta', meta }));
    },

    onChat(handler: (msg: { playerId: string; text: string }) => void) {
      chatHandlers.push(handler);
    },

    sendMissionComplete(missionId: string, name: string) {
      if (!ws || !_playerId) return;
      ws.send(JSON.stringify({ type: 'mission_complete', missionId, name }));
    },

    onMissionComplete(handler: (msg: { playerId: string; missionId: string; name: string }) => void) {
      missionCompleteHandlers.push(handler);
    },
  };
}
