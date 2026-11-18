/**
 * Clips (specs 80–99): the recording cut into contiguous-in-output, ordered
 * pieces of the source. Times are source milliseconds unless named output.
 */
import type { KeyEvent } from '../project'

export interface Clip {
  id: string
  sourceStartMs: number
  sourceEndMs: number
  /** Playback rate; 1 = real time. Stored as speed (the competitor stores 1/speed). */
  speed: number
  /** 0–1 microphone gain for this clip. */
  volume: number
  systemAudioVolume: number
  hideCursor: boolean
  disableSmoothMouseMovement: boolean
}

export type ClipSettings = Pick<Clip, 'speed' | 'volume' | 'systemAudioVolume' | 'hideCursor' | 'disableSmoothMouseMovement'>

export const MIN_CLIP_MS = 100
export const AUDIO_MUTE_ABOVE_SPEED = 2
export const SPEED_GROUPS: { label: string; speeds: number[] }[] = [
  { label: 'Slow', speeds: [0.5, 0.75] },
  { label: 'Regular', speeds: [1, 1.2, 1.4, 1.6, 1.8, 2] },
  { label: 'Fast', speeds: [3, 4, 8, 16, 24] }
]
export const VOLUME_OPTIONS = [1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

let counter = 0
export const newClipId = (): string => `clip-${Date.now().toString(36)}-${(counter += 1)}`

export function defaultClip(sourceDurationMs: number, id = newClipId()): Clip {
  return { id, sourceStartMs: 0, sourceEndMs: Math.max(MIN_CLIP_MS, sourceDurationMs), speed: 1, volume: 1, systemAudioVolume: 1, hideCursor: false, disableSmoothMouseMovement: false }
}

/** Spec 86: an empty list means one full-length clip. */
export function ensureClips(clips: readonly Clip[], sourceDurationMs: number): Clip[] {
  return clips.length ? [...clips] : [defaultClip(sourceDurationMs)]
}

export const sorted = (clips: readonly Clip[]): Clip[] => [...clips].sort((a, b) => a.sourceStartMs - b.sourceStartMs)
const indexOf = (clips: readonly Clip[], id: string): number => clips.findIndex((c) => c.id === id)

export function clipDurationMs(c: Clip): number {
  return c.sourceEndMs - c.sourceStartMs
}

/** Output length of a clip, after its speed. */
export function clipOutputMs(c: Clip): number {
  return clipDurationMs(c) / c.speed
}

export function outputDurationMs(clips: readonly Clip[]): number {
  return clips.reduce((sum, c) => sum + clipOutputMs(c), 0)
}

/** Where each clip starts on the output timeline. */
export function outputOffsets(clips: readonly Clip[]): number[] {
  let t = 0
  return clips.map((c) => {
    const start = t
    t += clipOutputMs(c)
    return start
  })
}

export function clipAtOutput(clips: readonly Clip[], outputMs: number): { clip: Clip; index: number; offsetMs: number } | null {
  const offsets = outputOffsets(clips)
  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i]
    const offset = offsets[i]
    if (clip && offset !== undefined && outputMs >= offset) return { clip, index: i, offsetMs: offset }
  }
  const first = clips[0]
  return first ? { clip: first, index: 0, offsetMs: 0 } : null
}

/** Output time → source time, following the clip's speed; clamped to the clip under the playhead. */
export function outputToSource(clips: readonly Clip[], outputMs: number): number {
  const hit = clipAtOutput(clips, outputMs)
  if (!hit) return outputMs
  const within = Math.min(clipOutputMs(hit.clip), Math.max(0, outputMs - hit.offsetMs))
  return hit.clip.sourceStartMs + within * hit.clip.speed
}

/** Source time → output time, or null when that footage has been cut away. */
export function sourceToOutput(clips: readonly Clip[], sourceMs: number): number | null {
  const offsets = outputOffsets(clips)
  for (let i = 0; i < clips.length; i += 1) {
    const c = clips[i]
    const offset = offsets[i]
    if (c && offset !== undefined && sourceMs >= c.sourceStartMs && sourceMs <= c.sourceEndMs) return offset + (sourceMs - c.sourceStartMs) / c.speed
  }
  return null
}

export function clipAtSource(clips: readonly Clip[], sourceMs: number): Clip | null {
  return clips.find((c) => sourceMs >= c.sourceStartMs && sourceMs < c.sourceEndMs) ?? clips.find((c) => sourceMs === c.sourceEndMs) ?? null
}

