import { describe, expect, it } from 'vitest'
import { DEVICE_FRAMES, frameByKey, frameLabel, framesFor, layoutFrame } from './deviceFrames'

describe('device frames (specs 185–187)', () => {
  it('ships a catalogue with unique keys across families, colours and orientations', () => {
    expect(DEVICE_FRAMES.length).toBeGreaterThan(40)
    expect(new Set(DEVICE_FRAMES.map((f) => f.key)).size).toBe(DEVICE_FRAMES.length)
    expect(DEVICE_FRAMES.filter((f) => f.family === 'iMac')).toHaveLength(7)
    expect(frameByKey(null)).toBeNull()
    expect(frameByKey('nope')).toBeNull()
  })

  it('filters perfect matches by recording size and shows everything when flexible', () => {
    expect(framesFor({ width: 2560, height: 1664 }, 'perfect').map((f) => f.name)).toEqual(['MacBook Air M2', 'MacBook Air M2', 'MacBook Air M2', 'MacBook Air M2'])
    expect(framesFor({ width: 1179, height: 2556 }, 'perfect').every((f) => f.orientation === 'portrait')).toBe(true)
    expect(framesFor({ width: 1000, height: 700 }, 'perfect')).toEqual([])
    expect(framesFor({ width: 1000, height: 700 }, 'flexible')).toHaveLength(DEVICE_FRAMES.length)
  })

  it('lays the frame out inside the area and keeps the recording ratio when adjusting', () => {
    const mac = framesFor({ width: 2560, height: 1664 }, 'perfect')[0]!
    const l = layoutFrame(mac, { width: 1600, height: 1000 }, { width: 1920, height: 1080 }, true)
    expect(l.frame.width).toBeLessThanOrEqual(1600.001)
    expect(l.frame.height).toBeLessThanOrEqual(1000.001)
    expect(l.screen.width / l.screen.height).toBeCloseTo(16 / 9, 2)
    expect(l.screen.x).toBeGreaterThan(l.frame.x)
    expect(l.chinHeight).toBeGreaterThan(0)
    const fixed = layoutFrame(mac, { width: 1600, height: 1000 }, { width: 1920, height: 1080 }, false)
    expect(fixed.screen.width / fixed.screen.height).toBeCloseTo(2560 / 1664, 2)
    const phone = DEVICE_FRAMES.find((f) => f.family === 'iPhone' && f.orientation === 'portrait')!
    const p = layoutFrame(phone, { width: 800, height: 600 }, { width: 1179, height: 2556 }, true)
    expect(p.frame.height).toBeLessThanOrEqual(600.001)
    expect(p.screen.height).toBeGreaterThan(p.screen.width)
    expect(frameLabel(phone)).toContain('portrait')
  })
})
