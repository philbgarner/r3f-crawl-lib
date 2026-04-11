// src/lib/utils/minimap.ts
//
// Minimap state management.
// Tracks which cells the player has explored (persistent) and which are
// currently visible (updated each turn via computeFov).
//
// Rendering to a 2D canvas is handled by `attachMinimap` in Phase 9.

import type { BspDungeonOutputs, RoomInfo } from "../dungeon/bsp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MinimapState = {
  width: number;
  height: number;
  /** 1 = explored at some point; 0 = never seen. Persists across turns. */
  explored: Uint8Array;
  /** 1 = currently visible this turn; 0 = not visible. Reset each turn. */
  visible: Uint8Array;
};

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Build the initial minimap state for a new dungeon.
 * Pre-explores the start room (endRoomId), the first monster's room, and the
 * corridor path connecting them — matching the classic roguelike "you know
 * where you started" reveal.
 */
export function createMinimapState(dungeon: BspDungeonOutputs): MinimapState {
  const { width, height } = dungeon;
  const explored = buildInitialExploredMask(dungeon);
  return {
    width,
    height,
    explored,
    visible: new Uint8Array(width * height),
  };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Merge an FOV result into the minimap state (mutates in place).
 * Pass the visible mask produced by `computeFov` / `createVisibilityMask`.
 */
export function updateExplored(state: MinimapState, fovResult: Uint8Array): void {
  const n = state.explored.length;
  for (let i = 0; i < n; i++) {
    state.visible[i] = fovResult[i] ?? 0;
    if (fovResult[i]) state.explored[i] = 1;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildInitialExploredMask(dungeon: BspDungeonOutputs): Uint8Array {
  const { width, height, rooms, endRoomId, fullRegionIds } = dungeon;
  const mask = new Uint8Array(width * height);

  function markRegion(regionId: number): void {
    for (let i = 0; i < fullRegionIds.length; i++) {
      if (fullRegionIds[i] === regionId) mask[i] = 1;
    }
  }

  // Start room (kitchen / endRoomId)
  markRegion(endRoomId);

  // First monster room = first room (not endRoomId) of type "room" in insertion order
  let firstMobRoomId: number | null = null;
  for (const [roomId, room] of rooms) {
    if (roomId !== endRoomId && (room as RoomInfo).type === "room") {
      firstMobRoomId = roomId;
      break;
    }
  }

  if (firstMobRoomId !== null) {
    markRegion(firstMobRoomId);

    // Map each room ID to the corridor IDs that border it
    const roomToCorridors = new Map<number, number[]>();
    for (const [id, room] of rooms) {
      if ((room as RoomInfo).type !== "corridor") continue;
      for (const connRoomId of (room as RoomInfo).connections) {
        if (!roomToCorridors.has(connRoomId)) roomToCorridors.set(connRoomId, []);
        roomToCorridors.get(connRoomId)!.push(id);
      }
    }

    // BFS from endRoomId to firstMobRoomId; mark corridors on shortest path
    const visited = new Set<number>([endRoomId]);
    const queue: [number, number[]][] = [[endRoomId, []]];

    outer: while (queue.length > 0) {
      const [curRoom, corridorPath] = queue.shift()!;
      for (const corridorId of roomToCorridors.get(curRoom) ?? []) {
        const corridor = rooms.get(corridorId) as RoomInfo | undefined;
        if (!corridor) continue;
        for (const nextRoom of corridor.connections) {
          if (nextRoom === curRoom || visited.has(nextRoom)) continue;
          visited.add(nextRoom);
          const newPath = [...corridorPath, corridorId];
          if (nextRoom === firstMobRoomId) {
            for (const cid of newPath) markRegion(cid);
            break outer;
          }
          queue.push([nextRoom, newPath]);
        }
      }
    }
  }

  return mask;
}
