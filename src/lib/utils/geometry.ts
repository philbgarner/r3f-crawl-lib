// ---------------------------------------------------------------------------
// MinHeap<T>
// ---------------------------------------------------------------------------

/**
 * A minimal binary min-heap keyed on a numeric priority.
 * Used by A* as the open-set priority queue.
 */
export class MinHeap<T> {
  private _heap: Array<{ priority: number; value: T }> = [];

  get size(): number {
    return this._heap.length;
  }

  push(priority: number, value: T): void {
    this._heap.push({ priority, value });
    this._bubbleUp(this._heap.length - 1);
  }

  pop(): T | undefined {
    if (this._heap.length === 0) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const top = this._heap[0]!.value;
    const last = this._heap.pop()!;
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this._heap[0]?.value;
  }

  peekPriority(): number {
    return this._heap[0]?.priority ?? Infinity;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      // Both indices are within bounds by the heap invariant.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (this._heap[parent]!.priority <= this._heap[i]!.priority) break;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tmp = this._heap[parent]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._heap[parent] = this._heap[i]!;
      this._heap[i] = tmp;
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this._heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      // Bounds are checked by `l < n` / `r < n` before indexing.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (l < n && this._heap[l]!.priority < this._heap[smallest]!.priority) smallest = l;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (r < n && this._heap[r]!.priority < this._heap[smallest]!.priority) smallest = r;
      if (smallest === i) break;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tmp = this._heap[smallest]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._heap[smallest] = this._heap[i]!;
      this._heap[i] = tmp;
      i = smallest;
    }
  }
}

// ---------------------------------------------------------------------------
// Octile distance heuristic
// ---------------------------------------------------------------------------

/**
 * Octile distance heuristic for 8-directional grids.
 * Scaled to match integer movement costs: orthogonal=10, diagonal=14.
 */
export function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return 10 * (dx + dy) - 6 * Math.min(dx, dy);
}

// ---------------------------------------------------------------------------
// Line-of-sight (Bresenham)
// ---------------------------------------------------------------------------

/**
 * Returns true if (ax, az) can see (bx, bz) with no blocking tiles in between.
 * Checks all intermediate cells (not the endpoints) via `walkableFn`.
 */
export function hasLineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walkableFn: (x: number, z: number) => boolean,
): boolean {
  let x0 = ax, z0 = az;
  const x1 = bx, z1 = bz;
  const dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;
  while (true) {
    if (x0 === x1 && z0 === z1) return true;
    if (!walkableFn(x0, z0)) return false;
    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; x0 += sx; }
    if (e2 < dx)  { err += dx; z0 += sz; }
  }
}

// ---------------------------------------------------------------------------
// Cardinal direction from yaw angle
// ---------------------------------------------------------------------------

const _DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CardinalDir = typeof _DIRS[number];

/** Maps a yaw angle (radians) to the nearest 8-way compass direction. */
export function cardinalDir(yaw: number): CardinalDir {
  const norm = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.round((norm / (Math.PI * 2)) * 8) % 8;
  // idx is always 0–7; _DIRS has exactly 8 elements.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return _DIRS[idx]!;
}

// ---------------------------------------------------------------------------
// UV rect normalisation
// ---------------------------------------------------------------------------

/**
 * Converts a pixel-space UV rect `{x, y, w, h}` into the normalised
 * `[x, y, w, h]` tuple expected by billboard shaders (y=0 is bottom in GL).
 */
export function normalizeUvRect(
  rect: { x: number; y: number; w: number; h: number } | undefined | null,
  sheetW: number,
  sheetH: number,
): [number, number, number, number] | undefined {
  if (!rect) return undefined;
  return [
    rect.x / sheetW,
    1.0 - (rect.y + rect.h) / sheetH,
    rect.w / sheetW,
    rect.h / sheetH,
  ];
}
