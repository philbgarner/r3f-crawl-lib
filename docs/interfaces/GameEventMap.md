[atomic-core](../README.md) / GameEventMap

# Interface: GameEventMap

Defined in: [events/eventEmitter.ts:17](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L17)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio"></a> `audio` | `object` | Spatial audio cue. `position` is optional world-space [x, z]. | [events/eventEmitter.ts:39](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L39) |
| `audio.name` | `string` | - | [events/eventEmitter.ts:39](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L39) |
| `audio.position?` | \[`number`, `number`\] | - | [events/eventEmitter.ts:39](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L39) |
| <a id="cell-paint"></a> `cell-paint` | `object` | A cell's surface paint changed. Each surface key holds the new overlay tile-name array for that surface (absent = unchanged, empty = unpainted). Emitted by `dungeon.paint()` and `dungeon.unpaint()`. | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| `cell-paint.ceil?` | `string`[] | - | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| `cell-paint.floor?` | `string`[] | - | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| `cell-paint.wall?` | `string`[] | - | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| `cell-paint.x` | `number` | - | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| `cell-paint.z` | `number` | - | [events/eventEmitter.ts:65](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L65) |
| <a id="chest-open"></a> `chest-open` | `object` | A chest was opened. `loot` is the array of items inside. | [events/eventEmitter.ts:29](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L29) |
| `chest-open.chest` | `EventEntity` | - | [events/eventEmitter.ts:29](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L29) |
| `chest-open.loot` | `EventItem`[] | - | [events/eventEmitter.ts:29](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L29) |
| <a id="damage"></a> `damage` | `object` | An entity received damage. `effect` is the status effect or attack type that caused it. | [events/eventEmitter.ts:19](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L19) |
| `damage.amount` | `number` | - | [events/eventEmitter.ts:19](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L19) |
| `damage.effect?` | `string` | - | [events/eventEmitter.ts:19](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L19) |
| `damage.entity` | `EventEntity` | - | [events/eventEmitter.ts:19](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L19) |
| <a id="death"></a> `death` | `object` | An entity died. `killer` is undefined for environmental deaths. | [events/eventEmitter.ts:21](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L21) |
| `death.entity` | `EventEntity` | - | [events/eventEmitter.ts:21](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L21) |
| `death.killer?` | `EventEntity` | - | [events/eventEmitter.ts:21](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L21) |
| <a id="heal"></a> `heal` | `object` | An entity was healed. | [events/eventEmitter.ts:25](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L25) |
| `heal.amount` | `number` | - | [events/eventEmitter.ts:25](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L25) |
| `heal.entity` | `EventEntity` | - | [events/eventEmitter.ts:25](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L25) |
| <a id="item-pickup"></a> `item-pickup` | `object` | An entity picked up an item. | [events/eventEmitter.ts:31](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L31) |
| `item-pickup.entity` | `EventEntity` | - | [events/eventEmitter.ts:31](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L31) |
| `item-pickup.item` | `EventItem` | - | [events/eventEmitter.ts:31](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L31) |
| <a id="lose"></a> `lose` | `object` | Game over. `reason` is a developer-supplied string. | [events/eventEmitter.ts:37](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L37) |
| `lose.reason` | `string` | - | [events/eventEmitter.ts:37](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L37) |
| <a id="miss"></a> `miss` | `object` | An attack missed. | [events/eventEmitter.ts:27](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L27) |
| `miss.attacker` | `EventEntity` | - | [events/eventEmitter.ts:27](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L27) |
| `miss.defender` | `EventEntity` | - | [events/eventEmitter.ts:27](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L27) |
| <a id="mission-complete"></a> `mission-complete` | `object` | A mission was completed by the local player. | [events/eventEmitter.ts:41](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L41) |
| `mission-complete.metadata?` | `Record`\<`string`, `unknown`\> | The mission's metadata bag at the time of completion. | [events/eventEmitter.ts:47](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L47) |
| `mission-complete.missionId` | `string` | - | [events/eventEmitter.ts:42](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L42) |
| `mission-complete.name` | `string` | - | [events/eventEmitter.ts:43](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L43) |
| `mission-complete.turn` | `number` | Turn number at which the mission was completed. | [events/eventEmitter.ts:45](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L45) |
| <a id="mission-peer-complete"></a> `mission-peer-complete` | `object` | A connected peer completed a mission (multiplayer only). Emitted when the transport receives a mission_complete broadcast from the server. Single-player games never emit this event. | [events/eventEmitter.ts:54](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L54) |
| `mission-peer-complete.missionId` | `string` | - | [events/eventEmitter.ts:55](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L55) |
| `mission-peer-complete.name` | `string` | - | [events/eventEmitter.ts:56](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L56) |
| `mission-peer-complete.playerId` | `string` | Server-assigned player ID of the peer who completed the mission. | [events/eventEmitter.ts:58](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L58) |
| <a id="turn"></a> `turn` | `object` | Fires at the start of every turn. | [events/eventEmitter.ts:33](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L33) |
| `turn.turn` | `number` | - | [events/eventEmitter.ts:33](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L33) |
| <a id="win"></a> `win` | `void` | Player reached the exit or a custom win condition fired. | [events/eventEmitter.ts:35](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L35) |
| <a id="xp-gain"></a> `xp-gain` | `object` | The player gained XP at grid position (x, z). | [events/eventEmitter.ts:23](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L23) |
| `xp-gain.amount` | `number` | - | [events/eventEmitter.ts:23](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L23) |
| `xp-gain.x` | `number` | - | [events/eventEmitter.ts:23](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L23) |
| `xp-gain.z` | `number` | - | [events/eventEmitter.ts:23](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/events/eventEmitter.ts#L23) |
