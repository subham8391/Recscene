import { describe, expect, it } from 'vitest'
import { cameraAtRest, cameraStep, cameraViewport, clampCenter, cursorAt, SPRING_FOCUSED, springStep, targetViewport, viewportTransform } from './camera'
import { makeZoom } from './zooms'

describe('cursorAt', () => {
  const samples = [
    { timeMs: 0, x: 0, y: 0 },
    { timeMs: 1000, x: 1, y: 0.5 },
    { timeMs: 2000, x: 0, y: 1 }
  ]
  it('interpolates and clamps to the ends', () => {
    expect(cursorAt(samples, 500)).toEqual({ x: 0.5, y: 0.25 })
    expect(cursorAt(samples, 1500)).toEqual({ x: 0.5, y: 0.75 })
    expect(cursorAt(samples, -5)).toEqual({ x: 0, y: 0 })
    expect(cursorAt(samples, 9999)).toEqual({ x: 0, y: 1 })
    expect(cursorAt([], 5)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('clampCenter', () => {
  it('keeps the view inside the frame and snaps near the edges', () => {
    expect(clampCenter({ x: 0.1, y: 0.5 }, 2, 0)).toEqual({ x: 0.25, y: 0.5 })
    expect(clampCenter({ x: 0.3, y: 0.5 }, 2, 0)).toEqual({ x: 0.3, y: 0.5 })
    expect(clampCenter({ x: 0.3, y: 0.5 }, 2, 0.25)).toEqual({ x: 0.25, y: 0.5 })
    expect(clampCenter({ x: 0.9, y: 0.9 }, 2, 0)).toEqual({ x: 0.75, y: 0.75 })
    expect(clampCenter({ x: 0.1, y: 0.1 }, 1, 0.25)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('targetViewport', () => {
  it('follows the cursor for auto zooms, the point for manual, and rests outside zooms', () => {
    const auto = makeZoom(0, 2000, 2, { id: 'a' })
    const manual = makeZoom(3000, 5000, 2, { id: 'm', type: 'manual', manualTargetPoint: { x: 0.8, y: 0.8 } })
    const cursor = (): { x: number; y: number } => ({ x: 0.4, y: 0.6 })
    expect(targetViewport(1000, [auto, manual], cursor)).toEqual({ center: { x: 0.4, y: 0.6 }, scale: 2 })
    expect(targetViewport(4000, [auto, manual], cursor)).toEqual({ center: { x: 0.75, y: 0.75 }, scale: 2 })
    expect(targetViewport(2500, [auto, manual], cursor)).toEqual({ center: { x: 0.5, y: 0.5 }, scale: 1 })
    expect(targetViewport(1000, [{ ...auto, isDisabled: true }], cursor).scale).toBe(1)
  })
})

describe('spring', () => {
  it('settles on the target without overshooting past it badly', () => {
    let s = { value: 0, velocity: 0 }
    let max = 0
    for (let i = 0; i < 300; i += 1) {
      s = springStep(s, 1, 16, SPRING_FOCUSED)
      max = Math.max(max, s.value)
    }
    expect(s.value).toBeCloseTo(1, 3)
    expect(max).toBeLessThan(1.15)
  })

  it('camera steps and jumps instantly when asked', () => {
    const target = { center: { x: 0.3, y: 0.3 }, scale: 2 }
    const rest = cameraAtRest({ center: { x: 0.5, y: 0.5 }, scale: 1 })
    const moved = cameraStep(rest, target, 16, SPRING_FOCUSED, false)
    expect(cameraViewport(moved).scale).toBeGreaterThan(1)
    expect(cameraViewport(moved).scale).toBeLessThan(2)
    expect(cameraViewport(cameraStep(rest, target, 16, SPRING_FOCUSED, true))).toEqual(target)
  })

  it('builds the CSS transform', () => {
    expect(viewportTransform({ center: { x: 0.5, y: 0.5 }, scale: 1 }, 100, 50)).toBe('translate(0.00px, 0.00px) scale(1.0000)')
    expect(viewportTransform({ center: { x: 0.25, y: 0.25 }, scale: 2 }, 100, 50)).toBe('translate(0.00px, 0.00px) scale(2.0000)')
  })
})
