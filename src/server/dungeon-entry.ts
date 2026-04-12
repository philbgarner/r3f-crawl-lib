// src/server/dungeon-entry.ts
//
// Build entry point for the server-side dungeon module.
// Compiled by vite.config.server.ts with 'three' aliased to the shim so
// generateBspDungeon runs in Node without a real GPU or browser context.

export { generateBspDungeon } from '../lib/dungeon/bsp'
export type { BspDungeonOutputs, BspDungeonOptions, RoomInfo } from '../lib/dungeon/bsp'
