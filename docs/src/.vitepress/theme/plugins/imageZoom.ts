import { inBrowser, onContentUpdated } from 'vitepress'
import mediumZoom from 'medium-zoom'

let installed = false

export const setupImageZoom = () => {
  if (!inBrowser) return
  if (installed) return
  installed = true

  const zoom = mediumZoom({
    background: 'var(--vp-img-preview-bg)',
  })

  const selector = '.vp-doc :not(a) > img:not(.no-zoom)'
  const refresh = () => {
    zoom.detach()
    zoom.attach(selector)
  }

  const scheduleRefresh = () => requestAnimationFrame(() => refresh())

  scheduleRefresh()
  onContentUpdated(scheduleRefresh)
}
