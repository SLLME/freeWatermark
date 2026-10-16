import type { App, Plugin } from 'vue'
import { WatermarkComponent } from './component'
import { vWatermark } from './directive'

export { WatermarkComponent, vWatermark }
export { normalizeBinding } from './directive'
export * from '../index'

/**
 * Vue 插件，一次性注册指令与组件。
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import FreeWatermarkVue from 'free-watermark/vue'
 *
 * createApp(App).use(FreeWatermarkVue).mount('#app')
 * ```
 */
export const FreeWatermarkVue: Plugin = {
  install(app: App) {
    app.directive('watermark', vWatermark)
    app.component('FreeWatermark', WatermarkComponent)
    app.component('Watermark', WatermarkComponent)
  },
}

export default FreeWatermarkVue
