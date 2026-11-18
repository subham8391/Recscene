import { join } from 'node:path'
import { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } from 'electron'
import type { RecordingResult, StartOptions } from '@core/captureProtocol'
import { RecordingEnvironment } from './environment'
import { ExportService } from './export'
import { installMenu } from './menu'
import { SpeakerNotes } from './notes'
import { Picker } from './picker'
import { ProjectService, registerMediaScheme } from './project'
import { Preferences } from './preferences'
import { projectsRoot, RecordingService, setProjectsFolderSource } from './recording'
import { offerRecovery } from './recovery'
import { LibraryService } from './library'
import { MusicService } from './music'
import { CaptionsService } from './captions'
import { PresetsService } from './presets'
import { SettingsService } from './settings'
import { QuickExport } from './quickExport'
import { Widget } from './widget'
import { CameraPreview } from './cameraPreview'
import { loadRoute, preloadPath } from './windows'

/** Spec 33: opens the picker when idle, finishes the recording while one runs. */
/** Spec 26: flags a moment while recording. */
const FLAG_SHORTCUT = 'CommandOrControl+Alt+Control+F'
/** Spec 28: starts or stops the teleprompter in the speaker notes window. */
const PROMPTER_SHORTCUT = 'CommandOrControl+Alt+.'

let mainWindow: BrowserWindow | null = null
let recording: RecordingService | null = null
let picker: Picker | null = null
let widget: Widget | null = null
let cameraPreview: CameraPreview | null = null
let notes: SpeakerNotes | null = null
let environment: RecordingEnvironment | null = null
let projects: ProjectService | null = null
let prefsStore: Preferences | null = null
let exporter: ExportService | null = null
let library: LibraryService | null = null
let music: MusicService | null = null
let captions: CaptionsService | null = null
let presets: PresetsService | null = null
let settings: SettingsService | null = null
let quickExport: QuickExport | null = null
let recordedDisplayId = 0

registerMediaScheme()
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
    settings?.applyDock()
  })
  window.on('show', () => settings?.applyDock())
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
      cameraPreview?.hide()
      picker?.close()
      const result: RecordingResult = await recording.stop()
      // Spec 41: the quick export widget (42–47) or the editor.
      if (prefsStore?.get('showQuickExportWidget') !== false && !reason) {
        quickExport?.show(result, recordedDisplayId)
        return
      }
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

/** A finished, recovered or imported recording opens in the editor (spec 41 with `create-project`). */
function showResult(result: RecordingResult, notice?: string | null): void {
  const window = showMainWindow()
  window.webContents.send('recording:finished', result)
  if (notice) window.webContents.send('app:notice', notice)
  void projects?.open(result.projectDir).then(() => refreshMenu()).catch(() => undefined)
}

function refreshMenu(): void {
  void projects?.recent().then((recent) => {
    installMenu({
      newRecording: () => picker?.open(),
      importVideo,
      recoverUnfinished: () => recoverUnfinished(true),
      mainWindow: () => mainWindow,
      openProject: () => projects?.pickAndOpen().then(() => refreshMenu()) ?? Promise.resolve(),
      openLastProject: () => projects?.openLast() ?? Promise.resolve(),
      openRecent: (dir) => projects?.open(dir).then(() => refreshMenu()) ?? Promise.resolve(),
      recent,
      projectsRoot,
      openSettings: (tab) => settings?.open(tab),
      editorAction: (id) => mainWindow?.webContents.send('editor:action', id)
    })
  })
}

async function recoverUnfinished(manual: boolean): Promise<void> {
  if (!recording) return
  const { results, notice } = await offerRecovery(recording, { manual })
  const last = results[results.length - 1]
  if (last) showResult(last, notice)
  else if (notice) showMainWindow().webContents.send('app:notice', notice)
}

async function importVideo(path: string): Promise<void> {
  if (!recording) return
  try {
    showResult(await recording.importVideo(path), 'Project created from video. There is no mouse cursor recorded, so automatic zooms cannot follow clicks.')
  } catch (error) {
    showMainWindow().webContents.send('app:notice', error instanceof Error ? error.message.replace(/^.*?: (?=[A-Z])/, '') : String(error))
  }
}

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('prefs:get', () => prefsStore?.all() ?? {})
ipcMain.handle('prefs:set', (_e, values: Record<string, unknown>) => prefsStore?.set(values))
ipcMain.handle('app:openPicker', () => picker?.open())
ipcMain.handle('app:projectsRoot', () => projectsRoot())

