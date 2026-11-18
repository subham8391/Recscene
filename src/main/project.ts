import { createReadStream, existsSync } from 'node:fs'
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { basename, dirname, join, resolve } from 'node:path'
import { app, BrowserWindow, clipboard, ClipboardItem, dialog, ipcMain, protocol, shell } from 'electron'
import { normaliseProject, type Project } from '@core/project'
import type { OpenedProject } from '@core/projectFile'
import { markRecent, projectNameFromDir, pruneRecent } from '@core/editor/recentProjects'
import { markersFile, type RecordingMarker } from '@core/recordingSession'
import type { Preferences } from './preferences'
import { projectsRoot } from './recording'

/** Scheme the renderer uses to play project media: recscene-media://project/<encoded project dir>/<file>. */
export const MEDIA_SCHEME = 'recscene-media'

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true, corsEnabled: true } }])
}

export function mediaUrl(projectDir: string, file: string): string {
  return `${MEDIA_SCHEME}://project/${encodeURIComponent(projectDir)}/${encodeURIComponent(file)}`
}

/** Bundled, read-only assets (click sounds, wallpapers): recscene-media://assets/<path under resources>. */
export const ASSETS_URL = `${MEDIA_SCHEME}://assets`
/** Spec 219: recscene-media://library/<file> serves the music library folder. */
export const LIBRARY_URL = `${MEDIA_SCHEME}://library`

function assetsRoot(kind: 'sounds' | 'backgrounds' | 'music'): string {
  const candidates = [join(process.resourcesPath, kind), join(app.getAppPath(), 'resources', kind)]
  return candidates.find((p) => existsSync(p)) ?? candidates[1]!
}

/**
 * Projects on disk (specs 73–76): open, save, save as, recent list, show in
 * Finder, and the media protocol that serves files from inside a bundle only.
 */
export class ProjectService {
  private current: OpenedProject | null = null

