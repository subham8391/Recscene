import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { app, globalShortcut } from 'electron'
import { appPrefsFrom, isLowDiskSpace, type AppPrefs } from '@core/appPrefs'
import type { Preferences } from './preferences'

const run = (file: string, args: string[]): Promise<void> =>
  new Promise((resolve) => execFile(file, args, () => resolve()))

/** Where the sound cues live in development and inside the packaged app. */
export function soundPath(name: 'begin-record' | 'end-record'): string {
  const candidates = [join(process.resourcesPath, 'sounds', `${name}.wav`), join(app.getAppPath(), 'resources', 'sounds', `${name}.wav`)]
  return candidates.find((p) => existsSync(p)) ?? candidates[1]!
}

/**
 * What changes around a recording and is put back afterwards (specs 29, 30,
 * 34, 35, 39): Finder desktop icons, the Dock icon, the optional shortcuts,
 * the start and stop sounds, and the free-space watch.
 */
export class RecordingEnvironment {
  private hidDesktop = false
  private hidDock = false
  private suspended: string[] = []
  private diskTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prefs: Preferences,
    private readonly optionalShortcuts: () => { accelerator: string; handler: () => void }[]
  ) {}

  current(): AppPrefs {
    return appPrefsFrom(this.prefs.all())
  }

  async enter(options: { hideDesktop: boolean; projectsRoot: string; onLowDisk: (message: string) => void }): Promise<void> {
    const p = this.current()
    if (options.hideDesktop || p.hideDesktopContentWhileRecording) {
      await run('defaults', ['write', 'com.apple.finder', 'CreateDesktop', '-bool', 'false'])
      await run('killall', ['Finder'])
      this.hidDesktop = true
    }
    if (p.hideAppDockIconWhileRecording && app.dock) {
      app.dock.hide()
      this.hidDock = true
    }
    if (p.blockShortcutsWhileRecording) {
      for (const s of this.optionalShortcuts()) {
        globalShortcut.unregister(s.accelerator)
        this.suspended.push(s.accelerator)
      }
    }
    if (p.playRecordingSounds) void run('afplay', [soundPath('begin-record')])
    this.diskTimer = setInterval(() => {
      void statfs(options.projectsRoot)
        .then((s) => {
          if (isLowDiskSpace(s.bavail * s.bsize)) options.onLowDisk('Recording was stopped because there is not enough disk space to continue recording.')
        })
        .catch(() => undefined)
    }, 5000)
  }

  async leave(): Promise<void> {
    if (this.diskTimer) clearInterval(this.diskTimer)
    this.diskTimer = null
    const p = this.current()
    if (p.playRecordingSounds) void run('afplay', [soundPath('end-record')])
    if (this.hidDesktop) {
      await run('defaults', ['write', 'com.apple.finder', 'CreateDesktop', '-bool', 'true'])
      await run('killall', ['Finder'])
      this.hidDesktop = false
    }
    if (this.hidDock && app.dock) {
      app.dock.show()
      this.hidDock = false
    }
    if (this.suspended.length) {
      for (const s of this.optionalShortcuts()) {
        if (this.suspended.includes(s.accelerator)) globalShortcut.register(s.accelerator, s.handler)
      }
      this.suspended = []
    }
  }
}
