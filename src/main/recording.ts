import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'
import { normaliseEvents, type EventsFile, type Permissions, type RecordingResult, type StartOptions } from '@core/captureProtocol'
import { newProject, recordingFolderName } from '@core/projectFile'
import { CaptureClient, resolveHelperPath } from './capture'

export type RendererStartOptions = Omit<StartOptions, 'outputDir'> & { name?: string }

export function projectsRoot(): string {
  return join(app.getPath('home'), 'Recscene Projects')
}

/** Owns the helper process and turns a stop into a project bundle. */
export class RecordingService {
  private client: CaptureClient
  private current: { projectDir: string; createdAt: Date; width: number; height: number; mic: boolean; window: BrowserWindow | null } | null = null

  constructor() {
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

  async start(options: RendererStartOptions, window: BrowserWindow | null): Promise<{ projectDir: string }> {
    if (this.current) throw new Error('A recording is already running')
    const createdAt = new Date()
    const projectDir = join(projectsRoot(), recordingFolderName(createdAt))
    await mkdir(projectDir, { recursive: true })
    // The app's own window should not end up in a display recording.
    if (options.target.kind === 'display') window?.minimize()
    try {
      const started = await this.client.start({ ...options, outputDir: projectDir })
      this.current = { projectDir, createdAt, width: started.width, height: started.height, mic: options.mic ?? false, window }
      return { projectDir }
    } catch (error) {
      window?.restore()
      throw error
    }
  }

  async stop(): Promise<RecordingResult> {
    const current = this.current
    if (!current) throw new Error('Nothing is being recorded')
    this.current = null
    const stopped = await this.client.stop()
    current.window?.restore()
    current.window?.focus()
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
    return {
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
  }

  dispose(): void {
    this.client.dispose()
  }

  private broadcast(channel: string, payload: unknown): void {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
  }
}

export function registerRecordingIpc(service: RecordingService): void {
  ipcMain.handle('capture:permissions', (_e, request: boolean) => service.permissions(request))
  ipcMain.handle('capture:list', () => service.listTargets())
  ipcMain.handle('capture:start', (event, options: RendererStartOptions) =>
    service.start(options, BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle('capture:stop', () => service.stop())
  ipcMain.handle('capture:projectsRoot', () => projectsRoot())
}
