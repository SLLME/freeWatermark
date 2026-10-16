import { createCanvas, getDPR, loadImage, toFontString, toLines } from './utils'
import type { ResolvedWatermarkOptions } from './types'

/** 一块水印贴图的绘制描述，坐标以自身中心为原点 */
interface WatermarkItem {
  width: number
  height: number
  paint: (ctx: CanvasRenderingContext2D) => void
}

export interface WatermarkTile {
  /** PNG dataURL */
  dataURL: string
  /** 贴图 CSS 宽度 */
  width: number
  /** 贴图 CSS 高度 */
  height: number
}

/** 创建文字水印的绘制描述 */
function createTextItem(options: ResolvedWatermarkOptions): WatermarkItem {
  const lines = toLines(options.content)
  const lineHeight = options.fontSize * options.lineHeight

  if (!lines.some((line) => line.trim() !== '')) {
    throw new Error('[free-watermark] 文字水印内容为空，请通过 content 指定文字，或改用 image 指定图片。')
  }

  const measureCtx = createCanvas(1, 1).getContext('2d')
  if (!measureCtx) {
    throw new Error('[free-watermark] 当前环境不支持 Canvas 2D，无法渲染水印。')
  }
  measureCtx.font = toFontString(options)

  let maxWidth = 0
  for (const line of lines) {
    maxWidth = Math.max(maxWidth, measureCtx.measureText(line).width)
  }

  return {
    width: Math.max(maxWidth, 1),
    height: Math.max(lineHeight * lines.length, 1),
    paint(ctx) {
      ctx.font = toFontString(options)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = options.color
      // 多行文字以中心对齐，保证旋转后仍居中
      const startY = -((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, index) => {
        ctx.fillText(line, 0, startY + index * lineHeight)
      })
    },
  }
}

/** 创建图片水印的绘制描述 */
async function createImageItem(options: ResolvedWatermarkOptions): Promise<WatermarkItem> {
  const source = options.image
  if (!source) {
    throw new Error('[free-watermark] 未提供图片。')
  }

  const img = await loadImage(source, options.crossOrigin)
  const naturalWidth = img.naturalWidth || img.width || 1
  const naturalHeight = img.naturalHeight || img.height || 1

  let width = options.width && options.width > 0 ? options.width : naturalWidth
  let height = options.height && options.height > 0 ? options.height : 0

  if (!height) {
    // 只给了宽度时按原始比例换算
    height = options.width && options.width > 0 ? (options.width * naturalHeight) / naturalWidth : naturalHeight
  }

  return {
    width,
    height,
    paint(ctx) {
      ctx.drawImage(img, -width / 2, -height / 2, width, height)
    },
  }
}

/**
 * 生成一块可无缝平铺的水印贴图。
 *
 * 思路：先算出水印本体（文字/图片）的尺寸，再按旋转角度计算其外接矩形，
 * 最后把外接矩形加上 gap 作为贴图尺寸，把本体绕中心旋转绘制进去。
 * 由于贴图四边都是空白区域，`background-repeat: repeat` 即可无缝拼接。
 */
export async function renderWatermarkTile(
  options: ResolvedWatermarkOptions,
): Promise<WatermarkTile> {
  const item = options.image
    ? await createImageItem(options)
    : createTextItem(options)

  const rad = (options.rotate * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))

  // 旋转后的外接矩形
  const boundWidth = item.width * cos + item.height * sin
  const boundHeight = item.width * sin + item.height * cos

  const isTile = options.mode === 'tile'
  const cssWidth = Math.ceil(isTile ? boundWidth + options.gap[0] : boundWidth)
  const cssHeight = Math.ceil(isTile ? boundHeight + options.gap[1] : boundHeight)

  const dpr = getDPR()
  const canvas = createCanvas(cssWidth * dpr, cssHeight * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('[free-watermark] 当前环境不支持 Canvas 2D，无法渲染水印。')
  }

  ctx.scale(dpr, dpr)
  ctx.globalAlpha = options.opacity
  ctx.translate(cssWidth / 2, cssHeight / 2)
  ctx.rotate(rad)
  item.paint(ctx)

  let dataURL: string
  try {
    dataURL = canvas.toDataURL('image/png')
  } catch {
    throw new Error(
      '[free-watermark] 图片跨域导致画布被污染，无法生成水印贴图。' +
        '请为图片开启 CORS（响应头 Access-Control-Allow-Origin），或改用同源图片 / Base64。',
    )
  }

  return { dataURL, width: cssWidth, height: cssHeight }
}
