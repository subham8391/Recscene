import { describe, expect, it } from 'vitest'
import type { ClickEvent } from '../project'
import { activeClickEffects, CLICK_SPRING_DEFAULT, CURSOR_PRESETS, cursorAtRest, cursorBlurPx, cursorRotation, cursorStep, cursorTarget, defaultCursorConfig, isPressed, lastMoveBefore, presetFor, removeShakes } from './cursor'

const rec = { width: 1000, height: 1000 }
const samples = [
  { timeMs: 0, x: 0.1, y: 0.1 },
  { timeMs: 1000, x: 0.2, y: 0.1 },
  { timeMs: 2000, x: 0.2, y: 0.1 },
  { timeMs: 6000, x: 0.2, y: 0.1 },
  { timeMs: 7000, x: 0.5, y: 0.5 }
]
const opts = (config: Partial<typeof defaultCursorConfig> = {}, clipHidden = false) => ({ startMs: 0, endMs: 8000, config: { ...defaultCursorConfig, ...config }, clipHidden })

describe('presets and shakes', () => {
  it('recognises presets and none', () => {
    expect(presetFor(CURSOR_PRESETS[1]!.spring, false)).toBe('medium')
    expect(presetFor({ stiffness: 1, damping: 1, mass: 1 }, false)).toBeNull()
    expect(presetFor(CURSOR_PRESETS[0]!.spring, true)).toBe('none')
  })

  it('removes a spike that returns and keeps real moves', () => {
    const spiky = [
      { timeMs: 0, x: 0.1, y: 0.1 },
      { timeMs: 10, x: 0.9, y: 0.9 },
      { timeMs: 20, x: 0.11, y: 0.1 },
      { timeMs: 30, x: 0.8, y: 0.8 },
      { timeMs: 40, x: 0.82, y: 0.8 }
    ]
    expect(removeShakes(spiky, 500, rec).map((s) => s.timeMs)).toEqual([0, 20, 30, 40])
    expect(removeShakes(spiky, 0, rec)).toHaveLength(5)
  })
})

describe('cursorTarget', () => {
  it('follows samples and hides for the project or the clip', () => {
    const at500 = cursorTarget(samples, 500, opts())
    expect(at500.visible).toBe(true)
    expect(at500.position.x).toBeCloseTo(0.15)
    expect(at500.position.y).toBeCloseTo(0.1)
    expect(cursorTarget(samples, 500, opts({ hideCursor: true })).visible).toBe(false)
    expect(cursorTarget(samples, 500, opts({}, true)).visible).toBe(false)
    expect(cursorTarget([], 500, opts()).visible).toBe(false)
  })

  it('hides after idling and shows again on movement', () => {
    expect(lastMoveBefore(samples, 3000)).toBe(1000)
    expect(cursorTarget(samples, 4000, opts({ hideNotMovingCursorAfterMs: 2000 })).visible).toBe(false)
    expect(cursorTarget(samples, 2500, opts({ hideNotMovingCursorAfterMs: 2000 })).visible).toBe(true)
    expect(cursorTarget(samples, 6500, opts({ hideNotMovingCursorAfterMs: 2000 })).visible).toBe(true)
  })

  it('loops home near the end and freezes for the stop window', () => {
    expect(cursorTarget(samples, 7500, opts({ loopCursorPositionBeforeEndMs: 1000 })).position).toEqual({ x: 0.1, y: 0.1 })
    const frozen = cursorTarget(samples, 7800, opts({ stopCursorMovementInLastPartMs: 2000 }))
    expect(frozen.position).toEqual(cursorTarget(samples, 6000, opts()).position)
  })
})

describe('motion', () => {
  it('springs towards the target or jumps when smoothing is off', () => {
    const rest = cursorAtRest({ x: 0, y: 0 })
    const moved = cursorStep(rest, { x: 1, y: 0 }, 16, CURSOR_PRESETS[0]!.spring, true, false, CLICK_SPRING_DEFAULT)
    expect(moved.x.value).toBeGreaterThan(0)
    expect(moved.x.value).toBeLessThan(1)
    expect(cursorStep(rest, { x: 1, y: 0 }, 16, CURSOR_PRESETS[0]!.spring, false, false, CLICK_SPRING_DEFAULT).x.value).toBe(1)
    expect(cursorRotation(moved, 0.5, 10)).toBeGreaterThan(10)
    expect(cursorRotation(rest, 0.5, -20)).toBe(-20)
  })

  it('presses on click and releases', () => {
    let m = cursorAtRest({ x: 0, y: 0 })
    for (let i = 0; i < 6; i += 1) m = cursorStep(m, { x: 0, y: 0 }, 16, CURSOR_PRESETS[0]!.spring, true, true, CLICK_SPRING_DEFAULT)
    expect(m.press.value).toBeLessThan(1)
    for (let i = 0; i < 120; i += 1) m = cursorStep(m, { x: 0, y: 0 }, 16, CURSOR_PRESETS[0]!.spring, true, false, CLICK_SPRING_DEFAULT)
    expect(m.press.value).toBeCloseTo(1, 2)
  })

  it('tracks click holds, effects and blur', () => {
    const clicks: ClickEvent[] = [{ timeMs: 1000, position: { x: 0.5, y: 0.5 }, button: 'left' }]
    expect(isPressed(clicks, 1050)).toBe(true)
    expect(isPressed(clicks, 1300)).toBe(false)
    expect(activeClickEffects(clicks, 1225)[0]?.progress).toBeCloseTo(0.5)
    expect(activeClickEffects(clicks, 2000)).toEqual([])
    const fast = { ...cursorAtRest({ x: 0, y: 0 }), x: { value: 0, velocity: 2 } }
    expect(cursorBlurPx(fast, 800, 1, 1)).toBeCloseTo(4)
    expect(cursorBlurPx(fast, 800, 0, 1)).toBe(0)
  })
})
