/**
 * free-watermark —— 轻量页面水印库
 *
 * @example
 * ```ts
 * import { createWatermark } from 'free-watermark'
 *
 * const watermark = createWatermark({ content: '内部资料 禁止外传' })
 * // 需要时更新或销毁
 * watermark.update({ color: '#f00' })
 * watermark.destroy()
 * ```
 */
export { Watermark, createWatermark, destroyAll, getInstances } from './watermark'
export {
  VERSION,
  DEFAULT_OPTIONS,
  HOST_ATTR,
  LAYER_ATTR,
} from './constants'
export {
  clearImageCache,
  getUserDefaults as getDefaults,
  setUserDefaults as setDefaults,
} from './utils'
export type {
  GapValue,
  ResolvedWatermarkOptions,
  WatermarkContent,
  WatermarkMode,
  WatermarkOptions,
  WatermarkPosition,
  WatermarkRenderInfo,
} from './types'
