import { HOST_ATTR, LAYER_ATTR, VERSION } from './constants'
import { renderWatermarkTile } from './renderer'
import { isBrowser, resolveOptions } from './utils'
import type {
  ResolvedWatermarkOptions,
  WatermarkOptions,
  WatermarkRenderInfo,
} from './types'

/** 已创建的实例，便于框架卸载时统一清理 */
const registry = new Set<Watermark>()

/** Shadow DOM 内的基础样式（仅做兜底，关键样式均以内联方式写入） */
const SHADOW_CSS = `
:host {
  contain: layout style;
}
[${LAYER_ATTR}] {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: block;
  pointer-events: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`

const containerPositionBackup = new WeakMap<HTMLElement, { value: string; priority: string }>()

/**
 * 页面水印实例。
 *
 * 渲染方式：用 Canvas 生成一块可无缝平铺的水印贴图，再作为图层背景重复铺满容器。
 * 隔离方式：水印节点挂在宿主元素的 Shadow DOM 中，页面样式无法影响它。
 * 防护方式：MutationObserver 监听节点被删除 / 样式被改写，自动还原。
 */
export class Watermark {
  /** 首次渲染完成后 resolve（成功或失败都会 resolve，失败信息见 `error`） */
  readonly ready: Promise<Watermark>

  private _options: ResolvedWatermarkOptions
  private _host: HTMLDivElement | null = null
  private _shadow: ShadowRoot | null = null
  private _layer: HTMLDivElement | null = null
  private _dataURL = ''
  private _tileWidth = 0
  private _tileHeight = 0
  private _error: Error | null = null
  private _visible = true
  private _destroyed = false
  private _renderToken = 0
  private _observers: MutationObserver[] = []
  private _fontsBound = false

  private _expectedHostStyle = ''
  private _expectedHostClass = ''
  private _expectedLayerStyle = ''

  constructor(options: WatermarkOptions = {}) {
    if (!isBrowser()) {
      throw new Error('[free-watermark] 水印只能在浏览器环境中创建。')
    }

    this._options = resolveOptions(options)
    this._create()
    this._attach()
    this._observe()
    this._bindFonts()

    this.ready = this._render().then(() => this)

    registry.add(this)
  }

  // ---------------------------------------------------------------------------
  // 公开 API
  // ---------------------------------------------------------------------------

  /** 增量更新配置并重新渲染 */
  update(partial: WatermarkOptions = {}): this {
    if (this._destroyed) return this

    const previousContainer = this._options.container
    this._options = resolveOptions({ ...this._options, ...partial })

    if (this._options.container !== previousContainer) {
      // 用旧容器还原定位，否则它会一直留着临时加上的 position: relative
      this._restoreContainerPosition(previousContainer)
      const host = this._host
      if (host && host.parentNode) host.parentNode.removeChild(host)
      this._attach()
      this._observe()
    }

    if (this._options.observeFonts && !this._fontsBound) this._bindFonts()

    this._applyHostStyle()
    void this._render()
    return this
  }

  /** 重新渲染当前配置 */
  refresh(): Promise<this> {
    if (this._destroyed) return Promise.resolve(this)
    return this._render().then(() => this)
  }

  /** 显示水印 */
  show(): this {
    if (this._destroyed) return this
    this._visible = true
    this._applyHostStyle()
    return this
  }

  /** 隐藏水印（仅隐藏，监听仍在，不会被页面改动意外唤起） */
  hide(): this {
    if (this._destroyed) return this
    this._visible = false
    this._applyHostStyle()
    return this
  }

  /** 当前是否可见 */
  isVisible(): boolean {
    return this._visible && !this._destroyed
  }

