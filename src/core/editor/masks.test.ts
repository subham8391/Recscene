import { describe, expect, it } from 'vitest'
import {
  activeMask,
  addMaskAt,
  applyOpacityToAll,
  blurPxFor,
  clampRegion,
  disableAllMasks,
  dragRegion,
  maskSettings,
  moveMask,
  NO_SPACE,
  nudgeRegion,
  pasteMaskSettings,
  regionFromPx,
  regionInCrop,
  regionToPx,
  splitMask,
  updateMask,
  type Mask,
  type MaskRegion
} from './masks'

const near = (actual: MaskRegion | null, expected: MaskRegion): void => {
  expect(actual).not.toBeNull()
  for (const k of ["x", "y", "width", "height"] as const) expect(actual![k]).toBeCloseTo(expected[k], 6)
}

const mask = (over: Partial<Mask>): Mask => ({ id: 'm', sourceStartMs: 1000, sourceEndMs: 5000, type: 'sensitive-data', region: { x: 0.3, y: 0.4, width: 0.3, height: 0.1 }, highlightMaskOpacity: 0.5, blurStrength: 18, featherEdge: true, isDisabled: false, ...over })

describe('mask track (specs 189, 192, 194, 198)', () => {
  it('adds in free space with defaults and refuses occupied slots', () => {
    const r = addMaskAt([], 2000, 10000)
    expect(r.mask).toMatchObject({ sourceStartMs: 2000, sourceEndMs: 6000, type: 'sensitive-data', highlightMaskOpacity: 0.5, blurStrength: 18, featherEdge: true })
    expect(addMaskAt(r.masks, 3000, 10000).error).toBe(NO_SPACE)
    expect(addMaskAt(r.masks, 6100, 6400).error).toBe(NO_SPACE)
    expect(addMaskAt(r.masks, 6000, 10000, 'highlight').mask?.type).toBe('highlight')
    const pasted = addMaskAt([], 0, 10000, 'sensitive-data', { type: 'highlight', highlightMaskOpacity: 0.8, region: { x: 0.9, y: 0.9, width: 0.5, height: 0.5 } })
    expect(pasted.mask).toMatchObject({ type: 'highlight', highlightMaskOpacity: 0.8, region: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 } })
  })

  it('moves, splits, disables and removes', () => {
    const a = mask({ id: 'a', sourceStartMs: 0, sourceEndMs: 3000 })
    const b = mask({ id: 'b', sourceStartMs: 5000, sourceEndMs: 8000 })
    expect(moveMask([a, b], 'b', { startMs: 1000, endMs: 4000 }, 10000)[1]).toMatchObject({ sourceStartMs: 3000, sourceEndMs: 6000 })
    expect(moveMask([a, b], 'a', { endMs: 100 }, 10000)[0]?.sourceEndMs).toBe(500)
    expect(splitMask([a], 1500).masks.map((m) => [m.sourceStartMs, m.sourceEndMs])).toEqual([[0, 1500], [1500, 3000]])
    expect(splitMask([a], 2950).error).toBe('New duration is too short')
    expect(disableAllMasks([a, b]).every((m) => m.isDisabled)).toBe(true)
    expect(activeMask([a, b], 6000)?.id).toBe('b')
    expect(activeMask([{ ...a, isDisabled: true }], 1000)).toBeNull()
    expect(activeMask([a, b], 4000)).toBeNull()
  })

  it('copies settings and applies opacity to all (specs 191, 195)', () => {
    const src = mask({ id: 's', type: 'highlight', highlightMaskOpacity: 0.7, blurStrength: 30, featherEdge: false })
    const dst = mask({ id: 'd', sourceStartMs: 6000, sourceEndMs: 9000 })
    const pasted = pasteMaskSettings([src, dst], 'd', maskSettings(src))[1]
    expect(pasted).toMatchObject({ type: 'highlight', highlightMaskOpacity: 0.7, blurStrength: 30, featherEdge: false, sourceStartMs: 6000, region: src.region })
    expect(applyOpacityToAll([src, dst], 0.95).every((m) => m.highlightMaskOpacity === 0.9)).toBe(true)
    expect(updateMask([dst], 'd', { region: { x: 0.95, y: 0, width: 0.2, height: 0.2 } })[0]?.region.x).toBeCloseTo(0.8)
  })
})

describe('region geometry (spec 192)', () => {
  const frame = { width: 1920, height: 1080 }

  it('clamps inside the frame and converts to pixels and back', () => {
    expect(clampRegion({ x: -0.2, y: 0.95, width: 0.5, height: 0.2 })).toEqual({ x: 0, y: 0.8, width: 0.5, height: 0.2 })
    expect(clampRegion({ x: 0, y: 0, width: 2, height: 0 })).toEqual({ x: 0, y: 0, width: 1, height: 0.01 })
    expect(regionToPx({ x: 0.25, y: 0.5, width: 0.5, height: 0.1 }, frame)).toEqual({ x: 480, y: 540, width: 960, height: 108 })
    expect(regionFromPx({ x: 480, y: 540, width: 960, height: 108 }, frame)).toEqual({ x: 0.25, y: 0.5, width: 0.5, height: 0.1 })
    expect(nudgeRegion({ x: 0.25, y: 0.5, width: 0.5, height: 0.1 }, 10, -108, frame)).toEqual({ x: 0.25 + 10 / 1920, y: 0.4, width: 0.5, height: 0.1 })
  })

  it('drags handles with the opposite side fixed and moves the whole region', () => {
    const r = { x: 0.2, y: 0.2, width: 0.4, height: 0.2 }
    near(dragRegion(r, 'e', 0.1, 0), { x: 0.2, y: 0.2, width: 0.5, height: 0.2 })
    near(dragRegion(r, 'w', 0.1, 0), { x: 0.3, y: 0.2, width: 0.3, height: 0.2 })
    near(dragRegion(r, 'n', 0, -0.1), { x: 0.2, y: 0.1, width: 0.4, height: 0.3 })
    near(dragRegion(r, 'se', 0.1, 0.1), { x: 0.2, y: 0.2, width: 0.5, height: 0.3 })
    expect(dragRegion(r, 'w', 0.5, 0).width).toBeCloseTo(0.01)
    near(dragRegion(r, 'move', 0.5, 0.9), { x: 0.6, y: 0.8, width: 0.4, height: 0.2 })
  })

  it('maps regions into a crop and scales the blur', () => {
    const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }
    near(regionInCrop({ x: 0.3, y: 0.3, width: 0.2, height: 0.2 }, crop), { x: 0.1, y: 0.1, width: 0.4, height: 0.4 })
    near(regionInCrop({ x: 0, y: 0, width: 0.3, height: 0.3 }, crop), { x: 0, y: 0, width: 0.1, height: 0.1 })
    expect(regionInCrop({ x: 0, y: 0, width: 0.1, height: 0.1 }, crop)).toBeNull()
    expect(regionInCrop({ x: 0.3, y: 0.3, width: 0.2, height: 0.2 }, null)).toEqual({ x: 0.3, y: 0.3, width: 0.2, height: 0.2 })
    expect(blurPxFor(18, 1920)).toBe(18)
    expect(blurPxFor(18, 960)).toBe(9)
  })
})
