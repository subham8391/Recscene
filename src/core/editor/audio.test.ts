import { describe, expect, it } from 'vitest'
import { backgroundLabel, backgroundSource, bundledName, clipAudible, defaultAudioConfig, improvesMicrophone, isAudioFile, libraryName, masterGain, micChain, micGain, musicGain, musicSegments, normaliseGain, systemGain } from './audio'
import { defaultClip } from './clips'

const clip = { ...defaultClip(10000), volume: 0.8, systemAudioVolume: 0.5 }

describe('mix gains (specs 213–215, 220, board)', () => {
  it('mutes tracks and multiplies clip and panel levels', () => {
    expect(micGain(clip, defaultAudioConfig)).toBe(0.8)
    expect(micGain(clip, { ...defaultAudioConfig, muteMicrophone: true })).toBe(0)
    expect(systemGain(clip, { ...defaultAudioConfig, systemAudioVolume: 0.5 })).toBe(0.25)
    expect(systemGain(clip, { ...defaultAudioConfig, muteSystemAudio: true })).toBe(0)
    expect(masterGain({ ...defaultAudioConfig, audioVolume: 1.5 })).toBe(1)
  })

  it('silences fast clips unless audio is kept above 2×', () => {
    const fast = { ...clip, speed: 3 }
    expect(clipAudible(fast, defaultAudioConfig)).toBe(false)
    expect(micGain(fast, defaultAudioConfig)).toBe(0)
    expect(micGain(fast, { ...defaultAudioConfig, keepAudioAboveSpeed: true })).toBe(0.8)
    expect(clipAudible({ ...clip, speed: 2 }, defaultAudioConfig)).toBe(true)
  })

  it('plays music only when a track is set and not muted', () => {
    expect(musicGain(defaultAudioConfig)).toBe(0)
    expect(musicGain({ ...defaultAudioConfig, backgroundAudioFileName: 'music:lofi/lean-groove' })).toBe(0.05)
    expect(musicGain({ ...defaultAudioConfig, backgroundAudioFileName: 'music:lofi/lean-groove', muteBackgroundAudio: true })).toBe(0)
    expect(musicSegments(70000, 30000)).toEqual([{ atMs: 0, lengthMs: 30000 }, { atMs: 30000, lengthMs: 30000 }, { atMs: 60000, lengthMs: 10000 }])
    expect(musicSegments(1000, 0)).toEqual([])
  })
})

describe('microphone modes (specs 217, 14)', () => {
  it('off bypasses everything; the other modes compress and normalise', () => {
    expect(micChain('off')).toMatchObject({ compressor: null, normalise: false, makeup: 1 })
    expect(micChain('standard').compressor?.ratio).toBe(3)
    expect(micChain('loud').makeup).toBeGreaterThan(micChain('standard').makeup)
    expect(micChain('noise-reduction')).toMatchObject({ highpassHz: 120, lowpassHz: 9000 })
    expect(improvesMicrophone(defaultAudioConfig)).toBe(false)
    expect(improvesMicrophone({ ...defaultAudioConfig, microphoneMode: 'loud' })).toBe(true)
  })

  it('normalises to the target peak within limits', () => {
    expect(normaliseGain(0.45)).toBeCloseTo(2)
    expect(normaliseGain(0.01)).toBe(6)
    expect(normaliseGain(0)).toBe(1)
    expect(normaliseGain(1.2)).toBeCloseTo(0.75)
  })
})

describe('background sources (specs 218–219)', () => {
  const catalogue = [{ id: 'lofi/lean-groove', name: 'Lean Groove', category: 'Lo-fi', durationMs: 30000 }]
  it('tells bundled, library and project files apart', () => {
    expect(backgroundSource(null)).toBeNull()
    expect(backgroundSource(bundledName('lofi/lean-groove'))).toEqual({ kind: 'bundled', id: 'lofi/lean-groove' })
    expect(backgroundSource(libraryName('song.mp3'))).toEqual({ kind: 'library', file: 'song.mp3' })
    expect(backgroundSource('music-1.mp3')).toEqual({ kind: 'project', file: 'music-1.mp3' })
    expect(backgroundLabel('music:lofi/lean-groove', catalogue)).toBe('Lean Groove')
    expect(backgroundLabel('library:My Song.mp3', catalogue)).toBe('My Song')
    expect(isAudioFile('x.MP3')).toBe(true)
    expect(isAudioFile('x.txt')).toBe(false)
  })
})
