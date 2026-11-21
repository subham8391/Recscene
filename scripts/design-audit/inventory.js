/* global document, getComputedStyle, ROOT */
// Returns a style inventory of every visible element under ROOT: text leaves with font metrics,
// containers with box metrics. Shared by the board probe and the app probe.
(() => {
  const root = document.querySelector(ROOT) || document.body
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' && !el.closest('details:not([open]) > :not(summary)') }
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim()
  const num = (v) => Math.round(parseFloat(v) || 0)
  const out = []
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el)) continue
    if (['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'canvas', 'video', 'img'].includes(el.tagName.toLowerCase())) continue
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    const t = ownText(el)
    out.push({
      tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '', text: t.slice(0, 40),
      all: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      fs: num(cs.fontSize), lh: cs.lineHeight, fw: cs.fontWeight, color: cs.color, bg: cs.backgroundColor, radius: num(cs.borderTopLeftRadius),
      pad: [num(cs.paddingTop), num(cs.paddingRight), num(cs.paddingBottom), num(cs.paddingLeft)], gap: num(cs.rowGap) + '/' + num(cs.columnGap),
      border: cs.borderTopWidth !== '0px' ? cs.borderTopColor : '', display: cs.display, kids: el.children.length
    })
  }
  return out
})()
