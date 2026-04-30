[atomic-core](../README.md) / createDungeonRenderer

# Function: createDungeonRenderer()

> **createDungeonRenderer**(`element`, `game`, `options?`): [`DungeonRenderer`](../type-aliases/DungeonRenderer.md)

Defined in: [rendering/dungeonRenderer.ts:582](https://github.com/philbgarner/atomic-core/blob/4041e6411d0bb6dd169f8ed8eae77a3af59aedf0/src/lib/rendering/dungeonRenderer.ts#L582)

Mount a Three.js first-person dungeon renderer into `element`.

Call after `game.generate()` is wired up. The renderer reads dungeon geometry
from the game handle and re-renders whenever the player moves. Pass an
`options.packedAtlas` + `options.tileNameResolver` pair to enable textured
walls/floors/ceilings; omit them for flat-colour geometry.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `element` | `HTMLElement` | Container element — the renderer fills it entirely. |
| `game` | `GameHandle` | Live `GameHandle` returned by `createGame()`. |
| `options` | [`DungeonRendererOptions`](../type-aliases/DungeonRendererOptions.md) | Optional renderer configuration (fog, atlas, skirt tiles, etc.). |

## Returns

[`DungeonRenderer`](../type-aliases/DungeonRenderer.md)

A `DungeonRenderer` handle with `setEntities`, `addLayer`, etc.

## Example

```ts
const packed = await loadTextureAtlas('sprites.png', atlasJson);
const renderer = createDungeonRenderer(document.getElementById('viewport'), game, {
  packedAtlas: packed,
  tileNameResolver: packedAtlasResolver(packed),
  floorTile: 'stone_floor',
  wallTile:  'brick_wall',
  ceilTile:  'ceiling_stone',
});
game.events.on('turn', () => renderer.setEntities([...enemies]));
```
