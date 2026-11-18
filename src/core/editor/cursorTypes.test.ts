import { describe, expect, it } from 'vitest'
import { screenBlurPx, cameraAtRest } from './camera'
import { CURSOR_SETS, cursorHotspot, cursorTypeAt, defaultCursorConfig, normaliseCursorType, optimiseCursorTypes, setDrawsTypes } from './cursor'

const changes = [
  { timeMs: 0, type: 'pointer' },
  { timeMs: 1000, type: 'ibeam' },
  { timeMs: 1050, type: 'pointinghand' },
  { timeMs: 1100, type: 'ibeam' },
  { timeMs: 3000, type: 'resize-left' },
  { timeMs: 5000, type: 'weird-app-cursor' }
]

describe('cursor types (specs 125, 134–136)', () => {
  it('ships 24 sets and maps recorded types to drawable ones', () => {
    expect(CURSOR_SETS).toHaveLength(24)
    expect(CURSOR_SETS[4]?.id).toBe('custom-1')
    expect(normaliseCursorType('resize-right')).toBe('resize-leftright')
    expect(normaliseCursorType('resize-down')).toBe('resize-updown')
    expect(normaliseCursorType('ibeam-vertical')).toBe('ibeam')
    expect(normaliseCursorType('whatever')).toBe('pointer')
    expect(setDrawsTypes('macos')).toBe(true)
    expect(setDrawsTypes('touch')).toBe(false)
    expect(cursorHotspot('pointer')).toEqual({ x: 3.6, y: 1.9 })
    expect(cursorHotspot('crosshair')).toEqual({ x: 12, y: 12 })
  })

  it('drops rapid changes when optimising and keeps them otherwise', () => {
    expect(optimiseCursorTypes(changes).map((c) => c.type)).toEqual(['pointer', 'ibeam', 'resize-left', 'weird-app-cursor'])
    const cfg = { ...defaultCursorConfig, cursorSet: { id: 'macos' as const } }
    expect(cursorTypeAt(changes, 1075, cfg)).toBe('pointer')
    expect(cursorTypeAt(changes, 1150, cfg)).toBe('ibeam')
    expect(cursorTypeAt(changes, 1075, { ...cfg, optimizeOriginalCursorTypes: false })).toBe('pointinghand')
    expect(cursorTypeAt(changes, 3500, cfg)).toBe('resize-leftright')
    expect(cursorTypeAt(changes, 6000, cfg)).toBe('pointer')
    expect(cursorTypeAt(changes, 1150, { ...cfg, alwaysUseDefaultCursor: true })).toBe('pointer')
    expect(cursorTypeAt(changes, 1150, { ...cfg, cursorSet: { id: 'touch' } })).toBe('pointer')
    expect(cursorTypeAt([], 500, cfg)).toBe('pointer')
  })

  it('blurs the screen with pans and zooms (specs 146–147)', () => {
    const still = cameraAtRest({ center: { x: 0.5, y: 0.5 }, scale: 2 })
    expect(screenBlurPx(still, 1000, 1, 1, 1)).toBe(0)
    const panning = { ...still, x: { value: 0.5, velocity: 0.6 } }
    expect(screenBlurPx(panning, 1000, 1, 1, 1)).toBeCloseTo(2)
    expect(screenBlurPx(panning, 1000, 1, 0, 1)).toBe(0)
    const zooming = { ...still, scale: { value: 1.5, velocity: 1.2 } }
    expect(screenBlurPx(zooming, 1000, 1, 1, 1)).toBeCloseTo(1)
    expect(screenBlurPx(zooming, 1000, 1, 1, 0)).toBe(0)
    expect(screenBlurPx({ ...panning, x: { value: 0.5, velocity: 40 } }, 1000, 1, 1, 1)).toBe(10)
  })
})
