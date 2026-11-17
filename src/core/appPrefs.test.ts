import { describe, expect, it } from 'vitest'
import { appPrefsFrom, defaultAppPrefs, isLowDiskSpace, LOW_DISK_SPACE_BYTES } from './appPrefs'

describe('appPrefsFrom', () => {
  it('fills defaults and keeps valid values', () => {
    expect(appPrefsFrom(undefined)).toEqual(defaultAppPrefs)
    expect(appPrefsFrom({ hideDesktopContentWhileRecording: true, hideAppDockIconWhileRecording: 'yes', actionAfterRecording: 'quick-export' })).toEqual({
      ...defaultAppPrefs,
      hideDesktopContentWhileRecording: true,
      actionAfterRecording: 'quick-export'
    })
    expect(appPrefsFrom({ actionAfterRecording: 'nonsense' }).actionAfterRecording).toBe('create-project')
    expect(appPrefsFrom({ defaultZoomLevel: 9 }).defaultZoomLevel).toBe(4)
    expect(appPrefsFrom({ defaultZoomLevel: null }).defaultZoomLevel).toBeNull()
    expect(appPrefsFrom({ createAutomaticZooms: false }).createAutomaticZooms).toBe(false)
  })
})

describe('isLowDiskSpace', () => {
  it('is true below the threshold and false for unknown values', () => {
    expect(isLowDiskSpace(LOW_DISK_SPACE_BYTES - 1)).toBe(true)
    expect(isLowDiskSpace(LOW_DISK_SPACE_BYTES)).toBe(false)
    expect(isLowDiskSpace(Number.NaN)).toBe(false)
    expect(isLowDiskSpace(-1)).toBe(false)
  })
})
