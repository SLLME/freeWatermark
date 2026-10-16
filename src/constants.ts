import type { WatermarkOptions } from './types'

/** 版本号，与 package.json 保持一致 */
export const VERSION = '0.1.0'

/** 宿主元素标识属性 */
export const HOST_ATTR = 'data-free-watermark'
/** 水印图层标识属性 */
export const LAYER_ATTR = 'data-free-watermark-layer'

/** 默认配置类型：间距类选项在此处固定为元组 */
export type WatermarkDefaults = Required<
  Pick<
    WatermarkOptions,
    | 'content'
    | 'crossOrigin'
    | 'fontSize'
    | 'fontFamily'
    | 'fontWeight'
    | 'fontStyle'
    | 'color'
    | 'opacity'
    | 'rotate'
    | 'gap'
    | 'offset'
    | 'lineHeight'
    | 'mode'
    | 'position'
    | 'zIndex'
    | 'shadow'
    | 'observe'
    | 'observeFonts'
    | 'className'
  >
> & {
  gap: [number, number]
  offset: [number, number]
}

/** 默认配置 */
export const DEFAULT_OPTIONS: WatermarkDefaults = {
  content: '',
  crossOrigin: 'anonymous',
  fontSize: 16,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  opacity: 0.15,
  rotate: -22,
  gap: [100, 100],
  offset: [0, 0],
  lineHeight: 1.5,
  mode: 'tile',
  position: 'absolute',
  zIndex: 9999,
  shadow: true,
  observe: true,
  observeFonts: true,
  className: '',
}

/** 渲染贴图时 devicePixelRatio 的上限，避免高分屏下画布过大 */
export const DPR_CAP = 3
