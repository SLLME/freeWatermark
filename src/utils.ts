import { DEFAULT_OPTIONS, DPR_CAP } from './constants'
import type {
  GapValue,
  ResolvedWatermarkOptions,
  WatermarkContent,
  WatermarkOptions,
} from './types'

/** 用户通过 setDefaults 设置的全局默认值 */
let userDefaults: WatermarkOptions = {}

export function setUserDefaults(options: WatermarkOptions): void {
  userDefaults = { ...userDefaults, ...options }
}

export function getUserDefaults(): WatermarkOptions {
  return { ...DEFAULT_OPTIONS, ...userDefaults }
}

/** 判断是否处于浏览器环境 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** 归一化 [x, y] 形式的间距值 */
export function toPair(value: GapValue | undefined, fallback: [number, number]): [number, number] {
  if (typeof value === 'number' && Number.isFinite(value)) return [value, value]
  if (Array.isArray(value) && value.length === 2) {
    const [x, y] = value
    return [Number.isFinite(x) ? x : fallback[0], Number.isFinite(y) ? y : fallback[1]]
  }
  return [fallback[0], fallback[1]]
}

/** 将内容统一成行数组 */
export function toLines(content: WatermarkContent): string[] {
  const raw = Array.isArray(content) ? content : String(content ?? '').split('\n')
  return raw.map((line) => String(line ?? ''))
}

/** 解析容器，支持选择器字符串 */
export function resolveContainer(target: WatermarkOptions['container']): HTMLElement {
  if (!isBrowser()) {
    throw new Error('[free-watermark] 当前环境不支持 DOM，无法创建水印。')
  }
  if (target === null || target === undefined || target === '') {
    return document.body
  }
  if (typeof target === 'string') {
    const el = document.querySelector(target)
    if (!el) {
      throw new Error(`[free-watermark] 找不到容器元素：${target}`)
    }
    return el as HTMLElement
  }
  if (target instanceof HTMLElement) return target
  throw new Error('[free-watermark] container 必须是 HTMLElement 或选择器字符串。')
}

/** 生成 canvas 字体简写 */
export function toFontString(options: ResolvedWatermarkOptions): string {
  const { fontStyle, fontWeight, fontSize, fontFamily } = options
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
}

/** 创建离屏 canvas */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  return canvas
}

/** 取当前设备像素比（带上限） */
export function getDPR(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
  return Math.min(Math.max(dpr || 1, 1), DPR_CAP)
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImageElement(src: string, crossOrigin: string | null): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = crossOrigin
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`[free-watermark] 图片加载失败：${src}`))
    img.src = src
  })
}

/**
 * 加载图片，带缓存。
 * 远程图片默认带 crossOrigin=anonymous，失败后会降级重试一次（可能污染画布）。
 */
export function loadImage(
  source: string | HTMLImageElement,
  crossOrigin: string | null = 'anonymous',
): Promise<HTMLImageElement> {
  if (typeof source !== 'string') {
    if (source.complete && source.naturalWidth > 0) return Promise.resolve(source)
    return new Promise((resolve, reject) => {
      source.addEventListener('load', () => resolve(source), { once: true })
      source.addEventListener('error', () => reject(new Error('[free-watermark] 图片加载失败')), {
        once: true,
      })
    })
  }

  const key = `${crossOrigin ?? 'none'}|${source}`
  const cached = imageCache.get(key)
  if (cached) return cached

  const task = loadImageElement(source, crossOrigin).catch((error) => {
    if (crossOrigin) {
      // 目标站点未开启 CORS 时降级重试，后续生成 dataURL 可能因画布污染失败
      return loadImageElement(source, null)
    }
    throw error
  })

  imageCache.set(key, task)
  return task
}

/** 清空图片缓存 */
export function clearImageCache(): void {
  imageCache.clear()
}

/** 归一化并填充默认配置 */
export function resolveOptions(options: WatermarkOptions = {}): ResolvedWatermarkOptions {
  const merged: WatermarkOptions = { ...DEFAULT_OPTIONS, ...userDefaults, ...options }
  const opacity = Number(merged.opacity)

  return {
    container: resolveContainer(merged.container),
    content: merged.content ?? '',
    image: merged.image,
    crossOrigin: merged.crossOrigin === undefined ? DEFAULT_OPTIONS.crossOrigin : merged.crossOrigin,
    width: merged.width,
    height: merged.height,
    fontSize: Number(merged.fontSize) || DEFAULT_OPTIONS.fontSize,
    fontFamily: merged.fontFamily || DEFAULT_OPTIONS.fontFamily,
    fontWeight: merged.fontWeight ?? DEFAULT_OPTIONS.fontWeight,
    fontStyle: merged.fontStyle ?? DEFAULT_OPTIONS.fontStyle,
    color: merged.color || DEFAULT_OPTIONS.color,
    opacity: Number.isFinite(opacity) ? Math.min(Math.max(opacity, 0), 1) : DEFAULT_OPTIONS.opacity,
    rotate: Number.isFinite(Number(merged.rotate)) ? Number(merged.rotate) : DEFAULT_OPTIONS.rotate,
    gap: toPair(merged.gap, DEFAULT_OPTIONS.gap),
    offset: toPair(merged.offset, DEFAULT_OPTIONS.offset),
    lineHeight: Number(merged.lineHeight) || DEFAULT_OPTIONS.lineHeight,
    mode: merged.mode === 'center' ? 'center' : 'tile',
    position: merged.position === 'fixed' ? 'fixed' : 'absolute',
    zIndex: merged.zIndex ?? DEFAULT_OPTIONS.zIndex,
    shadow: merged.shadow !== false,
    observe: merged.observe !== false,
    observeFonts: merged.observeFonts !== false,
    className: merged.className ?? '',
    style: merged.style ?? {},
    onRender: merged.onRender,
  }
}
