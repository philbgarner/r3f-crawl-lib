[atomic-core](../README.md) / createWebSocketTransport

# Function: createWebSocketTransport()

> **createWebSocketTransport**(`url`): [`ActionTransport`](../type-aliases/ActionTransport.md)

Defined in: [transport/websocket.ts:34](https://github.com/philbgarner/atomic-core/blob/54550262747609ee8b273468044fb8a6ec349eb1/src/lib/transport/websocket.ts#L34)

Create a browser-side WebSocket transport for multiplayer.
Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket server URL (e.g. `"ws://localhost:3001"`). |

## Returns

[`ActionTransport`](../type-aliases/ActionTransport.md)
