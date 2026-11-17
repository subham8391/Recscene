import { BrowserWindow, ipcMain, screen } from 'electron'
import { speakerNotesPrefsFrom, type SpeakerNotesPrefs } from '@core/speakerNotes'
import type { Preferences } from './preferences'
import { createOverlayWindow } from './windows'

const WIDTH = 316
const HEIGHT = 270
const MARGIN = 24
const KEYS: (keyof SpeakerNotesPrefs)[] = ['showSpeakerNotes', 'speakerNotesText', 'speakerNotesFontSize', 'speakerNotesOpacity', 'prompterSpeed']

/**
 * The speaker notes window (specs 27–28): always on top, excluded from the
 * capture by process id, with a teleprompter that ⌘⌥. starts and stops.
 */
export class SpeakerNotes {
  private window: BrowserWindow | null = null

  constructor(private readonly prefs: Preferences) {
    ipcMain.handle('notes:prefs', () => this.current())
    ipcMain.handle('notes:save', (_e, values: Partial<SpeakerNotesPrefs>) => this.save(values))
    ipcMain.handle('notes:close', () => this.hide(true))
  }

  current(): SpeakerNotesPrefs {
    return speakerNotesPrefsFrom(Object.fromEntries(KEYS.map((k) => [k, this.prefs.get(k)])))
  }

  save(values: Partial<SpeakerNotesPrefs>): SpeakerNotesPrefs {
    this.prefs.set(Object.fromEntries(Object.entries(values).filter(([k]) => (KEYS as string[]).includes(k))))
    const next = this.current()
    if (values.showSpeakerNotes === false) this.hide(false)
    this.window?.webContents.send('notes:update', next)
    return next
  }

  get isOpen(): boolean {
    return this.window !== null
  }

  /** Bottom-right of the display, as on the Picker board. */
  show(displayId?: number): void {
    if (this.window) {
      this.window.showInactive()
      return
    }
    const display = (displayId !== undefined && screen.getAllDisplays().find((d) => d.id === displayId)) || screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { x, y, width, height } = display.workArea
    const window = createOverlayWindow({ x: x + width - WIDTH - MARGIN, y: y + height - HEIGHT - MARGIN, width: WIDTH, height: HEIGHT }, 'notes', { movable: true })
    window.once('overlay-loaded' as 'show', () => window.showInactive())
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  hide(remember: boolean): void {
    if (remember) this.prefs.set({ showSpeakerNotes: false })
    this.window?.close()
    this.window = null
  }

  togglePrompter(): void {
    this.window?.webContents.send('notes:togglePrompter')
  }
}
