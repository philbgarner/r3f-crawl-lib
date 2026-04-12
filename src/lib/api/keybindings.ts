// src/lib/api/keybindings.ts
//
// Keybindings helper — maps key strings to named action tokens and dispatches
// to a developer-supplied onAction callback.
//
// Migrated from libold/src/hooks/useEotBCamera.ts (MoveActions) and the
// key-handler in useGameState.ts.  No React dependency — pure DOM events.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Maps action name → array of key strings (e.g. KeyboardEvent.key values). */
export type KeyBindings = Record<string, string[]>;

export type KeybindingsOptions = {
  /** Action → key(s) map. Key strings match `KeyboardEvent.key`. */
  bindings: KeyBindings;
  /**
   * Called when a bound key is pressed.
   * @param action  The action name from `bindings`.
   * @param event   The raw KeyboardEvent.
   */
  onAction(action: string, event: KeyboardEvent): void;
};

/** Handle returned by `createKeybindings`; call `destroy()` to remove the listener. */
export type KeybindingsHandle = {
  destroy(): void;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Install a `keydown` listener on `document` that maps key presses to
 * named actions using `options.bindings`.
 *
 * Returns a handle with a `destroy()` method that removes the listener.
 */
export function createKeybindings(options: KeybindingsOptions): KeybindingsHandle {
  // Invert bindings: key string → action name
  const keyToAction = new Map<string, string>();
  for (const [action, keys] of Object.entries(options.bindings)) {
    for (const key of keys) {
      keyToAction.set(key, action);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    const action = keyToAction.get(event.key);
    if (action !== undefined) {
      options.onAction(action, event);
    }
  }

  document.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      document.removeEventListener("keydown", handleKeydown);
    },
  };
}