  constructor(
    private readonly prefs: Preferences,
    private readonly mainWindow: () => BrowserWindow | null
  ) {
    // Only files directly inside a .recscene bundle are served; anything else is refused.
    // Range requests are honoured so <video> can seek and decode on demand.
    protocol.handle(MEDIA_SCHEME, async (request) => {
      const url = new URL(request.url)
      let path: string
      if (url.host === 'assets') {
        // sounds/clicks/<set>/<file>.wav and backgrounds/<Collection>/<file>.svg only
        const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
        if (/^sounds\/clicks\/[a-z-]+\/(down|up|click)\.wav$/.test(rel)) path = join(assetsRoot('sounds'), rel.slice('sounds/'.length))
        else if (/^backgrounds\/[A-Za-z]+\/[a-z0-9-]+\.svg$/.test(rel)) path = join(assetsRoot('backgrounds'), rel.slice('backgrounds/'.length))
        else if (/^music\/[a-z]+\/[a-z0-9-]+\.m4a$/.test(rel)) path = join(assetsRoot('music'), rel.slice('music/'.length))
        else return new Response('Forbidden', { status: 403 })
      } else if (url.host === 'library') {
        // Spec 219: audio files directly inside the app's music library folder.
        const file = decodeURIComponent(url.pathname).replace(/^\/+/, '')
        if (file.includes('/') || file.includes('..') || !file) return new Response('Forbidden', { status: 403 })
        path = join(app.getPath('userData'), 'music-library', file)
      } else {
        const [, dirEncoded, fileEncoded] = url.pathname.split('/')
        if (!dirEncoded || !fileEncoded) return new Response('Not found', { status: 404 })
        const dir = resolve(decodeURIComponent(dirEncoded))
        const file = decodeURIComponent(fileEncoded)
        if (!dir.endsWith('.recscene') || file.includes('/') || file.includes('..')) return new Response('Forbidden', { status: 403 })
        path = join(dir, file)
      }
      const info = await stat(path).catch(() => null)
      if (!info?.isFile()) return new Response('Not found', { status: 404 })
      const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
      const type = ({ mov: 'video/quicktime', mp4: 'video/mp4', m4a: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg', wav: 'audio/wav', aiff: 'audio/aiff', aif: 'audio/aiff', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' } as Record<string, string>)[ext] ?? 'application/octet-stream'
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
      let start = 0
      let end = info.size - 1
      let status = 200
      if (range) {
        start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]))
        end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1
        if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } })
        status = 206
      }
      const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream
      return new Response(stream, {
        status,
        headers: {
          'Content-Type': type,
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {})
        }
      })
    })
    ipcMain.handle('project:current', () => this.current)
    ipcMain.handle('project:open', (_e, projectDir: string) => this.open(projectDir))
    ipcMain.handle('project:pick', () => this.pickAndOpen())
    ipcMain.handle('project:save', (_e, project: Project) => this.save(project))
    ipcMain.handle('project:saveAs', (_e, project: Project) => this.saveAs(project))
    ipcMain.handle('project:recent', () => this.recent())
    ipcMain.handle('project:showInFinder', () => this.showInFinder())
    ipcMain.handle('project:copyFrame', (_e, png: ArrayBuffer) => this.copyFrame(png))
    ipcMain.handle('project:exportFrame', (_e, png: ArrayBuffer, timeMs: number) => this.exportFrame(png, timeMs))
    ipcMain.handle('project:pickBackgroundImage', () => this.pickBackgroundImage())
    ipcMain.handle('project:importBackgroundImage', (_e, source: string | ArrayBuffer) => this.importBackgroundImage(source))
    ipcMain.handle('project:close', () => this.close())
    ipcMain.handle('project:mediaUrl', (_e, file: string) => (this.current ? mediaUrl(this.current.projectDir, file) : null))
  }

  get currentDir(): string | null {
    return this.current?.projectDir ?? null
  }

  get currentOpened(): OpenedProject | null {
    return this.current
  }

  async recent(): Promise<{ projectDir: string; name: string }[]> {
    const raw = this.prefs.get('recentProjects')
    const list = Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : []
    const existing: string[] = []
    for (const p of list) if (await stat(join(p, 'project.json')).then(() => true).catch(() => false)) existing.push(p)
    const pruned = pruneRecent(list, (p) => existing.includes(p))
    if (pruned.length !== list.length) this.prefs.set({ recentProjects: pruned })
    return pruned.map((projectDir) => ({ projectDir, name: projectNameFromDir(projectDir) }))
  }

  async open(projectDir: string): Promise<OpenedProject> {
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(join(projectDir, 'project.json'), 'utf8'))
    } catch {
      await dialog.showMessageBox({ type: 'error', message: 'Failed to open project', detail: 'Project file was not found. It might have been moved or deleted.' })
      throw new Error('Project file was not found')
    }
    const project = normaliseProject(raw)
    const markers = await readFile(join(projectDir, 'recording-markers.json'), 'utf8')
      .then((t) => (JSON.parse(t) as { markers?: RecordingMarker[] }).markers ?? [])
      .catch(() => [] as RecordingMarker[])
    const has = async (f: string): Promise<boolean> => stat(join(projectDir, f)).then(() => true).catch(() => false)
    const cursor = await readFile(join(projectDir, 'events.json'), 'utf8')
      .then((text) => {
        const parsed = JSON.parse(text) as { cursor?: { timeMs: number; x: number; y: number }[] }
        return Array.isArray(parsed.cursor) ? parsed.cursor.filter((s) => Number.isFinite(s.timeMs) && Number.isFinite(s.x) && Number.isFinite(s.y)) : []
      })
      .catch(() => [] as { timeMs: number; x: number; y: number }[])
    const opened: OpenedProject = {
      projectDir,
      project,
      markers,
      cursor,
      media: {
        assets: ASSETS_URL,
        library: LIBRARY_URL,
        screen: mediaUrl(projectDir, project.recording.screen.file),
        ...(project.recording.microphone && (await has(project.recording.microphone.file)) ? { mic: mediaUrl(projectDir, project.recording.microphone.file) } : {}),
        ...(project.recording.camera && (await has(project.recording.camera.file)) ? { camera: mediaUrl(projectDir, project.recording.camera.file) } : {})
      }
    }
    this.current = opened
    const list = this.prefs.get('recentProjects')
    this.prefs.set({ recentProjects: markRecent(Array.isArray(list) ? (list as string[]) : [], projectDir) })
    const window = this.mainWindow()
    if (window) {
      window.webContents.send('project:opened', opened)
      window.show()
      window.focus()
    }
    return opened
  }

  /** Back to the projects home: the editor saved already (spec 73's autosave) or asked. */
  close(): void {
    this.current = null
    this.mainWindow()?.webContents.send('project:closed')
  }

  async pickAndOpen(): Promise<OpenedProject | null> {
    const result = await dialog.showOpenDialog({ title: 'Open project', defaultPath: projectsRoot(), properties: ['openDirectory'], message: 'Choose a .recscene project' })
    const dir = result.filePaths[0]
    if (result.canceled || !dir) return null
    const target = dir.endsWith('.recscene') ? dir : dirname(dir).endsWith('.recscene') ? dirname(dir) : dir
    return this.open(target)
  }

  async openLast(): Promise<void> {
    const [last] = await this.recent()
    if (last) await this.open(last.projectDir)
  }

  /** Spec 74: writes project.json and stamps lastSavedAt. */
  async save(project: Project): Promise<{ lastSavedAt: string }> {
    const current = this.current
    if (!current) throw new Error('No project is open')
    const lastSavedAt = new Date().toISOString()
    const saved: Project = { ...project, updatedAt: project.updatedAt ?? lastSavedAt, lastSavedAt }
    await writeFile(join(current.projectDir, 'project.json'), JSON.stringify(saved, null, 2))
    current.project = saved
    return { lastSavedAt }
  }

  /** Spec 74: copies the whole bundle to a new location and opens it. */
  async saveAs(project: Project): Promise<OpenedProject | null> {
    const current = this.current
    if (!current) throw new Error('No project is open')
    const result = await dialog.showSaveDialog({ title: 'Save project as…', message: 'Pick location to save project', defaultPath: join(projectsRoot(), `${project.name}.recscene`), nameFieldLabel: 'Project name' })
    if (result.canceled || !result.filePath) return null
    const target = result.filePath.endsWith('.recscene') ? result.filePath : `${result.filePath}.recscene`
    await mkdir(dirname(target), { recursive: true })
    await cp(current.projectDir, target, { recursive: true })
    const renamed: Project = { ...project, name: basename(target, '.recscene') }
    await writeFile(join(target, 'project.json'), JSON.stringify({ ...renamed, lastSavedAt: new Date().toISOString() }, null, 2))
    await writeFile(join(target, 'recording-markers.json'), JSON.stringify(markersFile(current.markers), null, 2))
    return this.open(target)
  }

  /** Spec 167: a png or jpg is copied into the bundle as background-<n>.<ext>; returns its file name and media url. */
  async importBackgroundImage(source: string | ArrayBuffer): Promise<{ file: string; url: string }> {
    const current = this.current
    if (!current) throw new Error('No project is open')
    const ext = typeof source === 'string' ? source.slice(source.lastIndexOf('.') + 1).toLowerCase() : 'png'
    if (!['png', 'jpg', 'jpeg'].includes(ext)) throw new Error('Invalid mime type')
    const file = `background-${Date.now().toString(36)}.${ext}`
    const target = join(current.projectDir, file)
    try {
      if (typeof source === 'string') await cp(source, target)
      else await writeFile(target, Buffer.from(source))
    } catch {
      throw new Error('Error copying file to project')
    }
    return { file, url: mediaUrl(current.projectDir, file) }
  }

  async pickBackgroundImage(): Promise<{ file: string; url: string } | null> {
    const result = await dialog.showOpenDialog({ title: 'Choose a background image', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    return this.importBackgroundImage(path)
  }

  async showInFinder(): Promise<void> {
    if (this.current) shell.showItemInFolder(join(this.current.projectDir, 'project.json'))
  }

  /** Spec 77. */
  async copyFrame(png: ArrayBuffer): Promise<void> {
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })])
  }

  /** Spec 78. */
  async exportFrame(png: ArrayBuffer, timeMs: number): Promise<string | null> {
    const name = this.current ? this.current.project.name : 'Frame'
    const seconds = (timeMs / 1000).toFixed(2)
    const result = await dialog.showSaveDialog({ title: 'Export current frame', defaultPath: join(app.getPath('pictures'), `${name} - Frame ${seconds}s.png`), filters: [{ name: 'PNG image', extensions: ['png'] }] })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, Buffer.from(png))
    return result.filePath
  }
}
