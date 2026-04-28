// src/lib/dungeon/doors.ts

import { IS_BLOCKED } from './colliderFlags';

export type DoorCandidate = {
  x: number;
  z: number;
  dx: number;
  dz: number;
  yaw: number;
  /** Region ID of the room this opening leads into. */
  roomId: number;
  /** All threshold cells in this opening, sorted along the corridor axis. */
  groupCells: { x: number; z: number }[];
  /** Index into groupCells that is the chosen door position (median). */
  midIdx: number;
};

export type DoorRecord = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  /**
   * Key ID that locks/unlocks this door. -1 means the door is not lockable
   * by a key — only by scripted triggers.
   */
  keyId: number;
  /** Region ID of the room this door guards. */
  roomId: number;
  locked: boolean;
  open: boolean;
};

/**
 * Finds door candidate locations: one per corridor-to-room opening, centered
 * in the opening. Corridor cells are identified as solid=0 with regionId=0;
 * room cells as solid=0 with regionId!=0.
 */
export function findDoorCandidates(
  regionIdData: Uint8Array,
  solidData: Uint8Array,
  W: number,
  H: number,
): DoorCandidate[] {
  function isCorridor(x: number, z: number): boolean {
    if (x < 0 || z < 0 || x >= W || z >= H) return false;
    const i = z * W + x;
    return solidData[i] === 0 && regionIdData[i] === 0;
  }

  function isRoom(x: number, z: number): boolean {
    if (x < 0 || z < 0 || x >= W || z >= H) return false;
    const i = z * W + x;
    return solidData[i] === 0 && (regionIdData[i] ?? 0) !== 0;
  }

  const DIRS4: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  // Group threshold cells (corridor cells adjacent to a room cell) by opening.
  // Key: "{dx}_{dz}_{fixed}" where fixed is the coordinate along the opening line.
  const groups = new Map<
    string,
    { x: number; z: number; dx: number; dz: number; roomId: number }[]
  >();

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (!isCorridor(x, z)) continue;
      for (const [dx, dz] of DIRS4) {
        if (isRoom(x + dx, z + dz)) {
          // dx===0 means travel is vertical; fixed coord is z (the row).
          // dx!==0 means travel is horizontal; fixed coord is x (the column).
          const key = `${dx}_${dz}_${dx === 0 ? z : x}`;
          if (!groups.has(key)) groups.set(key, []);
          const adjRoomId = regionIdData[(z + dz) * W + (x + dx)] ?? 0;
          groups.get(key)!.push({ x, z, dx, dz, roomId: adjRoomId });
          break;
        }
      }
    }
  }

  const candidates: DoorCandidate[] = [];

  for (const cells of groups.values()) {
    if (cells.length === 0) continue;
    const first = cells[0]!;
    const { dx, dz } = first;
    // Sort along the axis perpendicular to travel so the median gives the centre.
    cells.sort((a, b) => (dx === 0 ? a.x - b.x : a.z - b.z));
    const midIdx = Math.floor(cells.length / 2);
    const mid = cells[midIdx]!;

    candidates.push({
      x: mid.x,
      z: mid.z,
      dx,
      dz,
      yaw: dx === 0 ? 0 : Math.PI / 2,
      roomId: mid.roomId,
      groupCells: cells.map((c) => ({ x: c.x, z: c.z })),
      midIdx,
    });
  }

  return candidates;
}

/**
 * Walls off all non-door cells in a door opening group plus the two flanking
 * corridor cells beside the door. Modifies solidData and colliderFlagsData
 * in-place; the caller is responsible for marking textures as needsUpdate.
 */
export function wallOffDoorGroup(
  candidate: DoorCandidate,
  solidData: Uint8Array,
  colliderFlagsData: Uint8Array,
  regionIdData: Uint8Array,
  W: number,
  H: number,
): void {
  const { x: doorX, z: doorZ, dx, dz, groupCells, midIdx } = candidate;

  // Wall off the non-door cells in the opening group.
  for (let i = 0; i < groupCells.length; i++) {
    if (i === midIdx) continue;
    const cell = groupCells[i]!;
    const idx = cell.z * W + cell.x;
    solidData[idx] = 1;
    colliderFlagsData[idx] = IS_BLOCKED;
  }


  // Wall off the two flanking corridor cells perpendicular to the door direction.
  // Perpendicular offsets from (dx, dz) are (-dz, dx) and (dz, -dx).
  for (const [fx, fz] of [
    [doorX - dz, doorZ + dx],
    [doorX + dz, doorZ - dx],
  ] as [number, number][]) {
    if (fx < 0 || fz < 0 || fx >= W || fz >= H) continue;
    const fi = fz * W + fx;
    if (solidData[fi] === 0 && (regionIdData[fi] ?? 0) === 0) {
      solidData[fi] = 1;
      colliderFlagsData[fi] = IS_BLOCKED;
    }
  }
}
