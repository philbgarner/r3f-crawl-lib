// vite.config.server.ts
//
// Builds the multiplayer server as a single self-contained Node binary.
// 'three' and the dungeon source are aliased so Rolldown can resolve them
// without requiring a pre-built dist/server/dungeon.js.
// Output: dist/server/index.js

import { defineConfig } from 'vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

function shebangPlugin(): Plugin {
  return {
    name: 'shebang',
    renderChunk(code) {
      return { code: '#!/usr/bin/env node\n' + code, map: null }
    },
  }
}

export default defineConfig({
  resolve: {
    alias: [
      { find: '../../dist/server/dungeon.js', replacement: resolve(__dirname, 'src/server/dungeon-entry.ts') },
      { find: 'three', replacement: resolve(__dirname, 'src/server/three-shim.js') },
    ],
  },
  plugins: [shebangPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/server/index.js'),
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      external: ['express', 'ws', 'node:http', 'node:path', 'node:url', 'node:os'],
    },
    sourcemap: true,
    minify: false,
  },
})
