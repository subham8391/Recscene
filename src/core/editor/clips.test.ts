import { describe, expect, it } from 'vitest'
import {
  applySpeedToAll,
  applyTypingSuggestion,
  canApplySpeedToAll,
  canResetAll,
  clipAtOutput,
  clipSettings,
  defaultClip,
  ensureClips,
  hasTrim,
  isAudioMuted,
  joinClips,
  mergeWith,
  outputDurationMs,
  outputToSource,
  removeClip,
  removeTrim,
  resetAllClips,
  rippleRemoveBefore,
  sourceToOutput,
  splitClip,
  trimClip,
  trimmedMs,
  typingGroups,
  updateClip,
  type Clip
} from './clips'

const D = 10_000
const one = (): Clip => defaultClip(D, 'a')

describe('defaults and mapping', () => {
  it('fills an empty list with one full clip', () => {
    expect(ensureClips([], D)[0]).toMatchObject({ sourceStartMs: 0, sourceEndMs: D, speed: 1 })
    expect(ensureClips([one()], D)).toHaveLength(1)
  })

  it('maps output and source times through speeds and cuts', () => {
    const clips: Clip[] = [
      { ...one(), id: 'a', sourceStartMs: 0, sourceEndMs: 4000, speed: 2 },
      { ...one(), id: 'b', sourceStartMs: 6000, sourceEndMs: 10_000, speed: 1 }
    ]
    expect(outputDurationMs(clips)).toBe(6000)
    expect(outputToSource(clips, 1000)).toBe(2000)
    expect(outputToSource(clips, 3000)).toBe(7000)
    expect(sourceToOutput(clips, 2000)).toBe(1000)
    expect(sourceToOutput(clips, 7000)).toBe(3000)
    expect(sourceToOutput(clips, 5000)).toBeNull()
    expect(clipAtOutput(clips, 5999)?.clip.id).toBe('b')
    expect(clipAtOutput([], 0)).toBeNull()
  })
})

describe('trim', () => {
  it('clamps to neighbours, the recording and the minimum length', () => {
    const { clips } = splitClip([one()], 5000)
    let list = trimClip(clips, clips[1]!.id, 'start', 4000, D)
    expect(list[1]?.sourceStartMs).toBe(5000)
    list = trimClip(list, list[0]!.id, 'end', 9999, D)
    expect(list[0]?.sourceEndMs).toBe(5000)
    list = trimClip(list, list[0]!.id, 'start', 4990, D)
    expect(list[0]?.sourceStartMs).toBe(4900)
    list = trimClip(list, list[1]!.id, 'end', 99_999, D)
    expect(list[1]?.sourceEndMs).toBe(D)
  })

  it('reports and removes trims', () => {
    let list = trimClip([one()], 'a', 'start', 1000, D)
    list = trimClip(list, 'a', 'end', 9000, D)
    expect(trimmedMs(list, 'a', 'start', D)).toBe(1000)
    expect(trimmedMs(list, 'a', 'end', D)).toBe(1000)
    expect(hasTrim(list, 'a', D)).toBe(true)
    expect(removeTrim(list, 'a', 'start', D)[0]?.sourceStartMs).toBe(0)
    expect(removeTrim(list, 'a', 'both', D)[0]).toMatchObject({ sourceStartMs: 0, sourceEndMs: D })
    expect(hasTrim([one()], 'a', D)).toBe(false)
  })
})

describe('split, remove, merge', () => {
  it('splits with the right half inheriting settings and refuses short parts', () => {
    const base = updateClip([one()], 'a', { speed: 2, hideCursor: true })
    const r = splitClip(base, 4000)
    expect(r.error).toBeUndefined()
    expect(r.clips.map((c) => [c.sourceStartMs, c.sourceEndMs])).toEqual([[0, 4000], [4000, D]])
    expect(r.clips[1]).toMatchObject({ speed: 2, hideCursor: true })
    expect(splitClip(base, 50).error).toBe('The part you want to cut is too short')
    expect(splitClip(base, 0).error).toBe("Can't cut here")
  })

  it('removes all but the last clip and ripple-removes before the playhead', () => {
    const { clips } = splitClip([one()], 5000)
    expect(removeClip(clips, clips[0]!.id)).toHaveLength(1)
    expect(removeClip([one()], 'a')).toHaveLength(1)
    expect(rippleRemoveBefore(clips, 7000).map((c) => c.sourceStartMs)).toEqual([5000])
    expect(rippleRemoveBefore(clips, 3000)).toHaveLength(2)
  })

  it('merges with neighbours and joins touching clips', () => {
    const { clips } = splitClip([one()], 5000)
    const right = updateClip(clips, clips[1]!.id, { speed: 4 })
    const merged = mergeWith(right, right[1]!.id, 'previous')
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ sourceStartMs: 0, sourceEndMs: D, speed: 4 })
    const joined = joinClips(right, right[1]!.id)
    expect(joined[0]).toMatchObject({ sourceStartMs: 0, sourceEndMs: D, speed: 1 })
    expect(mergeWith(clips, clips[0]!.id, 'previous')).toHaveLength(2)
  })
})

describe('settings', () => {
  it('validates speed, applies to all, mutes above 2×, copies settings', () => {
    const { clips } = splitClip([one()], 5000)
    const fast = updateClip(clips, clips[0]!.id, { speed: 3 })
    expect(() => updateClip(clips, 'a', { speed: 0 })).toThrow('Speed must be a positive number.')
    expect(canApplySpeedToAll(fast, fast[0]!.id)).toBe(true)
    expect(applySpeedToAll(fast, fast[0]!.id).every((c) => c.speed === 3)).toBe(true)
    expect(isAudioMuted(fast[0]!)).toBe(true)
    expect(isAudioMuted({ ...one(), speed: 2 })).toBe(false)
    expect(clipSettings(fast[0]!)).toEqual({ speed: 3, volume: 1, systemAudioVolume: 1, hideCursor: false, disableSmoothMouseMovement: false })
  })

  it('resets everything to one clip', () => {
    const { clips } = splitClip([one()], 5000)
    expect(canResetAll(clips, D)).toBe(true)
    expect(canResetAll([one()], D)).toBe(false)
    expect(resetAllClips(D)).toHaveLength(1)
  })
})

describe('typing suggestions', () => {
  const key = (t: number) => ({ timeMs: t, label: 'A' })
  it('finds bursts of at least 1.5 s with 2+ keys per second', () => {
    const keys = [0, 300, 600, 900, 1200, 1500, 1800, 2100].map(key)
    expect(typingGroups(keys)).toEqual([{ startMs: 0, endMs: 2100, keystrokes: 8 }])
    expect(typingGroups([0, 1000, 2000, 3000].map(key))).toEqual([])
    expect(typingGroups([0, 300, 600, 900, 1200, 1500, 1800, 5000, 5200, 5400].map(key))).toHaveLength(1)
  })

  it('splits around the burst and speeds up the middle', () => {
    const r = applyTypingSuggestion([one()], { startMs: 2000, endMs: 5000, keystrokes: 9 }, 3)
    expect(r.applied).toBe(true)
    expect(r.clips.map((c) => [c.sourceStartMs, c.sourceEndMs, c.speed])).toEqual([[0, 2000, 1], [2000, 5000, 3], [5000, D, 1]])
    const atStart = applyTypingSuggestion([one()], { startMs: 20, endMs: 3000, keystrokes: 9 }, 3)
    expect(atStart.clips.map((c) => [c.sourceStartMs, c.sourceEndMs, c.speed])).toEqual([[0, 3000, 3], [3000, D, 1]])
  })
})
