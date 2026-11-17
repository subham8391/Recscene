/** Speaker notes and the teleprompter (specs 27–28). */

export interface SpeakerNotesPrefs {
  showSpeakerNotes: boolean
  speakerNotesText: string
  /** Pixels; the window scales its text with it. */
  speakerNotesFontSize: number
  /** 0.3–1. */
  speakerNotesOpacity: number
  /** 0–100; pixels per second scroll = speed × PROMPTER_PX_PER_SECOND_AT_100 / 100. */
  prompterSpeed: number
}

export const defaultSpeakerNotesPrefs: SpeakerNotesPrefs = {
  showSpeakerNotes: false,
  speakerNotesText: '',
  speakerNotesFontSize: 15,
  speakerNotesOpacity: 0.85,
  prompterSpeed: 35
}

export const FONT_SIZES = [12, 15, 18, 22, 28] as const
export const PROMPTER_PX_PER_SECOND_AT_100 = 120

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function speakerNotesPrefsFrom(raw: unknown): SpeakerNotesPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof SpeakerNotesPrefs, unknown>>
  return {
    showSpeakerNotes: typeof r.showSpeakerNotes === 'boolean' ? r.showSpeakerNotes : false,
    speakerNotesText: typeof r.speakerNotesText === 'string' ? r.speakerNotesText : '',
    speakerNotesFontSize: typeof r.speakerNotesFontSize === 'number' && Number.isFinite(r.speakerNotesFontSize) ? clamp(Math.round(r.speakerNotesFontSize), 10, 40) : defaultSpeakerNotesPrefs.speakerNotesFontSize,
    speakerNotesOpacity: typeof r.speakerNotesOpacity === 'number' && Number.isFinite(r.speakerNotesOpacity) ? clamp(r.speakerNotesOpacity, 0.3, 1) : defaultSpeakerNotesPrefs.speakerNotesOpacity,
    prompterSpeed: typeof r.prompterSpeed === 'number' && Number.isFinite(r.prompterSpeed) ? clamp(Math.round(r.prompterSpeed), 0, 100) : defaultSpeakerNotesPrefs.prompterSpeed
  }
}

/** How far (px) the prompter has scrolled after running for `elapsedMs` at `speed`, capped at the scrollable height. */
export function prompterOffset(elapsedMs: number, speed: number, maxOffset: number): number {
  const pxPerSecond = (clamp(speed, 0, 100) / 100) * PROMPTER_PX_PER_SECOND_AT_100
  return clamp((Math.max(0, elapsedMs) / 1000) * pxPerSecond, 0, Math.max(0, maxOffset))
}
