import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, nativeTheme, shell, systemPreferences } from 'electron'
import { defaultSettings, diagnosticsReport, effectiveGlobalShortcut, GLOBAL_SHORTCUTS, settingsFrom, shouldHideDock, toElectronAccelerator, type AppSettings, type SettingsTab } from '@core/settings'
import type { Preferences } from './preferences'
import type { RecordingService } from './recording'
import { loadRoute, preloadPath } from './windows'

export interface SettingsHooks {
  recording: RecordingService
  /** Handlers for the global shortcuts, by id (spec 66). */
  globalHandlers: Record<string, () => void>
  /** Editor windows that count for the Dock rule (spec 253). */
  mainWindows: () => BrowserWindow[]
  projectsFolder: () => string
  presetsFolder: () => string
}

const PANES: Record<string, string> = {
  screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  inputMonitoring: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent',
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  files: 'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders'
}

/**
 * The Settings window (⌘,) and everything a preference change has to do in
 * the main process: login item, Dock icon, appearance, global shortcuts.
 */
export class SettingsService {
  private window: BrowserWindow | null = null
  private tab: SettingsTab = 'general'

  constructor(
    private readonly prefs: Preferences,
    private readonly hooks: SettingsHooks
  ) {
    ipcMain.handle('settings:get', () => this.snapshot())
    ipcMain.handle('settings:set', (_e, values: Partial<AppSettings>) => this.set(values))
    ipcMain.handle('settings:tab', () => this.tab)
    ipcMain.handle('settings:open', (_e, tab?: SettingsTab) => this.open(tab))
    ipcMain.handle('settings:openPane', (_e, pane: string) => shell.openExternal(PANES[pane] ?? PANES['screen']!))
    ipcMain.handle('settings:openAppData', () => shell.openPath(app.getPath('userData')))
    ipcMain.handle('settings:openChangelog', () => this.openChangelog())
    ipcMain.handle('settings:reset', () => this.reset())
    ipcMain.handle('settings:copyDiagnostics', () => this.copyDiagnostics())
    ipcMain.handle('settings:checkForUpdates', () => this.checkForUpdates())
    this.applyAll()
  }

  current(): AppSettings {
    return settingsFrom(this.prefs.all())
  }

  private async snapshot(): Promise<AppSettings & { projectsFolder: string; presetsFolder: string; appVersion: string; appData: string; permissions: Record<string, string | boolean> }> {
    const permissions = await this.hooks.recording.permissions(false).catch(() => ({ screen: false, inputMonitoring: false, accessibility: false, microphone: 'notDetermined', camera: 'notDetermined' }))
    return { ...this.current(), projectsFolder: this.hooks.projectsFolder(), presetsFolder: this.hooks.presetsFolder(), appVersion: app.getVersion(), appData: app.getPath('userData'), permissions: { ...permissions } }
  }

  set(values: Partial<AppSettings>): AppSettings {
    this.prefs.set(values as Record<string, unknown>)
    const s = this.current()
    if ('startAtStartup' in values) app.setLoginItemSettings({ openAtLogin: s.startAtStartup })
    if ('appearance' in values) nativeTheme.themeSource = s.appearance
    if ('shortcutOverrides' in values) this.registerGlobalShortcuts()
    if ('hideDockIcon' in values) this.applyDock()
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('prefs:changed', s)
    return s
  }

  /** On launch: appearance, login item and global shortcuts follow the stored preferences. */
  applyAll(): void {
    const s = this.current()
    nativeTheme.themeSource = s.appearance
    this.registerGlobalShortcuts()
    this.applyDock()
  }

  registerGlobalShortcuts(): string[] {
    globalShortcut.unregisterAll()
    const s = this.current()
    const failed: string[] = []
    for (const g of GLOBAL_SHORTCUTS) {
      const handler = this.hooks.globalHandlers[g.id]
      if (!handler) continue
      const acc = toElectronAccelerator(effectiveGlobalShortcut(g.id, s.shortcutOverrides))
      try {
        if (!globalShortcut.register(acc, handler)) failed.push(g.label)
      } catch {
        failed.push(g.label)
      }
    }
    return failed
  }

  /** Spec 253: hide the Dock icon when nothing is open and nothing records; back when a window opens. */
  applyDock(): void {
    if (process.platform !== 'darwin' || !app.dock) return
    const hide = shouldHideDock(this.current(), this.hooks.mainWindows().filter((w) => !w.isDestroyed() && w.isVisible()).length, this.hooks.recording.isRecording)
    if (hide) app.dock.hide()
    else if (!this.hooks.recording.isRecording) app.dock.show()
  }

  open(tab?: SettingsTab): void {
    if (tab) this.tab = tab
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('settings:showTab', this.tab)
      this.window.show()
      this.window.focus()
      return
    }
    const window = new BrowserWindow({
      width: 820,
      height: 600,
      minWidth: 680,
      minHeight: 480,
      title: 'Settings',
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 14 },
      backgroundColor: '#0E0F11',
      show: false,
      webPreferences: { preload: preloadPath(), sandbox: true, contextIsolation: true, nodeIntegration: false }
    })
    window.on('ready-to-show', () => window.show())
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    loadRoute(window, 'settings')
    this.window = window
  }

  private async openChangelog(): Promise<void> {
    const candidates = [join(app.getAppPath(), 'docs', 'CHANGELOG.md'), join(process.resourcesPath, 'CHANGELOG.md')]
    for (const c of candidates) {
      const r = await shell.openPath(c)
      if (!r) return
    }
    await shell.openExternal('https://github.com/subham8391/Recscene/blob/main/docs/CHANGELOG.md')
  }

  /** Spec 269. */
  private async reset(): Promise<AppSettings> {
    const keep = { recentProjects: this.prefs.get('recentProjects') }
    const blank: Record<string, unknown> = {}
    for (const k of Object.keys(this.prefs.all())) blank[k] = undefined
    this.prefs.set({ ...blank, ...keep, ...defaultSettings })
    this.applyAll()
    const s = this.current()
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('prefs:changed', s)
    return s
  }

  /** Spec 257 without a support server: the report goes to the clipboard. */
  private async copyDiagnostics(): Promise<string> {
    const [permissions, cameras, model] = await Promise.all([
      this.hooks.recording.permissions(false).catch(() => ({})),
      this.hooks.recording.listCameras().then((c) => c.map((x) => x.name)).catch(() => [] as string[]),
      new Promise<string>((resolve) => execFile('sysctl', ['-n', 'hw.model'], (_e, out) => resolve((out || '').trim() || 'unknown')))
    ])
    const report = diagnosticsReport({
      appVersion: app.getVersion(),
      macOS: process.getSystemVersion(),
      model,
      arch: process.arch,
      memoryGb: Math.round(process.getSystemMemoryInfo().total / 1024 / 1024),
      cameras,
      microphone: '',
      permissions: permissions as Record<string, string | boolean>,
      email: this.current().diagnosticEmail
    })
    clipboard.writeText(report)
    return report
  }

  /** Specs 259–262 need signed builds and a release feed; until then the check says so. */
  private async checkForUpdates(): Promise<string> {
    const message = `You are using Recscene ${app.getVersion()}. Automatic updates arrive with signed builds; until then, new versions are on GitHub.`
    await dialog.showMessageBox({ type: 'info', message: 'Check for updates', detail: message, buttons: ['OK'] })
    return message
  }

  static mediaStatus(kind: 'camera' | 'microphone'): string {
    return process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus(kind) : 'granted'
  }
}
