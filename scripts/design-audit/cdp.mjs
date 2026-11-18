/* global fetch, WebSocket */
// Usage: node cdp.mjs <route> "<js expression>"  — evaluates JS in the renderer whose URL hash matches the route.
const [route, expr] = process.argv.slice(2)
const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
const page = targets.find((t) => t.type === 'page' && (route === 'editor' ? !t.url.includes('#') : t.url.endsWith('#' + route)))
if (!page) { console.error('no target for', route, targets.map((t) => t.url)); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } }))
const msg = await new Promise((r) => ws.addEventListener('message', (m) => r(JSON.parse(m.data))))
console.log(JSON.stringify(msg.result?.result?.value ?? msg.result ?? msg))
ws.close()
