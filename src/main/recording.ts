import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { normaliseEvents, type EventsFile, type Permissions, type RecordingResult, type StartOptions } from '@core/captureProtocol'
import { newProject, recordingFolderName } from '@core/projectFile'
import { addFlag, addMarker, markersFile, pauseClock, resumeClock, startSession, type SessionState } from '@core/recordingSession'
import { importedBundleName, isUnfinishedBundle } from '@core/recovery'
import { appPrefsFrom } from '@core/appPrefs'
import type { ProjectConfig } from '@core/project'
import { CaptureClient, resolveHelperPath } from './capture'
import type { Preferences } from './preferences'

export type RendererStartOptions = Omit<StartOptions, 'outputDir'> & { name?: string; cameraName?: string | null }

let projectsFolderPref: () => unknown = () => undefined

/** Spec 255: the projects folder preference (`projectsFolderPath`) is read through this. */
export function setProjectsFolderSource(read: () => unknown): void {
  projectsFolderPref = read
}

/** Where new recordings, imports and "Save as…" default to; `~/Recscene Projects` unless spec 255 says otherwise. */
export function projectsRoot(): string {
  const pref = projectsFolderPref()
  return typeof pref === 'string' && pref.trim() ? pref : join(app.getPath('home'), 'Recscene Projects')
}

/** Owns the helper process and turns a stop into a project bundle. */
export interface SessionSnapshot extends SessionState {
  /** A short confirmation for the widget, e.g. "Flag added" (specs 22–26). */
  toast: string | null
}

/**
 * Emits 'started' with the start options, 'session' with every SessionSnapshot
 * change, 'stopped' with the result and 'cancelled' when a recording is thrown away.
 */
export class RecordingService extends EventEmitter {
  private client: CaptureClient
  private current: { projectDir: string; createdAt: Date; width: number; height: number; mic: boolean; cameraName: string | null; options: RendererStartOptions; session: SessionState } | null = null
  private busy = false
  private toastTimer: ReturnType<typeof setTimeout> | null = null

  /** Specs 227, 232: supplies the config a new project starts with. */
  configSeed: (() => Promise<ProjectConfig>) | null = null

  constructor(private readonly prefs?: Preferences) {
    super()
    this.client = new CaptureClient({ helperPath: resolveHelperPath(app.getAppPath(), process.resourcesPath, app.isPackaged) })
    this.client.on('warning', (message: string) => this.broadcast('capture:warning', message))
    this.client.on('error', (error: Error) => this.broadcast('capture:warning', error.message))
  }

  permissions(request: boolean): Promise<Permissions> {
    return this.client.permissions(request)
  }

  listTargets(): ReturnType<CaptureClient['listTargets']> {
    return this.client.listTargets()
  }

  /** Spec 8. */
  listCameras(): ReturnType<CaptureClient['listCameras']> {
    return this.client.listCameras()
  }

  /** The camera being recorded right now (for the preview bubble), or null. */
  get cameraName(): string | null {
    return this.current?.cameraName ?? null
  }

  get isRecording(): boolean {
    return this.current !== null
  }

  /** The helper process, shared with export for muxing. */
  get helper(): CaptureClient {
    return this.client
  }

  snapshot(): SessionSnapshot | null {
    return this.current ? { ...this.current.session, toast: this.toast } : null
  }

  private toast: string | null = null