  /** 移除水印并释放所有监听 */
  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this._renderToken += 1
    this._teardownObservers()
    this._detach()
    this._host = null
    this._shadow = null
    this._layer = null
    this._dataURL = ''
    registry.delete(this)
  }

  /** 当前完整配置（副本） */
  getOptions(): ResolvedWatermarkOptions {
    const { gap, offset } = this._options
    return { ...this._options, gap: [gap[0], gap[1]], offset: [offset[0], offset[1]] }
  }

  /** 最近一次生成的贴图 dataURL */
  getDataURL(): string {
    return this._dataURL
  }

  /** 水印宿主元素（已销毁时为 null） */
  getElement(): HTMLDivElement | null {
    return this._host
  }

  /** 最近一次渲染的错误，无错误时为 null */
  get error(): Error | null {
    return this._error
  }

  /** 是否已销毁 */
  get destroyed(): boolean {
    return this._destroyed
  }

  // ---------------------------------------------------------------------------
  // 内部实现
  // ---------------------------------------------------------------------------

  private _create(): void {
    const host = document.createElement('div')
    host.setAttribute(HOST_ATTR, VERSION)
    this._host = host

    if (this._options.shadow && typeof host.attachShadow === 'function') {
      this._shadow = host.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = SHADOW_CSS
      this._shadow.appendChild(style)
    }

    this._buildLayer()
    this._applyHostStyle()
  }

  private _buildLayer(): void {
    const layer = document.createElement('div')
    layer.setAttribute(LAYER_ATTR, '')
    this._layer = layer
    const root: Node = this._shadow ?? this._host ?? layer
    root.appendChild(layer)
  }

  private _attach(): void {
    const host = this._host
    if (!host) return
    if (this._options.position === 'absolute') this._ensureContainerPosition()
    this._options.container.appendChild(host)
  }

  private _detach(): void {
    const host = this._host
    if (host && host.parentNode) host.parentNode.removeChild(host)
    this._restoreContainerPosition()
  }

  /**
   * 宿主使用绝对定位时需要容器是定位元素。
   * 只在容器原本是 static 时临时改成 relative，销毁时还原。
   */
  private _ensureContainerPosition(): void {
    const container = this._options.container
    if (containerPositionBackup.has(container)) return

    const view = container.ownerDocument?.defaultView
    const computed = view ? view.getComputedStyle(container).position : ''
    if (computed && computed !== 'static') return

    containerPositionBackup.set(container, {
      value: container.style.getPropertyValue('position'),
      priority: container.style.getPropertyPriority('position'),
    })
    container.style.setProperty('position', 'relative')
  }

  private _restoreContainerPosition(target?: HTMLElement): void {
    const container = target ?? this._options.container
    const backup = containerPositionBackup.get(container)
    if (!backup) return
    if (backup.value) {
      container.style.setProperty('position', backup.value, backup.priority)
    } else {
      container.style.removeProperty('position')
    }
    containerPositionBackup.delete(container)
  }

  private _applyHostStyle(): void {
    const host = this._host
    if (!host) return

    const { zIndex, position, style, className } = this._options
    host.className = className
    this._expectedHostClass = host.className

    const declarations = [
      `position:${position}`,
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'margin:0',
      'padding:0',
      'border:0',
      'background:transparent',
      'pointer-events:none',
      'transform:none',
      'opacity:1',
      'visibility:visible',
      `z-index:${zIndex}`,
      this._visible ? 'display:block' : 'display:none',
    ]

    host.style.cssText = declarations.join(';')
    for (const key of Object.keys(style)) {
      host.style.setProperty(key, style[key] as string)
    }

    this._expectedHostStyle = host.style.cssText
  }

  private _applyLayerStyle(): void {
    const layer = this._layer
    if (!layer) return

    const { mode, offset } = this._options
    const declarations = [
      'position:absolute',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'display:block',
      'margin:0',
      'padding:0',
      'border:0',
      'opacity:1',
      'visibility:visible',
      'transform:none',
      'pointer-events:none',
      'background-color:transparent',
      '-webkit-print-color-adjust:exact',
      'print-color-adjust:exact',
    ]

    if (this._dataURL) {
      declarations.push(
        `background-image:url("${this._dataURL}")`,
        `background-size:${this._tileWidth}px ${this._tileHeight}px`,
        `background-repeat:${mode === 'tile' ? 'repeat' : 'no-repeat'}`,
        `background-position:${mode === 'tile' ? `${offset[0]}px ${offset[1]}px` : 'center center'}`,
      )
    } else {
      declarations.push('background-image:none')
    }

    layer.style.cssText = declarations.join(';')
    this._expectedLayerStyle = layer.style.cssText
  }

  private _observe(): void {
    this._teardownObservers()
    const host = this._host
    if (!this._options.observe || !host) return

    const watch = (target: Node, init: MutationObserverInit): void => {
      const observer = new MutationObserver(() => this._verify())
      observer.observe(target, init)
      this._observers.push(observer)
    }

    // 宿主被移除 / 被移动到别处
    watch(this._options.container, { childList: true })
    // 宿主自身样式或 class 被改写
    watch(host, { childList: true, attributes: true, attributeFilter: ['style', 'class'] })
    // 图层被删除或背景被改写（Shadow DOM 内部同样可被 MutationObserver 观测）
    if (this._shadow) {
      watch(this._shadow, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      })
    }
  }

  private _teardownObservers(): void {
    for (const observer of this._observers) observer.disconnect()
    this._observers = []
  }

  /**
   * 校验并还原水印状态。
   * 所有写入都以「期望值」为准，因此自身写入触发的 mutation 回调是空操作，不会形成死循环。
   */
  private _verify(): void {
    if (this._destroyed) return
    const host = this._host
    const layer = this._layer
    if (!host) return

    const container = this._options.container
    if (!container.contains(host)) {
      container.appendChild(host)
    }
    if (host.style.cssText !== this._expectedHostStyle) {
      host.style.cssText = this._expectedHostStyle
    }
    if (host.className !== this._expectedHostClass) {
      host.className = this._expectedHostClass
    }

    const layerRoot: Node = this._shadow ?? host
    if (!layer || !layerRoot.contains(layer)) {
      this._buildLayer()
      this._applyLayerStyle()
    } else if (layer.style.cssText !== this._expectedLayerStyle) {
      layer.style.cssText = this._expectedLayerStyle
    }
  }

  private _bindFonts(): void {
    if (this._fontsBound || this._destroyed) return
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (!fonts || typeof fonts.ready?.then !== 'function') return

    this._fontsBound = true
    fonts.ready
      .then(() => {
        // 自定义字体加载完成后字宽会变化，重绘一次避免水印被裁切
        if (!this._destroyed) void this._render()
      })
      .catch(() => {
        /* 忽略字体加载异常 */
      })
  }

  private async _render(): Promise<void> {
    if (this._destroyed) return
    const token = ++this._renderToken

    try {
      const tile = await renderWatermarkTile(this._options)
      if (this._destroyed || token !== this._renderToken) return

      this._dataURL = tile.dataURL
      this._tileWidth = tile.width
      this._tileHeight = tile.height
      this._error = null
      this._applyLayerStyle()

      if (this._options.onRender) {
        const info: WatermarkRenderInfo = {
          dataURL: tile.dataURL,
          width: tile.width,
          height: tile.height,
          options: this._options,
        }
        try {
          this._options.onRender(info)
        } catch (callbackError) {
          // 业务回调里的异常不应该被当成渲染失败
          console.error(callbackError)
        }
      }
    } catch (error) {
      if (this._destroyed || token !== this._renderToken) return
      this._error = error instanceof Error ? error : new Error(String(error))
      console.error(this._error)
    }
  }
}

/** 创建一个水印实例 */
export function createWatermark(options: WatermarkOptions = {}): Watermark {
  return new Watermark(options)
}

/** 销毁当前页面上的所有水印实例 */
export function destroyAll(): void {
  for (const instance of Array.from(registry)) instance.destroy()
  registry.clear()
}

/** 获取当前页面上的所有水印实例 */
export function getInstances(): Watermark[] {
  return Array.from(registry)
}
