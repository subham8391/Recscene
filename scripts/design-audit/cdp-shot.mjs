/* global fetch, WebSocket, Buffer */
// Usage: node cdp-shot.mjs <route> <out.png> — screenshots the renderer page itself.
import { writeFileSync } from 'node:fs'
const [route, out] = process.argv.slice(2)
const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
const page = targets.find((t) => t.type === 'page' && (route === 'editor' ? !t.url.includes('#') : t.url.endsWith('#' + route)))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }))
const msg = await new Promise((r) => ws.addEventListener('message', (m) => r(JSON.parse(m.data))))
writeFileSync(out, Buffer.from(msg.result.data, 'base64'))
ws.close()
