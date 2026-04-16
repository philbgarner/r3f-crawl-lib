# Plan: Billboarded Sprite Rendering for Mobiles

## Overview

Replace the current colored `BoxGeometry` entity placeholders with camera-facing billboard quads
driven by a multi-layer sprite system. Actors declare a `spriteMap` describing their visual
layers and angle variants; the renderer handles all Three.js work transparently.

---

## Goals

- Drop-in: existing `addActor()` call gains an optional `spriteMap` field; nothing breaks if it is
  absent (box fallback remains).
- Layered: up to N texture layers per billboard, each with independent atlas tile, x/y offset,
  scale, and opacity.
- Multi-angle: up to 8 viewing angles (N/NE/E/SE/S/SW/W/NW); each angle can override any
  layer's tile. Defaults gracefully when fewer angles are defined.
- Future-ready: layer structure is designed so per-layer animation (frame cycling) can be bolted
  on without changing the public API.

---

## Public API Changes

### `EntityBase` extension (`entities/types.ts`)

```ts
/** Optional; presence switches renderer from box to billboard. */
spriteMap?: SpriteMap;
```

### New type: `SpriteMap` (`rendering/billboardSprites.ts`)

```ts
/**
 * Describes how to render a mobile as a camera-facing billboard.
 *
 * Layers are drawn back-to-front (index 0 = bottommost).
 * Each layer samples one tile from the shared sprite atlas.
 */
export interface SpriteMap {
  /** Pixel dimensions of a single sprite cell in the atlas (before scaling). */
  frameSize: { w: number; h: number };

  /**
   * Ordered layers composited front-to-back.
   * All layers share the same billboard quad; only the sampled UV differs.
   */
  layers: SpriteLayer[];

  /**
   * Optional per-angle overrides.  The key is a cardinal/intercardinal direction
   * string: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW".
   *
   * When the camera bearing relative to the sprite falls within 45° of an angle,
   * that angle's layer overrides take precedence.  Omit an angle to reuse the
   * base layer definitions.
   */
  angles?: Partial<Record<AngleKey, AngleOverride[]>>;
}

export type AngleKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface SpriteLayer {
  /** Atlas tile index (same coordinate space as existing `tileId` usage). */
  tileId: number;

  /** Horizontal offset from billboard center, in world units. Default 0. */
  offsetX?: number;

  /** Vertical offset from billboard center, in world units. Default 0. */
  offsetY?: number;

  /** Uniform scale multiplier. Default 1. */
  scale?: number;

  /** Alpha multiplier [0,1]. Default 1. */
  opacity?: number;

  // --- Future animation hook (not implemented in v1, reserved) ---
  /** When present, the layer will cycle through these tile IDs. (v2) */
  // animation?: { frames: number[]; fps: number };
}

export interface AngleOverride {
  /** Which layer index this override targets. */
  layerIndex: number;
  /** Replacement tile ID for this angle. */
  tileId: number;
  /** Replacement opacity (optional). */
  opacity?: number;
}
```

### `createDungeonRenderer` options

No change to the constructor signature; billboard rendering is activated automatically per-entity
when `spriteMap` is present. The existing `entityAppearances` option continues to control box
geometry for entities that lack a `spriteMap`.

---

## Implementation

### New file: `src/lib/rendering/billboardSprites.ts`

Responsibilities:
1. **`createBillboardMaterial(atlas, tileSize, columns)`** — returns a
   `THREE.ShaderMaterial` for a single billboard layer. Shader uniforms:
   - `uAtlas` — texture sampler
   - `uTileId` — active tile index (updated per-frame from `SpriteLayer.tileId`)
   - `uTileSize` — normalized tile dimensions
   - `uColumns` — columns in atlas
   - `uOffsetXY` — vec2 world-space layer offset
   - `uScale` — float scale multiplier
   - `uOpacity` — float [0,1]

2. **`BillboardHandle`** — per-entity object returned internally by the renderer:
   ```ts
   interface BillboardHandle {
     layerMeshes: THREE.Mesh[];   // one PlaneGeometry mesh per layer
     update(entity: EntityBase, cameraYaw: number): void;
     dispose(): void;
   }
   ```

3. **`createBillboard(entity, spriteMap, atlas, scene)`** — allocates `layerMeshes`,
   adds them to the scene, returns `BillboardHandle`.

4. **`updateBillboard(handle, entity, cameraYaw)`** — called each RAF frame:
   - Rotates the root billboard group to always face the camera (Y-axis only).
   - Computes the viewer's bearing angle relative to the entity's facing.
   - Selects the correct `AngleOverride[]` (or base layers if none matches).
   - Updates `uTileId` and `uOpacity` uniforms per layer mesh.
   - Positions the group at entity world position.

