/**
 * camera.ts
 *
 * Plain (non-React) camera factories for first-person dungeon navigation.
 *
 * `createCamera`     - Analog first-person camera with wall-sliding collision.
 *                      Moves continuously while keys are held (WASD / arrows).
 *
 * `createEotBCamera` - Grid-locked camera with lerp animation, matching the
 *                      Eye of the Beholder style (one cell per key press, 90°
 *                      turns). Accepts configurable keybindings.
 *
 * Both factories set up their own DOM event listeners and expose an `update`
 * method to be called each animation frame. Call `destroy()` to remove
 * listeners when the camera is no longer needed.
 */
export type CameraState = {
    x: number;
    z: number;
    yaw: number;
};
export type CameraOptions = {
    solidData: Uint8Array | null;
    /** When provided, IS_WALKABLE flags drive movement collision instead of solidData. */
    colliderFlagsData?: Uint8Array | null;
    width: number;
    height: number;
    startX: number;
    startZ: number;
    /** Field of view in degrees (informational; passed through to config). */
    fov?: number;
    /** Move lerp duration ms (informational; not used by this camera style). */
    moveLerpMs?: number;
    /** World units per grid cell. Default: 3. */
    tileSize?: number;
    /** Element to attach mouse drag listeners to. Defaults to `window`. */
    element?: HTMLElement;
};
export type Camera = {
    getState(): CameraState;
    /** Call once per frame; dt is elapsed seconds. */
    update(dt: number): void;
    setSolidData(data: Uint8Array, width: number, height: number): void;
    setColliderFlagsData(data: Uint8Array, width: number, height: number): void;
    /** Remove DOM event listeners. */
    destroy(): void;
};
/**
 * Create an analog first-person camera with wall-sliding collision.
 * Moves continuously while keys are held (WASD / arrows). Call `update(dt)` each frame.
 */
export declare function createCamera(options: CameraOptions): Camera;
export type EotBKeybindings = {
    moveForward: string[];
    moveBackward: string[];
    strafeLeft: string[];
    strafeRight: string[];
    turnLeft: string[];
    turnRight: string[];
    [key: string]: string[];
};
export type EotBCameraOptions = {
    solidData: Uint8Array | null;
    /** When provided, IS_WALKABLE flags drive movement collision instead of solidData. */
    colliderFlagsData?: Uint8Array | null;
    width: number;
    height: number;
    startX: number;
    startZ: number;
    keybindings: EotBKeybindings;
    startYaw?: number;
    /** Animation lerp duration in ms. Default: 150. */
    moveLerpMs?: number;
    /** Field of view in degrees (informational). */
    fov?: number;
    /** World units per grid cell (informational). Default: 3. */
    tileSize?: number;
    blocked?: boolean;
    canPhaseWalls?: boolean;
    blockedPositions?: {
        x: number;
        z: number;
    }[];
    onStep?: () => void;
    onRotation?: () => void;
    onBlockedMove?: (dx: number, dz: number) => void;
};
export type MoveActions = {
    moveForward(): void;
    moveBackward(): void;
    strafeLeft(): void;
    strafeRight(): void;
    turnLeft(): void;
    turnRight(): void;
};
export type EotBCamera = {
    getState(): CameraState;
    /** Lerp-interpolated visual state; also the value from getState() */
    logicalState: CameraState;
    /** Call once per frame with the current timestamp (e.g. from requestAnimationFrame). */
    update(timestamp: number): void;
    moveActions: MoveActions;
    /** Programmatically move by (dx, dz) world units, with lerp animation. */
    doMove(dx: number, dz: number): void;
    setSolidData(data: Uint8Array, width: number, height: number): void;
    setColliderFlagsData(data: Uint8Array, width: number, height: number): void;
    setBlocked(blocked: boolean): void;
    setBlockedPositions(positions: {
        x: number;
        z: number;
    }[]): void;
    /** Remove DOM event listeners. */
    destroy(): void;
};
/**
 * Create a grid-locked Eye of the Beholder style camera.
 * Moves one cell per key press with lerp animation and configurable keybindings.
 * Call `update(timestamp)` each frame with the value from `requestAnimationFrame`.
 */
export declare function createEotBCamera(options: EotBCameraOptions): EotBCamera;
//# sourceMappingURL=camera.d.ts.map