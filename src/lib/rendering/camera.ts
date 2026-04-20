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

import { isWalkableCell } from "../dungeon/colliderFlags";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type CameraState = {
  x: number;
  z: number;
  yaw: number;
};

// ---------------------------------------------------------------------------
// createCamera — analog first-person with wall-sliding
// ---------------------------------------------------------------------------

const MOVE_SPEED = 4.0;       // world units per second
const TURN_SPEED = 2.2;       // radians per second (keyboard)
const MOUSE_SENSITIVITY = 0.003; // radians per pixel
const MARGIN = 0.25;           // collision margin (world units)

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

function cellPassable(
  wx: number,
  wz: number,
  solidData: Uint8Array | null,
  colliderFlagsData: Uint8Array | null,
  width: number,
  height: number,
): boolean {
  const cx = Math.floor(wx);
  const cz = Math.floor(wz);
  if (cx < 0 || cz < 0 || cx >= width || cz >= height) return false;
  if (colliderFlagsData) {
    return isWalkableCell(colliderFlagsData[cz * width + cx] ?? 0x02);
  }
  return (solidData?.[cz * width + cx] ?? 1) === 0;
}

function canOccupy(
  wx: number,
  wz: number,
  solidData: Uint8Array | null,
  colliderFlagsData: Uint8Array | null,
  width: number,
  height: number,
): boolean {
  return (
    cellPassable(wx - MARGIN, wz - MARGIN, solidData, colliderFlagsData, width, height) &&
    cellPassable(wx + MARGIN, wz - MARGIN, solidData, colliderFlagsData, width, height) &&
    cellPassable(wx - MARGIN, wz + MARGIN, solidData, colliderFlagsData, width, height) &&
    cellPassable(wx + MARGIN, wz + MARGIN, solidData, colliderFlagsData, width, height)
  );
}

function tryMove(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  solidData: Uint8Array | null,
  colliderFlagsData: Uint8Array | null,
  width: number,
  height: number,
): { x: number; z: number } {
  const nx = ox + dx;
  const nz = oz + dz;
  if (canOccupy(nx, nz, solidData, colliderFlagsData, width, height)) return { x: nx, z: nz };
  if (canOccupy(nx, oz, solidData, colliderFlagsData, width, height)) return { x: nx, z: oz };
  if (canOccupy(ox, nz, solidData, colliderFlagsData, width, height)) return { x: ox, z: nz };
  return { x: ox, z: oz };
}

/**
 * Create an analog first-person camera with wall-sliding collision.
 * Moves continuously while keys are held (WASD / arrows). Call `update(dt)` each frame.
 */
export function createCamera(options: CameraOptions): Camera {
  let { solidData, width, height } = options;
  let colliderFlagsData = options.colliderFlagsData ?? null;
  let state: CameraState = { x: options.startX, z: options.startZ, yaw: 0 };

  const keys = new Set<string>();
  let dragging = false;

  const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onMouseDown = () => { dragging = true; };
  const onMouseUp = () => { dragging = false; };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    state = { ...state, yaw: state.yaw - e.movementX * MOUSE_SENSITIVITY };
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const el = options.element ?? window;
  el.addEventListener("mousedown", onMouseDown as EventListener);
  window.addEventListener("mouseup", onMouseUp);
  el.addEventListener("mousemove", onMouseMove as EventListener);

  return {
    getState() {
      return state;
    },

    update(dt: number) {
      const solid = solidData;
      if (!solid) return;

      const { x, z, yaw } = state;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      let moveX = 0;
      let moveZ = 0;
      let turnDelta = 0;

      if (keys.has("KeyW") || keys.has("ArrowUp")) { moveX += fwdX; moveZ += fwdZ; }
      if (keys.has("KeyS") || keys.has("ArrowDown")) { moveX -= fwdX; moveZ -= fwdZ; }
      if (keys.has("KeyA")) { moveX -= rightX; moveZ -= rightZ; }
      if (keys.has("KeyD")) { moveX += rightX; moveZ += rightZ; }
      if (keys.has("ArrowLeft") || keys.has("KeyQ")) turnDelta -= TURN_SPEED * dt;
      if (keys.has("ArrowRight") || keys.has("KeyE")) turnDelta += TURN_SPEED * dt;

      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0) {
        moveX = (moveX / len) * MOVE_SPEED * dt;
        moveZ = (moveZ / len) * MOVE_SPEED * dt;
      }

      if (moveX !== 0 || moveZ !== 0 || turnDelta !== 0) {
        const { x: nx, z: nz } = tryMove(x, z, moveX, moveZ, solid, colliderFlagsData, width, height);
        state = { x: nx, z: nz, yaw: yaw + turnDelta };
      }
    },

    setSolidData(data: Uint8Array, w: number, h: number) {
      solidData = data;
      width = w;
      height = h;
      state = { x: options.startX, z: options.startZ, yaw: 0 };
    },

    setColliderFlagsData(data: Uint8Array, w: number, h: number) {
      colliderFlagsData = data;
      width = w;
      height = h;
    },

    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("mousedown", onMouseDown as EventListener);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove as EventListener);
    },
  };
}

