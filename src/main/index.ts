import { join } from 'node:path'
import { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } from 'electron'
import type { RecordingResult, StartOptions } from '@core/captureProtocol'
import { RecordingEnvironment } from './environment'
import { SpeakerNotes } from './notes'
import { Picker } from './picker'
import { Preferences } from './preferences'
import { projectsRoot, RecordingService } from './recording'
import { Widget } from './widget'
import { loadRoute, preloadPath } from './windows'

/** Spec 33: opens the picker when idle, finishes the recording while one runs. */
const RECORD_SHORTCUT = 'Shift+CommandOrControl+R'
/** Spec 26: flags a moment while recording. */
const FLAG_SHORTCUT = 'CommandOrControl+Alt+Control+F'
/** Spec 28: starts or stops the teleprompter in the speaker notes window. */
const PROMPTER_SHORTCUT = 'CommandOrControl+Alt+.'

let mainWindow: BrowserWindow | null = null
let recording: RecordingService | null = null
let picker: Picker | null = null
let widget: Widget | null = null
let notes: SpeakerNotes | null = null
let environment: RecordingEnvironment | null = null
let stopping: Promise<void> | null = null

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#0E0F11',
    webPreferences: { preload: preloadPath(), sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  window.on('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  loadRoute(window, 'editor')
  return window
}

function showMainWindow(): BrowserWindow {
  if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  return mainWindow
}

async function stopRecording(reason?: string): Promise<void> {
  if (!recording?.isRecording) return
  if (stopping) return stopping
  stopping = (async () => {
    try {
      widget?.hide()
      picker?.close()
      const result: RecordingResult = await recording.stop()
      const window = showMainWindow()
      window.webContents.send('recording:finished', result)
      if (reason) window.webContents.send('app:notice', reason)
    } finally {
      stopping = null
    }
  })()
  return stopping
}

const optionalShortcuts = (): { accelerator: string; handler: () => void }[] => [
  { accelerator: FLAG_SHORTCUT, handler: () => { if (recording?.isRecording) void recording.addFlag().catch(() => undefined) } },
  { accelerator: PROMPTER_SHORTCUT, handler: () => notes?.togglePrompter() }
]

function onRecordShortcut(): void {
  if (recording?.isRecording) void stopRecording()
  else picker?.open()
}

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:openPicker', () => picker?.open())
ipcMain.handle('app:projectsRoot', () => projectsRoot())

void app.whenReady().then(() => {
  const prefs = new Preferences(join(app.getPath('userData'), 'preferences.json'))
  recording = new RecordingService()
  widget = new Widget(recording, stopRecording)
  notes = new SpeakerNotes(prefs)
  picker = new Picker(recording, prefs, projectsRoot, notes)
  environment = new RecordingEnvironment(prefs, optionalShortcuts)
  recording.on('cancelled', () => {
    widget?.hide()
    picker?.close()
    notes?.hide(false)
    void environment?.leave()
  })
  recording.on('stopped', () => {
    notes?.hide(false)
    void environment?.leave()
  })
  recording.on('started', (options: StartOptions) => {
    const t = options.target
    const displayId = t.kind === 'display' ? t.id : t.kind === 'area' ? t.displayId : screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id
    widget?.show(displayId)
    if (notes?.current().showSpeakerNotes) notes.show(displayId)
    void environment?.enter({
      hideDesktop: prefs.get('hideDesktopContentWhileRecording') === true,
      projectsRoot: projectsRoot(),
      onLowDisk: (message) => void stopRecording(message)
    })
  })
  globalShortcut.register(RECORD_SHORTCUT, onRecordShortcut)
  for (const s of optionalShortcuts()) globalShortcut.register(s.accelerator, s.handler)
  mainWindow = createMainWindow()
  // Development aid: RECSCENE_OPEN_PICKER=1 opens the picker as soon as the app is ready.
  if (!app.isPackaged && process.env['RECSCENE_OPEN_PICKER']) setTimeout(() => picker?.open(), 800)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showMainWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void environment?.leave()
  recording?.dispose()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
