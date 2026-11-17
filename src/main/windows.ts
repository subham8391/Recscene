import { join } from 'node:path'
import { app, BrowserWindow, type Rectangle } from 'electron'

export type Route = 'editor' | 'picker' | 'widget' | 'notes'

/** Loads the renderer at a hash route, in development from the Vite server and otherwise from disk. */
export function loadRoute(window: BrowserWindow, route: Route): void {
  const hash = route === 'editor' ? '' : `#${route}`
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) void window.loadURL(devUrl + hash)
  else void window.loadFile(join(__dirname, '../renderer/index.html'), { hash: route === 'editor' ? undefined : route })
}

export const preloadPath = (): string => join(__dirname, '../preload/index.js')

/** A frameless, transparent, always-on-top window that floats over the desktop. */
export function createOverlayWindow(bounds: Rectangle, route: Route, options: { clickThrough?: boolean; movable?: boolean } = {}): BrowserWindow {
  const window = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: options.movable ?? false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    focusable: !options.clickThrough,
    webPreferences: { preload: preloadPath(), sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  if (options.clickThrough) window.setIgnoreMouseEvents(true)
  // Transparent windows do not reliably fire ready-to-show; show once the page has loaded.
  window.webContents.once('did-finish-load', () => window.emit('overlay-loaded'))
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') console.error(`[${route}] ${event.message}`)
  })
  window.webContents.on('render-process-gone', (_e, details) => console.error(`[${route}] renderer gone: ${details.reason}`))
  window.webContents.on('did-fail-load', (_e, code, desc) => console.error(`[${route}] load failed: ${code} ${desc}`))
  loadRoute(window, route)
  return window
}
