import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { normaliseEvents, type EventsFile, type Permissions, type RecordingResult, type StartOptions } from '@core/captureProtocol'
import { newProject, recordingFolderName } from '@core/projectFile'
import { CaptureClient, resolveHelperPath } from './capture'

export type RendererStartOptions = Omit<StartOptions, 'outputDir'> & { name?: string }

export function projectsRoot(): string {
  return join(app.getPath('home'), 'Recscene Projects')
}

/** Owns the helper process and turns a stop into a project bundle. */
/** Emits 'started' with the start options and 'stopped' with the result. */
export class RecordingService extends EventEmitter {
  private client: CaptureClient
  private current: { projectDir: string; createdAt: Date; width: number; height: number; mic: boolean } | null = null

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

  async start(options: RendererStartOptions): Promise<{ projectDir: string }> {
    if (this.current) throw new Error('Cannot start recording while another is in progress')
    const createdAt = new Date()
    const projectDir = join(projectsRoot(), recordingFolderName(createdAt))
    await mkdir(projectDir, { recursive: true })
    const started = await this.client.start({ ...options, outputDir: projectDir })
    this.current = { projectDir, createdAt, width: started.width, height: started.height, mic: options.mic ?? false }
    this.emit('started', options)
    return { projectDir }
  }

  async stop(): Promise<RecordingResult> {
    const current = this.current
    if (!current) throw new Error('Nothing is being recorded')
    this.current = null
    const stopped = await this.client.stop()
    const eventsFile = JSON.parse(await readFile(stopped.files.events, 'utf8')) as EventsFile
    const events = normaliseEvents(eventsFile, stopped.durationMs)
    const project = newProject({
      id: randomUUID(),
      name: basename(current.projectDir, '.recscene'),
      createdAt: current.createdAt.toISOString(),
      durationMs: stopped.durationMs,
      screen: { width: current.width, height: current.height, file: basename(stopped.files.screen) },
      ...(stopped.files.mic ? { mic: { file: basename(stopped.files.mic) } } : {}),
      events
    })
    const projectFile = join(current.projectDir, 'project.json')
    await writeFile(projectFile, JSON.stringify(project, null, 2))
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
