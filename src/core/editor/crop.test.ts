import { describe, expect, it } from 'vitest'
import { applyCropAspect, clampCrop, cropFromFractions, cropToFractions, fullCrop, isCropTooSmall, moveCrop, nudgeStep, resizeCropHandle } from './crop'

const rec = { width: 2000, height: 1000 }

describe('crop', () => {
  it('clamps inside the recording with the minimum size', () => {
    expect(clampCrop({ x: -50, y: -50, width: 100, height: 100 }, rec)).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    expect(clampCrop({ x: 1900, y: 900, width: 500, height: 500 }, rec)).toEqual({ x: 1500, y: 500, width: 500, height: 500 })
    expect(isCropTooSmall({ x: 0, y: 0, width: 199, height: 200 })).toBe(true)
  })

  it('applies aspect ratios and resizes handles', () => {
    expect(applyCropAspect({ x: 0, y: 0, width: 800, height: 100 }, 1, rec)).toEqual({ x: 0, y: 0, width: 800, height: 800 })
    expect(applyCropAspect({ x: 0, y: 0, width: 2000, height: 100 }, 16 / 9, rec)).toEqual({ x: 0, y: 0, width: 1778, height: 1000 })
    const c = { x: 500, y: 200, width: 600, height: 400 }
    expect(resizeCropHandle(c, 'se', 100, 50, null, rec)).toEqual({ x: 500, y: 200, width: 700, height: 450 })
    expect(resizeCropHandle(c, 'nw', 100, 100, null, rec)).toEqual({ x: 600, y: 300, width: 500, height: 300 })
    expect(resizeCropHandle(c, 'se', -500, 0, null, rec).width).toBe(200)
    expect(resizeCropHandle(c, 'se', 200, 0, 2, rec)).toEqual({ x: 500, y: 200, width: 800, height: 400 })
  })

  it('nudges and converts to fractions', () => {
    expect(nudgeStep({ shiftKey: false, metaKey: false })).toBe(1)
    expect(nudgeStep({ shiftKey: true, metaKey: false })).toBe(10)
    expect(nudgeStep({ shiftKey: true, metaKey: true })).toBe(100)
    expect(moveCrop({ x: 1900, y: 0, width: 200, height: 200 }, 50, 0, rec).x).toBe(1800)
    expect(cropToFractions(fullCrop(rec), rec)).toBeNull()
    expect(cropToFractions({ x: 500, y: 250, width: 1000, height: 500 }, rec)).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 })
    expect(cropFromFractions({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, rec)).toEqual({ x: 500, y: 250, width: 1000, height: 500 })
    expect(cropFromFractions(null, rec)).toEqual(fullCrop(rec))
  })
})
