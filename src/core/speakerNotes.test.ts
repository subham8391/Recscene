import { describe, expect, it } from 'vitest'
import { defaultSpeakerNotesPrefs, prompterOffset, speakerNotesPrefsFrom } from './speakerNotes'

describe('speakerNotesPrefsFrom', () => {
  it('defaults and clamps', () => {
    expect(speakerNotesPrefsFrom(null)).toEqual(defaultSpeakerNotesPrefs)
    const p = speakerNotesPrefsFrom({ showSpeakerNotes: true, speakerNotesText: 'hi', speakerNotesFontSize: 99, speakerNotesOpacity: 0.1, prompterSpeed: -4 })
    expect(p).toEqual({ showSpeakerNotes: true, speakerNotesText: 'hi', speakerNotesFontSize: 40, speakerNotesOpacity: 0.3, prompterSpeed: 0 })
  })
})

describe('prompterOffset', () => {
  it('scrolls linearly with speed and stops at the end', () => {
    expect(prompterOffset(0, 50, 1000)).toBe(0)
    expect(prompterOffset(2000, 50, 1000)).toBe(120)
    expect(prompterOffset(2000, 100, 1000)).toBe(240)
    expect(prompterOffset(60_000, 100, 1000)).toBe(1000)
    expect(prompterOffset(5000, 0, 1000)).toBe(0)
  })
})