/** Spec 80: drag an edge; clamped so clips never overlap and never drop under 100 ms. */
export function trimClip(clips: readonly Clip[], id: string, edge: 'start' | 'end', sourceMs: number, sourceDurationMs: number): Clip[] {
  const list = sorted(clips)
  const i = indexOf(list, id)
  const c = list[i]
  if (!c) return list
  const prev = list[i - 1]
  const next = list[i + 1]
  if (edge === 'start') {
    const min = prev ? prev.sourceEndMs : 0
    const value = Math.max(min, Math.min(c.sourceEndMs - MIN_CLIP_MS, sourceMs))
    list[i] = { ...c, sourceStartMs: Math.round(value) }
  } else {
    const max = next ? next.sourceStartMs : sourceDurationMs
    const value = Math.min(max, Math.max(c.sourceStartMs + MIN_CLIP_MS, sourceMs))
    list[i] = { ...c, sourceEndMs: Math.round(value) }
  }
  return list
}

/** Spec 82: how much footage is trimmed away at an edge (0 when it touches the neighbour or the recording's end). */
export function trimmedMs(clips: readonly Clip[], id: string, edge: 'start' | 'end', sourceDurationMs: number): number {
  const list = sorted(clips)
  const i = indexOf(list, id)
  const c = list[i]
  if (!c) return 0
  if (edge === 'start') return c.sourceStartMs - (list[i - 1]?.sourceEndMs ?? 0)
  return (list[i + 1]?.sourceStartMs ?? sourceDurationMs) - c.sourceEndMs
}

export function hasTrim(clips: readonly Clip[], id: string, sourceDurationMs: number): boolean {
  return trimmedMs(clips, id, 'start', sourceDurationMs) > 0 || trimmedMs(clips, id, 'end', sourceDurationMs) > 0
}

export function removeTrim(clips: readonly Clip[], id: string, edge: 'start' | 'end' | 'both', sourceDurationMs: number): Clip[] {
  let list = sorted(clips)
  if (edge !== 'end') list = trimClip(list, id, 'start', 0, sourceDurationMs)
  if (edge !== 'start') list = trimClip(list, id, 'end', sourceDurationMs, sourceDurationMs)
  return list
}

/** Spec 83: both halves must keep 100 ms; the right half inherits the settings. */
export function splitClip(clips: readonly Clip[], sourceMs: number): { clips: Clip[]; error?: string } {
  const list = sorted(clips)
  const i = list.findIndex((c) => sourceMs > c.sourceStartMs && sourceMs < c.sourceEndMs)
  const c = list[i]
  if (!c) return { clips: list, error: "Can't cut here" }
  if (sourceMs - c.sourceStartMs < MIN_CLIP_MS || c.sourceEndMs - sourceMs < MIN_CLIP_MS) return { clips: list, error: 'The part you want to cut is too short' }
  const left = { ...c, sourceEndMs: Math.round(sourceMs) }
  const right = { ...c, id: newClipId(), sourceStartMs: Math.round(sourceMs) }
  return { clips: [...list.slice(0, i), left, right, ...list.slice(i + 1)] }
}

/** Spec 84: the last clip cannot be removed; neighbours keep their ranges so the footage becomes a cut. */
export function removeClip(clips: readonly Clip[], id: string): Clip[] {
  if (clips.length <= 1) return [...clips]
  return clips.filter((c) => c.id !== id)
}

/** Spec 85: removes the last clip that ends at or before the source time. */
export function rippleRemoveBefore(clips: readonly Clip[], sourceMs: number): Clip[] {
  const list = sorted(clips)
  const target = [...list].reverse().find((c) => c.sourceEndMs <= sourceMs)
  return target ? removeClip(list, target.id) : list
}

/** Spec 88 (and 87 via 'previous' on the right-hand clip): this clip's settings win. */
export function mergeWith(clips: readonly Clip[], id: string, side: 'previous' | 'next'): Clip[] {
  const list = sorted(clips)
  const i = indexOf(list, id)
  const c = list[i]
  const other = side === 'previous' ? list[i - 1] : list[i + 1]
  if (!c || !other) return list
  const merged = side === 'previous' ? { ...c, sourceStartMs: other.sourceStartMs } : { ...c, sourceEndMs: other.sourceEndMs }
  return list.filter((x) => x.id !== other.id).map((x) => (x.id === id ? merged : x))
}

