import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'vue/index': 'src/vue/index.ts',
    },
    outDir: 'dist',
    format: ['esm', 'cjs'],
    target: 'es2018',
    platform: 'browser',
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    external: ['vue'],
  },
  {
    entry: { watermark: 'src/index.ts' },
    outDir: 'dist',
    format: ['iife'],
    globalName: 'FreeWatermark',
    target: 'es2018',
    platform: 'browser',
    dts: false,
    sourcemap: false,
    clean: false,
    minify: true,
  },
])
