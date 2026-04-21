[atomic-core](../README.md) / MissionDef

# Type Alias: MissionDef

> **MissionDef** = `object`

Defined in: [missions/types.ts:76](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L76)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="description"></a> `description?` | `string` | - | [missions/types.ts:80](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L80) |
| <a id="evaluator"></a> `evaluator` | [`MissionEvaluator`](MissionEvaluator.md) | Evaluated once per turn. Return true when the mission condition is met. | [missions/types.ts:84](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L84) |
| <a id="id"></a> `id` | `string` | Must be unique within the game session. | [missions/types.ts:78](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L78) |
| <a id="metadata"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Seed data for the metadata bag. Evaluators can accumulate cross-turn state here (e.g. `{ kills: 0 }`). | [missions/types.ts:94](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L94) |
| <a id="name"></a> `name` | `string` | - | [missions/types.ts:79](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L79) |
| <a id="oncomplete"></a> `onComplete?` | [`MissionCompleteCallback`](MissionCompleteCallback.md) | Called once, synchronously, when the evaluator first returns true. Optional — omit if you only need the `mission-complete` event. | [missions/types.ts:89](https://github.com/philbgarner/atomic-core/blob/059d282bcb55e802a623f9e7a0f2cb290623baf0/src/lib/missions/types.ts#L89) |
