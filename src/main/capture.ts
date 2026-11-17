import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseHelperLine,
  serializeCommand,
  splitLines,
  type HelperCommand,
  type HelperEvent,
  type Permissions,
  type StartOptions
} from '@core/captureProtocol'

type Terminal = Exclude<HelperEvent, { event: 'warning' }>
type Pending = { resolve: (e: Terminal) => void; reject: (e: Error) => void }

/** Minimal shape of the child process the client drives; a test can fake it. */
export interface HelperProcess {
  stdin: { write(chunk: string): unknown } | null
  stdout: EventEmitter | null
  stderr: EventEmitter | null
  on(event: 'exit', listener: (code: number | null) => void): unknown
  on(event: 'error', listener: (err: Error) => void): unknown
  kill(): unknown
}

export interface CaptureClientOptions {
  helperPath: string
  spawn?: (path: string) => HelperProcess
}

export class CaptureError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'CaptureError'
  }
}

/**
 * Drives the native helper over stdin/stdout. Commands are answered in order,
 * one terminal event each; warnings and unsolicited errors are re-emitted.
 */
export class CaptureClient extends EventEmitter {
  private process: HelperProcess | null = null
  private pending: Pending[] = []
  private buffer = ''
  private readonly helperPath: string
  private readonly spawnFn: (path: string) => HelperProcess

  constructor(options: CaptureClientOptions) {
    super()
    this.helperPath = options.helperPath
    this.spawnFn = options.spawn ?? ((path) => nodeSpawn(path, [], { stdio: ['pipe', 'pipe', 'pipe'] }) as unknown as HelperProcess)
  }

  get running(): boolean {
    return this.process !== null
  }

  private ensure(): HelperProcess {
    if (this.process) return this.process
    const child = this.spawnFn(this.helperPath)
    child.stdout?.on('data', (chunk: Buffer | string) => this.onData(chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer | string) => this.emit('stderr', chunk.toString()))
    child.on('error', (err) => this.fail(new CaptureError('spawn', err.message)))
    child.on('exit', (code) => {
      this.process = null
      this.fail(new CaptureError('exited', `capture helper exited with code ${code ?? 'null'}`))
    })
    this.process = child
    return child
  }

  private onData(text: string): void {
    const { lines, rest } = splitLines(this.buffer, text)
    this.buffer = rest
    for (const line of lines) {
      const event = parseHelperLine(line)
      if (!event) continue
      if (event.event === 'warning') {
        this.emit('warning', event.message)
        continue
      }
      const head = this.pending.shift()
      if (head) head.resolve(event)
      else if (event.event === 'error') this.emit('error', new CaptureError(event.code, event.message))
    }
  }

  private fail(error: Error): void {
    const pending = this.pending
    this.pending = []
    for (const p of pending) p.reject(error)
    if (pending.length === 0 && this.listenerCount('error') > 0) this.emit('error', error)
  }

  private send<T extends Terminal['event']>(command: HelperCommand, expect: T): Promise<Extract<Terminal, { event: T }>> {
    const child = this.ensure()
    return new Promise((resolve, reject) => {
      this.pending.push({
        resolve: (event) => {
          if (event.event === 'error') reject(new CaptureError(event.code, event.message))
          else if (event.event === expect) resolve(event as Extract<Terminal, { event: T }>)
          else reject(new CaptureError('protocol', `expected ${expect}, got ${event.event}`))
        },
        reject
      })
      child.stdin?.write(serializeCommand(command))
    })
  }

  ping(): Promise<{ version: string }> {
    return this.send({ cmd: 'ping' }, 'pong')
  }

  async permissions(request = false): Promise<Permissions> {
    const { screen, inputMonitoring, accessibility, microphone } = await this.send({ cmd: 'permissions', request }, 'permissions')
    return { screen, inputMonitoring, accessibility, microphone }
  }

  listTargets(): Promise<Extract<HelperEvent, { event: 'targets' }>> {
    return this.send({ cmd: 'list' }, 'targets')
  }

  start(options: StartOptions): Promise<Extract<HelperEvent, { event: 'started' }>> {
    return this.send({ cmd: 'start', ...options }, 'started')
  }

  stop(): Promise<Extract<HelperEvent, { event: 'stopped' }>> {
    return this.send({ cmd: 'stop' }, 'stopped')
  }

  pause(): Promise<{ timeMs: number }> {
    return this.send({ cmd: 'pause' }, 'paused')
  }

  resume(): Promise<{ timeMs: number }> {
    return this.send({ cmd: 'resume' }, 'resumed')
  }

  mark(kind: 'marker' | 'flag'): Promise<{ timeMs: number }> {
    return this.send({ cmd: 'mark', kind }, 'marked')
  }

  cancel(): Promise<void> {
    return this.send({ cmd: 'cancel' }, 'cancelled').then(() => undefined)
  }

  dispose(): void {
    this.process?.kill()
    this.process = null
  }
}

/** Where the helper binary lives in development and inside the packaged app. */
export function resolveHelperPath(appPath: string, resourcesPath: string, packaged: boolean): string {
  const candidates = packaged
    ? [join(resourcesPath, 'bin', 'recscene-capture')]
    : [join(appPath, 'native', 'bin', 'recscene-capture'), join(appPath, 'native', 'RecsceneCapture', '.build', 'release', 'recscene-capture')]
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!
}

export type { HelperProcess as CaptureHelperProcess, ChildProcess }
