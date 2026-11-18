/**
 * Recorded voice-overs (specs 221, 292): narration recorded in the editor,
 * placed at the playhead, mixed with the other tracks. The AI kind is not
 * built; the model keeps the competitor's shape so it can be added later.
 *
 * A voice-over file is in source time: the recorder plays the clip so that
 * the source advances at real time, so file ms == source ms from the start.
 * A synchronized voice-over therefore plays at the clip's speed and loses the
 * parts that are cut out; an independent one runs whole at 1× from where its
 * first frame lands.
 */
import { clipAtOutput, outputToSource, sourceToOutput, type Clip } from './clips'

/** `all-frames` follows the recording (speed changes, cuts); `first-frame` plays on its own clock from where it starts. */
export type VoiceOverAttach = 'first-frame' | 'all-frames'

export interface VoiceOver {
  id: string
  /** Mono WAV inside the bundle. */
  file: string
  /** Where it starts, in source time. */
  sourceStartMs: number
  voiceoverDurationMs: number
  /** 0–1. */
  volume: number
  attachMode: VoiceOverAttach
  /** Mute the microphone and hide the camera while it plays. */
  hideRecording: boolean
  isDisabled: boolean
}

export const VOICEOVER_PRESENT = 'Voiceover already present at current playback time'
export const VOICEOVER_FINISHING = 'Finishing recording because another voiceover is present at the current playback time'
export const VOICEOVER_ADDED = 'Voiceover added to project'
export const VOICEOVER_MIC_DENIED = 'Please allow access to your microphone in order to record your voice.'
export const VOICEOVER_EMPTY_TRACK = 'Click to add voice over'
export const ATTACH_HELP: Record<VoiceOverAttach, string> = {
  'first-frame': 'Voiceover plays independently of the recording, even if the recording speed is changed or parts of the recording are cut out.',
  'all-frames': 'Voiceover plays along with the recording. Voiceover automatically adjusts to the recording speed and is cut out if parts of the recording are cut out.'
}

let counter = 0
export const newVoiceOverId = (): string => `vo-${Date.now().toString(36)}-${(counter += 1)}`

const endOf = (v: VoiceOver): number => v.sourceStartMs + v.voiceoverDurationMs
export const sortedVoiceOvers = (list: readonly VoiceOver[]): VoiceOver[] => [...list].sort((a, b) => a.sourceStartMs - b.sourceStartMs)

/** The voice-over covering a source time, disabled ones included. */
export function voiceOverAt(list: readonly VoiceOver[], sourceMs: number): VoiceOver | undefined {
  return list.find((v) => sourceMs >= v.sourceStartMs && sourceMs < endOf(v))
}

/** Spec 221: nothing may start on top of another voice-over. */
export function canStartAt(list: readonly VoiceOver[], sourceMs: number): string | null {
  return voiceOverAt(list, sourceMs) ? VOICEOVER_PRESENT : null
}

/** Where a recording started at `sourceMs` must stop: the next voice-over's start, else the end of the recording. */
export function recordingLimitMs(list: readonly VoiceOver[], sourceMs: number, sourceDurationMs: number): number {
  const next = sortedVoiceOvers(list).find((v) => v.sourceStartMs > sourceMs)
  return next ? next.sourceStartMs : sourceDurationMs
}

export function addVoiceOver(list: readonly VoiceOver[], v: Omit<VoiceOver, 'id'> & { id?: string }): { list: VoiceOver[]; voiceOver?: VoiceOver; error?: string } {
  const error = canStartAt(list, v.sourceStartMs)
  if (error) return { list: [...list], error }
  const voiceOver: VoiceOver = { ...v, id: v.id ?? newVoiceOverId() }
  return { list: sortedVoiceOvers([...list, voiceOver]), voiceOver }
}

export function updateVoiceOver(list: readonly VoiceOver[], id: string, patch: Partial<Omit<VoiceOver, 'id'>>): VoiceOver[] {
  return list.map((v) => (v.id === id ? { ...v, ...patch } : v))
}

export function removeVoiceOver(list: readonly VoiceOver[], id: string): VoiceOver[] {
  return list.filter((v) => v.id !== id)
}

/** Spec 292: one volume for every voice-over. */
export function applyVolumeToAll(list: readonly VoiceOver[], volume: number): VoiceOver[] {
  return list.map((v) => ({ ...v, volume }))
}