### Vertex shader (billboard layer)

```glsl
// Keeps the quad facing the camera at all times (Y-axis billboard).
// The parent group is rotated on CPU; the shader only applies UV math.

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### Fragment shader (billboard layer)

```glsl
uniform sampler2D uAtlas;
uniform vec2  uTileSize;
uniform float uColumns;
uniform float uTileId;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  float col = mod(uTileId, uColumns);
  float row = floor(uTileId / uColumns);
  vec2 origin = vec2(col, row) * uTileSize;
  vec2 atlasUv = origin + vUv * uTileSize;
  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
```

### Changes to `dungeonRenderer.ts`

- Add `Map<string, BillboardHandle>` alongside the existing entity mesh cache.
- In `syncEntities()`:
  - If `entity.spriteMap` is present → create/update `BillboardHandle`; skip box geometry.
  - On entity death/removal → call `handle.dispose()` and remove from map.
- In the RAF render loop, after camera lerp:
  - For each live `BillboardHandle`, call
    `updateBillboard(handle, entity, currentCameraYaw)`.

### Changes to `entities/types.ts`

- Add optional `spriteMap?: SpriteMap` to `EntityBase`.

---

## Angle Selection Logic

```
relativeAngle = (entityFacing - cameraYaw + 2π) mod 2π
sector        = round(relativeAngle / (2π/numAngles)) mod numAngles
angleKey      = ["N","NE","E","SE","S","SW","W","NW"][sector]
```

If `spriteMap.angles[angleKey]` is undefined, fall back to the base `spriteMap.layers`.

---

## Example Usage (actor definition, in tutorial or new example)

```js
const goblin = {
  id: "goblin_1",
  kind: "enemy",
  type: "goblin",
  sprite: "goblin",
  x: 5, z: 7,
  hp: 8, maxHp: 8, attack: 2, defense: 0,
  speed: 6, alive: true, blocksMove: true,
  faction: "enemy", tick: 0,

  spriteMap: {
    frameSize: { w: 32, h: 32 },
    layers: [
      // Layer 0: body (always visible)
      { tileId: 42, opacity: 1.0 },
      // Layer 1: weapon overlay, slightly above center
      { tileId: 55, offsetY: 0.1, opacity: 0.9 },
    ],
    angles: {
      // When viewed from behind, swap to back-facing tiles
      S: [
        { layerIndex: 0, tileId: 43 },
        { layerIndex: 1, tileId: 56 },
      ],
      SW: [{ layerIndex: 0, tileId: 44 }],
      SE: [{ layerIndex: 0, tileId: 44 }],
    },
  },
};

game.turns.addActor(goblin);
```

---

## New Example: `examples/billboard-sprites/`

A self-contained HTML+JS example (no bundler) demonstrating:

1. A single-room dungeon with three enemy actors, each using a `spriteMap`.
2. A two-layer goblin (body + weapon overlay).
3. A four-angle skeleton (front/back/left/right tiles differ).
4. The player walks around and the sprites always face the camera with the correct angle variant.
5. Code comments explain each `spriteMap` field.

Files:
```
examples/billboard-sprites/
  index.html
  billboard-sprites.js   ← game setup and spriteMap definitions
  README.md
```

---

## File Summary

| Action | File |
|--------|------|
| New    | `src/lib/rendering/billboardSprites.ts` |
| Modify | `src/lib/rendering/dungeonRenderer.ts` |
| Modify | `src/lib/entities/types.ts` |
| New    | `examples/billboard-sprites/index.html` |
| New    | `examples/billboard-sprites/billboard-sprites.js` |

---

## Extensibility Notes

### Adding animation (v2)

Each `SpriteLayer` already has a commented `animation` field stub. Enabling it would require:
- A per-layer frame timer tracked inside `BillboardHandle`.
- `updateBillboard()` already runs each RAF frame, so frame advancement fits naturally.
- No API-breaking change: layers without `animation` behave as today.

### Adding more angles

`AngleKey` is a string union; adding `"NNE"` etc. requires only expanding the type and the
sector calculation divisor. Existing `spriteMap` definitions are unaffected.

### Separate atlas per sprite

If sprites need their own atlas (not the dungeon tile atlas), `SpriteMap` can gain an optional
`atlasUrl?: string`. The billboard material factory would load and cache textures keyed by URL.
This is a one-field addition with no ripple to existing consumers.
