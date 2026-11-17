import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { normaliseEvents, type EventsFile, type Permissions, type RecordingResult, type StartOptions } from '@core/captureProtocol'
import { newProject, recordingFolderName } from '@core/projectFile'
import { addFlag, addMarker, markersFile, pauseClock, resumeClock, startSession, type SessionState } from '@core/recordingSession'
import { CaptureClient, resolveHelperPath } from './capture'

export type RendererStartOptions = Omit<StartOptions, 'outputDir'> & { name?: string }

export function projectsRoot(): string {
  return join(app.getPath('home'), 'Recscene Projects')
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
  private current: { projectDir: string; createdAt: Date; width: number; height: number; mic: boolean; options: RendererStartOptions; session: SessionState } | null = null
  private busy = false
  private toastTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
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

  get isRecording(): boolean {
    return this.current !== null
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
    this.current = { projectDir, createdAt, width: started.width, height: started.height, mic: options.mic ?? false, options, session: startSession(Date.now()) }
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
    const project = newProject({
      id: randomUUID(),
      name: basename(current.projectDir, '.recscene'),
      createdAt: current.createdAt.toISOString(),
      durationMs: stopped.durationMs,
      screen: { width: current.width, height: current.height, file: basename(stopped.files.screen) },
      ...(stopped.files.mic ? { mic: { file: basename(stopped.files.mic) } } : {}),
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
      cursorSamples: events.cursor.length
    }
    this.emit('stopped', result)
    return result
  }

  dispose(): void {
    this.client.dispose()
  }

  private broadcast(channel: string, payload: unknown): void {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
  }
}
