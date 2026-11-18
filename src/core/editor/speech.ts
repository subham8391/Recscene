/**
 * Speech detection on the microphone track (spec 286): which spans hold
 * speech, which silences are long enough to hide the camera, and the
 * layout change that follows.
 */
import type { CameraConfig, LayoutType, Point01, CameraLayout } from './cameraLayout'

export interface TimeRange {
  startMs: number
  endMs: number
}

export interface SpeechOptions {
  /** Level below which a window is silence, in dBFS (RMS). */
  thresholdDb: number
  /** Analysis window length. */
  windowMs: number
  /** Runs shorter than this are noise, not speech. */
  minSpeechMs: number
  /** Runs closer than this are one utterance. */
  joinGapMs: number
  /** Breathing room added before and after each run. */
  padMs: number
}

export const SPEECH_DEFAULTS: SpeechOptions = { thresholdDb: -38, windowMs: 30, minSpeechMs: 120, joinGapMs: 300, padMs: 150 }

/** Slider range of "Minimum silence duration" (spec 286). */
export const HIDE_SILENCE_MIN_MS = 2000
export const HIDE_SILENCE_MAX_MS = 15000
export const HIDE_SILENCE_DEFAULT_MS = 5000
export const NO_SPEECH_FOUND = 'No speech was found in the microphone track, so the camera never hides.'
export const NO_MIC_FOR_SILENCE = 'Needs a microphone track.'

const mergeRanges = (ranges: TimeRange[], joinMs: number): TimeRange[] => {
  const out: TimeRange[] = []
  for (const r of ranges) {
    const last = out[out.length - 1]
    if (last && r.startMs - last.endMs <= joinMs) last.endMs = Math.max(last.endMs, r.endMs)
    else out.push({ ...r })
  }
  return out
}

/** Spans of the track that hold speech, from one channel of decoded audio. */
export function speechRanges(samples: ArrayLike<number>, sampleRate: number, options: Partial<SpeechOptions> = {}): TimeRange[] {
  const o = { ...SPEECH_DEFAULTS, ...options }
  const n = samples.length
  if (n === 0 || sampleRate <= 0) return []
  const win = Math.max(1, Math.round((sampleRate * o.windowMs) / 1000))
  const runs: TimeRange[] = []
  let runStart = -1
  for (let start = 0; start < n; start += win) {
    const end = Math.min(n, start + win)
    let sum = 0
    for (let i = start; i < end; i += 1) {
      const v = samples[i] ?? 0
      sum += v * v
    }
    const rms = Math.sqrt(sum / (end - start))
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity
    const ms = (start / sampleRate) * 1000
    if (db >= o.thresholdDb) {
      if (runStart < 0) runStart = ms
    } else if (runStart >= 0) {
      runs.push({ startMs: runStart, endMs: ms })
      runStart = -1
    }
  }
  if (runStart >= 0) runs.push({ startMs: runStart, endMs: (n / sampleRate) * 1000 })
  const durationMs = (n / sampleRate) * 1000
  const joined = mergeRanges(runs, o.joinGapMs).filter((r) => r.endMs - r.startMs >= o.minSpeechMs)
  const padded = joined.map((r) => ({ startMs: Math.max(0, r.startMs - o.padMs), endMs: Math.min(durationMs, r.endMs + o.padMs) }))
  return mergeRanges(padded, 0).map((r) => ({ startMs: Math.round(r.startMs), endMs: Math.round(r.endMs) }))
}

/** Silences at least `minMs` long between (and around) the speech ranges. */
export function silenceGaps(speech: readonly TimeRange[], durationMs: number, minMs: number): TimeRange[] {
  if (durationMs <= 0) return []
  const sorted = [...speech].sort((a, b) => a.startMs - b.startMs)
  const gaps: TimeRange[] = []
  let cursor = 0
  for (const r of sorted) {
    if (r.startMs - cursor >= minMs) gaps.push({ startMs: cursor, endMs: r.startMs })
    cursor = Math.max(cursor, r.endMs)
  }
  if (durationMs - cursor >= minMs) gaps.push({ startMs: cursor, endMs: durationMs })
  return gaps
}

export function inRanges(ranges: readonly TimeRange[], timeMs: number): boolean {
  return ranges.some((r) => timeMs >= r.startMs && timeMs < r.endMs)
}

export function clampSilenceMs(v: number): number {
  return Math.min(HIDE_SILENCE_MAX_MS, Math.max(HIDE_SILENCE_MIN_MS, Math.round(v)))
}

export interface EffectiveLayoutLike {
  type: LayoutType
  cameraSize: number
  cameraPositionPoint: Point01
  custom: CameraLayout | null
}

/**
 * Spec 286: during a long enough silence the camera leaves the frame unless the
 * microphone is muted, the camera fills the frame, or a timeline layout hides it already.
 */
export function applySilence<T extends EffectiveLayoutLike>(eff: T, config: Pick<CameraConfig, 'hideDuringSilenceMs'>, gaps: readonly TimeRange[], timeMs: number, micMuted: boolean): T {
  if (config.hideDuringSilenceMs === null || micMuted) return eff
  if (eff.type === 'only-camera' || eff.type === 'only-screen') return eff
  if (!inRanges(gaps, timeMs)) return eff
  return { ...eff, type: 'only-screen' }
}
