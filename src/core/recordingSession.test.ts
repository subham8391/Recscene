import { describe, expect, it } from 'vitest'
import { addFlag, addMarker, elapsedMs, isPaused, markersFile, pauseClock, resumeClock, startSession } from './recordingSession'

describe('session clock', () => {
  it('counts recorded time and excludes pauses', () => {
    let { clock } = startSession(1_000)
    expect(elapsedMs(clock, 5_000)).toBe(4_000)
    clock = pauseClock(clock, 5_000)
    expect(isPaused(clock)).toBe(true)
    expect(elapsedMs(clock, 9_000)).toBe(4_000)
    clock = resumeClock(clock, 9_000)
    expect(isPaused(clock)).toBe(false)
    expect(elapsedMs(clock, 10_000)).toBe(5_000)
  })

  it('ignores a second pause or a resume when not paused', () => {
    const { clock } = startSession(0)
    const paused = pauseClock(clock, 100)
    expect(pauseClock(paused, 200)).toBe(paused)
    expect(resumeClock(clock, 200)).toBe(clock)
  })
})

describe('markers and flags', () => {
  it('keeps markers sorted and labels optional', () => {
    const m = addMarker(addMarker([], { timeMs: 9_000, label: 'bug' }), { timeMs: 2_000 })
    expect(m).toEqual([{ timeMs: 2_000 }, { timeMs: 9_000, label: 'bug' }])
    expect(markersFile(m)).toEqual({ version: 1, markers: m })
  })

  it('debounces flags and clamps negatives', () => {
    expect(addFlag(addFlag([], 1_000), 1_200)).toEqual([1_000])
    expect(addFlag([1_000], 5_000)).toEqual([1_000, 5_000])
    expect(addFlag([], -5)).toEqual([0])
  })
})
