import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { createWatermark, Watermark } from '../watermark'
import type { WatermarkContent, WatermarkOptions } from '../types'

/**
 * Vue 3 组件：把插槽内容包在一个定位容器里，并给这个容器加上水印。
 *
 * @example
 * ```html
 * <Watermark content="内部资料 禁止外传" :opacity="0.2">
 *   <div>正文内容</div>
 * </Watermark>
 * ```
 */
export const WatermarkComponent = defineComponent({
  name: 'FreeWatermark',

  props: {
    /** 文字水印内容 */
    content: {
      type: [String, Array] as PropType<WatermarkContent>,
      default: undefined,
    },
    /** 图片水印 */
    image: {
      type: [String, Object] as PropType<string | HTMLImageElement>,
      default: undefined,
    },
    /** 其余配置，见 WatermarkOptions */
    options: {
      type: Object as PropType<WatermarkOptions>,
      default: () => ({}),
    },
    /** 是否显示水印 */
    visible: {
      type: Boolean,
      default: true,
    },
  },

  setup(props, { slots, attrs }) {
    const rootRef = ref<HTMLElement | null>(null)
    let instance: Watermark | null = null

    const resolveOptions = (): WatermarkOptions => {
      const options: WatermarkOptions = { ...props.options }
      if (props.content !== undefined) options.content = props.content
      if (props.image !== undefined) options.image = props.image
      return options
    }

    onMounted(() => {
      const el = rootRef.value
      if (!el) return
      instance = createWatermark({ ...resolveOptions(), container: el })
      if (!props.visible) instance.hide()
    })

    watch(
      () => [props.content, props.image, props.options, props.visible],
      () => {
        if (!instance) return
        instance.update(resolveOptions())
        if (props.visible) instance.show()
        else instance.hide()
      },
      { deep: true },
    )

    onBeforeUnmount(() => {
      instance?.destroy()
      instance = null
    })

    return () =>
      h(
        'div',
        {
          ...attrs,
          ref: rootRef,
          style: [{ position: 'relative' }, attrs.style as Record<string, string> | undefined],
        },
        slots.default ? slots.default() : [],
      )
  },
})

export default WatermarkComponent
