import { describe, expect, it } from 'vitest'
import { agoLabel, formatDuration, formatTimecode, formatTransport } from './time'

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_599_999)).toBe('59:59')
  })

  it('never goes negative', () => {
    expect(formatDuration(-500)).toBe('0:00')
  })
})

describe('formatTimecode', () => {
  it('adds tenths of a second', () => {
    expect(formatTimecode(65_240)).toBe('1:05.2')
    expect(formatTimecode(999)).toBe('0:00.9')
  })
})

describe('formatTransport', () => {
  it('reads minutes, seconds and hundredths with two digits each', () => {
    expect(formatTransport(0)).toBe('00:00.00')
    expect(formatTransport(65_240)).toBe('01:05.24')
    expect(formatTransport(12_400)).toBe('00:12.40')
    expect(formatTransport(-5)).toBe('00:00.00')
  })
})

describe('agoLabel', () => {
  it('rounds to the nearest friendly unit', () => {
    const now = Date.parse('2026-11-18T12:00:00Z')
    expect(agoLabel('2026-11-18T11:59:58Z', now)).toBe('just now')
    expect(agoLabel('2026-11-18T11:59:48Z', now)).toBe('12 s ago')
    expect(agoLabel('2026-11-18T11:55:00Z', now)).toBe('5 min ago')
    expect(agoLabel('2026-11-18T10:00:00Z', now)).toBe('2 h ago')
    expect(agoLabel('2026-11-15T12:00:00Z', now)).toBe('3 days ago')
    expect(agoLabel('garbage', now)).toBe('')
  })
})
