import { BrowserWindow, ipcMain, screen } from 'electron'
import { createOverlayWindow } from './windows'

const WIDTH = 440
const HEIGHT = 64
const MARGIN = 24

/**
 * The floating recording widget (spec 32): elapsed time and Stop, excluded
 * from the capture by process id. Pause, flag and restart arrive with spec 22–26.
 */
export class Widget {
  private window: BrowserWindow | null = null
  private startedAt = 0

  constructor(private readonly onStop: () => Promise<void>) {
    ipcMain.handle('widget:state', () => ({ startedAt: this.startedAt }))
    ipcMain.handle('widget:stop', () => this.onStop())
  }

  show(displayId: number): void {
    this.hide()
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    const { x, y, height } = display.workArea
    this.startedAt = Date.now()
    const window = createOverlayWindow({ x: x + MARGIN, y: y + height - HEIGHT - MARGIN, width: WIDTH, height: HEIGHT }, 'widget')
    window.once('overlay-loaded' as 'show', () => window.showInactive())
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  hide(): void {
    this.window?.close()
    this.window = null
  }
}
