import { describe, expect, it } from 'vitest'
import {
  addLayoutAt,
  applyCameraSizeToAll,
  cameraMotionAtRest,
  cameraMotionStep,
  cameraTimeMs,
  cellPoint,
  defaultCameraConfig,
  effectiveLayout,
  layoutSettings,
  moveLayout,
  motionBox,
  NO_SPACE,
  pasteLayoutSettings,
  placeCamera,
  positionCell,
  splitLayout,
  stepPosition,
  type CameraLayout
} from './cameraLayout'

const layout = (over: Partial<CameraLayout>): CameraLayout => ({ id: 'l', sourceStartMs: 1000, sourceEndMs: 4000, type: 'only-camera', cameraSize: null, cameraPositionPoint: { x: 1, y: 1 }, isDisabled: false, ...over })

describe('timeline layouts (specs 156, 161, 163)', () => {
  it('adds a fullscreen layout in free space and refuses an occupied slot', () => {
    const r = addLayoutAt([], 2000, 10000)
    expect(r.layout).toMatchObject({ sourceStartMs: 2000, sourceEndMs: 5000, type: 'only-camera', cameraSize: null })
    const again = addLayoutAt(r.layouts, 3000, 10000)
    expect(again.error).toBe(NO_SPACE)
    expect(addLayoutAt(r.layouts, 5200, 5500).error).toBe(NO_SPACE)
    expect(addLayoutAt(r.layouts, 9500, 10000).layout).toMatchObject({ sourceStartMs: 9000, sourceEndMs: 10000 })
    expect(addLayoutAt(r.layouts, 5000, 10000, 'both').layout?.type).toBe('both')
  })

  it('moves within neighbours and the minimum length', () => {
    const a = layout({ id: 'a', sourceStartMs: 0, sourceEndMs: 3000 })
    const b = layout({ id: 'b', sourceStartMs: 5000, sourceEndMs: 8000 })
    expect(moveLayout([a, b], 'b', { startMs: 1000, endMs: 4000 }, 10000)[1]).toMatchObject({ sourceStartMs: 3000, sourceEndMs: 6000 })
    expect(moveLayout([a, b], 'a', { endMs: 7000 }, 10000)[0]?.sourceEndMs).toBe(5000)
    expect(moveLayout([a, b], 'a', { startMs: 2900 }, 10000)[0]?.sourceStartMs).toBe(2000)
  })

  it('splits at the playhead and refuses tiny pieces', () => {
    const r = splitLayout([layout({})], 2500)
    expect(r.layouts.map((l) => [l.sourceStartMs, l.sourceEndMs])).toEqual([[1000, 2500], [2500, 4000]])
    expect(splitLayout([layout({})], 1050).error).toBe('New duration is too short')
    expect(splitLayout([layout({})], 500).error).toBe('No layout at the playhead')
  })

  it('plays the default layout outside and under disabled layouts, and hides everything when the camera is hidden', () => {
    const list = [layout({}), layout({ id: 'd', sourceStartMs: 6000, sourceEndMs: 8000, isDisabled: true, type: 'only-screen' })]
    expect(effectiveLayout(defaultCameraConfig, list, 2000).type).toBe('only-camera')
    expect(effectiveLayout(defaultCameraConfig, list, 7000)).toMatchObject({ type: 'both', custom: null })
    expect(effectiveLayout(defaultCameraConfig, list, 500).cameraSize).toBe(0.35)
    expect(effectiveLayout({ ...defaultCameraConfig, hideCamera: true }, list, 2000).type).toBe('only-screen')
    expect(effectiveLayout(defaultCameraConfig, [layout({ cameraSize: 0.6, type: 'both' })], 2000).cameraSize).toBe(0.6)
  })

  it('copies, pastes and applies the size to all', () => {
    const src = layout({ id: 's', type: 'both', cameraSize: 0.5, cameraPositionPoint: { x: 0, y: 0.5 } })
    const dst = layout({ id: 't', sourceStartMs: 6000, sourceEndMs: 9000 })
    const pasted = pasteLayoutSettings([src, dst], 't', layoutSettings(src))[1]
    expect(pasted).toMatchObject({ type: 'both', cameraSize: 0.5, cameraPositionPoint: { x: 0, y: 0.5 }, sourceStartMs: 6000 })
    const all = applyCameraSizeToAll(defaultCameraConfig, [src, dst], 0.25)
    expect(all.config.defaultLayout.cameraSize).toBe(0.25)
    expect(all.layouts.every((l) => l.cameraSize === 0.25)).toBe(true)
  })
})

