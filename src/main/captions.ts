import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, ipcMain, shell } from 'electron'
import type { Transcript } from '@core/editor/captions'
import type { CaptureClient } from './capture'
import type { ProjectService } from './project'

/** Specs 205–207, 212: generation through the helper's on-device engine and subtitle files. */
export class CaptionsService {
  constructor(
    private readonly helper: () => CaptureClient,
    private readonly projects: ProjectService
  ) {
    ipcMain.handle('captions:locales', () => this.helper().speechLocales().catch(() => [] as string[]))
    ipcMain.handle('captions:generate', (_e, locale: string | null) => this.generate(locale))
    ipcMain.handle('captions:export', (_e, format: 'srt' | 'vtt' | 'txt', content: string, name: string) => this.exportFile(format, content, name))
  }

  async generate(locale: string | null): Promise<Transcript> {
    const current = this.projects.currentOpened
    if (!current) throw new Error('No project is open')
    const mic = current.project.recording.microphone?.file
    if (!mic) throw new Error('No microphone recorded')
    const r = await this.helper().transcribe(join(current.projectDir, mic), locale)
    return { language: r.language, generatedAt: new Date().toISOString(), words: r.words.map((w) => ({ text: w.text, startMs: Math.round(w.startMs), endMs: Math.round(w.endMs) })) }
  }

  /** Spec 212: "Where to save the transcript?", then the file is revealed in Finder. */
  async exportFile(format: 'srt' | 'vtt' | 'txt', content: string, name: string): Promise<string | null> {
    const result = await dialog.showSaveDialog({ title: 'Where to save the transcript?', defaultPath: join(app.getPath('documents'), `${name}.${format}`), filters: [{ name: format.toUpperCase(), extensions: [format] }] })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content, 'utf8')
    shell.showItemInFolder(result.filePath)
    return result.filePath
  }
}
