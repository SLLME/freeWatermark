/**
 * free-watermark 公共类型定义
 */

/** 水印文字内容，支持单行字符串、多行数组，字符串中的 `\n` 也会被拆分为多行 */
export type WatermarkContent = string | string[]

/** 水印排版模式：`tile` 平铺（默认），`center` 居中单个 */
export type WatermarkMode = 'tile' | 'center'

/** 间距值：单值表示 x/y 相同，或 [x, y] */
export type GapValue = number | [number, number]

/** 水印宿主元素的定位方式 */
export type WatermarkPosition = 'absolute' | 'fixed'

export interface WatermarkOptions {
  /** 水印挂载容器，支持 DOM 元素或选择器字符串，默认 `document.body` */
  container?: HTMLElement | string | null
  /** 文字水印内容 */
  content?: WatermarkContent
  /** 图片水印，URL / Base64 / HTMLImageElement；提供时优先按图片渲染 */
  image?: string | HTMLImageElement
  /** 加载远程图片时的 crossOrigin 属性，默认 `anonymous`，传 null 关闭 */
  crossOrigin?: string | null

  /** 图片水印显示宽度（px），不传则用图片原始宽度 */
  width?: number
  /** 图片水印显示高度（px），只传 width 时按比例自动计算 */
  height?: number

  /** 字号（px），默认 16 */
  fontSize?: number
  /** 字体，默认系统字体栈 */
  fontFamily?: string
  /** 字重，默认 `normal` */
  fontWeight?: string | number
  /** 字体风格，默认 `normal` */
  fontStyle?: 'normal' | 'italic' | 'oblique'

  /** 颜色，支持 hex / rgb / rgba / 关键字，默认 `#000000` */
  color?: string
  /** 透明度 0~1，默认 0.15 */
  opacity?: number
  /** 旋转角度（度），正值为顺时针，默认 -22 */
  rotate?: number

  /** 平铺模式下相邻水印的间距 [x, y]，默认 [100, 100] */
  gap?: GapValue
  /** 水印整体偏移量 [x, y]，对应 background-position，默认 [0, 0] */
  offset?: GapValue
  /** 多行文字行高倍数，默认 1.5 */
  lineHeight?: number

  /** 排版模式，默认 `tile` */
  mode?: WatermarkMode
  /** 宿主元素定位方式，默认 `absolute`；`fixed` 常用于让水印固定在视口 */
  position?: WatermarkPosition
  /** 层级，默认 9999 */
  zIndex?: number | string

  /** 是否使用 Shadow DOM 隔离样式，默认 true */
  shadow?: boolean
  /** 是否开启防删除/防篡改监听（MutationObserver），默认 true */
  observe?: boolean
  /** 是否在 Web Font 加载完成后自动重绘，默认 true */
  observeFonts?: boolean

  /** 宿主元素的 class 名 */
  className?: string
  /** 追加到宿主元素的额外内联样式 */
  style?: Record<string, string>
  /** 每次渲染完成后的回调 */
  onRender?: (info: WatermarkRenderInfo) => void
}

/** 渲染完成回调参数 */
export interface WatermarkRenderInfo {
  /** 生成的水印贴图 dataURL（PNG） */
  dataURL: string
  /** 贴图 CSS 宽度 */
  width: number
  /** 贴图 CSS 高度 */
  height: number
  /** 本次渲染使用的完整配置 */
  options: ResolvedWatermarkOptions
}

/** 内部使用的、已填充默认值并完成归一化的配置 */
export interface ResolvedWatermarkOptions {
  container: HTMLElement
  content: WatermarkContent
  image?: string | HTMLImageElement
  crossOrigin: string | null
  width?: number
  height?: number
  fontSize: number
  fontFamily: string
  fontWeight: string | number
  fontStyle: 'normal' | 'italic' | 'oblique'
  color: string
  opacity: number
  rotate: number
  gap: [number, number]
  offset: [number, number]
  lineHeight: number
  mode: WatermarkMode
  position: WatermarkPosition
  zIndex: number | string
  shadow: boolean
  observe: boolean
  observeFonts: boolean
  className: string
  style: Record<string, string>
  onRender?: (info: WatermarkRenderInfo) => void
}
