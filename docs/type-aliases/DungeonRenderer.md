[atomic-core](../README.md) / DungeonRenderer

# Type Alias: DungeonRenderer

> **DungeonRenderer** = `object`

Defined in: [rendering/dungeonRenderer.ts:261](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L261)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="camera"></a> `camera` | `THREE.PerspectiveCamera` | The PerspectiveCamera tracking the player. Attach lights as children for player-relative effects: `renderer.camera.add(torch)` — torch follows the player automatically. | [rendering/dungeonRenderer.ts:274](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L274) |
| <a id="scene"></a> `scene` | `THREE.Scene` | The Three.js Scene used by the renderer. Add PointLights, DirectionalLights, or any other Three.js objects directly. Attach a PointLight to `camera` for a player-locked torch: `renderer.camera.add(new THREE.PointLight(0xffaa44, 5, 20))` | [rendering/dungeonRenderer.ts:268](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L268) |

## Methods

### addLayer()

> **addLayer**(`spec`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:327](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L327)

Add an instanced geometry layer on top of existing walls, ceilings, or
floors.  May be called before or after the dungeon is generated; layers
added before generation are deferred and applied automatically.

Returns a handle whose `remove()` method tears the layer down.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`LayerSpec`](LayerSpec.md) |

#### Returns

[`LayerHandle`](LayerHandle.md)

***

### addLight()

> **addLight**\<`T`\>(`light`): `T`

Defined in: [rendering/dungeonRenderer.ts:290](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L290)

Add a Three.js light to the renderer scene.
Returns the same light object so you can modify it at any time —
changes to position, intensity, or color take effect on the next frame.
Lights added here are automatically removed when `destroy()` is called.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `Light`\<`LightShadow`\<`Camera`\> \| `undefined`\> |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `light` | `T` |

#### Returns

`T`

#### Example

```ts
// Player torch — attach to camera so it follows the player:
const torch = renderer.addLight(new THREE.PointLight(0xffaa44, 4, 20, 2));
renderer.camera.add(torch);

// Fixed wall sconce:
const sconce = renderer.addLight(new THREE.PointLight(0xff6622, 2, 12, 2));
sconce.position.set(wx, wy, wz);
```

***

### createAtlasMaterial()

> **createAtlasMaterial**(): `ShaderMaterial` \| `null`

Defined in: [rendering/dungeonRenderer.ts:340](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L340)

Create a new atlas `ShaderMaterial` using the same texture, fog, and
shader settings as the renderer's own geometry.  Useful when building a
layer material that should display tiles from the configured atlas.
Returns `null` when no atlas was passed to `createDungeonRenderer`.

#### Returns

`ShaderMaterial` \| `null`

***

### destroy()

> **destroy**(): `void`

Defined in: [rendering/dungeonRenderer.ts:394](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L394)

Unmount the canvas and release all Three.js resources.

#### Returns

`void`

***

### highlightCells()

> **highlightCells**(`filter`): [`LayerHandle`](LayerHandle.md)

Defined in: [rendering/dungeonRenderer.ts:363](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L363)

Overlay coloured floor highlights on a subset of cells.

The `filter` is called for every non-solid floor cell and should return a
CSS colour string to highlight that cell, or a falsy value to skip it.
The `regionId` argument lets callers colour-code cells by room/corridor
without extra bookkeeping.

Returns a `LayerHandle` whose `remove()` tears the overlay down.
May be called before or after `game.generate()`.