/** Drag on the track: a voice-over moves (never resizes) between its neighbours. */
export function moveVoiceOver(list: readonly VoiceOver[], id: string, startMs: number, sourceDurationMs: number): VoiceOver[] {
  const sorted = sortedVoiceOvers(list)
  const i = sorted.findIndex((v) => v.id === id)
  const v = sorted[i]
  if (!v) return sorted
  const minStart = sorted[i - 1] ? endOf(sorted[i - 1]!) : 0
  const maxStart = (sorted[i + 1]?.sourceStartMs ?? sourceDurationMs) - v.voiceoverDurationMs
  const next = Math.round(Math.max(minStart, Math.min(maxStart, startMs)))
  if (next < minStart) return sorted
  sorted[i] = { ...v, sourceStartMs: next }
  return sortedVoiceOvers(sorted)
}

/** A piece of a voice-over file to play in output time. */
export interface VoiceOverSegment {
  voiceOver: VoiceOver
  /** Output time it starts at. */
  atMs: number
  /** Offset into the file. */
  offsetMs: number
  /** Length of file audio to play. */
  lengthMs: number
  /** Playback rate (the clip speed for synchronized voice-overs). */
  rate: number
}

/**
 * How each enabled voice-over plays over the edited video: a synchronized one is
 * cut and sped with the clips it covers; an independent one starts where its
 * first frame lands in the output and runs whole at normal speed.
 */
export function voiceOverSegments(list: readonly VoiceOver[], clips: readonly Clip[]): VoiceOverSegment[] {
  const out: VoiceOverSegment[] = []
  for (const v of list) {
    if (v.isDisabled || v.voiceoverDurationMs <= 0) continue
    if (v.attachMode === 'first-frame') {
      const at = outputStartOf(v, clips)
      if (at === null) continue
      out.push({ voiceOver: v, atMs: at, offsetMs: 0, lengthMs: v.voiceoverDurationMs, rate: 1 })
      continue
    }
    let outAt = 0
    for (const c of clips) {
      const a = Math.max(c.sourceStartMs, v.sourceStartMs)
      const b = Math.min(c.sourceEndMs, endOf(v))
      if (b > a) out.push({ voiceOver: v, atMs: outAt + (a - c.sourceStartMs) / c.speed, offsetMs: a - v.sourceStartMs, lengthMs: b - a, rate: c.speed })
      outAt += (c.sourceEndMs - c.sourceStartMs) / c.speed
    }
  }
  return out.sort((a, b) => a.atMs - b.atMs)
}

/** Output time an independent voice-over starts at: where its first frame lands, or the next kept frame when that one is cut. */
export function outputStartOf(v: VoiceOver, clips: readonly Clip[]): number | null {
  const direct = sourceToOutput(clips, v.sourceStartMs)
  if (direct !== null) return direct
  let outAt = 0
  for (const c of clips) {
    if (c.sourceStartMs >= v.sourceStartMs) return outAt
    outAt += (c.sourceEndMs - c.sourceStartMs) / c.speed
  }
  return null
}

/** What plays at an output time: the segment, its file offset there, and the rate. */
export function voiceOverPlayingAt(list: readonly VoiceOver[], clips: readonly Clip[], outputMs: number): { voiceOver: VoiceOver; fileMs: number; rate: number } | null {
  for (const s of voiceOverSegments(list, clips)) {
    const end = s.atMs + s.lengthMs / s.rate
    if (outputMs >= s.atMs && outputMs < end) return { voiceOver: s.voiceOver, fileMs: s.offsetMs + (outputMs - s.atMs) * s.rate, rate: s.rate }
  }
  return null
}

/** Spec 292's "Hide & Mute original recording": true while such a voice-over plays at this output time. */
export function recordingHiddenAt(list: readonly VoiceOver[], clips: readonly Clip[], outputMs: number): boolean {
  const p = voiceOverPlayingAt(list, clips, outputMs)
  return !!p && p.voiceOver.hideRecording
}

/** Output ranges where the original recording is muted (for export gain automation). */
export function hiddenOutputRanges(list: readonly VoiceOver[], clips: readonly Clip[]): { startMs: number; endMs: number }[] {
  return voiceOverSegments(list, clips)
    .filter((s) => s.voiceOver.hideRecording)
    .map((s) => ({ startMs: s.atMs, endMs: s.atMs + s.lengthMs / s.rate }))
}

/** Source time of the frame a voice-over's output position maps to, for the track. */
export const voiceOverLabel = (v: VoiceOver, index: number): string => `Voiceover ${index + 1}`

/** Keeps a recording in bounds: trims a voice-over to the limit it may reach. */
export function clampDuration(startMs: number, durationMs: number, limitMs: number): number {
  return Math.max(0, Math.min(durationMs, limitMs - startMs))
}

export const voiceOverSourceAt = (clips: readonly Clip[], outputMs: number): number => outputToSource(clips, outputMs)
export const voiceOverClipAt = (clips: readonly Clip[], outputMs: number): Clip | null => clipAtOutput(clips, outputMs)?.clip ?? null
