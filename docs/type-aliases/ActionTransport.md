[atomic-core](../README.md) / ActionTransport

# Type Alias: ActionTransport

> **ActionTransport** = `object`

Defined in: [transport/types.ts:77](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L77)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="playerid"></a> `playerId` | `readonly` | `string` \| `null` | Server-assigned player ID. Null before connect() resolves. | [transport/types.ts:114](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L114) |

## Methods

### connect()

> **connect**(`meta?`): `Promise`\<\{ `dungeonConfig?`: `Record`\<`string`, `unknown`\>; `isHost`: `boolean`; `playerId`: `string`; \}\>

Defined in: [transport/types.ts:83](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L83)

Connect to the server. Resolves with the server-assigned player ID and
whether this client is the room host (first to join). Non-host clients
also receive the dungeon config so they can generate the same dungeon.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `meta?` | `Record`\<`string`, `unknown`\> |

#### Returns

`Promise`\<\{ `dungeonConfig?`: `Record`\<`string`, `unknown`\>; `isHost`: `boolean`; `playerId`: `string`; \}\>

***

### disconnect()

> **disconnect**(): `void`

Defined in: [transport/types.ts:111](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L111)

#### Returns

`void`

***

### initDungeon()

> **initDungeon**(`payload`): `void`

Defined in: [transport/types.ts:109](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L109)

Send the dungeon solid map and config to the server. Called by the host
client after game.generate() completes so the server can validate moves
and share the config with late-joining clients.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | [`DungeonInitPayload`](DungeonInitPayload.md) |

#### Returns

`void`

***

### onChat()

> **onChat**(`handler`): `void`

Defined in: [transport/types.ts:138](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L138)

Register a handler that fires whenever a chat message is received.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`msg`) => `void` |

#### Returns

`void`

***

### onMissionComplete()?

> `optional` **onMissionComplete**(`handler`): `void`

Defined in: [transport/types.ts:160](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L160)

Register a handler that fires when the server relays a mission completion
from another connected player. `createGame()` wires this internally to
emit the `mission-peer-complete` event on the game event emitter.

Optional — if absent, peer mission events are never emitted.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`msg`) => `void` |

#### Returns

`void`

***

### onStateUpdate()

> **onStateUpdate**(`handler`): `void`

Defined in: [transport/types.ts:102](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L102)

Register a handler that fires whenever the server pushes a state update.
Multiple handlers are supported — each call appends a new subscriber.
createGame() registers one internally for reconciliation; the example can
register another to track other players for rendering.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`update`) => `void` |

#### Returns

`void`

***

### send()

> **send**(`action`): `void`

Defined in: [transport/types.ts:94](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L94)

Send a player action to the authoritative server instead of applying it
locally. Called automatically by game.turns.commit() when a transport is
configured.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | [`TurnAction`](TurnAction.md) |

#### Returns

`void`

***

### sendChat()

> **sendChat**(`text`): `void`

Defined in: [transport/types.ts:119](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L119)

Send a chat message to all players in the room.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`void`

***

### sendMeta()

> **sendMeta**(`meta`): `void`

Defined in: [transport/types.ts:126](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L126)

Send arbitrary metadata to the server to be broadcast to all peers via
the state snapshot. Useful for things like sprite choice that other
clients need to know but that the server doesn't act on.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `meta` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### sendMissionComplete()?

> `optional` **sendMissionComplete**(`missionId`, `name`): `void`

Defined in: [transport/types.ts:151](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L151)

Notify the server that this player completed a mission. The server is
expected to broadcast this to all other connected clients so they can
emit a `mission-peer-complete` event locally.

Optional — if absent, mission completions are not broadcast to peers.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `missionId` | `string` |
| `name` | `string` |

#### Returns

`void`

***

### sendMonsterState()

> **sendMonsterState**(`monsters`): `void`

Defined in: [transport/types.ts:133](https://github.com/philbgarner/atomic-core/blob/00ebe2c72dacab39c637c5b68506af1715bce7d0/src/lib/transport/types.ts#L133)

Send the current monster state to the server so it can be broadcast to
all connected clients. Should be called by the host after generate() and
after every turn in which monsters move or change state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `monsters` | `MonsterNetState`[] |

#### Returns

`void`
