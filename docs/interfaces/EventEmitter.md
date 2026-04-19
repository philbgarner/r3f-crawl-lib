[atomic-core](../README.md) / EventEmitter

# Interface: EventEmitter

Defined in: [events/eventEmitter.ts:69](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/events/eventEmitter.ts#L69)

## Methods

### emit()

> **emit**\<`K`\>(...`args`): `void`

Defined in: [events/eventEmitter.ts:72](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/events/eventEmitter.ts#L72)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | [`GameEventMap`](GameEventMap.md)\[`K`\] *extends* `void` ? \[`K`\] : \[`K`, [`GameEventMap`](GameEventMap.md)\[`K`\]\] |

#### Returns

`void`

***

### off()

> **off**\<`K`\>(`event`, `handler`): `void`

Defined in: [events/eventEmitter.ts:71](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/events/eventEmitter.ts#L71)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `handler` | `Handler`\<[`GameEventMap`](GameEventMap.md)\[`K`\]\> |

#### Returns

`void`

***

### on()

> **on**\<`K`\>(`event`, `handler`): `void`

Defined in: [events/eventEmitter.ts:70](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/events/eventEmitter.ts#L70)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `handler` | `Handler`\<[`GameEventMap`](GameEventMap.md)\[`K`\]\> |

#### Returns

`void`
