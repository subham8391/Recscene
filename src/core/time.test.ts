import { describe, expect, it } from 'vitest'
import { formatDuration, formatTimecode } from './time'

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
