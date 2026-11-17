import { describe, expect, it } from 'vitest'
import { normaliseEvents, parseHelperLine, serializeCommand, splitLines, type EventsFile } from './captureProtocol'

describe('parseHelperLine', () => {
  it('parses a helper event', () => {
    expect(parseHelperLine('{"event":"pong","version":"0.1.0"}')).toEqual({ event: 'pong', version: '0.1.0' })
  })

  it('ignores blank lines, bad JSON and unknown events', () => {
    expect(parseHelperLine('')).toBeNull()
    expect(parseHelperLine('   ')).toBeNull()
    expect(parseHelperLine('not json')).toBeNull()
    expect(parseHelperLine('{"event":"nope"}')).toBeNull()
    expect(parseHelperLine('[1,2]')).toBeNull()
    expect(parseHelperLine('42')).toBeNull()
  })
})

describe('splitLines', () => {
  it('keeps a partial trailing line for the next chunk', () => {
    const first = splitLines('', '{"event":"pong"}\n{"event":"war')
    expect(first.lines).toEqual(['{"event":"pong"}'])
    expect(first.rest).toBe('{"event":"war')
    const second = splitLines(first.rest, 'ning","message":"x"}\n')
    expect(second.lines).toEqual(['{"event":"warning","message":"x"}'])
    expect(second.rest).toBe('')
  })
})

describe('serializeCommand', () => {
  it('writes one JSON object per line', () => {
    expect(serializeCommand({ cmd: 'stop' })).toBe('{"cmd":"stop"}\n')
  })
})

describe('normaliseEvents', () => {
  const file: EventsFile = {
    version: 1,
    region: { x: 0, y: 0, width: 1800, height: 1169 },
    clicks: [
      { timeMs: 2000, position: { x: 0.5, y: 0.5 }, button: 'left' },
      { timeMs: 500, position: { x: 1, y: 0 }, button: 'right' },
      { timeMs: 700, position: { x: 1.2, y: -0.1 }, button: 'right' },
      { timeMs: 9000, position: { x: 0.1, y: 0.1 }, button: 'left' }
    ],
    keys: [
      { timeMs: 1000, label: '⌘C' },
      { timeMs: 1500, label: '' }
    ],
    cursor: [
      { timeMs: 100, x: 0.2, y: 0.3 },
      { timeMs: -5, x: 0, y: 0 }
    ]
  }

  it('sorts and drops events outside the recording in time or space', () => {
    const out = normaliseEvents(file, 5000)
    expect(out.clicks.map((c) => c.timeMs)).toEqual([500, 2000])
    expect(out.clicks[0]?.position).toEqual({ x: 1, y: 0 })
    expect(out.keys).toEqual([{ timeMs: 1000, label: '⌘C' }])
    expect(out.cursor).toEqual([{ timeMs: 100, x: 0.2, y: 0.3 }])
  })
})
