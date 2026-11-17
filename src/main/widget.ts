import { BrowserWindow, dialog, ipcMain, screen } from 'electron'
import { CONFIRM_CANCEL, CONFIRM_RESTART } from '@core/recordingSession'
import type { RecordingService, SessionSnapshot } from './recording'
import { createOverlayWindow } from './windows'

const WIDTH = 480
const HEIGHT = 64
const MARGIN = 24

/**
 * The floating recording widget (specs 22–26, 32): clock, pause/resume,
 * marker, flag, restart, cancel and stop. Excluded from the capture by process id.
 */
export class Widget {
  private window: BrowserWindow | null = null

  constructor(
    private readonly recording: RecordingService,
    private readonly onStop: () => Promise<void>
  ) {
    ipcMain.handle('widget:state', () => recording.snapshot())
    ipcMain.handle('widget:stop', () => this.onStop())
    ipcMain.handle('widget:pause', () => recording.pause())
    ipcMain.handle('widget:resume', () => recording.resume())
    ipcMain.handle('widget:marker', () => recording.addMarker())
    ipcMain.handle('widget:flag', () => recording.addFlag())
    ipcMain.handle('widget:restart', () => this.confirmThen(CONFIRM_RESTART, 'Restart', () => recording.restart().then(() => undefined)))
    ipcMain.handle('widget:cancel', () => this.confirmThen(CONFIRM_CANCEL, 'Cancel recording', () => recording.cancel()))
    recording.on('session', (snapshot: SessionSnapshot | null) => this.window?.webContents.send('widget:update', snapshot))
  }

  show(displayId: number): void {
    this.hide()
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    const { x, y, height } = display.workArea
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

  private async confirmThen(message: string, confirmLabel: string, action: () => Promise<void>): Promise<boolean> {
    const choice = await dialog.showMessageBox({ type: 'warning', message, buttons: [confirmLabel, 'Keep recording'], defaultId: 1, cancelId: 1 })
    if (choice.response !== 0) return false
    await action()
    return true
  }
}
