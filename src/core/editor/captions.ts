/**
 * Captions and the transcript (specs 205–212, 289–290, Captions and
 * Transcript boards): the word list the helper produces, how it becomes
 * cues on screen, how it maps to the edited timeline for subtitle files,
 * and edit-by-transcript cuts, fillers and pauses.
 */
import { MIN_CLIP_MS, sorted as sortClips, sourceToOutput, type Clip } from './clips'

export interface TranscriptWord {
  text: string
  startMs: number
  endMs: number
  /** Spec 289: cut from the transcript and captions only; the video is unchanged. */
  hidden?: boolean
  /** Spec 290: 1 = filled pause ("um"), 2 = discourse filler ("like"), highlighted only. */
  filler?: 1 | 2
}

export interface Transcript {
  /** Locale the model used, e.g. "en_US". */
  language: string
  generatedAt: string
  words: TranscriptWord[]
}

export type CaptionPosition = 'top' | 'bottom' | 'under-screen'

export interface CaptionConfig {
  /** Spec 208. */
  showTranscript: boolean
  /** Spec 209: 0.5–2. */
  transcriptSizeRatio: number
  /** Board: where the line sits. */
  captionPosition: CaptionPosition
  /** Board: karaoke-style emphasis of the spoken word. */
  captionHighlightWord: boolean
  /** Board: dark panel behind the text. */
  captionBackground: boolean
  /** Board: shorter cues, one line at a time. */
  captionOneLine: boolean
  /** Spec 207: "auto" or a locale identifier for the next generation. */
  transcriptLanguage: string
}

export const defaultCaptionConfig: CaptionConfig = {
  showTranscript: true,
  transcriptSizeRatio: 1,
  captionPosition: 'bottom',
  captionHighlightWord: true,
  captionBackground: true,
  captionOneLine: false,
  transcriptLanguage: 'auto'
}

export const CAPTION_SIZE_MIN = 0.5
export const CAPTION_SIZE_MAX = 2
export const CAPTION_SIZE_PRESETS: readonly { label: string; ratio: number }[] = [
  { label: 'Small', ratio: 0.8 },
  { label: 'Medium', ratio: 1 },
  { label: 'Large', ratio: 1.3 }
]
export const NO_MIC = 'No microphone recorded'
export const REGENERATE_WARNING = 'When re-generating transcript, previous transcript (and all changes you made to it) will be lost.'
export const GENERATING_TOAST = "Transcript is being generated. You can still edit your project while it's being generated."
export const ENGINE_NOTE = "Transcript will be generated locally using Apple's native speech recognition engine (requires macOS 26.0 or later). No data will be sent to the server."
export const EDIT_HINT = 'Type to correct the text — ⌫ cuts words out of the video, ⌘⌫ cuts them from the transcript only.'
export const EDIT_EMPTY = 'Edit your video by editing its text: delete words to cut them out, remove filler words and long pauses in one click.'

/** A line on screen: consecutive words close in time. */
export interface Cue {
  startMs: number
  endMs: number
  words: TranscriptWord[]
}

export interface CueOptions {
  maxWords: number
  maxMs: number
  gapMs: number
}

export const CUE_DEFAULTS: CueOptions = { maxWords: 8, maxMs: 4000, gapMs: 900 }
export const ONE_LINE: CueOptions = { maxWords: 4, maxMs: 2200, gapMs: 600 }

/** Groups the visible words into cues; a cue ends at a long gap, a sentence end, or the limits. */
export function buildCues(words: readonly TranscriptWord[], options: CueOptions = CUE_DEFAULTS): Cue[] {
  const cues: Cue[] = []
  let current: TranscriptWord[] = []
  const flush = (): void => {
    const first = current[0]
    const last = current[current.length - 1]
    if (first && last) cues.push({ startMs: first.startMs, endMs: Math.max(last.endMs, first.startMs + 400), words: current })
    current = []
  }
  for (const w of words) {
    if (w.hidden) continue
    const first = current[0]
    const last = current[current.length - 1]
    if (first && last) {
      const tooLong = current.length >= options.maxWords || w.endMs - first.startMs > options.maxMs
      const gap = w.startMs - last.endMs > options.gapMs
      if (tooLong || gap || /[.!?]$/.test(last.text)) flush()
    }
    current.push(w)
  }
  flush()
  return cues
}

export function cueAt(cues: readonly Cue[], sourceMs: number): Cue | null {
  return cues.find((c) => sourceMs >= c.startMs && sourceMs < c.endMs) ?? null
}

/** Index of the word being spoken in a cue, or -1 before the first word. */
export function spokenIndex(cue: Cue, sourceMs: number): number {
  let idx = -1
  cue.words.forEach((w, i) => {
    if (sourceMs >= w.startMs) idx = i
  })
  return idx
}