describe('position grid (specs 154, 158–159)', () => {
  it('steps through the 3 × 3 grid and stops at the edges', () => {
    expect(stepPosition({ x: 1, y: 1 }, 'left')).toEqual({ x: 0.5, y: 1 })
    expect(stepPosition({ x: 0.5, y: 1 }, 'up')).toEqual({ x: 0.5, y: 0.5 })
    expect(stepPosition({ x: 0, y: 0 }, 'left')).toBeNull()
    expect(stepPosition({ x: 0, y: 0 }, 'up')).toBeNull()
    expect(stepPosition({ x: 0.9, y: 0.1 }, 'down')).toEqual({ x: 1, y: 0.5 })
    expect(positionCell({ x: 1, y: 1 })).toBe(8)
    expect(positionCell({ x: 0.5, y: 0 })).toBe(1)
    expect(cellPoint(4)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('placement (specs 150–155)', () => {
  const frame = { width: 1920, height: 1080 }
  const cam = { width: 1280, height: 720 }

  it('overlays the camera at the anchor with the size as a fraction of the shorter side', () => {
    const p = placeCamera({ frame, cameraFrame: cam, type: 'both', cameraSize: 0.35, position: { x: 1, y: 1 }, config: defaultCameraConfig, zoomed: false, paddingRatio: 0.1 })
    expect(p.camera).not.toBeNull()
    expect(p.camera!.height).toBeCloseTo(378, 0)
    expect(p.camera!.width).toBeCloseTo(672, 0)
    expect(p.camera!.x + p.camera!.width).toBeCloseTo(1920 - 54, 0)
    expect(p.camera!.y + p.camera!.height).toBeCloseTo(1080 - 54, 0)
    expect(p.radius).toBeCloseTo(0.25 * 378, 0)
    expect(p.screen).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
  })

  it('shrinks during zooms and centres at 0.5', () => {
    const zoomed = placeCamera({ frame, cameraFrame: cam, type: 'both', cameraSize: 0.35, position: { x: 0.5, y: 0.5 }, config: defaultCameraConfig, zoomed: true, paddingRatio: 0 })
    expect(zoomed.camera!.height).toBeCloseTo(378 * 0.7, 0)
    expect(zoomed.camera!.x + zoomed.camera!.width / 2).toBeCloseTo(960, 0)
    const noShrink = placeCamera({ frame, cameraFrame: cam, type: 'both', cameraSize: 0.35, position: { x: 0.5, y: 0.5 }, config: { ...defaultCameraConfig, cameraScaleDuringZoom: 1 }, zoomed: true, paddingRatio: 0 })
    expect(noShrink.camera!.height).toBeCloseTo(378, 0)
  })

  it('crops square around the centre and makes a circle at roundness 0.5', () => {
    const p = placeCamera({ frame, cameraFrame: cam, type: 'both', cameraSize: 0.35, position: { x: 1, y: 1 }, config: { ...defaultCameraConfig, cameraAspectRatio: 'square', cameraRoundness: 0.5 }, zoomed: false, paddingRatio: 0.1 })
    expect(p.camera!.width).toBeCloseTo(p.camera!.height, 5)
    expect(p.crop).toEqual({ x: 0.21875, y: 0, width: 0.5625, height: 1 })
    expect(p.radius).toBeCloseTo(p.camera!.width / 2, 5)
  })

  it('fills the frame for fullscreen camera, hides for screen only, splits side by side', () => {
    const full = placeCamera({ frame, cameraFrame: cam, type: 'only-camera', cameraSize: 0.35, position: { x: 1, y: 1 }, config: defaultCameraConfig, zoomed: false, paddingRatio: 0.1 })
    expect(full.camera).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080 })
    expect(placeCamera({ frame, cameraFrame: cam, type: 'only-screen', cameraSize: 0.35, position: { x: 1, y: 1 }, config: defaultCameraConfig, zoomed: false, paddingRatio: 0.1 }).camera).toBeNull()
    const split = placeCamera({ frame, cameraFrame: cam, type: 'split', cameraSize: 0.35, position: { x: 1, y: 1 }, config: defaultCameraConfig, zoomed: false, paddingRatio: 0.1 })
    expect(split.screen.x).toBe(0)
    expect(split.screen.width).toBeLessThan(1000)
    expect(split.camera!.x).toBeGreaterThan(split.screen.width)
    const flipped = placeCamera({ frame, cameraFrame: cam, type: 'split', cameraSize: 0.35, position: { x: 1, y: 1 }, config: { ...defaultCameraConfig, splitFlip: true }, zoomed: false, paddingRatio: 0.1 })
    expect(flipped.camera!.x).toBeLessThan(flipped.screen.x)
  })
})

describe('transitions and delay', () => {
  it('springs the box towards the target and fades a hidden camera', () => {
    let m = cameraMotionAtRest({ x: 0, y: 0, width: 100, height: 100 }, { width: 1000, height: 600 })
    for (let i = 0; i < 120; i += 1) m = cameraMotionStep(m, { x: 500, y: 300, width: 200, height: 200 }, 16)
    expect(motionBox(m).x).toBeCloseTo(500, 0)
    expect(motionBox(m).width).toBeCloseTo(200, 0)
    for (let i = 0; i < 120; i += 1) m = cameraMotionStep(m, null, 16)
    expect(m.alpha.value).toBeLessThan(0.01)
    expect(motionBox(m).width).toBeLessThan(1)
    expect(cameraMotionStep(m, { x: 1, y: 2, width: 3, height: 4 }, 16, true)).toMatchObject({ x: { value: 1 }, alpha: { value: 1 } })
  })

  it('shifts the camera time by the delay', () => {
    expect(cameraTimeMs(5000, { ...defaultCameraConfig, cameraDelayMs: 120 })).toBe(4880)
    expect(cameraTimeMs(50, { ...defaultCameraConfig, cameraDelayMs: 120 })).toBe(0)
  })
})
