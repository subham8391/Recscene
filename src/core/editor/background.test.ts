import { describe, expect, it } from 'vitest'
import { applyInset, DEFAULT_GRADIENT, defaultBackgroundConfig, GRADIENT_PRESETS, gradientCss, insetValue, isHexColor, randomWallpaper, screenLayout, setDirectional, shadowCss, toggleFavourite, withAlpha } from './background'

describe('gradients and colours', () => {
  it('has 35 presets including the default and renders CSS', () => {
    expect(GRADIENT_PRESETS).toHaveLength(35)
    expect(GRADIENT_PRESETS[0]).toEqual(DEFAULT_GRADIENT)
    expect(gradientCss(DEFAULT_GRADIENT)).toBe('linear-gradient(135deg, #03045e 0%, #caf0f8 100%)')
    expect(gradientCss({ start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, stops: DEFAULT_GRADIENT.stops })).toBe('linear-gradient(180deg, #03045e 0%, #caf0f8 100%)')
  })

  it('validates hex and adds alpha', () => {
    expect(isHexColor('#3F37C9')).toBe(true)
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('blue')).toBe(false)
    expect(withAlpha('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)')
    expect(withAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
})

describe('screenLayout', () => {
  const frame = { width: 1000, height: 500 }
  const rec = { width: 1600, height: 900 }
  const none = { top: 0, right: 0, bottom: 0, left: 0 }

  it('fills the frame at 0% padding and keeps the same gap on every side (Screen Studio measurement)', () => {
    expect(screenLayout(frame, { width: 1000, height: 500 }, 0, none).screen).toEqual({ x: 0, y: 0, width: 1000, height: 500 })
    // Auto frame for 1600×900 at 10%: (1600 + 180) × (900 + 180) → scaled to height 500: gap = 10% of the recording's height on all sides.
    const auto = { width: 1780 * (500 / 1080), height: 500 }
    const { screen } = screenLayout(auto, rec, 10, none)
    const gap = screen.y
    expect(gap).toBeCloseTo(0.1 * screen.height, 5)
    expect(screen.x).toBeCloseTo(gap, 5)
    expect(auto.width - screen.x - screen.width).toBeCloseTo(gap, 5)
    expect(auto.height - screen.y - screen.height).toBeCloseTo(gap, 5)
    // A fixed 2:1 frame letterboxes the extra width equally.
    const fixed = screenLayout(frame, rec, 10, none)
    expect(fixed.screen.height).toBeCloseTo(500 / 1.2)
    expect(fixed.screen.y).toBeCloseTo(0.1 * fixed.screen.height)
    expect(fixed.screen.x).toBeCloseTo((1000 - fixed.screen.width) / 2)
  })

  it('leaves room for the inset band', () => {
    const { outer, screen } = screenLayout(frame, rec, 10, { top: 20, right: 20, bottom: 20, left: 20 })
    expect(outer.height - screen.height).toBeCloseTo(40)
    expect(screen.x - outer.x).toBe(20)
    expect(outer.y).toBeCloseTo(0.1 * screen.height)
  })
})

describe('shadow and inset', () => {
  it('builds shadows and switches directional intensity', () => {
    expect(shadowCss(defaultBackgroundConfig)).toContain('rgba(0, 0, 0, 0.75)')
    expect(shadowCss({ ...defaultBackgroundConfig, shadowIntensity: 0 })).toBe('none')
    const d = setDirectional(defaultBackgroundConfig, true)
    expect(d.shadowIntensity).toBe(0.4)
    expect(shadowCss(d)).toMatch(/^0\.0px 25\.0px 10\.0px/)
    expect(setDirectional(d, false).shadowIntensity).toBe(0.75)
  })

  it('writes all inset sides and the corner radius', () => {
    const c = applyInset(defaultBackgroundConfig, 24)
    expect(c.insetPadding).toEqual({ top: 24, right: 24, bottom: 24, left: 24 })
    expect(c.windowBorderRadius).toBe(34)
    expect(insetValue(c)).toBe(24)
    expect(applyInset(c, 999).insetPadding.top).toBe(60)
  })
})

describe('wallpapers', () => {
  it('picks randomly and toggles favourites', () => {
    expect(randomWallpaper(['a', 'b', 'c'], () => 0.5)).toBe('b')
    expect(randomWallpaper([], () => 0.5)).toBe('macOS/tahoe-light')
    expect(toggleFavourite([], 'x')).toEqual(['x'])
    expect(toggleFavourite(['x', 'y'], 'x')).toEqual(['y'])
  })
})
