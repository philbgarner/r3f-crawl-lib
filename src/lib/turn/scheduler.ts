// src/lib/turn/scheduler.ts
//
// RogueBasin-style priority queue scheduler using absolute timestamps.
//
// Key design: store absolute timestamps (not relative delays) to avoid O(n)
// adjustment per tick. Lazy cancellation handles removal efficiently.
//
// Reference: https://roguebasin.com/index.php/A_priority_queue_based_turn_scheduling_system

import type { ActorId } from "./types";

// ---------------------------------------------------------------------------
// MinHeap (internal — not exported; Phase 3 BSP helpers provide their own)
// ---------------------------------------------------------------------------

class MinHeap<T> {
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
    const top = this._heap[0]!.value;
    const last = this._heap.pop()!;
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._heap[parent]!.priority <= this._heap[i]!.priority) break;
      const tmp = this._heap[parent]!;
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
      if (l < n && this._heap[l]!.priority < this._heap[smallest]!.priority) smallest = l;
      if (r < n && this._heap[r]!.priority < this._heap[smallest]!.priority) smallest = r;
      if (smallest === i) break;
      const tmp = this._heap[smallest]!;
      this._heap[smallest] = this._heap[i]!;
      this._heap[i] = tmp;
      i = smallest;
    }
  }
}

// ---------------------------------------------------------------------------
// TurnScheduler
// ---------------------------------------------------------------------------

type Scheduled = {
  actorId: ActorId;
  at: number;
  seq: number;
};

export class TurnScheduler {
  private heap: MinHeap<Scheduled> = new MinHeap();
  private now: number = 0;
  private seq: number = 0;
  private cancelled: Set<ActorId> = new Set();

  /** Schedule an actor to act at now + delay. */
  add(actorId: ActorId, delay: number): void {
    const at = this.now + delay;
    const seq = this.seq++;
    const priority = at + (seq % 1_000_000) / 1_000_000;
    this.heap.push(priority, { actorId, at, seq });
  }

  /** Lazily remove an actor from the schedule. */
  remove(actorId: ActorId): void {
    this.cancelled.add(actorId);
  }

  /** Re-add a cancelled actor (un-cancels it too). */
  restore(actorId: ActorId): void {
    this.cancelled.delete(actorId);
  }

  /**
   * Pop the next actor whose turn it is.
   * Advances now to the actor's scheduled time.
   * Returns null if the schedule is empty.
   */
  next(): { actorId: ActorId; now: number } | null {
    while (this.heap.size > 0) {
      const entry = this.heap.pop()!;
      if (this.cancelled.has(entry.actorId)) {
        this.cancelled.delete(entry.actorId);
        continue;
      }
      this.now = entry.at;
      return { actorId: entry.actorId, now: this.now };
    }
    return null;
  }

  /** Re-schedule an actor after it has acted. */
  reschedule(actorId: ActorId, delay: number): void {
    this.add(actorId, delay);
  }

  getNow(): number {
    return this.now;
  }

  get size(): number {
    return this.heap.size;
  }
}
