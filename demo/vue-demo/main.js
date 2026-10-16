import { createApp, ref } from 'vue'
import FreeWatermarkVue from 'free-watermark/vue'

/** 一张内联 SVG，避免演示时依赖网络 */
const LOGO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="44">' +
      '<rect x="1" y="1" width="138" height="42" rx="10" fill="none" stroke="#00b42a" stroke-width="2"/>' +
      '<text x="70" y="29" font-family="sans-serif" font-size="18" font-weight="700" fill="#00b42a" text-anchor="middle">STAR TECH</text>' +
      '</svg>',
  )

const template = /* html */ `
  <div class="page">
    <header>
      <h1>free-watermark · Vue 3 集成演示</h1>
      <span>指令与组件已由插件注册，水印随数据响应式更新</span>
    </header>

    <div class="controls">
      <label>公司名（改动后各处水印实时更新）</label>
      <input v-model="company" />
      <button @click="showComponent = !showComponent">
        {{ showComponent ? '卸载组件水印' : '挂载组件水印' }}
      </button>
    </div>

    <!-- 用法一：指令 -->
    <section v-watermark="{ content: company + ' · 内部资料', color: '#165dff', fontSize: 16, opacity: 0.18 }">
      <h2>用法一：v-watermark 指令</h2>
      <p>水印直接挂在指令所在元素上，配置对象是响应式的，数据变化会自动重绘。</p>
      <p>适合给已有容器快速加一层水印，不需要改动原有 DOM 结构。</p>
    </section>

    <!-- 用法二：组件 -->
    <Watermark
      v-if="showComponent"
      class="wm-card"
      :content="company + ' · 保密'"
      :options="{ color: '#f53f3f', rotate: -18, gap: [120, 90], opacity: 0.16 }"
    >
      <h2>用法二：&lt;Watermark&gt; 组件</h2>
      <p>把需要保护的内容放进默认插槽，组件会自动包一层定位容器并加上水印。</p>
      <p>组件卸载时水印与监听会一起销毁，不会残留节点。</p>
    </Watermark>

    <!-- 用法三：图片水印 -->
    <section v-watermark="{ image: logo, width: 140, opacity: 0.2, gap: [60, 60], rotate: -30 }">
      <h2>用法三：图片水印</h2>
      <p>image 支持 URL、Base64 与 HTMLImageElement，常用于铺公司 LOGO。</p>
      <p>远程图片需要服务端开启 CORS，否则画布会被污染，无法生成水印贴图。</p>
    </section>
  </div>
`

const app = createApp({
  setup() {
    const company = ref('星辰科技')
    const showComponent = ref(true)
    return { company, showComponent, logo: LOGO }
  },
  template,
})

// 一次性注册 v-watermark 指令与 <Watermark> 组件
app.use(FreeWatermarkVue)
app.mount('#app')
