import { BrowserWindow, ipcMain, screen } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import type { OpenedProject } from '@core/projectFile'
import type { Preferences } from './preferences'
import type { ProjectService } from './project'
import { createOverlayWindow } from './windows'

const WIDTH = 560
const HEIGHT = 440
const MARGIN = 24

export interface QuickExportPrefs {
  /** Spec 45. */
  muteQuickExportWidgetPreview: boolean
  /** Spec 42. */
  alwaysSaveProjectWhenUsingQuickExportWidget: boolean
}

/**
 * The Quick Export widget (specs 42–47): after a recording stops, a small
 * window plays the fresh footage and offers Save, Copy, Edit (and Share,
 * which waits for shareable links). The project exists on disk already;
 * finishing asks whether to keep or delete it unless always-save is on.
 */
export class QuickExport {
  private window: BrowserWindow | null = null
  private result: RecordingResult | null = null

  constructor(
    private readonly prefs: Preferences,
    private readonly projects: ProjectService,
    private readonly hooks: { openInEditor: (result: RecordingResult) => void; trash: (projectDir: string) => Promise<void> }
  ) {
    ipcMain.handle('quickexport:state', () => this.state())
    ipcMain.handle('quickexport:setPrefs', (_e, values: Partial<QuickExportPrefs>) => this.prefs.set(values))
    ipcMain.handle('quickexport:edit', () => this.edit())
    ipcMain.handle('quickexport:done', (_e, action: 'keep' | 'delete') => this.done(action))
  }

  private quickPrefs(): QuickExportPrefs {
    return { muteQuickExportWidgetPreview: this.prefs.get('muteQuickExportWidgetPreview') === true, alwaysSaveProjectWhenUsingQuickExportWidget: this.prefs.get('alwaysSaveProjectWhenUsingQuickExportWidget') === true }
  }

  private async state(): Promise<{ result: RecordingResult; opened: OpenedProject; prefs: QuickExportPrefs } | null> {
    if (!this.result) return null
    const opened = await this.projects.read(this.result.projectDir)
    return { result: this.result, opened, prefs: this.quickPrefs() }
  }

  show(result: RecordingResult, displayId: number): void {
    this.hide()
    this.result = result
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    const { x, y, width, height } = display.workArea
    const window = createOverlayWindow({ x: x + width - WIDTH - MARGIN, y: y + height - HEIGHT - MARGIN, width: WIDTH, height: HEIGHT }, 'quickexport', { movable: true })
    window.setAlwaysOnTop(true, 'floating')
    window.once('overlay-loaded' as 'show', () => {
      window.show()
      window.focus()
    })
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  hide(): void {
    this.window?.close()
    this.window = null
  }

  /** Spec 47. */
  private edit(): void {
    const result = this.result
    this.result = null
    this.hide()
    if (result) this.hooks.openInEditor(result)
  }

  /** Spec 42: keep or delete the project once the export is done. */
  private async done(action: 'keep' | 'delete'): Promise<void> {
    const result = this.result
    this.result = null
    this.hide()
    if (action === 'delete' && result) await this.hooks.trash(result.projectDir)
  }
}
