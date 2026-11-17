import { statfs } from 'node:fs/promises'
import { BrowserWindow, ipcMain, screen } from 'electron'
import { displayUnderPoint, pickerPrefsFrom, type DisplayInfo, type PickerPrefs, type PickerState, type Rect, type RecordRequest } from '@core/recordingPicker'
import type { SpeakerNotes } from './notes'
import type { Preferences } from './preferences'
import type { RecordingService } from './recording'
import { createOverlayWindow } from './windows'

const PREF_KEYS: (keyof PickerPrefs)[] = ['source', 'recordingCountdownDuration', 'recordingAreaCropPresets', 'recordMicrophone', 'systemAudio', 'recordingAreaCover', 'lastArea', 'showSpeakerNotes']

/**
 * The recording picker (specs 1–5, 13, 17, 21, 31): a transparent window the
 * size of the display under the mouse, with the "New recording" panel and the
 * area-selection overlay drawn by the renderer. After Record it either closes
 * or stays as a click-through cover that dims everything outside the area.
 */
export class Picker {
  private window: BrowserWindow | null = null
  private displayId = 0

  constructor(
    private readonly recording: RecordingService,
    private readonly prefs: Preferences,
    private readonly projectsRoot: () => string,
    private readonly notes: SpeakerNotes
  ) {
    ipcMain.handle('picker:state', () => this.state())
    ipcMain.handle('picker:savePrefs', (_e, values: Partial<PickerPrefs>) => this.savePrefs(values))
    ipcMain.handle('picker:record', (_e, request: RecordRequest) => this.record(request))
    ipcMain.handle('picker:cancel', () => this.close())
  }

  get isOpen(): boolean {
    return this.window !== null
  }

  open(): void {
    if (this.window) {
      this.window.focus()
      return
    }
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    this.displayId = display.id
    const window = createOverlayWindow(display.bounds, 'picker')
    window.once('overlay-loaded' as 'show', () => {
      window.show()
      window.focus()
    })
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  close(): void {
    this.window?.close()
    this.window = null
  }

  /** Keep the window as a dim cover around the area while recording (spec 31). */
  private becomeCover(): void {
    const window = this.window
    if (!window) return
    window.setIgnoreMouseEvents(true)
    window.setFocusable(false)
    window.webContents.send('picker:cover')
  }

  private pickerPrefs(): PickerPrefs {
    return pickerPrefsFrom(Object.fromEntries(PREF_KEYS.map((k) => [k, this.prefs.get(k)])))
  }

  private savePrefs(values: Partial<PickerPrefs>): PickerPrefs {
    const allowed = Object.fromEntries(Object.entries(values).filter(([k]) => (PREF_KEYS as string[]).includes(k)))
    this.prefs.set(allowed)
    if (values.showSpeakerNotes === true) this.notes.show(this.displayId)
    if (values.showSpeakerNotes === false) this.notes.hide(false)
    return this.pickerPrefs()
  }

  private async state(): Promise<PickerState> {
    const primary = screen.getPrimaryDisplay()
    const displays: DisplayInfo[] = screen.getAllDisplays().map((d) => ({ id: d.id, bounds: d.bounds, scale: d.scaleFactor, isMain: d.id === primary.id }))
    const [permissions, targets, free] = await Promise.all([
      this.recording.permissions(false),
      this.recording.listTargets().catch(() => ({ displays: [], windows: [] })),
      statfs(this.projectsRoot()).then((s) => s.bavail * s.bsize).catch(() => 0)
    ])
    const current = displayUnderPoint(displays, screen.getCursorScreenPoint())
    return {
      displays,
      displayId: this.displayId || current?.id || primary.id,
      windows: targets.windows,
      permissions,
      prefs: this.pickerPrefs(),
      freeSpaceBytes: free
    }
  }

  private async record(request: RecordRequest): Promise<{ projectDir: string }> {
    const prefs = this.pickerPrefs()
    const target =
      request.source === 'window' && request.windowId !== undefined
        ? { kind: 'window' as const, id: request.windowId }
        : request.source === 'area' && request.area
          ? this.areaTarget(request.displayId, request.area)
          : { kind: 'display' as const, id: request.displayId }
    if (request.source === 'area' && request.area) this.prefs.set({ lastArea: request.area })
    const result = await this.recording.start({ target, mic: request.mic, systemAudio: request.systemAudio, excludeProcessIds: [process.pid] })
    if (request.source === 'area' && prefs.recordingAreaCover) this.becomeCover()
    else this.close()
    return result
  }

  /** Areas are kept in global points by the renderer; the helper wants them relative to the display. */
  private areaTarget(displayId: number, area: Rect): { kind: 'area'; displayId: number; x: number; y: number; width: number; height: number } {
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    return { kind: 'area', displayId, x: area.x - display.bounds.x, y: area.y - display.bounds.y, width: area.width, height: area.height }
  }
}
