/**
 * Playback state and the transport actions (specs 52–57). Pure: the renderer
 * owns the clock and calls `tick` with elapsed wall time.
 */
export interface PlaybackState {
  timeMs: number
  playing: boolean
  /** Signed multiplier: 1 = real time forward, -2 = double speed backward. */
  speed: number
  loop: boolean
}

export const MAX_SPEED = 8
/** Spec 55: jumps while playing (ms). When paused the plain arrows move one frame. */
export const STEP_BACK_MS = -1000
export const STEP_FORWARD_MS = 500
export const STEP_BACK_FAST_MS = -2000
export const STEP_FORWARD_FAST_MS = 1000
export const SPEED_CHOICES = [0.25, 0.5, 1, 1.5, 2, 4, 8] as const

export function initialPlayback(loop = false): PlaybackState {
  return { timeMs: 0, playing: false, speed: 1, loop }
}

const clampTime = (t: number, durationMs: number): number => Math.min(Math.max(0, t), Math.max(0, durationMs))

/** Space: play or pause at the current speed. Playing from the end restarts. */
export function togglePlay(s: PlaybackState, durationMs: number): PlaybackState {
  if (s.playing) return { ...s, playing: false }
  const atEnd = s.speed > 0 && s.timeMs >= durationMs
  const atStart = s.speed < 0 && s.timeMs <= 0
  return { ...s, playing: true, timeMs: atEnd ? 0 : atStart ? durationMs : s.timeMs }
}

/** L (spec 54): paused → 1× and play; backward → 1×; forward → double up to 8×. */
export function playForwardOrIncreaseSpeed(s: PlaybackState, durationMs: number): PlaybackState {
  if (!s.playing) return { ...s, playing: true, speed: 1, timeMs: s.timeMs >= durationMs ? 0 : s.timeMs }
  if (s.speed < 0) return { ...s, speed: 1 }
  return { ...s, speed: Math.min(MAX_SPEED, s.speed * 2) }
}

/** J (spec 53): paused → -1× and play; forward → -1×; backward → double up to -8×. */
export function playBackwardOrIncreaseSpeed(s: PlaybackState, durationMs: number): PlaybackState {
  if (!s.playing) return { ...s, playing: true, speed: -1, timeMs: s.timeMs <= 0 ? durationMs : s.timeMs }
  if (s.speed > 0) return { ...s, speed: -1 }
  return { ...s, speed: Math.max(-MAX_SPEED, s.speed * 2) }
}

/** K (spec 54): pause and reset the speed to 1×. */
export function stopAndResetSpeed(s: PlaybackState): PlaybackState {
  return { ...s, playing: false, speed: 1 }
}

export function setSpeed(s: PlaybackState, speed: number): PlaybackState {
  const magnitude = Math.min(MAX_SPEED, Math.max(0.25, Math.abs(speed)))
  return { ...s, speed: speed < 0 ? -magnitude : magnitude }
}

export function seek(s: PlaybackState, timeMs: number, durationMs: number): PlaybackState {
  return { ...s, timeMs: clampTime(timeMs, durationMs) }
}

/** Spec 55: one frame when paused, a timed jump when playing. */
export function step(s: PlaybackState, direction: 'back' | 'forward', fast: boolean, durationMs: number, fps = 60): PlaybackState {
  if (!s.playing) {
    const frame = 1000 / fps
    return seek(s, s.timeMs + (direction === 'back' ? -frame : frame), durationMs)
  }
  const delta = direction === 'back' ? (fast ? STEP_BACK_FAST_MS : STEP_BACK_MS) : fast ? STEP_FORWARD_FAST_MS : STEP_FORWARD_MS
  return seek(s, s.timeMs + delta, durationMs)
}

/** Spec 56: stop at the first or last frame. */
export function goToFirstFrame(s: PlaybackState): PlaybackState {
  return { ...s, playing: false, timeMs: 0 }
}

export function goToLastFrame(s: PlaybackState, durationMs: number): PlaybackState {
  return { ...s, playing: false, timeMs: Math.max(0, durationMs) }
}

/** Advances the clock by `elapsedMs` of wall time; loops or stops at the ends (spec 57). */
export function tick(s: PlaybackState, elapsedMs: number, durationMs: number): PlaybackState {
  if (!s.playing) return s
  const next = s.timeMs + elapsedMs * s.speed
  if (s.speed > 0 && next >= durationMs) return s.loop ? { ...s, timeMs: next - durationMs } : { ...s, timeMs: durationMs, playing: false }
  if (s.speed < 0 && next <= 0) return s.loop ? { ...s, timeMs: durationMs + next } : { ...s, timeMs: 0, playing: false }
  return { ...s, timeMs: next }
}

export function speedLabel(speed: number): string {
  const m = Math.abs(speed)
  return `${m % 1 === 0 ? m : m.toFixed(2).replace(/0+$/, '')}×${speed < 0 ? ' ◀' : ''}`
}
