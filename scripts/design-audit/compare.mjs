// Usage: node compare.mjs board.json app.json [region x y w h in board coords] — matches elements by text and reports metric differences.
import { readFileSync } from 'node:fs'
const [bf, af, ...reg] = process.argv.slice(2)
const B = JSON.parse(readFileSync(bf)), A = JSON.parse(readFileSync(af))
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const inReg = (e) => reg.length !== 4 || (e.x + e.w / 2 >= +reg[0] && e.x + e.w / 2 <= +reg[0] + +reg[2] && e.y + e.h / 2 >= +reg[1] && e.y + e.h / 2 <= +reg[1] + +reg[3])
const key = (e) => (e.text ? 'T:' + norm(e.text) : e.all ? 'C:' + e.tag + ':' + norm(e.all).slice(0, 30) : null)
const index = (list) => { const m = new Map(); for (const e of list) { const k = key(e); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(e) } return m }
const bi = index(B.filter(inReg)), ai = index(A)
const rows = [], missing = []
for (const [k, bs] of bi) {
  const as = ai.get(k)
  if (!as) { if (k.startsWith('T:')) missing.push(bs[0].text); continue }
  const b = bs[0], a = as[0]
  const d = []
  if (b.fs !== a.fs) d.push(`font ${b.fs}→${a.fs}`)
  if (b.lh !== a.lh) d.push(`lh ${b.lh}→${a.lh}`)
  if (b.fw !== a.fw) d.push(`weight ${b.fw}→${a.fw}`)
  if (b.color !== a.color) d.push(`color ${b.color}→${a.color}`)
  if (k.startsWith('C:')) {
    if (Math.abs(b.h - a.h) > 2) d.push(`h ${b.h}→${a.h}`)
    if (Math.abs(b.w - a.w) > 6) d.push(`w ${b.w}→${a.w}`)
    if (b.radius !== a.radius) d.push(`radius ${b.radius}→${a.radius}`)
    if (b.pad.join() !== a.pad.join()) d.push(`pad ${b.pad.join(' ')}→${a.pad.join(' ')}`)
    if (b.gap !== a.gap) d.push(`gap ${b.gap}→${a.gap}`)
    if (b.bg !== a.bg) d.push(`bg ${b.bg}→${a.bg}`)
    if ((b.border || '') !== (a.border || '')) d.push(`border ${b.border || 'none'}→${a.border || 'none'}`)
  } else if (Math.abs(b.h - a.h) > 2) d.push(`h ${b.h}→${a.h}`)
  if (d.length) rows.push(`${k.slice(0, 44).padEnd(44)} board(${b.tag}${b.cls ? '.' + b.cls : ''} ${b.w}×${b.h}) app(${a.tag}${a.cls ? '.' + a.cls : ''} ${a.w}×${a.h}): ${d.join(', ')}`)
}
console.log(rows.join('\n'))
if (missing.length) console.log('\nBoard text not found in app:\n  ' + missing.join('\n  '))
