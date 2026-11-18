import { describe, expect, it } from 'vitest'
import type { Clip } from './clips'
import { addVoiceOver, applyVolumeToAll, canStartAt, clampDuration, hiddenOutputRanges, moveVoiceOver, outputStartOf, recordingHiddenAt, recordingLimitMs, removeVoiceOver, updateVoiceOver, voiceOverPlayingAt, voiceOverSegments, VOICEOVER_PRESENT, type VoiceOver } from './voiceovers'

const clip = (id: string, sourceStartMs: number, sourceEndMs: number, speed = 1): Clip => ({ id, sourceStartMs, sourceEndMs, speed, volume: 1, systemAudioVolume: 1, hideCursor: false, disableSmoothMouseMovement: false } as unknown as Clip)
const vo = (id: string, sourceStartMs: number, voiceoverDurationMs: number, extra: Partial<VoiceOver> = {}): VoiceOver => ({ id, file: `${id}.wav`, sourceStartMs, voiceoverDurationMs, volume: 1, attachMode: 'all-frames', hideRecording: false, isDisabled: false, ...extra })

describe('voice-over placement', () => {
  const list = [vo('a', 1000, 2000), vo('b', 6000, 1000)]
  it('refuses a start on top of another voice-over', () => {
    expect(canStartAt(list, 1500)).toBe(VOICEOVER_PRESENT)
    expect(canStartAt(list, 3000)).toBeNull()
    expect(addVoiceOver(list, vo('c', 3500, 500)).error).toBeUndefined()
    expect(addVoiceOver(list, vo('c', 1500, 500)).error).toBe(VOICEOVER_PRESENT)
  })
  it('stops a recording at the next voice-over or the end', () => {
    expect(recordingLimitMs(list, 3500, 20000)).toBe(6000)
    expect(recordingLimitMs(list, 8000, 20000)).toBe(20000)
    expect(clampDuration(3500, 5000, 6000)).toBe(2500)
  })
  it('moves between neighbours and never resizes', () => {
    expect(moveVoiceOver(list, 'a', 5500, 20000)[0]!.sourceStartMs).toBe(4000)
    expect(moveVoiceOver(list, 'a', -100, 20000)[0]!.sourceStartMs).toBe(0)
    expect(moveVoiceOver(list, 'b', 19500, 20000)[1]!.sourceStartMs).toBe(19000)
    expect(moveVoiceOver(list, 'b', 2500, 20000)[1]!.sourceStartMs).toBe(3000)
  })
  it('updates, removes and applies a volume to all', () => {
    expect(updateVoiceOver(list, 'a', { volume: 0.5 })[0]!.volume).toBe(0.5)
    expect(removeVoiceOver(list, 'a')).toHaveLength(1)
    expect(applyVolumeToAll(list, 0.2).every((v) => v.volume === 0.2)).toBe(true)
  })
})

describe('voice-over playback', () => {
  const clips = [clip('c1', 0, 4000), clip('c2', 6000, 10000, 2)]
  it('synchronized voice-overs follow cuts and speed', () => {
    const segs = voiceOverSegments([vo('a', 3000, 5000)], clips)
    expect(segs).toEqual([
      expect.objectContaining({ atMs: 3000, offsetMs: 0, lengthMs: 1000, rate: 1 }),
      expect.objectContaining({ atMs: 4000, offsetMs: 3000, lengthMs: 2000, rate: 2 })
    ])
    expect(voiceOverPlayingAt([vo('a', 3000, 5000)], clips, 4500)).toEqual(expect.objectContaining({ fileMs: 4000, rate: 2 }))
    expect(voiceOverPlayingAt([vo('a', 3000, 5000)], clips, 2000)).toBeNull()
  })
  it('independent voice-overs start where their first frame lands and run whole', () => {
    const segs = voiceOverSegments([vo('a', 3000, 5000, { attachMode: 'first-frame' })], clips)
    expect(segs).toEqual([expect.objectContaining({ atMs: 3000, offsetMs: 0, lengthMs: 5000, rate: 1 })])
    expect(outputStartOf(vo('b', 5000, 1000, { attachMode: 'first-frame' }), clips)).toBe(4000)
    expect(outputStartOf(vo('b', 11000, 1000, { attachMode: 'first-frame' }), clips)).toBeNull()
  })
  it('disabled ones are skipped and hidden ranges follow hideRecording', () => {
    expect(voiceOverSegments([vo('a', 3000, 5000, { isDisabled: true })], clips)).toEqual([])
    const hidden = [vo('a', 1000, 1000, { hideRecording: true })]
    expect(hiddenOutputRanges(hidden, clips)).toEqual([{ startMs: 1000, endMs: 2000 }])
    expect(recordingHiddenAt(hidden, clips, 1500)).toBe(true)
    expect(recordingHiddenAt(hidden, clips, 2500)).toBe(false)
  })
})
