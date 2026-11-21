// Usage: node compose.mjs <board.png> <app.png> <out.png> [cropX cropY cropW cropH]
// Puts the board (1x, 1280 wide) and the app screenshot (2x, scaled to 1x) side by side at the
// same scale, optionally cropping both to the same region (board coordinates), and renders with
// headless Chrome. Board and app share the 1280×800 layout, so the same crop applies to both.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [board, app, out, cx = '0', cy = '0', cw = '1280', ch = '800'] = process.argv.slice(2)
const w = Number(cw), h = Number(ch), x = Number(cx), y = Number(cy)
const scale = w > 640 ? 1 : 2 // zoom in on small regions
const appW = Number(process.env.APPW || 1280) // APPW: the app window's own width when it is not the 1280 editor (settings, picker)
const appLeft = process.env.APPW ? -Number(process.env.APPX || 0) * scale : -x * scale, appTop = process.env.APPW ? -Number(process.env.APPY || 0) * scale : -y * scale
const dir = join(out, '..')
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#555;display:flex;gap:12px;padding:12px;font:12px Inter,system-ui">
<div><div style="color:#fff;margin-bottom:4px">board</div><div style="width:${w * scale}px;height:${h * scale}px;overflow:hidden;position:relative"><img src="file://${board}" style="position:absolute;left:${-x * scale}px;top:${-y * scale}px;width:${1280 * scale}px"></div></div>
<div><div style="color:#fff;margin-bottom:4px">app</div><div style="width:${w * scale}px;height:${h * scale}px;overflow:hidden;position:relative"><img src="file://${app}" style="position:absolute;left:${appLeft}px;top:${appTop}px;width:${appW * scale}px"></div></div>
</body>`
const file = join(dir, 'c.html')
writeFileSync(file, html)
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--user-data-dir=/tmp/claude-501/chrome-compose', '--no-first-run', '--hide-scrollbars', `--window-size=${w * scale * 2 + 36},${h * scale + 44}`, '--virtual-time-budget=1500', `--screenshot=${out}`, `file://${file}`], { stdio: 'ignore' })
console.log(out)
