/**
 * 用 esbuild 把 Vue 演示打成离线可跑的单文件，方便直接双击 demo/vue-demo/index.html 查看。
 * 用法：npm run build:demo
 */
import { build } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [resolve(root, 'demo/vue-demo/main.js')],
  outfile: resolve(root, 'demo/vue-demo/bundle.js'),
  bundle: true,
  format: 'iife',
  target: 'es2018',
  platform: 'browser',
  minify: false,
  sourcemap: false,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  alias: {
    // 让演示代码使用真实的包名，同时指向本地构建产物
    'free-watermark/vue': resolve(root, 'dist/vue/index.js'),
    'free-watermark': resolve(root, 'dist/index.js'),
    // 需要运行时模板编译能力，改用带编译器的 Vue 构建
    vue: resolve(root, 'node_modules/vue/dist/vue.esm-bundler.js'),
  },
})
