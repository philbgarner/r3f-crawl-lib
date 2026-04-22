import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import pkg from './package.json'

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    dts({
      include: ['src/lib'],
      outDir: 'dist',
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'AtomicCore',
      fileName: 'atomic-core',
      formats: ['es', 'umd', 'iife'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          three: 'THREE',
          '@react-three/fiber': 'ReactThreeFiber',
          '@react-three/drei': 'Drei',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
})
