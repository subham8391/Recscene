import { cp, readdir, readFile, rename, rm, stat, statfs, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import { normaliseProject } from '@core/project'
import { checkProjectName, duplicateName, type ProjectSummary, type UnfinishedRecording } from '@core/projectsHome'
import { IMPORTABLE_EXTENSIONS, isUnfinishedBundle } from '@core/recovery'
import type { Preferences } from './preferences'
import { mediaUrl } from './project'
import { projectsRoot, type RecordingService } from './recording'

export interface LibraryHooks {
  /** A recovered or imported recording opens in the editor (spec 41). */
  showResult: (result: RecordingResult, notice?: string | null) => void
  importVideo: (path: string) => Promise<void>
  mainWindow: () => BrowserWindow | null
  /** Called after a rename, duplicate or trash so the File › Open Recent menu matches the folder. */
  refreshMenu: () => void
}

/**
 * The projects home (Projects board; specs 7, 40, 75, 255): every `.recscene`
 * bundle in the projects folder, storage, rename, duplicate, trash, cached
 * thumbnails, unfinished recordings and the projects folder preference.
 */
export class LibraryService {
  constructor(
    private readonly prefs: Preferences,
    private readonly recording: RecordingService,
    private readonly hooks: LibraryHooks
  ) {
    ipcMain.handle('library:list', () => this.list())
    ipcMain.handle('library:storage', () => this.storage())
    ipcMain.handle('library:rename', (_e, projectDir: string, name: string) => this.rename(projectDir, name))
    ipcMain.handle('library:duplicate', (_e, projectDir: string) => this.duplicate(projectDir))
    ipcMain.handle('library:trash', (_e, projectDir: string) => this.trash(projectDir))
    ipcMain.handle('library:showInFinder', (_e, projectDir: string) => shell.showItemInFolder(join(projectDir, 'project.json')))
    ipcMain.handle('library:saveThumbnail', (_e, projectDir: string, png: ArrayBuffer) => this.saveThumbnail(projectDir, png))
    ipcMain.handle('library:unfinished', () => this.unfinished())
    ipcMain.handle('library:recover', (_e, dir: string) => this.recover(dir))
    ipcMain.handle('library:deleteUnfinished', (_e, dir: string) => this.deleteUnfinished(dir))
    ipcMain.handle('library:createFromVideo', () => this.createFromVideo())
    ipcMain.handle('library:folder', () => this.folder())
    ipcMain.handle('library:chooseFolder', () => this.chooseFolder())
    ipcMain.handle('library:resetFolder', () => this.setFolder(null))
  }

  /** Bundle folders directly inside the projects folder. */
  private async bundles(): Promise<string[]> {
    const root = projectsRoot()
    const names = await readdir(root).catch(() => [] as string[])
    const dirs: string[] = []
    for (const name of names) {
      if (!name.endsWith('.recscene')) continue
      const dir = join(root, name)
      if (await stat(dir).then((s) => s.isDirectory()).catch(() => false)) dirs.push(dir)
    }
    return dirs
  }

  private async bundleSize(dir: string): Promise<number> {
    const files = await readdir(dir).catch(() => [] as string[])
    let total = 0
    for (const f of files) total += await stat(join(dir, f)).then((s) => (s.isFile() ? s.size : 0)).catch(() => 0)
    return total
  }

  private async summarise(dir: string): Promise<ProjectSummary | null> {
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(join(dir, 'project.json'), 'utf8'))
    } catch {
      return null
    }
    const project = normaliseProject(raw)
    const dirInfo = await stat(dir).catch(() => null)
    const updatedAt = project.updatedAt ?? project.lastSavedAt ?? project.recording.createdAt ?? (dirInfo ? dirInfo.mtime.toISOString() : new Date(0).toISOString())
    const hasThumbnail = await stat(join(dir, 'thumbnail.png')).then((s) => s.isFile()).catch(() => false)
    return {
      projectDir: dir,
      name: project.name || basename(dir, '.recscene'),
      durationMs: project.recording.durationMs,
      updatedAt,
      sizeBytes: await this.bundleSize(dir),
      height: project.recording.screen.height,
      aspect: project.config.defaultOutputAspectRatio ?? 'auto',
      noCursor: await readFile(join(dir, 'events.json'), 'utf8')
        .then((t) => !((JSON.parse(t) as { cursor?: unknown[] }).cursor?.length))
        .catch(() => true),
      thumbnail: hasThumbnail ? mediaUrl(dir, 'thumbnail.png') : null,
      screen: mediaUrl(dir, project.recording.screen.file)
    }
  }

  async list(): Promise<ProjectSummary[]> {
    const out: ProjectSummary[] = []
    for (const dir of await this.bundles()) {
      const s = await this.summarise(dir)
      if (s) out.push(s)
    }
    return out
  }

  /** Bytes used by every bundle and bytes free on the projects volume (spec 39's path). */
  async storage(): Promise<{ usedBytes: number; freeBytes: number }> {
    let usedBytes = 0
    for (const dir of await this.bundles()) usedBytes += await this.bundleSize(dir)
    const freeBytes = await statfs(projectsRoot()).then((s) => s.bavail * s.bsize).catch(() => 0)
    return { usedBytes, freeBytes }
  }

  private async names(): Promise<string[]> {
    return (await this.bundles()).map((d) => basename(d, '.recscene'))
  }

  private recentList(): string[] {
    const raw = this.prefs.get('recentProjects')
    return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : []
  }

  /** Renames the bundle folder and the name inside project.json; the recent list follows. */
  async rename(projectDir: string, input: string): Promise<{ projectDir: string; name: string }> {
    const current = basename(projectDir, '.recscene')
    const check = checkProjectName(input, await this.names(), current)
    if (!check.ok) throw new Error(check.reason)
    const target = join(dirname(projectDir), `${check.name}.recscene`)
    if (target !== projectDir) await rename(projectDir, target)
    const file = join(target, 'project.json')
    const project = normaliseProject(JSON.parse(await readFile(file, 'utf8')))
    await writeFile(file, JSON.stringify({ ...project, name: check.name, updatedAt: new Date().toISOString() }, null, 2))
    this.prefs.set({ recentProjects: this.recentList().map((p) => (p === projectDir ? target : p)) })
    this.hooks.refreshMenu()
    return { projectDir: target, name: check.name }
  }

  /** Copies the bundle to "<name> copy.recscene" with the new name inside. */
  async duplicate(projectDir: string): Promise<{ projectDir: string; name: string }> {
    const name = duplicateName(basename(projectDir, '.recscene'), await this.names())
    const target = join(dirname(projectDir), `${name}.recscene`)
    await cp(projectDir, target, { recursive: true })
    const file = join(target, 'project.json')
    const project = normaliseProject(JSON.parse(await readFile(file, 'utf8')))
    await writeFile(file, JSON.stringify({ ...project, name, updatedAt: new Date().toISOString() }, null, 2))
    this.hooks.refreshMenu()
    return { projectDir: target, name }
  }

  /** Moves the bundle to the macOS Trash and forgets it in the recent list. */
  async trash(projectDir: string): Promise<void> {
    await shell.trashItem(projectDir)
    this.prefs.set({ recentProjects: this.recentList().filter((p) => p !== projectDir) })
    this.hooks.refreshMenu()
  }

  /** The renderer draws a frame of the footage once; it is cached inside the bundle. */
  async saveThumbnail(projectDir: string, png: ArrayBuffer): Promise<string> {
    if (!projectDir.endsWith('.recscene')) throw new Error('Not a project bundle')
    await writeFile(join(projectDir, 'thumbnail.png'), Buffer.from(png))
    return mediaUrl(projectDir, 'thumbnail.png')
  }

  /** Spec 40: footage without a project file, newest first. */
  async unfinished(): Promise<UnfinishedRecording[]> {
    const out: UnfinishedRecording[] = []
    for (const dir of await this.recording.unfinishedBundles()) {
      const startedAt = await stat(join(dir, 'screen.mov')).then((s) => s.birthtime.toISOString()).catch(() => new Date(0).toISOString())
      out.push({ dir, name: basename(dir, '.recscene'), startedAt })
    }
    return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  }

  async recover(dir: string): Promise<{ ok: boolean; message: string }> {
    const files = await readdir(dir).catch(() => [] as string[])
    if (!isUnfinishedBundle({ name: basename(dir), files })) return { ok: false, message: 'Recording was already recovered or deleted' }
    try {
      const result = await this.recording.recover(dir)
      this.hooks.showResult(result, 'Recording was recovered from an error and will be opened now.')
      return { ok: true, message: 'Recording recovered' }
    } catch {
      return { ok: false, message: `Recording can't be recovered (${basename(dir, '.recscene')})` }
    }
  }

  async deleteUnfinished(dir: string): Promise<void> {
    const files = await readdir(dir).catch(() => [] as string[])
    if (!isUnfinishedBundle({ name: basename(dir), files })) throw new Error('Not an unfinished recording')
    await rm(dir, { recursive: true, force: true })
  }

  /** Spec 7 from the home: pick a video and build a project around it. */
  async createFromVideo(): Promise<void> {
    const result = await dialog.showOpenDialog({ title: 'Select video file', properties: ['openFile'], filters: [{ name: 'Video or GIF', extensions: [...IMPORTABLE_EXTENSIONS] }] })
    const file = result.filePaths[0]
    if (!result.canceled && file) await this.hooks.importVideo(file)
  }

  /** Spec 255: the projects folder, whether it is the default, and a warning when it is on another volume. */
  async folder(): Promise<{ path: string; isDefault: boolean; outsideMainStorage: boolean }> {
    const path = projectsRoot()
    const isDefault = typeof this.prefs.get('projectsFolderPath') !== 'string'
    const [here, home] = await Promise.all([stat(path).catch(() => null), stat(app.getPath('home')).catch(() => null)])
    return { path, isDefault, outsideMainStorage: here !== null && home !== null && here.dev !== home.dev }
  }

  async chooseFolder(): Promise<{ path: string; isDefault: boolean; outsideMainStorage: boolean }> {
    const result = await dialog.showOpenDialog({ title: 'Select a folder to save your projects', buttonLabel: 'Select folder', defaultPath: projectsRoot(), properties: ['openDirectory', 'createDirectory'] })
    const dir = result.filePaths[0]
    if (!result.canceled && dir) await this.setFolder(dir)
    return this.folder()
  }

  async setFolder(path: string | null): Promise<void> {
    if (path === null) this.prefs.set({ projectsFolderPath: null })
    else this.prefs.set({ projectsFolderPath: path })
    this.hooks.refreshMenu()
  }
}
