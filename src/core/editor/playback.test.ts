import { describe, expect, it } from 'vitest'
import {
  goToFirstFrame,
  goToLastFrame,
  initialPlayback,
  playBackwardOrIncreaseSpeed,
  playForwardOrIncreaseSpeed,
  seek,
  speedLabel,
  step,
  stopAndResetSpeed,
  tick,
  togglePlay
} from './playback'

const D = 10_000

describe('transport', () => {
  it('space toggles and restarts from the end', () => {
    let s = togglePlay(initialPlayback(), D)
    expect(s.playing).toBe(true)
    s = togglePlay(s, D)
    expect(s.playing).toBe(false)
    s = togglePlay({ ...s, timeMs: D }, D)
    expect(s.timeMs).toBe(0)
  })

  it('L doubles up to 8× and flips backward to 1×', () => {
    let s = playForwardOrIncreaseSpeed(initialPlayback(), D)
    expect(s).toMatchObject({ playing: true, speed: 1 })
    s = playForwardOrIncreaseSpeed(playForwardOrIncreaseSpeed(playForwardOrIncreaseSpeed(playForwardOrIncreaseSpeed(s, D), D), D), D)
    expect(s.speed).toBe(8)
    expect(playForwardOrIncreaseSpeed({ ...s, speed: -4 }, D).speed).toBe(1)
  })

  it('J plays backward and doubles up to -8×', () => {
    let s = playBackwardOrIncreaseSpeed({ ...initialPlayback(), timeMs: 0 }, D)
    expect(s).toMatchObject({ playing: true, speed: -1, timeMs: D })
    s = playBackwardOrIncreaseSpeed(playBackwardOrIncreaseSpeed(playBackwardOrIncreaseSpeed(playBackwardOrIncreaseSpeed(s, D), D), D), D)
    expect(s.speed).toBe(-8)
    expect(playBackwardOrIncreaseSpeed({ ...s, speed: 2 }, D).speed).toBe(-1)
  })

  it('K stops and resets', () => {
    expect(stopAndResetSpeed({ timeMs: 5, playing: true, speed: -4, loop: false })).toMatchObject({ playing: false, speed: 1 })
  })

  it('arrows step a frame when paused and jump when playing', () => {
    const paused = { ...initialPlayback(), timeMs: 1000 }
    expect(step(paused, 'forward', false, D).timeMs).toBeCloseTo(1000 + 1000 / 60)
    expect(step(paused, 'back', true, D).timeMs).toBeCloseTo(1000 - 1000 / 60)
    const playing = { ...paused, playing: true }
    expect(step(playing, 'back', false, D).timeMs).toBe(0)
    expect(step(playing, 'forward', false, D).timeMs).toBe(1500)
    expect(step(playing, 'forward', true, D).timeMs).toBe(2000)
    expect(step({ ...playing, timeMs: 5000 }, 'back', true, D).timeMs).toBe(3000)
  })

  it('goes to first and last frame', () => {
    expect(goToFirstFrame({ ...initialPlayback(), timeMs: 5, playing: true })).toMatchObject({ timeMs: 0, playing: false })
    expect(goToLastFrame(initialPlayback(), D)).toMatchObject({ timeMs: D, playing: false })
  })

  it('seek clamps', () => {
    expect(seek(initialPlayback(), -5, D).timeMs).toBe(0)
    expect(seek(initialPlayback(), 99_999, D).timeMs).toBe(D)
  })
})

describe('tick', () => {
  it('advances by speed, stops at the end, loops when asked', () => {
    const s = { ...initialPlayback(), playing: true, speed: 2 }
    expect(tick(s, 100, D).timeMs).toBe(200)
    expect(tick({ ...s, timeMs: 9950 }, 100, D)).toMatchObject({ timeMs: D, playing: false })
    expect(tick({ ...s, timeMs: 9950, loop: true }, 100, D)).toMatchObject({ timeMs: 150, playing: true })
    expect(tick({ ...s, speed: -1, timeMs: 50 }, 100, D)).toMatchObject({ timeMs: 0, playing: false })
    expect(tick({ ...initialPlayback(), timeMs: 5 }, 100, D).timeMs).toBe(5)
  })
})

describe('speedLabel', () => {
  it('formats forward and backward speeds', () => {
    expect(speedLabel(1)).toBe('1×')
    expect(speedLabel(0.25)).toBe('0.25×')
    expect(speedLabel(-4)).toBe('4× ◀')
  })
})
