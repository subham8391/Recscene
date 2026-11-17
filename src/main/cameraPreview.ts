import { BrowserWindow, ipcMain, screen } from 'electron'
import type { WebcamPreviewType } from '@core/recordingPicker'
import { createOverlayWindow } from './windows'

const SIZE = 200
const MARGIN = 24

export interface CameraPreviewState {
  /** The recorded camera's name, so the renderer can open the same device. */
  cameraName: string
  previewType: WebcamPreviewType
}

/**
 * The live camera bubble while recording (specs 8 and 11): on screen only,
 * never in the output (the app's windows are excluded from the capture).
 * Bottom-right of the recorded display, draggable; square or full-frame.
 */
export class CameraPreview {
  private window: BrowserWindow | null = null
  private state: CameraPreviewState | null = null

  constructor() {
    ipcMain.handle('campreview:state', () => this.state)
  }

  show(displayId: number, state: CameraPreviewState): void {
    this.hide()
    this.state = state
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    const { x, y, width, height } = display.workArea
    const w = state.previewType === 'square' ? SIZE : Math.round((SIZE * 16) / 9)
    const window = createOverlayWindow({ x: x + width - w - MARGIN, y: y + height - SIZE - MARGIN, width: w, height: SIZE }, 'campreview', { movable: true })
    window.once('overlay-loaded' as 'show', () => window.showInactive())
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  hide(): void {
    this.window?.close()
    this.window = null
    this.state = null
  }
}
