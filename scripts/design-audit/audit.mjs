/* global fetch, WebSocket */
// Usage: node audit.mjs <route> [label] — DOM audit of the renderer page: clipped text, children
// overflowing their parent, overlapping siblings in flex/grid rows, buttons inside buttons,
// tiny hit targets, images that failed to load. Prints JSON lines.
const [route, label = route] = process.argv.slice(2)
const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
const page = targets.find((t) => t.type === 'page' && (route === 'editor' ? !t.url.includes('#') : t.url.endsWith('#' + route)))
if (!page) { console.error('no target for', route); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
const expr = `(() => {
  const issues = []
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' }
  const desc = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + (el.textContent ? ' "' + el.textContent.trim().slice(0, 28) + '"' : ''))
  const all = [...document.querySelectorAll('body *')].filter((el) => vis(el) && ![...el.parentElement ? [el] : []].some(() => el.closest('details:not([open])') && el.tagName !== 'SUMMARY' && el.closest('details:not([open])') !== el))
  for (const el of all) {
    const cs = getComputedStyle(el)
    // text clipped by overflow hidden / ellipsis
    if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && el.textContent.trim()) issues.push({ kind: 'clipped-text', el: desc(el), by: el.scrollWidth - el.clientWidth })
    // nested buttons
    if (el.tagName === 'BUTTON' && el.parentElement?.closest('button')) issues.push({ kind: 'button-in-button', el: desc(el) })
    // child overflowing a parent that clips or is a card/button (ignore scroll containers and the stage canvas)
    const p = el.parentElement
    if (p && p !== document.body) {
      const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect(), pcs = getComputedStyle(p)
      const scrolls = pcs.overflowY === 'auto' || pcs.overflowY === 'scroll' || pcs.overflowX === 'auto' || pcs.overflowX === 'scroll'
      const abs = cs.position === 'absolute' || cs.position === 'fixed'
      if (!scrolls && !abs && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1 || r.left < pr.left - 1 || r.top < pr.top - 1) && !el.closest('.stage__canvas, .tl__lane, canvas, video')) issues.push({ kind: 'overflows-parent', el: desc(el), parent: desc(p), right: Math.round(r.right - pr.right), bottom: Math.round(r.bottom - pr.bottom) })
    }
    // small click targets
    if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && !el.closest('.tl__lane')) { const r = el.getBoundingClientRect(); if (r.height < 20 || r.width < 20) issues.push({ kind: 'tiny-target', el: desc(el), w: Math.round(r.width), h: Math.round(r.height) }) }
    if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0 && el.getAttribute('src')) issues.push({ kind: 'broken-image', el: desc(el) })
  }
  // overlapping siblings laid out in a row/grid (not absolutely positioned, not inside timeline lanes)
  for (const p of all) {
    const pcs = getComputedStyle(p)
    if (!(pcs.display.includes('flex') || pcs.display.includes('grid'))) continue
    if (p.closest('.tl__lane, .stage__canvas')) continue
    const kids = [...p.children].filter((k) => vis(k) && !['absolute', 'fixed'].includes(getComputedStyle(k).position))
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect()
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 1 && oy > 1) issues.push({ kind: 'siblings-overlap', a: desc(kids[i]), b: desc(kids[j]), ox: Math.round(ox), oy: Math.round(oy), parent: desc(p) })
    }
  }
  return issues
})()`
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
const msg = await new Promise((r) => ws.addEventListener('message', (m) => r(JSON.parse(m.data))))
const issues = msg.result?.result?.value ?? []
console.log(`[${label}] ${issues.length} issue(s)`)
for (const i of issues) console.log('  ' + JSON.stringify(i))
ws.close()
