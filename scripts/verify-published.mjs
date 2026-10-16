/**
 * 发布后回归验证：对「已从 npm 安装到临时目录」的包做产物与解析校验。
 *
 * 设计说明：全程不派生任何子进程（createRequire + 动态 import），
 * 因此在受限沙箱里也能跑。ESM 侧通过一个中转模块来真实触发 exports 映射解析。
 *
 * 用法：
 *   1. 先准备临时目录并安装（受沙箱限制时需手动执行）：
 *      V=<临时目录>; cd $V && npm install free-watermark@<版本> vue@3
 *   2. node scripts/verify-published.mjs <版本> [--fresh] [--keep]
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const local = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = process.argv[2] || local.version
const workDir = join(tmpdir(), `fw-verify-${version}`)

const results = []
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail })

console.log(`验证 free-watermark@${version}`)
console.log(`工作目录 ${workDir}\n`)

if (process.argv.includes('--fresh')) rmSync(workDir, { recursive: true, force: true })
mkdirSync(workDir, { recursive: true })

const pkgDir = join(workDir, 'node_modules', 'free-watermark')
if (!existsSync(join(pkgDir, 'package.json'))) {
  console.error('未检测到已安装的包。请先执行：')
  console.error(`  cd "${workDir}"`)
  console.error(`  npm install free-watermark@${version} vue@3 --registry=https://registry.npmjs.org`)
  process.exit(1)
}

const installed = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))

// ---------- 1. 元数据 ----------
check('安装版本号与目标一致', installed.version === version, `实际 ${installed.version}`)
check('license 为 MIT', installed.license === 'MIT', String(installed.license))
check('无运行时依赖', !installed.dependencies, JSON.stringify(installed.dependencies))
check(
  'vue 为可选 peerDependency',
  installed.peerDependencies?.vue === '^3.0.0' && installed.peerDependenciesMeta?.vue?.optional === true,
)
check('engines 声明 node>=16', installed.engines?.node === '>=16', String(installed.engines?.node))

// ---------- 2. 产物文件 ----------
const expectedFiles = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'dist/vue/index.js',
  'dist/vue/index.cjs',
  'dist/vue/index.d.ts',
  'dist/vue/index.d.cts',
  'dist/watermark.global.js',
  'README.md',
  'LICENSE',
]
for (const file of expectedFiles) {
  check(`产物存在 ${file}`, existsSync(join(pkgDir, file)))
}

// ---------- 3. exports 映射指向的文件都要真实存在 ----------
const readTarget = (entry, condition) => installed.exports?.[entry]?.[condition]
for (const [entry, label] of [
  ['.', '主入口'],
  ['./vue', 'Vue 子入口'],
]) {
  for (const cond of ['import', 'require']) {
    const target = readTarget(entry, cond)
    check(
      `${label} exports["${cond}"] 指向的文件存在`,
      target?.default && existsSync(join(pkgDir, target.default)),
      target?.default,
    )
    check(
      `${label} exports["${cond}"] 类型声明存在`,
      target?.types && existsSync(join(pkgDir, target.types)),
      target?.types,
    )
  }
}

// ---------- 4. CJS 条件真实解析并执行 ----------
const requireFromWork = createRequire(join(workDir, '__resolve.cjs'))
let coreCjs
let vueCjs
try {
  coreCjs = requireFromWork('free-watermark')
  vueCjs = requireFromWork('free-watermark/vue')
  check('CJS 主入口可 require', typeof coreCjs.createWatermark === 'function')
  check('CJS 主入口导出 Watermark 类', typeof coreCjs.Watermark === 'function')
  check('CJS 主入口导出 destroyAll', typeof coreCjs.destroyAll === 'function')
  check('CJS Vue 子入口可 require', typeof vueCjs.vWatermark === 'object')
  check('CJS Vue 子入口带 install', typeof vueCjs.FreeWatermarkVue.install === 'function')
} catch (error) {
  check('CJS 入口可 require', false, error.message)
}

// ---------- 5. ESM 条件真实解析（经由中转模块触发 exports 映射）----------
const probeFile = join(workDir, 'esm-probe.mjs')
writeFileSync(
  probeFile,
  `export * from 'free-watermark'\nexport * as vueEntry from 'free-watermark/vue'\n`,
)
let esm
try {
  esm = await import(pathToFileURL(probeFile).href)
  check('ESM 主入口可按包名解析', typeof esm.createWatermark === 'function')
  check('ESM 主入口导出 Watermark 类', typeof esm.Watermark === 'function')
  check('ESM Vue 子入口可按包名解析', typeof esm.vueEntry?.vWatermark === 'object')
  check('ESM Vue 子入口导出组件', typeof esm.vueEntry?.WatermarkComponent === 'object')
  check('ESM Vue 子入口透出核心 API', typeof esm.vueEntry?.createWatermark === 'function')
} catch (error) {
  check('ESM 入口可按包名解析', false, error.message)
}

// ---------- 6. 运行时行为 ----------
check('VERSION 与发布版本一致', esm?.VERSION === version, `包内 ${esm?.VERSION}`)
check('默认 rotate 为 -22', esm?.DEFAULT_OPTIONS?.rotate === -22, String(esm?.DEFAULT_OPTIONS?.rotate))
check('默认 opacity 为 0.15', esm?.DEFAULT_OPTIONS?.opacity === 0.15, String(esm?.DEFAULT_OPTIONS?.opacity))
check('默认 gap 为 [100,100]', JSON.stringify(esm?.DEFAULT_OPTIONS?.gap) === '[100,100]')

let nodeError = ''
try {
  esm.createWatermark({ content: 'x' })
} catch (error) {
  nodeError = error.message
}
check('非浏览器环境抛出可读错误', /浏览器环境/.test(nodeError), nodeError)

// 核心类不应与 Vue 子入口的组件重名冲突
check('Vue 子入口未覆盖核心 Watermark 类', typeof esm?.Watermark === 'function')

// ---------- 7. IIFE 与类型声明 ----------
const iife = readFileSync(join(pkgDir, 'dist/watermark.global.js'), 'utf8')
check('IIFE 暴露 FreeWatermark 全局', /FreeWatermark/.test(iife), `${(iife.length / 1024).toFixed(1)} KB`)
check('IIFE 为压缩产物', iife.split('\n').length < 30, `${iife.split('\n').length} 行`)

const dts = readFileSync(join(pkgDir, 'dist/index.d.ts'), 'utf8')
check('类型声明含 WatermarkOptions', /WatermarkOptions/.test(dts))
check('类型声明含 createWatermark', /createWatermark/.test(dts))
check('类型声明含 Watermark 类', /declare class Watermark/.test(dts))

const vueDts = readFileSync(join(pkgDir, 'dist/vue/index.d.ts'), 'utf8')
check('Vue 类型声明含指令定义', /vWatermark/.test(vueDts))

// ---------- 输出 ----------
console.log('')
let failed = 0
for (const r of results) {
  if (!r.ok) failed += 1
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}${r.detail ? `  -> ${r.detail}` : ''}`)
}
console.log(`\n${failed === 0 ? '发布产物验证全部通过' : `${failed} 项未通过`}（${results.length - failed}/${results.length}）`)

if (!process.argv.includes('--keep')) rmSync(workDir, { recursive: true, force: true })
process.exit(failed === 0 ? 0 : 1)
