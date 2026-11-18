import { describe, expect, it } from 'vitest'
import { applyPreset, checkPresetName, isPresetFile, parsePreset, presetConfigFrom, presetFileName, presetIdFromFile, presetSummary, seedConfig, serialisePreset } from './presets'
import { defaultProjectConfig } from '../project'

describe('presets (specs 224–232)', () => {
  const config = { ...defaultProjectConfig, backgroundPaddingRatio: 20, recordingCrop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, hiddenShortcuts: { '100': true as const }, backgroundType: 'image' as const, backgroundImage: 'background-1.png', backgroundAudioFileName: 'music-1.mp3', cursorSize: 2 }

  it('snapshots the inspector settings and leaves the recording-specific keys behind', () => {
    const p = presetConfigFrom(config)
    expect(p.backgroundPaddingRatio).toBe(20)
    expect(p.cursorSize).toBe(2)
    expect(p).not.toHaveProperty('recordingCrop')
    expect(p).not.toHaveProperty('hiddenShortcuts')
    expect(p).not.toHaveProperty('backgroundImage')
    expect(p).not.toHaveProperty('backgroundAudioFileName')
    expect(p.backgroundType).toBe('gradient')
  })

  it('applies a preset over a project while keeping its own crop, hidden shortcuts and files', () => {
    const applied = applyPreset(config, { backgroundPaddingRatio: 5, cursorSize: 1, backgroundType: 'color' })
    expect(applied.backgroundPaddingRatio).toBe(5)
    expect(applied.cursorSize).toBe(1)
    expect(applied.backgroundType).toBe('color')
    expect(applied.recordingCrop).toEqual(config.recordingCrop)
    expect(applied.hiddenShortcuts).toEqual({ '100': true })
    expect(applied.backgroundAudioFileName).toBe('music-1.mp3')
  })

  it('validates names and maps them to files', () => {
    expect(checkPresetName('  Product demo ', ['Other'])).toEqual({ ok: true, name: 'Product demo', id: 'Product demo' })
    expect(checkPresetName('a/b', [])).toMatchObject({ ok: true, id: 'a-b' })
    expect(checkPresetName('', [])).toMatchObject({ ok: false })
    expect(checkPresetName('demo', ['Demo'])).toMatchObject({ ok: false, reason: 'A preset with this name already exists' })
    expect(checkPresetName('Demo', ['Demo'], 'Demo').ok).toBe(true)
    expect(presetFileName('Demo')).toBe('Demo.recscenepreset')
    expect(isPresetFile('x.RECSCENEPRESET')).toBe(true)
    expect(presetIdFromFile('Demo.recscenepreset')).toBe('Demo')
  })

  it('round-trips files and rejects junk', () => {
    const p = { id: 'Demo', name: 'Demo', createdAt: 'a', updatedAt: 'b', config: { cursorSize: 2 } }
    expect(parsePreset(JSON.parse(serialisePreset(p)), 'Demo')).toEqual(p)
    expect(parsePreset({ name: 'x' }, 'x')).toBeNull()
    expect(parsePreset('nope', 'x')).toBeNull()
    expect(parsePreset({ config: {} }, 'Fallback')?.name).toBe('Fallback')
  })

  it('seeds new projects from the default preset, else the last project when allowed', () => {
    const d = defaultProjectConfig
    expect(seedConfig(d, { cursorSize: 3 }, { cursorSize: 2 }, true).cursorSize).toBe(3)
    expect(seedConfig(d, null, { cursorSize: 2 }, true).cursorSize).toBe(2)
    expect(seedConfig(d, null, { cursorSize: 2 }, false).cursorSize).toBe(d.cursorSize)
    expect(presetSummary({ id: 'x', name: 'x', createdAt: '', updatedAt: '', config: { backgroundType: 'system', backgroundPaddingRatio: 12, defaultOutputAspectRatio: '9:16' } })).toBe('wallpaper · 12% padding · 9:16')
  })
})
