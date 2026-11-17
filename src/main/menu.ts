import { app, dialog, Menu, shell, type BrowserWindow } from 'electron'
import { IMPORTABLE_EXTENSIONS } from '@core/recovery'

export interface MenuActions {
  newRecording: () => void
  importVideo: (path: string) => Promise<void>
  recoverUnfinished: () => Promise<void>
  mainWindow: () => BrowserWindow | null
}

/** The application menu (specs 7, 33, 40 live here; the rest is the standard macOS set). */
export function installMenu(actions: MenuActions): void {
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
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { label: 'New Recording', accelerator: 'Shift+CommandOrControl+R', click: actions.newRecording },
        { label: 'Create Project from Video…', click: () => void pickVideo() },
        { type: 'separator' },
        { label: 'Recover Unfinished Recordings', click: () => void actions.recoverUnfinished() },
        { type: 'separator' },
        { label: 'Show Projects Folder', click: () => void shell.openPath(`${app.getPath('home')}/Recscene Projects`) },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Recscene Website', click: () => void shell.openExternal('https://recscene.app') }] }
  ])
  Menu.setApplicationMenu(menu)
}