// ---------------------------------------------------------------------------
// createEotBCamera — grid-locked movement with lerp animation
// ---------------------------------------------------------------------------

const DEFAULT_LERP_MS = 150;

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
  blockedPositions?: { x: number; z: number }[];
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
  setBlockedPositions(positions: { x: number; z: number }[]): void;
  /** Remove DOM event listeners. */
  destroy(): void;
};

/**
 * Create a grid-locked Eye of the Beholder style camera.
 * Moves one cell per key press with lerp animation and configurable keybindings.
 * Call `update(timestamp)` each frame with the value from `requestAnimationFrame`.
 */
export function createEotBCamera(options: EotBCameraOptions): EotBCamera {
  const lerpMs = options.moveLerpMs ?? DEFAULT_LERP_MS;
  const startYaw = options.startYaw ?? 0;

  let solidData = options.solidData;
  let colliderFlagsData = options.colliderFlagsData ?? null;
  let width = options.width;
  let height = options.height;
  let blocked = options.blocked ?? false;
  let canPhaseWalls = options.canPhaseWalls ?? false;
  let blockedPositions = options.blockedPositions ?? [];

  let logical: CameraState = { x: options.startX, z: options.startZ, yaw: startYaw };
  let visual: CameraState = { ...logical };

  const anim = {
    fromX: logical.x,
    fromZ: logical.z,
    fromYaw: logical.yaw,
    toX: logical.x,
    toZ: logical.z,
    toYaw: logical.yaw,
    startTime: 0,
    animating: false,
  };

  function walkable(cx: number, cz: number): boolean {
    if (cx < 0 || cz < 0 || cx >= width || cz >= height) return false;
    if (canPhaseWalls) return true;
    if (colliderFlagsData) {
      if (!isWalkableCell(colliderFlagsData[cz * width + cx] ?? 0x02)) return false;
    } else {
      if (!solidData) return false;
      if (solidData[cz * width + cx] !== 0) return false;
    }
    return !blockedPositions.some((p) => p.x === cx && p.z === cz);
  }

  function beginAnim(toX: number, toZ: number, toYaw: number, isMove: boolean) {
    anim.fromX = logical.x;
    anim.fromZ = logical.z;
    anim.fromYaw = logical.yaw;
    anim.toX = toX;
    anim.toZ = toZ;
    anim.toYaw = toYaw;
    anim.startTime = performance.now();
    anim.animating = true;
    logical = { x: toX, z: toZ, yaw: toYaw };
    if (isMove) options.onStep?.();
  }

  function guard() {
    return blocked || anim.animating;
  }

  const moveActions: MoveActions = {
    moveForward() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      const fdx = Math.round(-Math.sin(yaw));
      const fdz = Math.round(-Math.cos(yaw));
      const gx = Math.floor(x), gz = Math.floor(z);
      const ngx = gx + fdx, ngz = gz + fdz;
      if (walkable(ngx, ngz)) beginAnim(ngx + 0.5, ngz + 0.5, yaw, true);
      else options.onBlockedMove?.(fdx, fdz);
    },
    moveBackward() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      const fdx = Math.round(-Math.sin(yaw));
      const fdz = Math.round(-Math.cos(yaw));
      const gx = Math.floor(x), gz = Math.floor(z);
      const ngx = gx - fdx, ngz = gz - fdz;
      if (walkable(ngx, ngz)) beginAnim(ngx + 0.5, ngz + 0.5, yaw, true);
      else options.onBlockedMove?.(-fdx, -fdz);
    },
    strafeLeft() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      const fdx = Math.round(-Math.sin(yaw));
      const fdz = Math.round(-Math.cos(yaw));
      const gx = Math.floor(x), gz = Math.floor(z);
      const sgx = gx + fdz, sgz = gz - fdx;
      if (walkable(sgx, sgz)) beginAnim(sgx + 0.5, sgz + 0.5, yaw, true);
    },
    strafeRight() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      const fdx = Math.round(-Math.sin(yaw));
      const fdz = Math.round(-Math.cos(yaw));
      const gx = Math.floor(x), gz = Math.floor(z);
      const sgx = gx - fdz, sgz = gz + fdx;
      if (walkable(sgx, sgz)) beginAnim(sgx + 0.5, sgz + 0.5, yaw, true);
    },
    turnLeft() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      beginAnim(x, z, yaw + Math.PI / 2, false);
      options.onRotation?.();
    },
    turnRight() {
      if (guard()) return;
      const { x, z, yaw } = logical;
      beginAnim(x, z, yaw - Math.PI / 2, false);
      options.onRotation?.();
    },
  };

  // Keyboard bindings (plain DOM events, no hotkeys-js dependency)
  const boundKeys: Map<string, () => void> = new Map();

  function registerBindings(keybindings: EotBKeybindings) {
    const pairs: [string[], () => void][] = [
      [keybindings.moveForward,  () => moveActions.moveForward()],
      [keybindings.moveBackward, () => moveActions.moveBackward()],
      [keybindings.strafeLeft,   () => moveActions.strafeLeft()],
      [keybindings.strafeRight,  () => moveActions.strafeRight()],
      [keybindings.turnLeft,     () => moveActions.turnLeft()],
      [keybindings.turnRight,    () => moveActions.turnRight()],
    ];
    for (const [keys, action] of pairs) {
      for (const key of keys) {
        boundKeys.set(key, action);
      }
    }
  }

  registerBindings(options.keybindings);

  const onKeyDown = (e: KeyboardEvent) => {
    const action = boundKeys.get(e.code) ?? boundKeys.get(e.key);
    if (action) { e.preventDefault(); action(); }
  };

  window.addEventListener("keydown", onKeyDown);

  const camera: EotBCamera = {
    get logicalState() { return logical; },

    getState() { return visual; },

    update(timestamp: number) {
      if (!anim.animating) return;
      const t = Math.min((timestamp - anim.startTime) / lerpMs, 1);
      const s = t * t * (3 - 2 * t); // smoothstep
      visual = {
        x: anim.fromX + (anim.toX - anim.fromX) * s,
        z: anim.fromZ + (anim.toZ - anim.fromZ) * s,
        yaw: anim.fromYaw + (anim.toYaw - anim.fromYaw) * s,
      };
      if (t >= 1) anim.animating = false;
    },

    moveActions,

    doMove(dx: number, dz: number) {
      const { x, z, yaw } = logical;
      beginAnim(x + dx, z + dz, yaw, true);
    },

    setSolidData(data: Uint8Array, w: number, h: number) {
      solidData = data;
      width = w;
      height = h;
    },

    setColliderFlagsData(data: Uint8Array, w: number, h: number) {
      colliderFlagsData = data;
      width = w;
      height = h;
    },

    setBlocked(b: boolean) {
      blocked = b;
    },

    setBlockedPositions(positions: { x: number; z: number }[]) {
      blockedPositions = positions;
    },

    destroy() {
      window.removeEventListener("keydown", onKeyDown);
    },
  };

  return camera;
}
