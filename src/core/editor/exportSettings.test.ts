import { describe, expect, it } from 'vitest'
import { defaultExportSettings, estimateExport, exportSettingsFrom, formatBytes, formatSeconds, measuredRenderFps, outputSize, remainingSeconds, substitutePlaceholders, videoBitrate } from './exportSettings'

describe('export settings', () => {
  it('parses with defaults', () => {
    expect(exportSettingsFrom(undefined)).toEqual(defaultExportSettings)
    expect(exportSettingsFrom({ format: 'gif', height: 720, fps: 60, quality: 'web', gifDisableLoop: true })).toEqual({ format: 'gif', height: 720, fps: 60, quality: 'web', gifDisableLoop: true })
    expect(exportSettingsFrom({ height: 999, fps: 25 })).toMatchObject({ height: 1080, fps: 30 })
  })

  it('sizes output evenly and substitutes placeholders', () => {
    expect(outputSize(1080, 16 / 9)).toEqual({ width: 1920, height: 1080 })
    expect(outputSize(1080, 1.54)).toEqual({ width: 1664, height: 1080 })
    expect(outputSize(480, 9 / 16)).toEqual({ width: 270, height: 480 })
    expect(substitutePlaceholders('Demo %wx%h %rfps', { width: 1920, height: 1080 }, 30)).toBe('Demo 1920x1080 30fps')
  })

  it('scales bitrate and estimates size and time', () => {
    expect(videoBitrate('high', 1920, 1080, 30)).toBe(18_000_000)
    expect(videoBitrate('web', 3840, 2160, 60)).toBe(24_000_000)
    expect(videoBitrate('medium', 320, 180, 24)).toBe(Math.round(9_000_000 * 0.15 * 0.9))
    const e = estimateExport(defaultExportSettings, 10_000, 16 / 9, 25)
    expect(e.frames).toBe(300)
    expect(e.bytes).toBe(22_500_000)
    expect(e.seconds).toBe(12)
    expect(estimateExport({ ...defaultExportSettings, format: 'gif', height: 480 }, 1000, 16 / 9).bytes).toBeGreaterThan(0)
  })

  it('formats and measures pace', () => {
    expect(formatBytes(22_500_000)).toBe('21.5 MB')
    expect(formatBytes(2 * 1024 ** 3)).toBe('2.00 GB')
    expect(formatSeconds(12)).toBe('12 s')
    expect(formatSeconds(125)).toBe('2 min 5 s')
    expect(remainingSeconds({ phase: 'rendering', frame: 100, frames: 300, startedAt: 0 }, 10_000)).toBe(20)
    expect(remainingSeconds({ phase: 'rendering', frame: 0, frames: 300, startedAt: 0 }, 10_000)).toBeNull()
    expect(measuredRenderFps(300, 10_000)).toBe(30)
  })
})
