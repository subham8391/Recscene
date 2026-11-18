import { describe, expect, it } from 'vitest'
import { buildCues, captionMetrics, cueAt, cutRange, cutRanges, detectFillers, fillerRanges, longPauses, ONE_LINE, setWordsHidden, spokenIndex, subtitleFile, tightenPause, timedCues, transcriptSummary, wordIsCut, wordsRange, type TranscriptWord } from './captions'
import { defaultClip } from './clips'

const W = (text: string, startMs: number, endMs: number, extra: Partial<TranscriptWord> = {}): TranscriptWord => ({ text, startMs, endMs, ...extra })
const words = [W('Hello,', 0, 540), W('this', 540, 900), W('is', 900, 1080), W('a', 1080, 1200), W('quick', 1200, 1320), W('test.', 1320, 1860), W('Open', 2040, 2340), W('the', 2340, 2580), W('settings', 2580, 3120), W('um', 3200, 3500), W('and', 3600, 3800), W('paste', 3800, 4100), W('the', 4100, 4200), W('key.', 4200, 4380), W('Then', 7000, 7300), W('save', 7300, 7500), W('it.', 7500, 7700)]
const clip = defaultClip(10000)

describe('cues (specs 208–209)', () => {
  it('breaks at sentence ends, long gaps and limits, skipping hidden words', () => {
    const cues = buildCues(words)
    expect(cues.map((c) => c.words.map((w) => w.text).join(' '))).toEqual(['Hello, this is a quick test.', 'Open the settings um and paste the key.', 'Then save it.'])
    expect(buildCues(words, ONE_LINE).length).toBeGreaterThan(3)
    expect(buildCues(words.map((w) => (w.text === 'um' ? { ...w, hidden: true } : w)))[1]?.words.map((w) => w.text)).not.toContain('um')
    expect(cueAt(cues, 2500)?.words[0]?.text).toBe('Open')
    expect(cueAt(cues, 6000)).toBeNull()
    expect(spokenIndex(cues[0]!, 1000)).toBe(2)
    expect(spokenIndex(cues[0]!, -1)).toBe(-1)
    expect(captionMetrics(1080, 1).font).toBeCloseTo(45.36)
    expect(captionMetrics(1080, 5).font).toBeCloseTo(90.72)
  })

  it('writes subtitle files in output time and drops cut cues (spec 212)', () => {
    const cues = buildCues(words)
    const clips = cutRange([clip], 1900, 6900)
    const timed = timedCues(cues, clips)
    expect(timed.map((c) => c.text)).toEqual(['Hello, this is a quick test.', 'Then save it.'])
    expect(timed[1]?.startMs).toBe(2000)
    const srt = subtitleFile(timed, 'srt')
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:01,860\nHello, this is a quick test.')
    expect(subtitleFile(timed, 'vtt').startsWith('WEBVTT')).toBe(true)
    expect(subtitleFile(timed, 'txt')).toBe('Hello, this is a quick test.\nThen save it.\n')
    expect(transcriptSummary({ language: 'en_US', generatedAt: '', words }, 3)).toBe('English · 3 cues')
    expect(transcriptSummary(null, 0)).toBe('No transcript')
  })
})

describe('edit by transcript (specs 289–290)', () => {
  it('cuts ranges out of the clips like timeline cuts', () => {
    const cut = cutRange([clip], 2000, 3000)
    expect(cut.map((c) => [c.sourceStartMs, c.sourceEndMs])).toEqual([[0, 2000], [3000, 10000]])
    expect(cutRange([clip], 0, 10000)).toHaveLength(1)
    expect(cutRange([clip], 9950, 10000).map((c) => c.sourceEndMs)).toEqual([9950])
    const two = cutRanges([clip], [{ startMs: 1000, endMs: 2000 }, { startMs: 5000, endMs: 6000 }])
    expect(two.map((c) => [c.sourceStartMs, c.sourceEndMs])).toEqual([[0, 1000], [2000, 5000], [6000, 10000]])
    expect(wordIsCut(words[1]!, cutRange([clip], 500, 1000))).toBe(true)
    expect(wordIsCut(words[0]!, cutRange([clip], 500, 1000))).toBe(false)
    expect(wordsRange(words.slice(1, 3))).toEqual({ startMs: 500, endMs: 1120 })
    expect(wordsRange([])).toBeNull()
  })

  it('finds fillers per language and removable ranges', () => {
    const marked = detectFillers(words, 'en_US')
    expect(marked.find((w) => w.text === 'um')?.filler).toBe(1)
    expect(marked.find((w) => w.text === 'Hello,')?.filler).toBeUndefined()
    expect(detectFillers([W('ähm', 0, 100)], 'de_DE')[0]?.filler).toBe(1)
    expect(detectFillers([W('you', 0, 100), W('know', 100, 200)], 'xx')[0]?.filler).toBe(2)
    expect(fillerRanges(marked, [clip])).toEqual([{ startMs: 3170, endMs: 3530 }])
    expect(fillerRanges(marked, cutRange([clip], 3000, 3600))).toEqual([])
  })

  it('finds long pauses and tightens them to a breath', () => {
    const pauses = longPauses(words, [clip])
    expect(pauses).toEqual([{ startMs: 4380, endMs: 7000 }])
    const tightened = tightenPause([clip], pauses[0]!)
    expect(tightened.map((c) => [c.sourceStartMs, c.sourceEndMs])).toEqual([[0, 4730], [6650, 10000]])
    expect(longPauses(words, cutRange([clip], 4400, 6990))).toEqual([])
    expect(tightenPause([clip], { startMs: 100, endMs: 800 })).toEqual([clip])
  })

  it('hides words from the transcript only', () => {
    const hidden = setWordsHidden(words, 9, 9, true)
    expect(hidden[9]?.hidden).toBe(true)
    expect(setWordsHidden(hidden, 9, 9, false)[9]?.hidden).toBe(false)
  })
})
