import { SHARPEN_FILTER_ID, sharpenKernel } from '@core/editor/looks'

/**
 * Spec 287's sharpen is an SVG convolution filter shared by the stage's camera
 * element and the export canvas (`ctx.filter = url(#id)`); one element in the
 * document carries the current kernel.
 */
export function ensureSharpenFilter(amount: number): void {
  const existing = document.getElementById(`${SHARPEN_FILTER_ID}-svg`)
  let svg: Element
  if (existing) svg = existing
  else {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    el.id = `${SHARPEN_FILTER_ID}-svg`
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('width', '0')
    el.setAttribute('height', '0')
    el.style.position = 'absolute'
    el.innerHTML = `<filter id="${SHARPEN_FILTER_ID}" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 0 0 0 1 0 0 0 0" /></filter>`
    document.body.appendChild(el)
    svg = el
  }
  const kernel = sharpenKernel(amount)
  const m = svg.querySelector('feConvolveMatrix')
  if (m && m.getAttribute('kernelMatrix') !== kernel) m.setAttribute('kernelMatrix', kernel)
}
