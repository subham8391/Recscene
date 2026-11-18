import { describe, expect, it } from 'vitest'
import { applySilence, clampSilenceMs, inRanges, silenceGaps, speechRanges } from './speech'

const rate = 8000
/** Window alignment moves edges by up to one 30 ms window. */
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 40
/** `pattern` holds one character per 100 ms: 's' loud, '.' quiet. */
function track(pattern: string, loud = 0.3, quiet = 0.001): Float32Array {
  const per = rate / 10
  const out = new Float32Array(pattern.length * per)
  for (let i = 0; i < pattern.length; i += 1) {
    const amp = pattern[i] === 's' ? loud : quiet
    for (let j = 0; j < per; j += 1) out[i * per + j] = amp * Math.sin((j / per) * Math.PI * 40)
  }
  return out
}

describe('speechRanges', () => {
  it('finds loud runs, pads them and joins nearby ones', () => {
    const r = speechRanges(track('....sssss..sss..........'), rate)
    expect(r).toHaveLength(1)
    expect(near(r[0]!.startMs, 250)).toBe(true)
    expect(near(r[0]!.endMs, 1550)).toBe(true)
  })
  it('keeps separate utterances apart and drops clicks', () => {
    const r = speechRanges(track('..ssss..........ssss..'), rate)
    expect(r).toHaveLength(2)
    expect(near(r[0]!.startMs, 50) && near(r[0]!.endMs, 750)).toBe(true)
    expect(near(r[1]!.startMs, 1450) && near(r[1]!.endMs, 2150)).toBe(true)
    expect(speechRanges(track('.............'), rate)).toEqual([])
    expect(speechRanges(new Float32Array(0), rate)).toEqual([])
  })
})

describe('silenceGaps', () => {
  const speech = [{ startMs: 1000, endMs: 3000 }, { startMs: 9000, endMs: 10000 }]
  it('returns the long silences around speech', () => {
    expect(silenceGaps(speech, 20000, 5000)).toEqual([{ startMs: 3000, endMs: 9000 }, { startMs: 10000, endMs: 20000 }])
    expect(silenceGaps(speech, 20000, 500)).toHaveLength(3)
    expect(silenceGaps([], 20000, 5000)).toEqual([{ startMs: 0, endMs: 20000 }])
  })
  it('inRanges and clamp', () => {
    expect(inRanges(speech, 2000)).toBe(true)
    expect(inRanges(speech, 3000)).toBe(false)
    expect(clampSilenceMs(100)).toBe(2000)
    expect(clampSilenceMs(99999)).toBe(15000)
  })
})

describe('applySilence', () => {
  const eff = { type: 'both' as const, cameraSize: 0.3, cameraPositionPoint: { x: 1, y: 1 }, custom: null }
  const gaps = [{ startMs: 3000, endMs: 9000 }]
  it('hides the overlay during a gap only when the feature is on and the mic plays', () => {
    expect(applySilence(eff, { hideDuringSilenceMs: 5000 }, gaps, 4000, false).type).toBe('only-screen')
    expect(applySilence(eff, { hideDuringSilenceMs: 5000 }, gaps, 2000, false).type).toBe('both')
    expect(applySilence(eff, { hideDuringSilenceMs: null }, gaps, 4000, false).type).toBe('both')
    expect(applySilence(eff, { hideDuringSilenceMs: 5000 }, gaps, 4000, true).type).toBe('both')
  })
  it('leaves fullscreen camera and hidden layouts alone', () => {
    expect(applySilence({ ...eff, type: 'only-camera' as const }, { hideDuringSilenceMs: 5000 }, gaps, 4000, false).type).toBe('only-camera')
    expect(applySilence({ ...eff, type: 'split' as const }, { hideDuringSilenceMs: 5000 }, gaps, 4000, false).type).toBe('only-screen')
  })
})
