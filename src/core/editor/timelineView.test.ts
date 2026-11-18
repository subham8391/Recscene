import { describe, expect, it } from 'vitest'
import { initialView, keepVisible, panView, rulerTicks, sliderToZoom, timeAtX, visibleLabel, xAtTime, zoomToSlider, zoomView } from './timelineView'

const D = 60_000

describe('timeline view', () => {
  it('starts on the first minute, or the whole project when shorter', () => {
    expect(initialView(D)).toEqual({ startMs: 0, visibleMs: D })
    expect(initialView(2_000_000).visibleMs).toBe(60_000)
    expect(initialView(20_000).visibleMs).toBe(20_000)
    expect(initialView(500).visibleMs).toBe(2000)
  })

  it('zooms around the anchor within bounds', () => {
    const v = zoomView(initialView(D), 0.75, D, 30_000)
    expect(v.visibleMs).toBe(45_000)
    expect(v.startMs).toBe(7_500)
    expect(zoomView(v, 1.25, D).visibleMs).toBe(56_250)
    expect(zoomView(initialView(D), 0.001, D).visibleMs).toBe(2000)
    expect(zoomView(initialView(D), 10, D).visibleMs).toBe(D)
  })

  it('maps the slider both ways', () => {
    const v = initialView(D)
    expect(zoomToSlider(v, D)).toBe(0)
    const zoomed = sliderToZoom(100, v, D)
    expect(zoomed.visibleMs).toBe(2000)
    expect(zoomToSlider(zoomed, D)).toBe(100)
  })

  it('pans and keeps the playhead visible', () => {
    const v = { startMs: 0, visibleMs: 10_000 }
    expect(panView(v, 5000, D).startMs).toBe(5000)
    expect(panView(v, -5000, D).startMs).toBe(0)
    expect(panView(v, 99_000, D).startMs).toBe(50_000)
    expect(keepVisible(v, 15_000, D).startMs).toBe(7000)
    expect(keepVisible({ startMs: 20_000, visibleMs: 10_000 }, 5000, D).startMs).toBe(5000)
    expect(keepVisible(v, 5000, D)).toBe(v)
  })

  it('converts between pixels and time', () => {
    const v = { startMs: 10_000, visibleMs: 10_000 }
    expect(timeAtX(v, 500, 1000, D)).toBe(15_000)
    expect(xAtTime(v, 15_000, 1000)).toBe(500)
    expect(timeAtX(v, -100, 1000, D)).toBe(9000)
  })

  it('labels the ruler', () => {
    const ticks = rulerTicks({ startMs: 0, visibleMs: 60_000 })
    expect(ticks.map((t) => t.label).slice(0, 3)).toEqual(['0:00', '0:05', '0:10'])
    expect(rulerTicks({ startMs: 0, visibleMs: 2000 })[1]?.label).toBe('0:0.25')
    expect(visibleLabel({ startMs: 0, visibleMs: 12_000 })).toBe('12 seconds visible')
    expect(visibleLabel({ startMs: 0, visibleMs: 90_000 })).toBe('1.5 minutes visible')
  })
})
