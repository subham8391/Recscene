/**
 * Pure state for a recording in progress (specs 22–26): the clock the widget
 * shows, pauses, and the markers and flags collected along the way.
 * Wall-clock values are milliseconds from Date.now().
 */

export interface SessionClock {
  startedAt: number
  pausedAt: number | null
  pausedTotalMs: number
}

export interface RecordingMarker {
  timeMs: number
  label?: string
}

export interface SessionState {
  clock: SessionClock
  markers: RecordingMarker[]
  flags: number[]
}

export function startSession(now: number): SessionState {
  return { clock: { startedAt: now, pausedAt: null, pausedTotalMs: 0 }, markers: [], flags: [] }
}

/** Recorded time so far, excluding pauses. */
export function elapsedMs(clock: SessionClock, now: number): number {
  const pausedNow = clock.pausedAt === null ? 0 : now - clock.pausedAt
  return Math.max(0, now - clock.startedAt - clock.pausedTotalMs - pausedNow)
}

export function pauseClock(clock: SessionClock, now: number): SessionClock {
  if (clock.pausedAt !== null) return clock
  return { ...clock, pausedAt: now }
}

export function resumeClock(clock: SessionClock, now: number): SessionClock {
  if (clock.pausedAt === null) return clock
  return { ...clock, pausedAt: null, pausedTotalMs: clock.pausedTotalMs + (now - clock.pausedAt) }
}

export function isPaused(clock: SessionClock): boolean {
  return clock.pausedAt !== null
}

/** Spec 25: markers are kept in time order; the label is free text for the editor. */
export function addMarker(markers: readonly RecordingMarker[], marker: RecordingMarker): RecordingMarker[] {
  return [...markers, { timeMs: Math.max(0, marker.timeMs), ...(marker.label ? { label: marker.label } : {}) }].sort((a, b) => a.timeMs - b.timeMs)
}

/** Spec 26: flags are plain times; two presses within 300 ms count once. */
export function addFlag(flags: readonly number[], timeMs: number, debounceMs = 300): number[] {
  const t = Math.max(0, timeMs)
  if (flags.some((f) => Math.abs(f - t) < debounceMs)) return [...flags]
  return [...flags, t].sort((a, b) => a - b)
}

/** The recording-markers.json document written next to project.json. */
export function markersFile(markers: readonly RecordingMarker[]): { version: 1; markers: RecordingMarker[] } {
  return { version: 1, markers: [...markers] }
}

export const CONFIRM_RESTART = 'Are you sure you want to restart the entire recording?'
export const CONFIRM_CANCEL = 'Are you sure you want to cancel recording?'