  private publish(toast?: string): void {
    if (toast !== undefined) {
      this.toast = toast
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
        this.toast = null
        this.emit('session', this.snapshot())
      }, 2000)
    }
    this.emit('session', this.snapshot())
  }

  /** Spec 22–24: one operation at a time ("… while another operation is in progress"). */
  private async exclusive<T>(name: string, work: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error(`Cannot ${name} while another operation is in progress`)
    this.busy = true
    try {
      return await work()
    } finally {
      this.busy = false
    }
  }

  async start(options: RendererStartOptions): Promise<{ projectDir: string }> {
    if (this.current) throw new Error('Cannot start recording while another is in progress')
    const createdAt = new Date()
    const projectDir = join(projectsRoot(), recordingFolderName(createdAt))
    await mkdir(projectDir, { recursive: true })
    const started = await this.client.start({ ...options, outputDir: projectDir })
    this.current = { projectDir, createdAt, width: started.width, height: started.height, mic: options.mic ?? false, cameraName: options.cameraName ?? null, options, session: startSession(Date.now()) }
    this.emit('started', options)
    this.publish()
    return { projectDir }
  }

  async pause(): Promise<void> {
    const current = this.current
    if (!current) throw new Error('Cannot pause recording while there is no session')
    await this.exclusive('pause recording', async () => {
      await this.client.pause()
      current.session.clock = pauseClock(current.session.clock, Date.now())
      this.publish('Recording paused')
    })
  }

  async resume(): Promise<void> {
    const current = this.current
    if (!current) throw new Error('Cannot resume recording while there is no session')
    await this.exclusive('resume recording', async () => {
      await this.client.resume()
      current.session.clock = resumeClock(current.session.clock, Date.now())
      this.publish('Recording resumed')
    })
  }

  async addMarker(label?: string): Promise<void> {
    const current = this.current
    if (!current) throw new Error('Cannot add a marker while there is no session')
    const { timeMs } = await this.client.mark('marker')
    current.session.markers = addMarker(current.session.markers, { timeMs, ...(label ? { label } : {}) })
    this.publish('Marker added')
  }

  async addFlag(): Promise<void> {
    const current = this.current
    if (!current) throw new Error('Cannot add a flag while there is no session')
    const { timeMs } = await this.client.mark('flag')
    const before = current.session.flags.length
    current.session.flags = addFlag(current.session.flags, timeMs)
    if (current.session.flags.length > before) this.publish('Flag added')
  }

  /** Spec 24: stop, delete the files and the folder, return to idle. */
  async cancel(): Promise<void> {
    const current = this.current
    if (!current) throw new Error('Cannot cancel recording if not in recording state')
    await this.exclusive('cancel recording', async () => {
      this.current = null
      await this.client.cancel()
      await rm(current.projectDir, { recursive: true, force: true })
      this.emit('cancelled')
    })
  }

  /** Spec 23: discard and start again with the same source and settings. */
  async restart(): Promise<{ projectDir: string }> {
    const current = this.current
    if (!current) throw new Error('Cannot restart recording if not in recording state')
    await this.cancel()
    return this.start(current.options)
  }

  async stop(): Promise<RecordingResult> {
    const current = this.current
    if (!current) throw new Error('Nothing is being recorded')
    this.current = null
    const stopped = await this.exclusive('finish recording', () => this.client.stop())
    const eventsFile = JSON.parse(await readFile(stopped.files.events, 'utf8')) as EventsFile
    const events = normaliseEvents(eventsFile, stopped.durationMs)
    const camera = stopped.files.camera && stopped.cameraWidth && stopped.cameraHeight ? { width: stopped.cameraWidth, height: stopped.cameraHeight, file: basename(stopped.files.camera) } : undefined
    const seed = await this.configSeed?.().catch(() => undefined)
    const project = newProject({
      ...(seed ? { config: seed } : {}),
      id: randomUUID(),
      name: basename(current.projectDir, '.recscene'),
      createdAt: current.createdAt.toISOString(),
      durationMs: stopped.durationMs,
      screen: { width: current.width, height: current.height, file: basename(stopped.files.screen) },
      ...(stopped.files.mic ? { mic: { file: basename(stopped.files.mic) } } : {}),
      ...(camera ? { camera } : {}),
      events,
      flags: current.session.flags
    })
    const projectFile = join(current.projectDir, 'project.json')
    await writeFile(projectFile, JSON.stringify(project, null, 2))
    await writeFile(join(current.projectDir, 'recording-markers.json'), JSON.stringify(markersFile(current.session.markers), null, 2))
    const result: RecordingResult = {
      projectDir: current.projectDir,
      projectFile,
      durationMs: stopped.durationMs,
      frames: stopped.frames,
      width: current.width,
      height: current.height,
      clicks: events.clicks.length,
      keys: events.keys.length,
      cursorSamples: events.cursor.length,
      camera: !!camera
    }
    this.emit('stopped', result)
    return result
  }

  /** Spec 40: `.recscene` folders with footage but no project.json. */
  async unfinishedBundles(): Promise<string[]> {
    const root = projectsRoot()
    const names = await readdir(root).catch(() => [] as string[])
    const found: string[] = []
    for (const name of names) {
      const dir = join(root, name)
      if (!(await stat(dir).then((s) => s.isDirectory()).catch(() => false))) continue
      const files = await readdir(dir).catch(() => [] as string[])
      if (isUnfinishedBundle({ name, files })) found.push(dir)
    }
    return found
  }

  /** Spec 40: turn leftover footage into a project; events may be missing after a crash. */
  async recover(projectDir: string): Promise<RecordingResult> {
    const screen = join(projectDir, 'screen.mov')
    const probed = await this.client.probe(screen)
    const eventsPath = join(projectDir, 'events.json')
    const eventsFile = JSON.parse(await readFile(eventsPath, 'utf8').catch(() => '{"version":1,"region":{"x":0,"y":0,"width":0,"height":0},"clicks":[],"keys":[],"cursor":[]}')) as EventsFile
    const events = normaliseEvents(eventsFile, probed.durationMs)
    const created = await stat(screen).then((s) => s.birthtime).catch(() => new Date())
    const cameraFile = join(projectDir, 'camera.mov')
    const camera = (await stat(cameraFile).then((s) => s.size > 0).catch(() => false)) ? await this.client.probe(cameraFile).then((c) => ({ width: c.width, height: c.height, file: 'camera.mov' })).catch(() => undefined) : undefined
    return this.writeProject(projectDir, { createdAt: created, durationMs: probed.durationMs, width: probed.width, height: probed.height, events, mic: await stat(join(projectDir, 'mic.m4a')).then(() => 'mic.m4a').catch(() => undefined), camera, flags: [], markers: [], frames: 0 })
  }

  /** Spec 7: a project from an existing mp4, mov or gif, with no cursor or click data. */
  async importVideo(path: string): Promise<RecordingResult> {
    const root = projectsRoot()
    await mkdir(root, { recursive: true })
    const existing = await readdir(root).catch(() => [] as string[])
    const projectDir = join(root, importedBundleName(basename(path), existing))
    await mkdir(projectDir, { recursive: true })
    const screen = join(projectDir, 'screen.mov')
    const imported = await this.client.importVideo(path, screen).catch(async (error: unknown) => {
      await rm(projectDir, { recursive: true, force: true })
      throw error
    })
    await writeFile(join(projectDir, 'events.json'), JSON.stringify({ version: 1, region: { x: 0, y: 0, width: imported.width, height: imported.height }, clicks: [], keys: [], cursor: [] }))
    return this.writeProject(projectDir, { createdAt: new Date(), durationMs: imported.durationMs, width: imported.width, height: imported.height, events: { clicks: [], keys: [], cursor: [] }, flags: [], markers: [], frames: 0 })
  }

  private async writeProject(projectDir: string, input: { createdAt: Date; durationMs: number; width: number; height: number; events: ReturnType<typeof normaliseEvents>; mic?: string; camera?: { width: number; height: number; file: string }; flags: number[]; markers: SessionState['markers']; frames: number }): Promise<RecordingResult> {
    const seed = await this.configSeed?.().catch(() => undefined)
    const project = newProject({
      ...(seed ? { config: seed } : {}),
      id: randomUUID(),
      name: basename(projectDir, '.recscene'),
      createdAt: input.createdAt.toISOString(),
      durationMs: input.durationMs,
      screen: { width: input.width, height: input.height, file: 'screen.mov' },
      ...(input.mic ? { mic: { file: input.mic } } : {}),
      ...(input.camera ? { camera: input.camera } : {}),
      events: input.events,
      flags: input.flags,
      autoZoomLevel: this.autoZoomLevel()
    })
    const projectFile = join(projectDir, 'project.json')
    await writeFile(projectFile, JSON.stringify(project, null, 2))
    await writeFile(join(projectDir, 'recording-markers.json'), JSON.stringify(markersFile(input.markers), null, 2))
    return { projectDir, projectFile, durationMs: input.durationMs, frames: input.frames, width: input.width, height: input.height, clicks: input.events.clicks.length, keys: input.events.keys.length, cursorSamples: input.events.cursor.length, camera: !!input.camera }
  }

  /** Specs 102–103, 109: the level automatic zooms are created with, or null to create none. */
  private autoZoomLevel(): number | null {
    const p = appPrefsFrom(this.prefs?.all() ?? {})
    if (!p.createAutomaticZooms) return null
    return p.defaultZoomLevel ?? 2
  }

  dispose(): void {
    this.client.dispose()
  }

  private broadcast(channel: string, payload: unknown): void {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
  }
}
