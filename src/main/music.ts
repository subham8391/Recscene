import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog, ipcMain, shell } from 'electron'
import { AUDIO_EXTENSIONS, isAudioFile, type MusicTrack } from '@core/editor/audio'
import { mediaUrl } from './project'

/** The bundled background music (spec 218) and the user's own library folder (spec 219). */
export function musicRoot(): string {
  const candidates = [join(process.resourcesPath, 'music'), join(app.getAppPath(), 'resources', 'music')]
  return candidates.find((p) => existsSync(p)) ?? candidates[1]!
}

/** Spec 219: an app-managed folder; files dropped there show in the Library tab. */
export function musicLibraryDir(): string {
  return join(app.getPath('userData'), 'music-library')
}

export class MusicService {
  constructor(private readonly currentProjectDir: () => string | null) {
    ipcMain.handle('music:catalogue', () => this.catalogue())
    ipcMain.handle('music:library', () => this.library())
    ipcMain.handle('music:openLibraryFolder', () => this.openLibraryFolder())
    ipcMain.handle('music:pickFile', () => this.pickFile())
    ipcMain.handle('music:importFile', (_e, path: string) => this.importFile(path))
  }

  async catalogue(): Promise<MusicTrack[]> {
    try {
      return JSON.parse(await readFile(join(musicRoot(), 'catalogue.json'), 'utf8')) as MusicTrack[]
    } catch {
      return []
    }
  }

  async library(): Promise<string[]> {
    const dir = musicLibraryDir()
    await mkdir(dir, { recursive: true })
    return (await readdir(dir).catch(() => [] as string[])).filter((f) => !f.startsWith('.') && isAudioFile(f)).sort()
  }

  async openLibraryFolder(): Promise<void> {
    const dir = musicLibraryDir()
    await mkdir(dir, { recursive: true })
    await shell.openPath(dir)
  }

  /** Spec 218's own file: copied into the project bundle as music-<n>.<ext>; returns the stored name and its url. */
  async importFile(path: string): Promise<{ file: string; url: string }> {
    const projectDir = this.currentProjectDir()
    if (!projectDir) throw new Error('No project is open')
    if (!isAudioFile(path)) throw new Error('Not an audio file')
    const file = `music-${Date.now().toString(36)}.${path.split('.').pop()!.toLowerCase()}`
    await cp(path, join(projectDir, file))
    return { file, url: mediaUrl(projectDir, file) }
  }

  async pickFile(): Promise<{ file: string; url: string } | null> {
    const result = await dialog.showOpenDialog({ title: 'Add background audio', properties: ['openFile'], filters: [{ name: 'Audio', extensions: [...AUDIO_EXTENSIONS] }] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    return this.importFile(path)
  }

  static fileName(path: string): string {
    return basename(path)
  }
}
