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

  it('fills the frame at 0% padding and shrinks by the padding share', () => {
    expect(screenLayout(frame, { width: 1000, height: 500 }, 0, none).screen).toEqual({ x: 0, y: 0, width: 1000, height: 500 })
    const { screen } = screenLayout(frame, rec, 10, none)
    expect(screen.width).toBeCloseTo(711.1, 0)
    expect(screen.height).toBeCloseTo(400)
    expect(screen.x).toBeCloseTo((1000 - screen.width) / 2)
  })

  it('pads every side by the same number of pixels (Screen Studio measurement)', () => {
    const square = { width: 1000, height: 1000 }
    const { screen } = screenLayout(square, { width: 1600, height: 900 }, 10, none)
    expect(screen.x).toBeCloseTo(100)
    expect(screen.width).toBeCloseTo(800)
    const tall = { width: 500, height: 1000 }
    const t = screenLayout(tall, { width: 1000, height: 1000 }, 10, none)
    expect(t.screen.x).toBeCloseTo(50)
    expect(t.screen.width).toBeCloseTo(400)
  })

  it('leaves room for the inset band', () => {
    const { outer, screen } = screenLayout(frame, rec, 10, { top: 20, right: 20, bottom: 20, left: 20 })
    expect(outer.height).toBeCloseTo(400)
    expect(screen.height).toBeCloseTo(360)
    expect(screen.x - outer.x).toBe(20)
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
