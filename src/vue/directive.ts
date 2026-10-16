import type { Directive } from 'vue'
import { createWatermark, Watermark } from '../watermark'
import type { WatermarkContent, WatermarkOptions } from '../types'

const instances = new WeakMap<HTMLElement, Watermark>()
const signatures = new WeakMap<HTMLElement, string>()

/** 把指令值归一化成配置对象，允许直接写 `v-watermark="'内部资料'"` */
export function normalizeBinding(value: unknown): WatermarkOptions {
  if (typeof value === 'string' || Array.isArray(value)) {
    return { content: value as WatermarkContent }
  }
  if (value && typeof value === 'object') {
    return { ...(value as WatermarkOptions) }
  }
  return {}
}

/** 生成配置指纹，避免组件重复渲染时无谓地重绘水印 */
function signatureOf(options: WatermarkOptions): string {
  const { onRender: _onRender, image, ...rest } = options
  let text: string
  try {
    text = JSON.stringify(rest) ?? ''
  } catch {
    return `${Date.now()}-${Math.random()}`
  }
  if (image && typeof image !== 'string') {
    text += `|img:${(image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src || ''}`
  }
  return text
}

/**
 * Vue 3 指令：把水印挂到指令所在元素上。
 *
 * @example
 * ```html
 * <div v-watermark="{ content: '内部资料', opacity: 0.2 }">...</div>
 * <div v-watermark="'禁止截图'">...</div>
 * ```
 */
export const vWatermark: Directive<HTMLElement, WatermarkOptions | string | string[]> = {
  mounted(el, binding) {
    const options = normalizeBinding(binding.value)
    signatures.set(el, signatureOf(options))
    instances.set(el, createWatermark({ ...options, container: el }))
  },

  updated(el, binding) {
    const instance = instances.get(el)
    if (!instance) return

    const options = normalizeBinding(binding.value)
    const signature = signatureOf(options)
    if (signatures.get(el) === signature) return

    signatures.set(el, signature)
    instance.update({ ...options, container: el })
  },

  unmounted(el) {
    instances.get(el)?.destroy()
    instances.delete(el)
    signatures.delete(el)
  },
}

export default vWatermark
