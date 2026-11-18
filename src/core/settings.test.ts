import { describe, expect, it } from 'vitest'
import { ACTIONS } from './editor/actions'
import { acceleratorFromEvent, defaultSettings, diagnosticsReport, effectiveGlobalShortcut, isSnowSeason, isValidEmail, settingsFrom, shortcutConflict, shouldHideDock, toElectronAccelerator, withOverrides } from './settings'

describe('settings model', () => {
  it('takes defaults for anything missing or malformed', () => {
    expect(settingsFrom({})).toEqual(defaultSettings)
    const s = settingsFrom({ appearance: 'purple', recordingCountdownDuration: 4000, playbackPreviewMaxHeight: 999, shortcutOverrides: { save: 'Cmd+Shift+Q', bad: 3 }, logLevel: 9, defaultZoomLevel: 7 })
    expect(s.appearance).toBe('system')
    expect(s.recordingCountdownDuration).toBeNull()
    expect(s.playbackPreviewMaxHeight).toBe(1080)
    expect(s.shortcutOverrides).toEqual({ save: 'Cmd+Shift+Q' })
    expect(s.logLevel).toBe(2)
    expect(s.defaultZoomLevel).toBe(4)
    expect(settingsFrom({ appearance: 'dark', playbackEnergyMode: 'low-power', hideDockIcon: true }).hideDockIcon).toBe(true)
  })

  it('applies shortcut overrides and finds conflicts (spec 66)', () => {
    const over = { splitSliceAtCurrentTime: 'Cmd+Shift+C', 'global:record': 'Cmd+Shift+T' }
    expect(withOverrides(ACTIONS, over).find((a) => a.id === 'splitSliceAtCurrentTime')?.shortcut).toBe('Cmd+Shift+C')
    expect(withOverrides(ACTIONS, {}).find((a) => a.id === 'splitSliceAtCurrentTime')?.shortcut).toBe('C')
    expect(effectiveGlobalShortcut('global:record', over)).toBe('Cmd+Shift+T')
    expect(effectiveGlobalShortcut('global:flag', over)).toBe('Cmd+Alt+Ctrl+F')
    expect(shortcutConflict('global:flag', 'cmd+shift+t', over)).toBe('Start / stop recording')
    expect(shortcutConflict('global:flag', 'Cmd+Alt+F', over)).toBeNull()
    expect(shortcutConflict('save', 'Cmd+E', {})).toBe('Export video…')
    expect(shortcutConflict('save', 'Cmd+S', {})).toBeNull()
  })

  it('turns key events into accelerators and electron ones', () => {
    expect(acceleratorFromEvent({ key: 'r', code: 'KeyR', metaKey: true, shiftKey: true, altKey: false, ctrlKey: false })).toBe('Cmd+Shift+R')
    expect(acceleratorFromEvent({ key: '.', code: 'Period', metaKey: true, shiftKey: false, altKey: true, ctrlKey: false })).toBe('Cmd+Alt+.')
    expect(acceleratorFromEvent({ key: ' ', metaKey: false, shiftKey: false, altKey: false, ctrlKey: false })).toBe('Space')
    expect(acceleratorFromEvent({ key: 'Shift', metaKey: false, shiftKey: true, altKey: false, ctrlKey: false })).toBeNull()
    expect(toElectronAccelerator('Cmd+Alt+Ctrl+F')).toBe('CommandOrControl+Alt+Control+F')
    expect(toElectronAccelerator('Cmd+ArrowLeft')).toBe('CommandOrControl+Left')
  })

  it('writes the diagnostics report and checks emails, snow season and the Dock rule', () => {
    const r = diagnosticsReport({ appVersion: '0.1.0', macOS: '27.0.1', model: 'Mac15,6', arch: 'arm64', memoryGb: 36, cameras: ['FaceTime HD Camera'], microphone: '', permissions: { screen: true, camera: 'notDetermined' }, email: 'a@b.co' })
    expect(r).toContain('App: 0.1.0')
    expect(r).toContain('  screen: granted')
    expect(r).toContain('  camera: notDetermined')
    expect(r).toContain('Contact: a@b.co')
    expect(isValidEmail('')).toBe(true)
    expect(isValidEmail('x@y.z')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
    expect(isSnowSeason(new Date(2026, 11, 25))).toBe(true)
    expect(isSnowSeason(new Date(2026, 0, 6))).toBe(false)
    expect(shouldHideDock({ hideDockIcon: true }, 0, false)).toBe(true)
    expect(shouldHideDock({ hideDockIcon: true }, 1, false)).toBe(false)
    expect(shouldHideDock({ hideDockIcon: true }, 0, true)).toBe(false)
    expect(shouldHideDock({ hideDockIcon: false }, 0, false)).toBe(false)
  })
})
