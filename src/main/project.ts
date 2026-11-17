import { createReadStream } from 'node:fs'
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
      const [, dirEncoded, fileEncoded] = url.pathname.split('/')
      if (!dirEncoded || !fileEncoded) return new Response('Not found', { status: 404 })
      const dir = resolve(decodeURIComponent(dirEncoded))
      const file = decodeURIComponent(fileEncoded)
      if (!dir.endsWith('.recscene') || file.includes('/') || file.includes('..')) return new Response('Forbidden', { status: 403 })
      const path = join(dir, file)
      const info = await stat(path).catch(() => null)
      if (!info?.isFile()) return new Response('Not found', { status: 404 })
      const type = file.endsWith('.mov') ? 'video/quicktime' : file.endsWith('.m4a') ? 'audio/mp4' : 'application/octet-stream'
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
  }

  get currentDir(): string | null {
    return this.current?.projectDir ?? null
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
        screen: mediaUrl(projectDir, project.recording.screen.file),
        ...(project.recording.microphone && (await has(project.recording.microphone.file)) ? { mic: mediaUrl(projectDir, project.recording.microphone.file) } : {})
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