Example — highlight all cells in room 3 red, corridor cells yellow:
```ts
const handle = renderer.highlightCells((cx, cz, regionId) => {
  if (regionId === 3) return 'red';
  if (regionId > 100) return 'rgba(255,255,0,0.3)';
  return null;
});
// later:
handle.remove();
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `filter` | (`cx`, `cz`, `regionId`) => `string` \| `false` \| `null` \| `undefined` |

#### Returns

[`LayerHandle`](LayerHandle.md)

***

### rebuild()

> **rebuild**(): `void`

Defined in: [rendering/dungeonRenderer.ts:333](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L333)

Tear down all existing dungeon geometry and rebuild it from the current
dungeon outputs. Call this after `game.regenerate()` to keep the renderer
in sync when the dungeon layout has changed (e.g. a new seed).

#### Returns

`void`

***

### removeLight()

> **removeLight**(`light`): `void`

Defined in: [rendering/dungeonRenderer.ts:295](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L295)

Remove a light previously added with `addLight`.
Has no effect if the light was not added through this API.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `light` | `Light` |

#### Returns

`void`

***

### setAmbientOcclusion()

> **setAmbientOcclusion**(`intensity`): `void`

Defined in: [rendering/dungeonRenderer.ts:370](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L370)

Update the ambient occlusion intensity at runtime. `intensity` is clamped
to [0, 1]. Takes effect on the next rendered frame.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intensity` | `number` |

#### Returns

`void`

***

### setEntities()

> **setEntities**(`entities`): `void`

Defined in: [rendering/dungeonRenderer.ts:300](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L300)

Update the renderer's entity list. Call this on every 'turn' event
(or whenever entity positions change) to keep the scene in sync.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entities` | [`EntityBase`](EntityBase.md)[] |

#### Returns

`void`

***

### setObjects()

> **setObjects**(`objects`): `void`

Defined in: [rendering/dungeonRenderer.ts:307](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L307)

Register stationary billboard objects derived from `ObjectPlacement` records.
Call once after `game.generate()` (or pass `game.dungeon.objects` directly).
Objects with a `spriteMap` are rendered as camera-facing billboard sprites;
objects without one are ignored by the renderer.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `objects` | [`ObjectPlacement`](../interfaces/ObjectPlacement.md)[] |

#### Returns

`void`

***

### setSkybox()

> **setSkybox**(`opts`): `Promise`\<`void`\>

Defined in: [rendering/dungeonRenderer.ts:392](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L392)

Attach or replace the skybox cube map at runtime.
Pass `null` to remove the skybox and revert to the plain fog colour.
Resolves after all six face images have loaded (instant when a pre-loaded
`THREE.CubeTexture` is supplied or when `null` is passed).

Note: when a pre-loaded `THREE.CubeTexture` is supplied, ownership stays
with the caller — the renderer will not dispose it on `destroy()` or on a
subsequent `setSkybox()` call.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`SkyboxOptions`](SkyboxOptions.md) \| `null` |

#### Returns

`Promise`\<`void`\>

***

### setSurfaceLighting()

> **setSurfaceLighting**(`opts`): `void`

Defined in: [rendering/dungeonRenderer.ts:376](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L376)

Update directional surface lighting values at runtime. All fields are
optional — omit any field to leave its current value unchanged.
Takes effect on the next rendered frame; no geometry rebuild required.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | \{ `ceiling?`: `number`; `floor?`: `number`; `wallMax?`: `number`; `wallMin?`: `number`; \} |
| `opts.ceiling?` | `number` |
| `opts.floor?` | `number` |
| `opts.wallMax?` | `number` |
| `opts.wallMin?` | `number` |

#### Returns

`void`

***

### worldToScreen()

> **worldToScreen**(`gridX`, `gridZ`, `worldY?`): \{ `x`: `number`; `y`: `number`; \} \| `null`

Defined in: [rendering/dungeonRenderer.ts:319](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L319)

Project a dungeon grid cell to 2D pixel coordinates relative to the
renderer's container element, using the current camera state.

Returns `{ x, y }` in pixels (suitable for `left`/`top` on an absolutely-
positioned child of the container), or `null` when the point is behind
the camera or outside the viewport.

`worldY` is the vertical world-space position to project; defaults to
mid-entity height (~40% of ceiling height).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `gridX` | `number` |
| `gridZ` | `number` |
| `worldY?` | `number` |

#### Returns

\{ `x`: `number`; `y`: `number`; \} \| `null`
