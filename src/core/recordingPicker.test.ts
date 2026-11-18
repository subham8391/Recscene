import { describe, expect, it } from 'vitest'
import {
  addSavedDimensions,
  applyAspect,
  cameraLabel,
  CAMERA_MISSING,
  selectedCamera,
  applySavedDimensions,
  clampArea,
  countdownLabel,
  defaultPickerPrefs,
  displayUnderPoint,
  formatBytes,
  formatClock,
  pickerPrefsFrom,
  rectFromDrag,
  removeSavedDimensions
} from './recordingPicker'

const display = { x: 0, y: 0, width: 1800, height: 1169 }
const displays = [
  { id: 1, bounds: display, scale: 2, isMain: true },
  { id: 2, bounds: { x: -408, y: -1080, width: 1920, height: 1080 }, scale: 2, isMain: false }
]

describe('pickerPrefsFrom', () => {
  it('returns defaults for nothing', () => {
    expect(pickerPrefsFrom(undefined)).toEqual(defaultPickerPrefs)
  })

  it('keeps valid values and drops malformed ones', () => {
    const prefs = pickerPrefsFrom({
      source: 'area',
      recordingCountdownDuration: 5000,
      recordingAreaCropPresets: [{ width: 1280, height: 800 }, { width: 'x' }, null],
      recordMicrophone: false,
      systemAudio: 'none',
      lastArea: { x: 1, y: 2, width: 300, height: 200, extra: true }
    })
    expect(prefs.source).toBe('area')
    expect(prefs.recordingCountdownDuration).toBe(5000)
    expect(prefs.recordingAreaCropPresets).toEqual([{ width: 1280, height: 800 }])
    expect(prefs.recordMicrophone).toBe(false)
    expect(prefs.systemAudio).toBe('none')
    expect(prefs.lastArea).toEqual({ x: 1, y: 2, width: 300, height: 200 })
  })

  it('rejects a countdown that is not one of the four options', () => {
    expect(pickerPrefsFrom({ recordingCountdownDuration: 4000 }).recordingCountdownDuration).toBeNull()
    expect(pickerPrefsFrom({ source: 'device' }).source).toBe('display')
  })
})

describe('countdownLabel', () => {
  it('labels the options', () => {
    expect(countdownLabel(null)).toBe('No countdown')
    expect(countdownLabel(3000)).toBe('3 s')
  })
})

describe('displayUnderPoint', () => {
  it('finds the display containing the point', () => {
    expect(displayUnderPoint(displays, { x: -100, y: -500 })?.id).toBe(2)
    expect(displayUnderPoint(displays, { x: 10, y: 10 })?.id).toBe(1)
  })

  it('falls back to the main display', () => {
    expect(displayUnderPoint(displays, { x: 9999, y: 9999 })?.id).toBe(1)
  })
})

describe('rectFromDrag and clampArea', () => {
  it('normalises a drag in any direction', () => {
    expect(rectFromDrag({ x: 500, y: 400 }, { x: 100, y: 100 })).toEqual({ x: 100, y: 100, width: 400, height: 300 })
  })

  it('enforces the minimum size and keeps the area inside the display', () => {
    expect(clampArea({ x: 1700, y: 1100, width: 50, height: 50 }, display)).toEqual({ x: 1650, y: 1019, width: 150, height: 150 })
    expect(clampArea({ x: -20, y: -20, width: 5000, height: 5000 }, display)).toEqual({ x: 0, y: 0, width: 1800, height: 1169 })
  })
})

describe('applyAspect', () => {
  it('keeps the width and derives the height', () => {
    expect(applyAspect({ x: 100, y: 100, width: 1600, height: 500 }, 16 / 9, display)).toEqual({ x: 100, y: 100, width: 1600, height: 900 })
  })

  it('free ratio only clamps', () => {
    expect(applyAspect({ x: 0, y: 0, width: 100, height: 100 }, null, display).width).toBe(150)
  })
})

describe('saved dimensions', () => {
  it('adds newest first without duplicates and ignores tiny sizes', () => {
    let list = addSavedDimensions([], { width: 1280, height: 800 })
    list = addSavedDimensions(list, { width: 1920, height: 1080 })
    list = addSavedDimensions(list, { width: 1280, height: 800 })
    list = addSavedDimensions(list, { width: 10, height: 10 })
    expect(list).toEqual([
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 }
    ])
    expect(removeSavedDimensions(list, { width: 1920, height: 1080 })).toEqual([{ width: 1280, height: 800 }])
  })

  it('applies a saved size at the current position', () => {
    expect(applySavedDimensions({ x: 200, y: 200, width: 400, height: 400 }, { width: 1280, height: 800 }, display)).toEqual({ x: 200, y: 200, width: 1280, height: 800 })
  })
})

describe('formatting', () => {
  it('formats bytes and clocks', () => {
    expect(formatBytes(212 * 1024 ** 3)).toBe('212 GB')
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB')
    expect(formatBytes(300 * 1024 ** 2)).toBe('300 MB')
    expect(formatClock(42_000)).toBe('00:42')
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })
})

describe('camera choice (spec 8)', () => {
  const cams = [
    { id: 'a', name: 'FaceTime HD Camera', maxHeight: 1920 },
    { id: 'b', name: 'Logitech Brio', maxHeight: 2160 }
  ]

  it('is off unless the preference is on', () => {
    expect(selectedCamera(defaultPickerPrefs, cams)).toEqual({ camera: null, missing: false })
    expect(cameraLabel(defaultPickerPrefs, cams)).toBe("Not recorded")
  })

  it('uses the remembered camera when it is connected', () => {
    const prefs = { ...defaultPickerPrefs, recordCamera: true, cameraDeviceId: 'b' }
    expect(selectedCamera(prefs, cams).camera?.name).toBe('Logitech Brio')
    expect(cameraLabel(prefs, cams)).toBe('Logitech Brio · 1080p')
    expect(cameraLabel({ ...prefs, maximumWebcamHeight: 720 }, cams)).toBe('Logitech Brio · 720p')
  })

  it('falls back to the first camera and says the remembered one is gone', () => {
    const prefs = { ...defaultPickerPrefs, recordCamera: true, cameraDeviceId: 'gone' }
    expect(selectedCamera(prefs, cams)).toEqual({ camera: cams[0], missing: true })
    expect(CAMERA_MISSING).toContain('not be connected')
    expect(selectedCamera({ ...prefs, cameraDeviceId: null }, cams)).toEqual({ camera: cams[0], missing: false })
    expect(selectedCamera(prefs, [])).toEqual({ camera: null, missing: false })
    expect(cameraLabel(prefs, [])).toBe('No camera is connected')
  })

  it('reads the camera preferences from disk', () => {
    const p = pickerPrefsFrom({ recordCamera: true, cameraDeviceId: 'x', hideCameraPreview: true, webcamPreviewType: 'full-frame', maximumWebcamHeight: 720 })
    expect(p).toMatchObject({ recordCamera: true, cameraDeviceId: 'x', hideCameraPreview: true, webcamPreviewType: 'full-frame', maximumWebcamHeight: 720 })
    expect(pickerPrefsFrom({ maximumWebcamHeight: 4000, webcamPreviewType: 'oval', cameraDeviceId: '' })).toMatchObject({ maximumWebcamHeight: 1080, webcamPreviewType: 'square', cameraDeviceId: null })
  })
})
