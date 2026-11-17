import { describe, expect, it } from 'vitest'
import { autoZooms } from './autoZoom'
import type { ClickEvent } from './project'

const click = (timeMs: number, x = 0.5, y = 0.5): ClickEvent => ({
  timeMs,
  position: { x, y },
  button: 'left'
})

describe('autoZooms', () => {
  it('returns nothing for a recording without clicks', () => {
    expect(autoZooms([], 10_000)).toEqual([])
  })

  it('wraps a single click with the lead and tail', () => {
    const [zoom] = autoZooms([click(5_000, 0.2, 0.8)], 10_000)
    expect(zoom).toMatchObject({ startMs: 4_400, endMs: 6_200, scale: 2, automatic: true })
    expect(zoom?.center).toEqual({ x: 0.2, y: 0.8 })
  })

  it('merges clicks that happen close together and centres on their average', () => {
    const zooms = autoZooms([click(1_000, 0.2, 0.2), click(2_000, 0.4, 0.4)], 10_000)
    expect(zooms).toHaveLength(1)
    expect(zooms[0]).toMatchObject({ startMs: 400, endMs: 3_200 })
    expect(zooms[0]?.center.x).toBeCloseTo(0.3)
    expect(zooms[0]?.center.y).toBeCloseTo(0.3)
  })

  it('keeps clicks far apart in separate regions', () => {
    const zooms = autoZooms([click(1_000), click(8_000)], 10_000)
    expect(zooms.map((z) => [z.startMs, z.endMs])).toEqual([
      [400, 2_200],
      [7_400, 9_200]
    ])
  })

  it('clamps regions to the recording', () => {
    const zooms = autoZooms([click(200), click(9_900)], 10_000)
    expect(zooms[0]?.startMs).toBe(0)
    expect(zooms[1]?.endMs).toBe(10_000)
  })

  it('sorts clicks before grouping', () => {
    const zooms = autoZooms([click(8_000), click(1_000)], 10_000)
    expect(zooms[0]?.startMs).toBe(400)
  })

  it('honours custom options', () => {
    const [zoom] = autoZooms([click(5_000)], 10_000, { scale: 3, leadMs: 100, tailMs: 100 })
    expect(zoom).toMatchObject({ startMs: 4_900, endMs: 5_100, scale: 3 })
  })
})
