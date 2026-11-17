import { describe, expect, it } from 'vitest'
import type { ClickEvent } from '../project'
import {
  addZoomAt,
  applyLevelToAll,
  automaticZooms,
  clampZoom,
  duplicateZoom,
  freeRangeAt,
  makeZoom,
  moveZoom,
  removeZoom,
  setAllDisabled,
  splitZoom,
  stepZoomLevel,
  updateZoom,
  zoomAt,
  zoomSettings
} from './zooms'

const click = (t: number): ClickEvent => ({ timeMs: t, position: { x: 0.5, y: 0.5 }, button: 'left' })
const D = 30_000

describe('automaticZooms', () => {
  it('wraps clicks with −300/+2500 and merges close ones', () => {
    const z = automaticZooms([click(1000), click(2000), click(10_000)], D, 1.135)
    expect(z.map((r) => [r.startMs, r.endMs])).toEqual([[700, 4500], [9700, 12_500]])
    expect(z[0]).toMatchObject({ type: 'follow-click-groups', zoom: 1.135, snapToEdgesRatio: 0.25, isSystem: true, hasInstantAnimation: false })
  })

  it('merges ranges less than 2.5 s apart until stable, clamps and ignores the last second', () => {
    expect(automaticZooms([click(1000), click(5900)], D, 2).map((r) => [r.startMs, r.endMs])).toEqual([[700, 8400]])
    expect(automaticZooms([click(1000), click(6300)], D, 2)).toHaveLength(2)
    expect(automaticZooms([click(100), click(29_500)], D, 2).map((r) => [r.startMs, r.endMs])).toEqual([[0, 2600]])
    expect(automaticZooms([], D, 2)).toEqual([])
  })
})

describe('adding and moving', () => {
  it('finds free space and inserts a 3 s zoom, or refuses', () => {
    const base = [makeZoom(5000, 8000, 2)]
    expect(freeRangeAt(base, 6000, D)).toBeNull()
    expect(freeRangeAt(base, 1000, D)).toEqual({ start: 0, end: 5000 })
    const r = addZoomAt(base, 1000, D, 2)
    expect(r.zoom).toMatchObject({ startMs: 1000, endMs: 4000 })
    expect(addZoomAt(base, 4500, D, 2).zoom).toMatchObject({ startMs: 4000, endMs: 5000 })
    expect(addZoomAt(base, 6000, D, 2).error).toBe('Could not insert zoom at currently selected time')
    expect(addZoomAt([makeZoom(0, 29_500, 2)], 29_600, D, 2).error).toBeDefined()
  })

  it('moves edges and whole zooms within neighbours', () => {
    const [a, b] = [makeZoom(1000, 4000, 2, { id: 'a' }), makeZoom(6000, 9000, 2, { id: 'b' })]
    expect(moveZoom([a, b], 'a', { endMs: 7000 }, D)[0]).toMatchObject({ endMs: 6000 })
    expect(moveZoom([a, b], 'a', { endMs: 1500 }, D)[0]).toMatchObject({ endMs: 2000 })
    expect(moveZoom([a, b], 'b', { startMs: 5000, endMs: 8000 }, D)[1]).toMatchObject({ startMs: 5000, endMs: 8000 })
    expect(moveZoom([a, b], 'b', { startMs: 2000, endMs: 5000 }, D)[1]).toMatchObject({ startMs: 4000, endMs: 7000 })
  })
})

describe('levels and flags', () => {
  it('clamps and steps the level on the 0.2 grid', () => {
    expect(clampZoom(9)).toBe(4)
    expect(clampZoom(0.5)).toBe(1)
    const z = makeZoom(0, 2000, 1.135)
    expect(stepZoomLevel(z, 1).zoom).toBe(1.2)
    expect(stepZoomLevel(stepZoomLevel(z, 1), 1).zoom).toBe(1.4)
    expect(stepZoomLevel(z, -1).zoom).toBe(1)
    expect(updateZoom([z], z.id, { zoom: 7 })[0]?.zoom).toBe(4)
  })

  it('applies a level to all, disables all, copies settings', () => {
    const zooms = [makeZoom(0, 2000, 1.5, { id: 'a' }), makeZoom(3000, 5000, 3, { id: 'b' })]
    expect(applyLevelToAll(zooms, 'b').every((z) => z.zoom === 3)).toBe(true)
    expect(setAllDisabled(zooms, true).every((z) => z.isDisabled)).toBe(true)
    expect(zoomSettings(zooms[0]!)).toEqual({ type: 'follow-click-groups', zoom: 1.5, isDisabled: false, manualTargetPoint: { x: 0.5, y: 0.5 }, snapToEdgesRatio: 0.25 })
    expect(zoomAt(setAllDisabled(zooms, true), 1000)).toBeNull()
    expect(zoomAt(zooms, 1000)?.id).toBe('a')
  })
})

describe('duplicate, split, remove', () => {
  it('duplicates after the original, capped by the next zoom', () => {
    const zooms = [makeZoom(0, 3000, 2, { id: 'a' }), makeZoom(5000, 8000, 2, { id: 'b' })]
    const d = duplicateZoom(zooms, 'a', D)
    expect(d).toHaveLength(3)
    expect(d[1]).toMatchObject({ startMs: 3000, endMs: 5000 })
    expect(duplicateZoom([makeZoom(0, 3000, 2, { id: 'a' }), makeZoom(3500, 8000, 2, { id: 'b' })], 'a', D)).toHaveLength(2)
  })

  it('splits with the 100 ms rule and removes', () => {
    const zooms = [makeZoom(0, 3000, 2, { id: 'a' })]
    const s = splitZoom(zooms, 1000)
    expect(s.zooms.map((z) => [z.startMs, z.endMs])).toEqual([[0, 1000], [1000, 3000]])
    expect(splitZoom(zooms, 50).error).toBe('The part you want to cut is too short')
    expect(splitZoom(zooms, 5000).error).toBe('No zoom at the playhead')
    expect(removeZoom(zooms, 'a')).toEqual([])
  })
})
