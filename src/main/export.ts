import { mkdir, open, rename, rm, writeFile, type FileHandle } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { existsSync } from 'node:fs'
import { app, BrowserWindow, clipboard, ClipboardItem, dialog, ipcMain, shell } from 'electron'
import { substitutePlaceholders, type ExportSettings, type ExportTarget } from '@core/editor/exportSettings'
import type { CaptureClient } from './capture'
import type { Preferences } from './preferences'

export interface ExportJob {
  id: string
  target: ExportTarget
  /** Final destination for a file export; for the clipboard it is the temp exports folder. */
  destination: string
  settings: ExportSettings
}

/**
 * The file side of an export (specs 233, 240–241, 245): the renderer encodes
 * video and mixes audio, streams the MP4 (or GIF) here in chunks, and the
 * helper joins the audio in. Settings persist as the last used and, when
 * asked, as the defaults for quick export.
 */
export class ExportService {
  private jobs = new Map<string, { job: ExportJob; video: FileHandle; videoPath: string; audioPath: string | null; dir: string }>()

  constructor(
    private readonly prefs: Preferences,
    private readonly client: () => CaptureClient,
    private readonly mainWindow: () => BrowserWindow | null
  ) {
    ipcMain.handle('export:settings', () => ({ last: this.prefs.get('exportSettings') ?? null, defaults: this.prefs.get('defaultExportSettings') ?? null }))
    ipcMain.handle('export:saveSettings', (_e, settings: ExportSettings, asDefault: boolean) => this.prefs.set(asDefault ? { exportSettings: settings, defaultExportSettings: settings } : { exportSettings: settings }))
    ipcMain.handle('export:begin', (_e, args: { target: ExportTarget; projectName: string; settings: ExportSettings; size: { width: number; height: number } }) => this.begin(args))
    ipcMain.handle('export:chunk', (_e, id: string, chunk: ArrayBuffer, position: number) => this.chunk(id, chunk, position))
    ipcMain.handle('export:audio', (_e, id: string, wav: ArrayBuffer) => this.audio(id, wav))
    ipcMain.handle('export:finish', (_e, id: string) => this.finish(id))
    ipcMain.handle('export:cancel', (_e, id: string) => this.cancel(id))
    ipcMain.handle('export:reveal', (_e, path: string) => shell.showItemInFolder(path))
  }

  private clipboardDir(): string {
    return join(app.getPath('temp'), 'recscene-clipboard-exports')
  }

  /** Picks the destination (a save dialog for files) and opens the temp video file. */
  private async begin(args: { target: ExportTarget; projectName: string; settings: ExportSettings; size: { width: number; height: number } }): Promise<ExportJob | null> {
    if (this.jobs.size > 0) throw new Error('Only one export can be active at a time')
    const ext = args.settings.format
    const name = substitutePlaceholders(args.projectName, args.size, args.settings.fps)
    let destination: string
    if (args.target === 'file') {
      const result = await dialog.showSaveDialog({ title: 'Export video', defaultPath: join(app.getPath('home'), 'Movies', 'Recscene', `${name}.${ext}`), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
      if (result.canceled || !result.filePath) return null
      destination = result.filePath.endsWith(`.${ext}`) ? result.filePath : `${result.filePath}.${ext}`
    } else if (args.target === 'quick') {
      // Specs 42–43: the quick export widget saves without asking, into the Movies folder.
      const dir = join(app.getPath('home'), 'Movies', 'Recscene')
      await mkdir(dir, { recursive: true })
      destination = join(dir, `${name}.${ext}`)
      for (let n = 2; existsSync(destination); n += 1) destination = join(dir, `${name} ${n}.${ext}`)
    } else {
      await mkdir(this.clipboardDir(), { recursive: true })
      destination = join(this.clipboardDir(), `${name} ${Date.now().toString(36)}.${ext}`)
    }
    const id = `export-${Date.now().toString(36)}`
    const dir = join(app.getPath('temp'), 'recscene-exports', id)
    await mkdir(dir, { recursive: true })
    const videoPath = join(dir, `video.${ext}`)
    const video = await open(videoPath, 'w')
    const job: ExportJob = { id, target: args.target, destination, settings: args.settings }
    this.jobs.set(id, { job, video, videoPath, audioPath: null, dir })
    return job
  }

  private async chunk(id: string, chunk: ArrayBuffer, position: number): Promise<void> {
    const j = this.jobs.get(id)
    if (!j) throw new Error('Export was cancelled')
    await j.video.write(Buffer.from(chunk), 0, chunk.byteLength, position)
  }

  private async audio(id: string, wav: ArrayBuffer): Promise<void> {
    const j = this.jobs.get(id)
    if (!j) throw new Error('Export was cancelled')
    j.audioPath = join(j.dir, 'audio.wav')
    await writeFile(j.audioPath, Buffer.from(wav))
  }

  /** Joins audio (MP4 only), moves the file into place and, for the clipboard target, puts it on the pasteboard. */
  private async finish(id: string): Promise<{ path: string; durationMs: number | null }> {
    const j = this.jobs.get(id)
    if (!j) throw new Error('Export was cancelled')
    await j.video.close()
    await mkdir(join(j.job.destination, '..'), { recursive: true })
    let durationMs: number | null = null
    if (j.job.settings.format === 'mp4') {
      const muxed = await this.client().mux(j.videoPath, j.audioPath, j.job.destination)
      durationMs = muxed.durationMs
    } else {
      await rename(j.videoPath, j.job.destination)
    }
    await rm(j.dir, { recursive: true, force: true })
    this.jobs.delete(id)
    if (j.job.target === 'clipboard') {
      try {
        await clipboard.write([new ClipboardItem({ 'public.file-url': `file://${j.job.destination}`, 'text/plain': j.job.destination })])
      } catch {
        shell.showItemInFolder(j.job.destination)
      }
    }
    return { path: j.job.destination, durationMs }
  }

  private async cancel(id: string): Promise<void> {
    const j = this.jobs.get(id)
    if (!j) return
    this.jobs.delete(id)
    await j.video.close().catch(() => undefined)
    await rm(j.dir, { recursive: true, force: true })
  }

  openRecentClipboardExports(): void {
    void shell.openPath(this.clipboardDir())
  }

  /** Drops any export still in flight when the app quits. */
  dispose(): void {
    for (const id of [...this.jobs.keys()]) void this.cancel(id)
  }

  static fileName(path: string): string {
    return basename(path)
  }
}
