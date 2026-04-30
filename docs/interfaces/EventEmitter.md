[atomic-core](../README.md) / EventEmitter

# Interface: EventEmitter

Defined in: [events/eventEmitter.ts:75](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/events/eventEmitter.ts#L75)

## Methods

### emit()

> **emit**\<`K`\>(...`args`): `void`

Defined in: [events/eventEmitter.ts:78](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/events/eventEmitter.ts#L78)

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

Defined in: [events/eventEmitter.ts:77](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/events/eventEmitter.ts#L77)

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

Defined in: [events/eventEmitter.ts:76](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/events/eventEmitter.ts#L76)

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
