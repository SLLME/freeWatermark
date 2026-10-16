/**
 * 构建产物冒烟测试：校验 ESM / CJS / Vue 子入口是否可正常加载。
 * 用法：node scripts/smoke.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const esm = await import(new URL(`file://${resolve(root, 'dist/index.js').replace(/\\/g, '/')}`).href)
const vueEsm = await import(new URL(`file://${resolve(root, 'dist/vue/index.js').replace(/\\/g, '/')}`).href)
const cjs = require(resolve(root, 'dist/index.cjs'))
const vueCjs = require(resolve(root, 'dist/vue/index.cjs'))

const checks = [
  ['ESM 入口导出 createWatermark', typeof esm.createWatermark === 'function'],
  ['ESM 入口导出 Watermark 类', typeof esm.Watermark === 'function'],
  ['ESM 入口导出 destroyAll', typeof esm.destroyAll === 'function'],
  ['CJS 入口导出 createWatermark', typeof cjs.createWatermark === 'function'],
  ['Vue 子入口导出 vWatermark', typeof vueEsm.vWatermark === 'object'],
  ['Vue 子入口导出 WatermarkComponent', typeof vueEsm.WatermarkComponent === 'object'],
  ['Vue 子入口带 install 方法', typeof vueEsm.FreeWatermarkVue.install === 'function'],
  ['Vue 子入口可 CJS require', typeof vueCjs.vWatermark === 'object'],
  ['Vue 子入口透出核心 API', typeof vueEsm.createWatermark === 'function'],
  ['VERSION 一致', esm.VERSION === cjs.VERSION && /^\d+\.\d+\.\d+/.test(esm.VERSION)],
  ['默认配置 rotate 为 -22', esm.DEFAULT_OPTIONS.rotate === -22],
  ['默认配置 opacity 为 0.15', esm.DEFAULT_OPTIONS.opacity === 0.15],
  ['默认配置 gap 为 [100,100]', JSON.stringify(esm.DEFAULT_OPTIONS.gap) === '[100,100]'],
  ['setDefaults 可修改全局默认值', (() => {
    esm.setDefaults({ opacity: 0.3 })
    const ok = esm.getDefaults().opacity === 0.3
    esm.setDefaults({ opacity: 0.15 })
    return ok
  })()],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}`)
  if (!ok) failed += 1
}

// 非浏览器环境应当给出明确报错，而不是崩溃
try {
  esm.createWatermark({ content: 'test' })
  console.log(' FAIL  非浏览器环境应抛出错误')
  failed += 1
} catch (error) {
  const ok = /浏览器环境/.test(error.message)
  console.log(`${ok ? '  ok  ' : ' FAIL '} 非浏览器环境抛出可读错误：${error.message}`)
  if (!ok) failed += 1
}

console.log(`\n${failed === 0 ? '全部通过' : `${failed} 项失败`}（共 ${checks.length + 1} 项）`)
process.exit(failed === 0 ? 0 : 1)
