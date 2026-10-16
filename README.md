# free-watermark

轻量、零运行时依赖的页面水印库。用 Canvas 生成可无缝平铺的水印贴图，挂在 Shadow DOM 里与页面样式彻底隔离，并用 MutationObserver 兜住「F12 删水印」这类操作。

- **零依赖**，压缩后约 12 KB（IIFE）
- **文字 / 图片 / 多行**水印，支持旋转、间距、透明度、颜色、平铺与居中两种排版
- **Shadow DOM 隔离**，页面全局样式无法影响水印，水印也不污染页面
- **防删除防篡改**，节点被删、背景被抹、宿主被隐藏都会自动还原
- **高清渲染**，自动适配 devicePixelRatio，打印时也能正常输出
- **完整类型**，TypeScript 编写，自带 `.d.ts`
- **多格式产物**，ESM / CJS / IIFE 三种入口，另有 Vue 3 指令与组件

## 安装

```bash
npm install free-watermark
```

Vue 用户请确保项目里有 `vue@^3.0.0`（作为可选 peer 依赖，不用 Vue 时不会安装）。

## 快速开始

### 原生

```ts
import { createWatermark } from 'free-watermark'

const watermark = createWatermark({
  content: '内部资料 禁止外传',
  color: '#000000',
  opacity: 0.15,
})

// 需要时更新配置
watermark.update({ content: '张三 · 2026-10-16' })

// 页面离开或组件卸载时销毁
watermark.destroy()
```

也可以直接用 `<script>` 引入，全局变量为 `FreeWatermark`：

```html
<script src="https://unpkg.com/free-watermark/dist/watermark.global.js"></script>
<script>
  FreeWatermark.createWatermark({ content: '内部资料' })
</script>
```

### Vue 3

```ts
import { createApp } from 'vue'
import FreeWatermarkVue from 'free-watermark/vue'

createApp(App).use(FreeWatermarkVue).mount('#app')
```

注册后可用指令或组件：

```html
<!-- 指令：水印挂在指令所在元素上 -->
<div v-watermark="{ content: '内部资料', color: '#165dff' }">
  <p>正文内容</p>
</div>

<!-- 指令也可以直接给字符串 -->
<div v-watermark="'禁止截图'">...</div>

<!-- 组件：把要保护的内容放进默认插槽 -->
<Watermark content="内部资料 禁止外传" :options="{ rotate: -18, gap: [120, 90] }">
  <p>正文内容</p>
</Watermark>
```

也可以只按需引入：

```ts
import { vWatermark, WatermarkComponent } from 'free-watermark/vue'

app.directive('watermark', vWatermark)
app.component('Watermark', WatermarkComponent)
```

## 配置项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `container` | `HTMLElement \| string` | `document.body` | 水印挂载容器，支持选择器字符串 |
| `content` | `string \| string[]` | `''` | 文字内容，数组或含 `\n` 的字符串会渲染成多行 |
| `image` | `string \| HTMLImageElement` | — | 图片水印，URL / Base64 / 图片元素；提供时优先按图片渲染 |
| `crossOrigin` | `string \| null` | `'anonymous'` | 加载远程图片时的 CORS 属性 |
| `width` | `number` | 图片原始宽度 | 图片显示宽度（px） |
| `height` | `number` | 按比例计算 | 图片显示高度（px） |
| `fontSize` | `number` | `16` | 字号（px） |
| `fontFamily` | `string` | 系统字体栈 | 字体 |
| `fontWeight` | `string \| number` | `'normal'` | 字重 |
| `fontStyle` | `'normal' \| 'italic' \| 'oblique'` | `'normal'` | 字体风格 |
| `color` | `string` | `'#000000'` | 颜色，支持 hex / rgb / rgba / 关键字 |
| `opacity` | `number` | `0.15` | 透明度 0~1 |
| `rotate` | `number` | `-22` | 旋转角度，正值为顺时针 |
| `gap` | `number \| [number, number]` | `[100, 100]` | 相邻水印的间距 [x, y] |
| `offset` | `number \| [number, number]` | `[0, 0]` | 水印整体偏移，对应 `background-position` |
| `lineHeight` | `number` | `1.5` | 多行文字行高倍数 |
| `mode` | `'tile' \| 'center'` | `'tile'` | 平铺，或居中显示单个 |
| `position` | `'absolute' \| 'fixed'` | `'absolute'` | 宿主定位方式，`fixed` 常用于让水印固定在视口 |
| `zIndex` | `number \| string` | `9999` | 层级 |
| `shadow` | `boolean` | `true` | 是否用 Shadow DOM 隔离样式 |
| `observe` | `boolean` | `true` | 是否开启防删除 / 防篡改监听 |
| `observeFonts` | `boolean` | `true` | Web Font 加载完成后自动重绘一次 |
| `className` | `string` | `''` | 宿主元素的 class |
| `style` | `Record<string, string>` | `{}` | 追加到宿主元素的内联样式 |
| `onRender` | `(info) => void` | — | 每次渲染完成后的回调，参数含 `dataURL` / `width` / `height` / `options` |

## 实例 API

