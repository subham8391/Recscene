/**
 * The Audio panel (specs 213–220, 14, Audio board): the mix of microphone,
 * system audio, background music and click sounds, and how the microphone
 * is cleaned up. Pure rules; the renderer builds Web Audio graphs from them.
 */
import type { Clip } from './clips'

export type MicrophoneMode = 'off' | 'standard' | 'loud' | 'noise-reduction'

export interface AudioConfig {
  /** Spec 213: scales the whole mix, 0–1. */
  audioVolume: number
  /** Spec 214. */
  muteMicrophone: boolean
  /** Spec 215. */
  muteSystemAudio: boolean
  /** Spec 215's level, 0–1, multiplied by the clip's own system audio volume. */
  systemAudioVolume: number
  /** Spec 216 (no device audio is recorded yet; stored for later). */
  muteExternalDeviceAudio: boolean
  /** Spec 217 as the board's modes: off plays the file as recorded. */
  microphoneMode: MicrophoneMode
  /** Spec 14: off folds the microphone to mono. */
  microphoneInStereoMode: boolean
  /** Specs 218–219: "music:<category>/<slug>" for a bundled track, "library:<file>" from the library folder, or a file inside the bundle. */
  backgroundAudioFileName: string | null
  /** Spec 220. */
  backgroundAudioVolume: number
  muteBackgroundAudio: boolean
  /** Board: keep the microphone and system audio above 2× speed instead of muting them. */
  keepAudioAboveSpeed: boolean
}

export const defaultAudioConfig: AudioConfig = {
  audioVolume: 1,
  muteMicrophone: false,
  muteSystemAudio: false,
  systemAudioVolume: 1,
  muteExternalDeviceAudio: false,
  microphoneMode: 'off',
  microphoneInStereoMode: false,
  backgroundAudioFileName: null,
  backgroundAudioVolume: 0.05,
  muteBackgroundAudio: false,
  keepAudioAboveSpeed: false
}

/** Spec 217 maps to the modes other than off. */
export const improvesMicrophone = (c: AudioConfig): boolean => c.microphoneMode !== 'off'

export const MIC_MODES: readonly { id: MicrophoneMode; name: string; sub: string; task?: string }[] = [
  { id: 'off', name: 'Off', sub: 'Plays your microphone as recorded.' },
  { id: 'standard', name: 'Standard', sub: 'Adjusts your voice to a consistent volume. Its character stays the same.' },
  { id: 'loud', name: 'Loud', sub: 'Boosts your voice to a consistent, loud volume.', task: 'Leveling audio' },
  { id: 'noise-reduction', name: 'Noise reduction', sub: 'Boosts your voice and reduces background noise and room echo.', task: 'Reducing noise' }
]

/** The processing chain for a mode: a high-pass before a compressor, then make-up gain, then peak normalisation. */
export interface MicChain {
  highpassHz: number | null
  lowpassHz: number | null
  compressor: { threshold: number; ratio: number; knee: number; attack: number; release: number } | null
  makeup: number
  normalise: boolean
}

export function micChain(mode: MicrophoneMode): MicChain {
  switch (mode) {
    case 'standard': return { highpassHz: 60, lowpassHz: null, compressor: { threshold: -24, ratio: 3, knee: 10, attack: 0.005, release: 0.15 }, makeup: 1.2, normalise: true }
    case 'loud': return { highpassHz: 70, lowpassHz: null, compressor: { threshold: -30, ratio: 6, knee: 6, attack: 0.003, release: 0.1 }, makeup: 1.8, normalise: true }
    case 'noise-reduction': return { highpassHz: 120, lowpassHz: 9000, compressor: { threshold: -28, ratio: 4, knee: 8, attack: 0.004, release: 0.2 }, makeup: 1.4, normalise: true }
    default: return { highpassHz: null, lowpassHz: null, compressor: null, makeup: 1, normalise: false }
  }
}

/** Gain that brings a track's peak to the target, capped so silence is not blown up. */
export function normaliseGain(peak: number, target = 0.9, maxGain = 6): number {
  if (!Number.isFinite(peak) || peak <= 0) return 1
  return Math.min(maxGain, Math.max(0.1, target / peak))
}

export const AUDIO_MUTE_ABOVE_SPEED = 2

/** Spec 213 and the board: whether a clip's recorded audio plays at all. */
export function clipAudible(clip: Clip, config: AudioConfig): boolean {
  return config.keepAudioAboveSpeed || clip.speed <= AUDIO_MUTE_ABOVE_SPEED
}

/** The microphone gain for a clip (0 when muted), before the master volume. */
export function micGain(clip: Clip, config: AudioConfig): number {
  if (config.muteMicrophone || !clipAudible(clip, config)) return 0
  return Math.max(0, Math.min(1, clip.volume))
}

/** The system audio gain for a clip (0 when muted), before the master volume. */
export function systemGain(clip: Clip, config: AudioConfig): number {
  if (config.muteSystemAudio || !clipAudible(clip, config)) return 0
  return Math.max(0, Math.min(1, clip.systemAudioVolume)) * Math.max(0, Math.min(1, config.systemAudioVolume))
}

/** The background music gain, before the master volume (spec 220). */
export function musicGain(config: AudioConfig): number {
  if (!config.backgroundAudioFileName || config.muteBackgroundAudio) return 0
  return Math.max(0, Math.min(1, config.backgroundAudioVolume))
}

export const masterGain = (config: AudioConfig): number => Math.max(0, Math.min(1, config.audioVolume))

/** Spec 218: the bundled catalogue, by category. */
export interface MusicTrack {
  id: string
  name: string
  category: string
  durationMs: number
}

export const MUSIC_CATEGORIES = ['Commercial', 'Electronic', 'Instrumental', 'Lo-fi'] as const

export type BackgroundSource = { kind: 'bundled'; id: string } | { kind: 'library'; file: string } | { kind: 'project'; file: string }

/** Where a stored background file name points. */
export function backgroundSource(name: string | null): BackgroundSource | null {
  if (!name) return null
  if (name.startsWith('music:')) return { kind: 'bundled', id: name.slice('music:'.length) }
  if (name.startsWith('library:')) return { kind: 'library', file: name.slice('library:'.length) }
  return { kind: 'project', file: name }
}

export const bundledName = (id: string): string => `music:${id}`
export const libraryName = (file: string): string => `library:${file}`

/** A display name for whatever is in use. */
export function backgroundLabel(name: string | null, catalogue: readonly MusicTrack[]): string | null {
  const src = backgroundSource(name)
  if (!src) return null
  if (src.kind === 'bundled') return catalogue.find((t) => t.id === src.id)?.name ?? src.id
  return src.file.replace(/\.[^.]+$/, '')
}

/** Spec 218: the music starts at project start and loops for the whole video. */
export function musicSegments(totalMs: number, trackMs: number): { atMs: number; lengthMs: number }[] {
  if (trackMs <= 0 || totalMs <= 0) return []
  const out: { atMs: number; lengthMs: number }[] = []
  for (let at = 0; at < totalMs; at += trackMs) out.push({ atMs: at, lengthMs: Math.min(trackMs, totalMs - at) })
  return out
}

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'aiff', 'aif', 'mp4', 'mov'] as const

export function isAudioFile(fileName: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(fileName.split('.').pop()?.toLowerCase() ?? '')
}

export const MUTED_MIC = 'Microphone is muted.'
export const MUTED_SYSTEM = 'System audio is muted.'
export const MUTED_DEVICE = 'External device audio is muted.'
