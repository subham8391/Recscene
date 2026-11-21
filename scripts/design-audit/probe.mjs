/* global fetch, WebSocket, URL */
// Usage: node probe.mjs <port> <urlMatch> <rootSelector> <out.json> — dumps the style inventory of the matching page.
import { readFileSync, writeFileSync } from 'node:fs'
const [port, match, root, out] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const page = targets.find((t) => t.type === 'page' && (match === 'editor' ? !t.url.includes('#') : t.url.includes(match)))
if (!page) { console.error('no target', match, targets.map((t) => t.url)); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
const expr = `(() => { const ROOT=${JSON.stringify(root)}; return (\n` + readFileSync(new URL('./inventory.js', import.meta.url), 'utf8') + '\n) })()'
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
const msg = await new Promise((r) => ws.addEventListener('message', (m) => r(JSON.parse(m.data))))
const v = msg.result?.result?.value
if (!v) { console.error(JSON.stringify(msg).slice(0, 500)); process.exit(1) }
writeFileSync(out, JSON.stringify(v))
console.log(out, v.length, 'elements')
ws.close()
