// vite.config.server.ts
//
// Builds a Node-compatible dungeon module for the multiplayer server.
// 'three' is aliased to a minimal shim (no GPU, no browser context required).
// Output: dist/server/dungeon.js  (ESM, importable by src/server/index.js)

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      three: resolve(__dirname, 'src/server/three-shim.js'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/server/dungeon-entry.ts'),
      fileName: 'dungeon',
      formats: ['es'],
    },
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      // Bundle the shim + bsp — no external deps needed in Node
      external: [],
    },
    sourcemap: true,
    minify: false,
  },
})
