import { app, dialog, Menu, shell, type BrowserWindow } from 'electron'
import { IMPORTABLE_EXTENSIONS } from '@core/recovery'

export interface MenuActions {
  newRecording: () => void
  importVideo: (path: string) => Promise<void>
  recoverUnfinished: () => Promise<void>
  mainWindow: () => BrowserWindow | null
  openProject: () => Promise<unknown>
  openLastProject: () => Promise<void>
  openRecent: (projectDir: string) => Promise<unknown>
  recent: { projectDir: string; name: string }[]
  /** Spec 255: the current projects folder. */
  projectsRoot: () => string
  /** The Settings window (⌘,), optionally at a tab. */
  openSettings: (tab?: 'general' | 'recording' | 'editing' | 'shortcuts' | 'advanced' | 'experimental' | 'account') => void
  /** Sends an editor action id to the renderer (save, undo, toggles…). */
  editorAction: (id: string) => void
}

/** The application menu (specs 7, 33, 40, 63, 72, 74–78 live here; the rest is the standard macOS set). */
export function installMenu(actions: MenuActions): void {
  const send = (id: string) => () => actions.editorAction(id)
  const pickVideo = async (): Promise<void> => {
    const result = await dialog.showOpenDialog({
      title: 'Select video file',
      properties: ['openFile'],
      filters: [{ name: 'Video or GIF', extensions: [...IMPORTABLE_EXTENSIONS] }]
    })
    const file = result.filePaths[0]
    if (!result.canceled && file) await actions.importVideo(file)
  }
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CommandOrControl+,', click: () => actions.openSettings() },
        { label: 'Check for Updates…', click: () => actions.editorAction('checkForUpdates') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Recording', accelerator: 'Shift+CommandOrControl+R', click: actions.newRecording },
        { label: 'Create Project from Video…', click: () => void pickVideo() },
        { type: 'separator' },
        { label: 'Open Project…', accelerator: 'CommandOrControl+O', click: () => void actions.openProject() },
        { label: 'Open Last Project', accelerator: 'CommandOrControl+Alt+Z', enabled: actions.recent.length > 0, click: () => void actions.openLastProject() },
        {
          label: 'Open Recent',
          submenu: actions.recent.length ? actions.recent.map((r) => ({ label: r.name, click: () => void actions.openRecent(r.projectDir) })) : [{ label: 'No recent projects', enabled: false }]
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CommandOrControl+S', click: send('save') },
        { label: 'Save As…', accelerator: 'Shift+CommandOrControl+S', click: send('saveAs') },
        { label: 'Show Project in Finder', accelerator: 'Shift+CommandOrControl+O', click: send('showInFinder') },
        { label: 'Close Project', accelerator: 'Shift+CommandOrControl+W', click: send('closeProject') },
        { type: 'separator' },
        { label: 'Presets…', click: send('presets') },
        { label: 'Create New Preset', click: send('createPreset') },
        { label: 'Import Preset…', click: send('importPreset') },
        { type: 'separator' },
        { label: 'Recover Unfinished Recordings', click: () => void actions.recoverUnfinished() },
        { label: 'Show Projects Folder', click: () => void shell.openPath(actions.projectsRoot()) },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CommandOrControl+Z', click: send('undo') },
        { label: 'Redo', accelerator: 'Shift+CommandOrControl+Z', click: send('redo') },
        { type: 'separator' },
        { role: 'cut' },
        { label: 'Copy', accelerator: 'CommandOrControl+C', click: send('copyFrame') },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Show Editor Sidebar', click: send('toggleSidebar') },
        { label: 'Show Editor Timeline', click: send('toggleTimeline') },
        { label: 'Enter Preview Mode', accelerator: 'Shift+CommandOrControl+Enter', click: send('togglePreviewMode') },
        { type: 'separator' },
        { label: 'Show Audio Waveform', click: send('toggleWaveform') },
        { label: 'Smooth Waveform', click: send('toggleSmoothWaveform') },
        { label: 'Always Show Timeline Scrollbar', click: send('toggleTimelineScrollbar') },
        { label: 'Loop Playback', click: send('toggleLoop') },
        { type: 'separator' },
        { label: 'Zoom In Timeline', accelerator: 'CommandOrControl+=', click: send('timelineZoomIn') },
        { label: 'Zoom Out Timeline', accelerator: 'CommandOrControl+-', click: send('timelineZoomOut') },
        { type: 'separator' },
        { label: 'Show Command Menu…', accelerator: 'CommandOrControl+K', click: send('commandMenu') },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Export',
      submenu: [{ label: 'Export Video…', accelerator: 'CommandOrControl+E', click: send('export') }, { label: 'Export Current Frame as Image…', click: send('exportFrame') }]
    },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Shortcuts Guide', accelerator: 'CommandOrControl+/', click: send('shortcutsGuide') }, { label: 'Recscene Website', click: () => void shell.openExternal('https://recscene.app') }] }
  ])
  Menu.setApplicationMenu(menu)
}
