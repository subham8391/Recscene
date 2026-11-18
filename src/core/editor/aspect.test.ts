import { describe, expect, it } from 'vitest'
import { aspectLabel, fitBox, outputRatio, parseRatio, recordingBox } from './aspect'

const rec = { width: 3600, height: 2338 }

describe('aspect', () => {
  it('parses ratios and falls back to the recording for Auto', () => {
    expect(parseRatio('16:9')).toBeCloseTo(1.777, 2)
    expect(parseRatio(null)).toBeNull()
    expect(parseRatio('x')).toBeNull()
    expect(outputRatio(null, rec)).toBeCloseTo(1.54, 2)
    expect(outputRatio('1:1', rec)).toBe(1)
  })

  it('labels Auto with the nearest named ratio', () => {
    expect(aspectLabel(null, { width: 1920, height: 1080 })).toBe('Auto (16:9)')
    expect(aspectLabel(null, rec)).toBe('Auto (1.54)')
    expect(aspectLabel('9:16', rec)).toBe('Vertical 9:16')
  })

  it('fits and centres boxes', () => {
    expect(fitBox(1000, 500, 1)).toEqual({ x: 250, y: 0, width: 500, height: 500 })
    expect(fitBox(1000, 1000, 2)).toEqual({ x: 0, y: 250, width: 1000, height: 500 })
    const out = fitBox(1000, 500, 2)
    const inner = recordingBox(out, { width: 1000, height: 500 }, 0.1)
    expect(inner).toEqual({ x: 100, y: 50, width: 800, height: 400 })
    expect(recordingBox(out, { width: 1000, height: 500 }, 0)).toEqual(out)
  })
})