| 成员 | 说明 |
| --- | --- |
| `ready` | `Promise<Watermark>`，首次渲染完成后 resolve（成功失败都会 resolve，失败信息看 `error`） |
| `update(options)` | 增量更新配置并重新渲染，传 `container` 可换容器 |
| `refresh()` | 用当前配置重新渲染一次，返回 `Promise<Watermark>` |
| `show()` / `hide()` | 显示 / 隐藏水印，不会解除防篡改监听 |
| `isVisible()` | 当前是否可见 |
| `destroy()` | 移除水印、解除所有监听并还原容器原有的 `position` |
| `getOptions()` | 当前完整配置（副本） |
| `getDataURL()` | 最近一次生成的贴图 dataURL |
| `getElement()` | 水印宿主元素 |
| `error` | 最近一次渲染的错误，无错误为 `null` |
| `destroyed` | 是否已销毁 |

## 模块级 API

| 导出 | 说明 |
| --- | --- |
| `createWatermark(options)` | 创建水印实例 |
| `Watermark` | 水印类，可 `new` 使用 |
| `destroyAll()` | 销毁当前页面所有实例，SPA 卸载时很方便 |
| `getInstances()` | 获取当前页面所有实例 |
| `setDefaults(options)` | 设置全局默认配置，之后创建的水印都会继承 |
| `getDefaults()` | 读取当前全局默认配置 |
| `clearImageCache()` | 清空图片水印的图片缓存 |
| `DEFAULT_OPTIONS` | 内置默认配置 |
| `VERSION` | 版本号 |
| `HOST_ATTR` / `LAYER_ATTR` | 宿主与图层使用的属性名 |

```ts
import { setDefaults } from 'free-watermark'

// 全站统一口径，业务代码里只传内容
setDefaults({ color: '#165dff', opacity: 0.18, gap: [120, 120] })
```

## 实现原理

**1. Canvas 平铺。** 先测量水印本体（文字按行测量宽度，图片取显示尺寸），按旋转角度算出它的外接矩形，再把「外接矩形 + gap」作为贴图尺寸，把本体绕中心旋转绘制进去。贴图四边都是空白，所以 `background-repeat: repeat` 就能无缝拼接。相比生成成百上千个 DOM 节点，一张背景图的开销几乎可以忽略。

**2. Shadow DOM 隔离。** 水印宿主挂在容器里，真正的图层在宿主的 Shadow DOM 内。页面上的 `div { ... }`、`* { ... }` 这类全局样式不会渗进 Shadow DOM，水印的 class 也不会和页面冲突。

**3. MutationObserver 兜底。** 监听三类变化：宿主被移出容器、宿主自身的样式 / class 被改写、图层被删除或背景被改写。回调里不做「撤销操作」，而是把状态对齐到一个**期望值**，所以自身写入触发的回调是空操作，不会形成死循环。

**4. 高清与打印。** 贴图按 `devicePixelRatio`（上限 3）放大绘制，再用 `background-size` 缩回 CSS 尺寸，高分屏下文字不发虚；图层带 `print-color-adjust: exact`，打印时水印不会消失。

## 注意事项

- **防篡改是有边界的。** 这套防护能挡住绝大多数「打开控制台删节点」的操作，但前端水印本质上无法防住有足够权限的攻击者（例如注入 `!important` 的样式表、改写原型、或直接截屏后修图）。它提高的是成本，不是绝对安全。真要防止泄露，需要结合后端水印、暗水印或权限管控。
- **远程图片需要 CORS。** 图片水印要走 Canvas，跨域图片会污染画布导致无法生成贴图。库会先带 `crossOrigin="anonymous"` 请求，失败后降级重试，此时若仍被污染会抛出带说明的错误。请让图片服务返回 `Access-Control-Allow-Origin`，或改用同源图片 / Base64。
- **容器定位会被临时改动。** 宿主用绝对定位，若容器原本是 `position: static`，库会临时改成 `relative`，`destroy()` 时还原。想让容器保持不动，可自行给容器加 `position: relative`。
- **滚动容器内的表现。** 若容器自身有滚动条（如 `overflow: auto` 的弹窗），水印覆盖的是容器的可视区域，内容滚动时水印不动。这通常是想要的效果；若希望水印跟随滚动内容，请把水印挂到内容层上。
- **`destroy()` 之后不再防护。** 销毁会解除所有监听并删除节点，此时再删节点不会恢复——这是刻意的设计，避免内存泄漏。
- **SSR 环境**：`createWatermark` 只能在浏览器调用，服务端会抛出明确错误。在 Nuxt / Next 里请放在 `onMounted` 或 `useEffect` 中。

## 本地开发

```bash
npm install
npm run build        # 构建 ESM / CJS / IIFE 与类型声明
npm run typecheck    # 类型检查
npm test             # 产物冒烟测试
npm run build:demo   # 打包 Vue 演示
npm run demo         # 起本地静态服务器预览 demo
```

`demo/` 下有三个页面：

- `index.html` —— 原生演示，可实时调参、切换图片水印、一键模拟删水印
- `self-check.html` —— 自检页，会断言宿主尺寸、图层覆盖、防篡改恢复等 18 项
- `vue-demo/index.html` —— Vue 3 指令与组件演示

## License

[MIT](./LICENSE)
