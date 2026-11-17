import { describe, expect, it } from 'vitest'
import { waveformBars } from './waveform'

describe('waveformBars', () => {
  it('takes the peak of each bucket and clamps', () => {
    expect(waveformBars([0, 0.5, -1, 0.2, 0, 0, 2, 0], 4, false)).toEqual([0.5, 1, 0, 1])
  })

  it('smooths neighbours and handles empty input', () => {
    expect(waveformBars([1, 0, 0, 0], 2, true)).toEqual([0.75, 0.25])
    expect(waveformBars([], 3)).toEqual([0, 0, 0])
  })
})
