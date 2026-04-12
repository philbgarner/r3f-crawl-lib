import { TurnAction } from './types';
/** Base time unit. A speed-1 actor costs BASE_TIME per turn; speed-10 costs BASE_TIME/10. */
export declare const BASE_TIME = 100;
/**
 * Compute the scheduler delay for an actor with the given speed performing the given action.
 * Faster actors (higher speed) get smaller delays.
 */
export declare function actionDelay(speed: number, action: TurnAction): number;
export declare function clamp(min: number, max: number, value: number): number;
//# sourceMappingURL=actionCosts.d.ts.map