/** Spec 87: the bubble between two touching clips joins them; the left clip's settings win. */
export function joinClips(clips: readonly Clip[], rightId: string): Clip[] {
  const list = sorted(clips)
  const i = indexOf(list, rightId)
  const left = list[i - 1]
  return left ? mergeWith(list, left.id, 'next') : list
}

export function updateClip(clips: readonly Clip[], id: string, patch: Partial<ClipSettings>): Clip[] {
  if (patch.speed !== undefined && !(patch.speed > 0)) throw new Error('Speed must be a positive number.')
  return clips.map((c) => (c.id === id ? { ...c, ...patch } : c))
}

/** Spec 90. */
export function applySpeedToAll(clips: readonly Clip[], id: string): Clip[] {
  const speed = clips.find((c) => c.id === id)?.speed
  return speed === undefined ? [...clips] : clips.map((c) => ({ ...c, speed }))
}

export function canApplySpeedToAll(clips: readonly Clip[], id: string): boolean {
  const speed = clips.find((c) => c.id === id)?.speed
  return speed !== undefined && clips.some((c) => c.id !== id && c.speed !== speed)
}

/** Spec 91. */
export const isAudioMuted = (c: Clip): boolean => c.speed > AUDIO_MUTE_ABOVE_SPEED

/** Spec 98. */
export function clipSettings(c: Clip): ClipSettings {
  return { speed: c.speed, volume: c.volume, systemAudioVolume: c.systemAudioVolume, hideCursor: c.hideCursor, disableSmoothMouseMovement: c.disableSmoothMouseMovement }
}

/** Spec 99. */
export function resetAllClips(sourceDurationMs: number): Clip[] {
  return [defaultClip(sourceDurationMs)]
}

export function canResetAll(clips: readonly Clip[], sourceDurationMs: number): boolean {
  return clips.length > 1 || clips.some((c) => hasTrim(clips, c.id, sourceDurationMs) || c.speed !== 1)
}

/** Spec 92: keystroke bursts worth speeding up. */
export interface TypingGroup {
  startMs: number
  endMs: number
  keystrokes: number
}

export function typingGroups(keys: readonly KeyEvent[], options = { gapMs: 500, minMs: 1500, minRate: 2 }): TypingGroup[] {
  const times = [...keys].map((k) => k.timeMs).sort((a, b) => a - b)
  const groups: TypingGroup[] = []
  let start: number | null = null
  let last = 0
  let count = 0
  const flush = (): void => {
    if (start === null) return
    const span = last - start
    if (span >= options.minMs && count / (span / 1000) >= options.minRate) groups.push({ startMs: start, endMs: last, keystrokes: count })
    start = null
  }
  for (const t of times) {
    if (start !== null && t - last > options.gapMs) flush()
    if (start === null) {
      start = t
      count = 0
    }
    last = t
    count += 1
  }
  flush()
  return groups
}

/** Spec 92: split around the group and speed up the middle; skipped when a split would be too short. */
export function applyTypingSuggestion(clips: readonly Clip[], group: TypingGroup, speed: number): { clips: Clip[]; applied: boolean } {
  let list = sorted(clips)
  const startHit = clipAtSource(list, group.startMs)
  if (!startHit) return { clips: list, applied: false }
  if (group.startMs - startHit.sourceStartMs >= MIN_CLIP_MS) {
    const r = splitClip(list, group.startMs)
    if (r.error) return { clips: list, applied: false }
    list = r.clips
  }
  const endHit = clipAtSource(list, group.endMs)
  if (!endHit) return { clips: list, applied: false }
  if (endHit.sourceEndMs - group.endMs >= MIN_CLIP_MS) {
    const r = splitClip(list, group.endMs)
    if (r.error) return { clips: list, applied: false }
    list = r.clips
  }
  const middle = list.find((c) => c.sourceStartMs <= group.startMs && c.sourceEndMs >= group.endMs)
  if (!middle) return { clips: list, applied: false }
  return { clips: updateClip(list, middle.id, { speed }), applied: true }
}

export const TYPING_SPEED_DEFAULT = 3
export const TYPING_SPEED_MIN = 1.5
export const TYPING_SPEED_MAX = 8
