// src/lib/missions/missionSystem.ts
//
// Core mission system. createMissionSystem() returns a MissionsHandle that
// exposes the public API (add/remove/get/list) plus an internal _tick() method
// that createGame() calls once per turn to evaluate active missions.
//
// On completion:
//   1. Mission status transitions to 'complete' and completedAt is set.
//   2. The 'mission-complete' event is emitted on the game event emitter.
//   3. onComplete() is called synchronously if provided.
//   4. If a transport is present and supports sendMissionComplete(), it sends
//      the notification to the server for broadcast to other connected clients.

import type { EventEmitter } from '../events/eventEmitter';
import type { ActionTransport } from '../transport/types';
import type {
  Mission,
  MissionContext,
  MissionDef,
  MissionsHandle,
} from './types';

// ---------------------------------------------------------------------------
// Internal mutable record
// ---------------------------------------------------------------------------

type MissionRecord = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'complete' | 'failed';
  completedAt: number | undefined;
  metadata: Record<string, unknown>;
  evaluator: MissionDef['evaluator'];
  onComplete: MissionDef['onComplete'];
};

function recordToPublic(r: MissionRecord): Mission {
  // Return the record itself cast as Mission — the fields match and metadata is
  // intentionally mutable so evaluators can write to it via ctx.mission.metadata.
  return r as Mission;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMissionSystem(
  events: EventEmitter,
  transport: ActionTransport | undefined,
): MissionsHandle {
  const records = new Map<string, MissionRecord>();

  function completeRecord(record: MissionRecord, turn: number): void {
    record.status = 'complete';
    record.completedAt = turn;

    // 1. Emit local event
    events.emit('mission-complete', {
      missionId: record.id,
      name: record.name,
      turn,
      metadata: record.metadata,
    });

    // 2. Run onComplete callback
    record.onComplete?.(recordToPublic(record));

    // 3. Notify other connected players via transport (multiplayer only)
    transport?.sendMissionComplete?.(record.id, record.name);
  }

  const handle: MissionsHandle = {
    add(def: MissionDef): void {
      if (records.has(def.id)) {
        // Silently replace — allows re-adding after a regenerate()
        records.delete(def.id);
      }
      records.set(def.id, {
        id: def.id,
        name: def.name,
        description: def.description ?? '',
        status: 'active',
        completedAt: undefined,
        metadata: def.metadata ? { ...def.metadata } : {},
        evaluator: def.evaluator,
        onComplete: def.onComplete,
      });
    },

    remove(id: string): void {
      records.delete(id);
    },

    get(id: string): Mission | undefined {
      const r = records.get(id);
      return r ? recordToPublic(r) : undefined;
    },

    get list(): Mission[] {
      return Array.from(records.values()).map(recordToPublic);
    },

    get active(): Mission[] {
      return Array.from(records.values())
        .filter((r) => r.status === 'active')
        .map(recordToPublic);
    },

    get completed(): Mission[] {
      return Array.from(records.values())
        .filter((r) => r.status === 'complete')
        .map(recordToPublic);
    },

    _tick(ctx: MissionContext): void {
      for (const record of records.values()) {
        if (record.status !== 'active') continue;

        // Pass the mutable record as the mission so the evaluator can write
        // to metadata across turns.
        const ctxWithRecord: MissionContext = { ...ctx, mission: record as Mission };

        let result = false;
        try {
          result = record.evaluator(ctxWithRecord);
        } catch (err) {
          console.warn(`[missions] Evaluator for "${record.id}" threw:`, err);
        }

        if (result) {
          completeRecord(record, ctx.turn);
        }
      }
    },
  };

  return handle;
}
