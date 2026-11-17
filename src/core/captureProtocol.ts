/**
 * The line-delimited JSON protocol spoken by the native helper
 * (native/RecsceneCapture). Pure parsing and types, shared by main and renderer.
 */
import type { ClickEvent, KeyEvent, Point } from './project'

export interface DisplayTarget {
  id: number
  x: number
  y: number
  width: number
  height: number
  scale: number
  isMain: boolean
}

export interface WindowTarget {
  id: number
  title: string
  app: string
  bundleId: string
  pid: number
  x: number
  y: number
  width: number
  height: number
}

export type CaptureTarget =
  | { kind: 'display'; id: number }
  | { kind: 'window'; id: number }
  | { kind: 'area'; displayId: number; x: number; y: number; width: number; height: number }

export interface StartOptions {
  target: CaptureTarget
  outputDir: string
  mic?: boolean
  systemAudio?: boolean
  fps?: number
  showCursor?: boolean
  codec?: 'h264' | 'hevc'
  /** Process ids whose windows are excluded from a display or area capture. */
  excludeProcessIds?: number[]
}

export type HelperCommand =
  | { cmd: 'ping' }
  | { cmd: 'permissions'; request?: boolean }
  | { cmd: 'list' }
  | ({ cmd: 'start' } & StartOptions)
  | { cmd: 'stop' }
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  | { cmd: 'mark'; kind: 'marker' | 'flag' }
  | { cmd: 'cancel' }
  | { cmd: 'probe'; path: string }
  | { cmd: 'import'; path: string; output: string }

export interface Permissions {
  screen: boolean
  /** Needed for keystrokes. Clicks and cursor are captured without it. */
  inputMonitoring: boolean
  accessibility: boolean
  microphone: 'granted' | 'denied' | 'restricted' | 'notDetermined'
}

export interface StoppedFiles {
  screen: string
  events: string
  mic?: string
}

export type HelperEvent =
  | { event: 'pong'; version: string }
  | ({ event: 'permissions' } & Permissions)
  | { event: 'targets'; displays: DisplayTarget[]; windows: WindowTarget[] }
  | { event: 'started'; outputDir: string; width: number; height: number }
  | { event: 'stopped'; durationMs: number; files: StoppedFiles; micOffsetMs?: number; frames: number }
  | { event: 'paused'; timeMs: number }
  | { event: 'resumed'; timeMs: number }
  | { event: 'marked'; kind: 'marker' | 'flag'; timeMs: number }
  | { event: 'cancelled' }
  | { event: 'probed'; durationMs: number; width: number; height: number; hasAudio: boolean }
  | { event: 'imported'; output: string; durationMs: number; width: number; height: number; converted: boolean }
  | { event: 'warning'; message: string }
  | { event: 'error'; code: string; message: string }

const EVENT_NAMES = new Set(['pong', 'permissions', 'targets', 'started', 'stopped', 'paused', 'resumed', 'marked', 'cancelled', 'probed', 'imported', 'warning', 'error'])

/** Parses one stdout line. Returns null for blank lines and anything that is not a helper event. */
export function parseHelperLine(line: string): HelperEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const event = (value as { event?: unknown }).event
  if (typeof event !== 'string' || !EVENT_NAMES.has(event)) return null
  return value as HelperEvent
}

/** Splits a stdout chunk into complete lines, keeping any partial trailing line for the next chunk. */
export function splitLines(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const parts = (buffer + chunk).split('\n')
  const rest = parts.pop() ?? ''
  return { lines: parts, rest }
}

export function serializeCommand(command: HelperCommand): string {
  return JSON.stringify(command) + '\n'
}

/** The events.json file the helper writes next to screen.mov. */
export interface EventsFile {
  version: 1
  region: { x: number; y: number; width: number; height: number }
  clicks: { timeMs: number; position: Point; button: 'left' | 'right' | 'middle' }[]
  keys: { timeMs: number; label: string }[]
  cursor: { timeMs: number; x: number; y: number }[]
}

export interface RecordedEvents {
  clicks: ClickEvent[]
  keys: KeyEvent[]
  cursor: { timeMs: number; x: number; y: number }[]
}

/**
 * Validates and normalises an events file into the project model: drops
 * anything outside the recording in time or in space (a click on another
 * display must not create a zoom), and sorts by time.
 */
export function normaliseEvents(file: EventsFile, durationMs: number): RecordedEvents {
  const inRange = (t: number): boolean => Number.isFinite(t) && t >= 0 && t <= durationMs
  const inRegion = (x: number, y: number): boolean => x >= 0 && x <= 1 && y >= 0 && y <= 1
  const byTime = <T extends { timeMs: number }>(a: T, b: T): number => a.timeMs - b.timeMs
  return {
    clicks: file.clicks
      .filter((c) => inRange(c.timeMs) && inRegion(c.position.x, c.position.y))
      .map((c) => ({ timeMs: c.timeMs, position: { x: c.position.x, y: c.position.y }, button: c.button }))
      .sort(byTime),
    keys: file.keys
      .filter((k) => inRange(k.timeMs) && k.label.length > 0)
      .map((k) => ({ timeMs: k.timeMs, label: k.label }))
      .sort(byTime),
    cursor: file.cursor
      .filter((s) => inRange(s.timeMs) && inRegion(s.x, s.y))
      .map((s) => ({ timeMs: s.timeMs, x: s.x, y: s.y }))
      .sort(byTime)
  }
}

/** What the app reports after a recording was turned into a project bundle. */
export interface RecordingResult {
  projectDir: string
  projectFile: string
  durationMs: number
  frames: number
  width: number
  height: number
  clicks: number
  keys: number
  cursorSamples: number
}
