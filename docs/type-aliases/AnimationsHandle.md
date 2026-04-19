[atomic-core](../README.md) / AnimationsHandle

# Type Alias: AnimationsHandle

> **AnimationsHandle** = `object`

Defined in: [animations/types.ts:47](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/animations/types.ts#L47)

Developer-facing handle exposed as game.animations.

## Methods

### clear()

> **clear**(`kind`): `void`

Defined in: [animations/types.ts:50](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/animations/types.ts#L50)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`AnimationEventKind`](AnimationEventKind.md) |

#### Returns

`void`

***

### off()

> **off**\<`K`\>(`kind`, `handler`): `void`

Defined in: [animations/types.ts:49](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/animations/types.ts#L49)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`AnimationEventKind`](AnimationEventKind.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | `K` |
| `handler` | [`AnimationHandler`](AnimationHandler.md)\<`K`\> |

#### Returns

`void`

***

### on()

> **on**\<`K`\>(`kind`, `handler`): `void`

Defined in: [animations/types.ts:48](https://github.com/philbgarner/atomic-core/blob/c5af815606b0ff4e676f4a6760a775a53993493f/src/lib/animations/types.ts#L48)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`AnimationEventKind`](AnimationEventKind.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | `K` |
| `handler` | [`AnimationHandler`](AnimationHandler.md)\<`K`\> |

#### Returns

`void`
