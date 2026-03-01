import { ref, computed, watch, type Ref } from 'vue'

interface DrawioParserOptions {
  /** drawio 文件路径（基于 public 目录） */
  src?: Ref<string | undefined>
  /** 内联 XML 字符串（可配合 ?raw 导入） */
  data?: Ref<string | undefined>
}

/**
 * 解析 drawio XML，计算内容宽高比并生成 viewer URL
 *
 * 遍历所有 mxGeometry 节点提取坐标，计算包围盒，
 * 返回 CSS aspect-ratio 值让 iframe 自适应高度
 */
export function useDrawioParser(options: DrawioParserOptions) {
  const xmlContent = ref('')
  const loading = ref(true)
  /** CSS aspect-ratio 值，格式如 "1140 / 510" */
  const aspectRatio = ref<string | null>(null)

  /** diagrams.net viewer iframe URL */
  const viewerUrl = computed(() => {
    if (!xmlContent.value) return ''
    return `https://viewer.diagrams.net/?lightbox=1&highlight=0000ff&nav=1&ui=light#R${encodeURIComponent(xmlContent.value)}`
  })

  /**
   * 解析 drawio XML，计算内容宽高比
   * 优先从 mxGeometry 包围盒计算，回退到 pageWidth/pageHeight
   */
  function parseAspectRatio(xml: string): string | null {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')

      const model = doc.querySelector('mxGraphModel')
      const pageW = Number(model?.getAttribute('pageWidth')) || 0
      const pageH = Number(model?.getAttribute('pageHeight')) || 0

      // 计算所有节点的包围盒
      const geometries = doc.querySelectorAll('mxGeometry')
      let minX = Infinity
      let minY = Infinity
      let maxX = 0
      let maxY = 0
      let hasGeometry = false

      geometries.forEach((geo) => {
        // 只处理绝对定位的几何信息（relative 的是连接线中间点）
        if (geo.getAttribute('relative') === '1') return

        const x = Number(geo.getAttribute('x')) || 0
        const y = Number(geo.getAttribute('y')) || 0
        const w = Number(geo.getAttribute('width')) || 0
        const h = Number(geo.getAttribute('height')) || 0

        if (w === 0 && h === 0) return

        hasGeometry = true
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + w)
        maxY = Math.max(maxY, y + h)
      })

      if (hasGeometry) {
        // 内容区域 + 上下左右各留 60px 边距
        const padding = 60
        const contentW = maxX - minX + padding * 2
        const contentH = maxY - minY + padding * 2
        return `${contentW} / ${contentH}`
      }

      // 回退到画布尺寸
      if (pageW > 0 && pageH > 0) {
        return `${pageW} / ${pageH}`
      }
    } catch {
      // 解析失败
    }
    return null
  }

  /** 加载并解析 drawio 内容 */
  async function loadContent() {
    const dataVal = options.data?.value
    const srcVal = options.src?.value

    if (dataVal) {
      xmlContent.value = dataVal
      aspectRatio.value = parseAspectRatio(dataVal)
      loading.value = false
      return
    }

    if (srcVal) {
      try {
        const res = await fetch(srcVal)
        const text = await res.text()
        xmlContent.value = text
        aspectRatio.value = parseAspectRatio(text)
      } catch (e) {
        console.error('[DrawioViewer] 加载文件失败:', e)
      } finally {
        loading.value = false
      }
    }
  }

  // 监听 src/data 变化自动重新加载
  watch(
    () => [options.src?.value, options.data?.value],
    () => loadContent(),
  )

  return {
    xmlContent,
    loading,
    aspectRatio,
    viewerUrl,
    loadContent,
  }
}