export const cueText = (cue: Cue): string => cue.words.map((w) => w.text).join(' ')

/** Caption geometry for a frame of this height (spec 209 scales it). */
export function captionMetrics(frameHeight: number, ratio: number): { font: number; pad: number; radius: number; margin: number; maxWidth: number } {
  const font = Math.max(10, frameHeight * 0.042 * Math.min(CAPTION_SIZE_MAX, Math.max(CAPTION_SIZE_MIN, ratio)))
  return { font, pad: font * 0.45, radius: font * 0.45, margin: frameHeight * 0.06, maxWidth: 0.8 }
}

// --- Subtitle files (spec 212) ------------------------------------------------------------

/** Cues mapped to the edited timeline; cues inside cut parts are dropped, partially cut ones clamped. */
export function timedCues(cues: readonly Cue[], clips: readonly Clip[]): { startMs: number; endMs: number; text: string }[] {
  const out: { startMs: number; endMs: number; text: string }[] = []
  for (const cue of cues) {
    const visible = cue.words.filter((w) => sourceToOutput(clips, w.startMs) !== null)
    if (visible.length === 0) continue
    const a = sourceToOutput(clips, visible[0]!.startMs)
    const b = sourceToOutput(clips, visible[visible.length - 1]!.endMs) ?? sourceToOutput(clips, visible[visible.length - 1]!.startMs)
    if (a === null || b === null) continue
    out.push({ startMs: a, endMs: Math.max(b, a + 400), text: visible.map((w) => w.text).join(' ') })
  }
  return out
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

function stamp(ms: number, sep: ',' | '.'): string {
  const total = Math.max(0, Math.round(ms))
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)
  const f = total % 1000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}${sep}${String(f).padStart(3, '0')}`
}

export type SubtitleFormat = 'srt' | 'vtt' | 'txt'

export function subtitleFile(cues: readonly { startMs: number; endMs: number; text: string }[], format: SubtitleFormat): string {
  if (format === 'txt') return cues.map((c) => c.text).join('\n') + '\n'
  if (format === 'vtt') return 'WEBVTT\n\n' + cues.map((c) => `${stamp(c.startMs, '.')} --> ${stamp(c.endMs, '.')}\n${c.text}\n`).join('\n')
  return cues.map((c, i) => `${i + 1}\n${stamp(c.startMs, ',')} --> ${stamp(c.endMs, ',')}\n${c.text}\n`).join('\n')
}

// --- Edit by transcript (specs 289–290) --------------------------------------------------

/** Removes a source range from the clips: partial clips are trimmed, clips inside are dropped, a clip around the range is split. */
export function cutRange(clips: readonly Clip[], startMs: number, endMs: number): Clip[] {
  const s = Math.min(startMs, endMs)
  const e = Math.max(startMs, endMs)
  const out: Clip[] = []
  for (const c of sortClips(clips)) {
    if (e <= c.sourceStartMs || s >= c.sourceEndMs) {
      out.push(c)
      continue
    }
    const leftLen = s - c.sourceStartMs
    const rightLen = c.sourceEndMs - e
    if (leftLen >= MIN_CLIP_MS) out.push({ ...c, sourceEndMs: Math.round(s) })
    if (rightLen >= MIN_CLIP_MS) out.push({ ...c, id: leftLen >= MIN_CLIP_MS ? `${c.id}-r${Math.round(e)}` : c.id, sourceStartMs: Math.round(e) })
  }
  // Spec 84: the last clip cannot be removed.
  return out.length > 0 ? out : [...clips]
}

/** The source range a run of words covers, padded a little so the cut sounds natural. */
export function wordsRange(words: readonly TranscriptWord[], padMs = 40): { startMs: number; endMs: number } | null {
  const first = words[0]
  const last = words[words.length - 1]
  if (!first || !last) return null
  return { startMs: Math.max(0, first.startMs - padMs), endMs: last.endMs + padMs }
}

export interface Pause {
  startMs: number
  endMs: number
}

/** Spec 290: gaps between consecutive words longer than the minimum, inside the clips. */
export function longPauses(words: readonly TranscriptWord[], clips: readonly Clip[], minMs = 1500): Pause[] {
  const out: Pause[] = []
  const list = [...words].sort((a, b) => a.startMs - b.startMs)
  for (let i = 1; i < list.length; i += 1) {
    const a = list[i - 1]!
    const b = list[i]!
    const gap = b.startMs - a.endMs
    if (gap >= minMs && sourceToOutput(clips, (a.endMs + b.startMs) / 2) !== null) out.push({ startMs: a.endMs, endMs: b.startMs })
  }
  return out
}

export const BREATH_MS = 350

/** Spec 290: shortens a pause to a breath on each side. */
export function tightenPause(clips: readonly Clip[], pause: Pause, breathMs = BREATH_MS): Clip[] {
  const s = pause.startMs + breathMs
  const e = pause.endMs - breathMs
  if (e - s < MIN_CLIP_MS) return [...clips]
  return cutRange(clips, s, e)
}

export const FILLERS: Record<string, { tier1: string[]; tier2: string[] }> = {
  en: { tier1: ['um', 'uh', 'er', 'ah', 'hmm', 'mhmm', 'mm', 'mmm', 'huh', 'uh-huh', 'erm', 'umm', 'uhh'], tier2: ['like', 'you know', 'so', 'i mean', 'kind of', 'sort of', 'basically', 'actually', 'literally', 'right'] },
  de: { tier1: ['äh', 'ähm', 'hm', 'mhm', 'öh', 'öhm'], tier2: ['halt', 'quasi', 'sozusagen', 'eigentlich'] },
  fr: { tier1: ['euh', 'hein', 'ben', 'bah'], tier2: ['genre', 'en fait', 'du coup', 'voilà'] },
  es: { tier1: ['eh', 'em', 'este', 'mmm'], tier2: ['o sea', 'bueno', 'pues', 'tipo'] },
  pt: { tier1: ['é', 'hã', 'ahn', 'hum'], tier2: ['tipo', 'né', 'então'] },
  it: { tier1: ['ehm', 'eh', 'mmm'], tier2: ['cioè', 'tipo', 'allora'] },
  pl: { tier1: ['yyy', 'eee', 'hmm'], tier2: ['no', 'jakby', 'wiesz'] },
  nl: { tier1: ['eh', 'ehm', 'uh', 'uhm'], tier2: ['zeg maar', 'dus', 'eigenlijk'] }
}

const strip = (t: string): string => t.toLowerCase().replace(/[.,!?;:"']/g, '')

/** Spec 290: marks filled pauses (tier 1, removable) and discourse fillers (tier 2, highlighted) for the language. */
export function detectFillers(words: readonly TranscriptWord[], language: string): TranscriptWord[] {
  const lang = language.slice(0, 2).toLowerCase()
  const table = FILLERS[lang] ?? FILLERS['en']!
  return words.map((w, i) => {
    const t = strip(w.text)
    const next = words[i + 1] ? strip(words[i + 1]!.text) : ''
    if (table.tier1.includes(t)) return { ...w, filler: 1 }
    if (table.tier2.includes(t) || table.tier2.includes(`${t} ${next}`)) return { ...w, filler: 2 }
    const { filler, ...rest } = w
    void filler
    return rest
  })
}

/** Every present tier-1 filler as a cut range (spec 290 "Remove N filler words"). */
export function fillerRanges(words: readonly TranscriptWord[], clips: readonly Clip[]): { startMs: number; endMs: number }[] {
  return words.filter((w) => w.filler === 1 && !w.hidden && sourceToOutput(clips, w.startMs) !== null).map((w) => ({ startMs: Math.max(0, w.startMs - 30), endMs: w.endMs + 30 }))
}

/** Applies several cuts from last to first so earlier ranges stay valid. */
export function cutRanges(clips: readonly Clip[], ranges: readonly { startMs: number; endMs: number }[]): Clip[] {
  return [...ranges].sort((a, b) => b.startMs - a.startMs).reduce((c, r) => cutRange(c, r.startMs, r.endMs), [...clips])
}

export function setWordsHidden(words: readonly TranscriptWord[], from: number, to: number, hidden: boolean): TranscriptWord[] {
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  return words.map((w, i) => (i >= a && i <= b ? { ...w, hidden } : w))
}

export function replaceWordText(words: readonly TranscriptWord[], index: number, text: string): TranscriptWord[] {
  return words.map((w, i) => (i === index ? { ...w, text: text.trim() || w.text } : w))
}

/** "English · 9 cues" for the panel head. */
export function transcriptSummary(t: Transcript | null, cues: number): string {
  if (!t) return 'No transcript'
  const lang = languageName(t.language)
  return `${lang} · ${cues} cue${cues === 1 ? '' : 's'}`
}

export function languageName(locale: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.replace('_', '-').split('-')[0] ?? locale) ?? locale
  } catch {
    return locale
  }
}

/** Whether the word is in a cut part of the recording (spec 289 draws it struck through). */
export function wordIsCut(w: TranscriptWord, clips: readonly Clip[]): boolean {
  return sourceToOutput(clips, w.startMs + (w.endMs - w.startMs) / 2) === null
}
