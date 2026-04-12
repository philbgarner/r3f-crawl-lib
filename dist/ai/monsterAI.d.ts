import { GridPos } from './astar';
import { DungeonOutputs } from '../dungeon/bsp';
import { ActorId } from '../turn/types';
import { TurnSystemState, DecideResult } from '../turn/system';
export type MonsterAlertConfig = {
    detectionRadius: number;
    giveUpTurns: number;
};
/**
 * Derive alert config from danger level.
 * danger 0  → detectionRadius 4,  giveUpTurns 3
 * danger 10 → detectionRadius 10, giveUpTurns 12
 */
export declare function monsterAlertConfig(danger: number): MonsterAlertConfig;
export declare function computeChasePathToPlayer(state: TurnSystemState, monsterId: ActorId, dungeon: DungeonOutputs, isWalkable: (x: number, y: number) => boolean, opts?: {
    maxSteps?: number;
}): GridPos[] | null;
/**
 * Decide what a monster does this turn.
 *
 * @param playerVisRadius  FOV radius used by the renderer (default 8).
 */
export declare function decideChasePlayer(state: TurnSystemState, monsterId: ActorId, dungeon: DungeonOutputs, isWalkable: (x: number, y: number) => boolean, isOpaque: (x: number, y: number) => boolean, playerVisRadius?: number, fourDir?: boolean): DecideResult;
//# sourceMappingURL=monsterAI.d.ts.map