void app.whenReady().then(() => {
  const prefs = new Preferences(join(app.getPath('userData'), 'preferences.json'))
  prefsStore = prefs
  setProjectsFolderSource(() => prefs.get('projectsFolderPath'))
  recording = new RecordingService(prefs)
  widget = new Widget(recording, stopRecording)
  cameraPreview = new CameraPreview()
  notes = new SpeakerNotes(prefs)
  picker = new Picker(recording, prefs, projectsRoot, notes)
  environment = new RecordingEnvironment(prefs, optionalShortcuts)
  recording.on('cancelled', () => {
    widget?.hide()
    cameraPreview?.hide()
    picker?.close()
    notes?.hide(false)
    void environment?.leave()
  })
  recording.on('stopped', () => {
    cameraPreview?.hide()
    notes?.hide(false)
    void environment?.leave()
  })
  recording.on('started', (options: StartOptions) => {
    const t = options.target
    const displayId = t.kind === 'display' ? t.id : t.kind === 'area' ? t.displayId : screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id
    recordedDisplayId = displayId
    widget?.show(displayId)
    const cameraName = recording?.cameraName
    if (cameraName && prefs.get('hideCameraPreview') !== true) cameraPreview?.show(displayId, { cameraName, previewType: prefs.get('webcamPreviewType') === 'full-frame' ? 'full-frame' : 'square' })
    if (notes?.current().showSpeakerNotes) notes.show(displayId)
    void environment?.enter({
      hideDesktop: prefs.get('hideDesktopContentWhileRecording') === true,
      projectsRoot: projectsRoot(),
      onLowDisk: (message) => void stopRecording(message)
    })
  })
  // Global shortcuts are registered by the settings service from the (remappable) preferences (spec 66).
  projects = new ProjectService(prefs, () => mainWindow)
  exporter = new ExportService(prefs, () => recording!.helper, () => mainWindow)
  library = new LibraryService(prefs, recording, { showResult, importVideo, mainWindow: () => mainWindow, refreshMenu })
  music = new MusicService(() => projects?.currentDir ?? null)
  captions = new CaptionsService(() => recording!.helper, projects)
  presets = new PresetsService(prefs)
  recording.configSeed = () => presets!.seed()
  projects.onSaved = (p) => presets?.rememberLast(p.config)
  quickExport = new QuickExport(prefs, projects, {
    openInEditor: (result) => showResult(result),
    trash: (dir) => library!.trash(dir)
  })
  settings = new SettingsService(prefs, {
    recording,
    globalHandlers: { 'global:record': onRecordShortcut, 'global:flag': optionalShortcuts()[0]!.handler, 'global:prompter': optionalShortcuts()[1]!.handler },
    mainWindows: () => (mainWindow && !mainWindow.isDestroyed() ? [mainWindow] : []),
    projectsFolder: projectsRoot,
    presetsFolder: () => presets!.folder()
  })
  recording.on('stopped', () => settings?.applyDock())
  recording.on('cancelled', () => settings?.applyDock())
  app.on('will-quit', () => {
    exporter?.dispose()
    void library
    void music
    void captions
    void presets
  })
  refreshMenu()
  mainWindow = createMainWindow()
  // Spec 272: the first launch opens Settings › General with the permission cards when something is missing.
  mainWindow.once('show', () => {
    if (settings?.current().onboardingDone) return
    void recording?.permissions(false).then((p) => {
      if (!p.screen || p.microphone === 'notDetermined') settings?.open('general')
      prefs.set({ onboardingDone: true })
    })
  })
  // Spec 40 on launch: the projects home shows unfinished recordings in its banner; File › Recover asks with a dialog.
  // Development aid: RECSCENE_QUICK_EXPORT=<project dir> shows the quick export widget for that project.
  const quickDir = process.env['RECSCENE_QUICK_EXPORT']
  if (!app.isPackaged && quickDir) setTimeout(() => quickExport?.show({ projectDir: quickDir, projectFile: join(quickDir, 'project.json'), durationMs: 0, frames: 0, width: 0, height: 0, clicks: 0, keys: 0, cursorSamples: 0 }, screen.getPrimaryDisplay().id), 800)
  // Development aid: RECSCENE_OPEN_PICKER=1 opens the picker as soon as the app is ready.
  if (!app.isPackaged && process.env['RECSCENE_OPEN_PICKER']) setTimeout(() => picker?.open(), 800)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showMainWindow()
  })
})

// Spec 250: a .recscene bundle opened from Finder or dropped on the Dock icon.
app.on('open-file', (event, path) => {
  event.preventDefault()
  void app.whenReady().then(() => projects?.openPath(path).then(() => refreshMenu()).catch((error: unknown) => showMainWindow().webContents.send('app:notice', error instanceof Error ? error.message : String(error))))
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void environment?.leave()
  recording?.dispose()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
