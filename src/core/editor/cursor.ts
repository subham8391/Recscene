/**
 * The drawn cursor (specs 125–147): which position it heads for at a moment,
 * how it is smoothed, rotated and scaled on clicks, and when it is hidden.
 * Positions are fractions of the frame; times are source milliseconds.
 */
import type { ClickEvent, Point } from '../project'
import { cursorAt, springStep, type CursorSample, type SpringParams, type SpringState } from './camera'

export type CursorSetId = 'macos' | 'macos-tahoe' | 'touch' | 'halloween'
export const CURSOR_SETS: { id: CursorSetId; label: string }[] = [
  { id: 'macos', label: 'macOS' },
  { id: 'macos-tahoe', label: 'macOS Tahoe' },
  { id: 'touch', label: 'Touch' },
  { id: 'halloween', label: 'Halloween' }
]

export const CURSOR_SIZE_DEFAULT = 1.5
export const CURSOR_SIZE_MIN = 0.5
export const CURSOR_SIZE_MAX = 4

/** Spec 130. */
export const CURSOR_PRESETS: { id: 'smooth' | 'medium' | 'rapid'; label: string; spring: SpringParams }[] = [
  { id: 'smooth', label: 'Smooth', spring: { stiffness: 470, damping: 70, mass: 3 } },
  { id: 'medium', label: 'Medium', spring: { stiffness: 340, damping: 60, mass: 3 } },
  { id: 'rapid', label: 'Rapid', spring: { stiffness: 530, damping: 40, mass: 1 } }
]
export const CLICK_SPRING_DEFAULT: SpringParams = { stiffness: 700, damping: 30, mass: 1 }

export interface CursorConfig {
  cursorSet: { id: CursorSetId }
  cursorSize: number
  hideCursor: boolean
  disableMouseMovementSpring: boolean
  mouseMovementSpring: SpringParams
  mouseClickSpring: SpringParams
  cursorRotateOnXMovementRatio: number
  cursorBaseRotation: number
  alwaysUseDefaultCursor: boolean
  useDefaultCursorIfAppCursorHasLowResolution: boolean
  optimizeOriginalCursorTypes: boolean
  hideNotMovingCursorAfterMs: number | null
  loopCursorPositionBeforeEndMs: number | null
  stopCursorMovementInLastPartMs: number
  /** Misspelt on purpose: the stored key matches the reference app. */
  removeCurshorShakeTreshold: number
  clickEffect: null | 'circle' | 'ripple'
  clickSoundEffect: null | 'apple-magic-mouse' | 'logitech-mx-master'
  clickSoundEffectVolume: number
  motionBlurAmount: number
  motionBlurCursorAmount: number
  motionBlurScreenMoveAmount: number
  motionBlurScreenZoomAmount: number
}

export const defaultCursorConfig: CursorConfig = {
  cursorSet: { id: 'macos' },
  cursorSize: CURSOR_SIZE_DEFAULT,
  hideCursor: false,
  disableMouseMovementSpring: false,
  mouseMovementSpring: { ...CURSOR_PRESETS[0]!.spring },
  mouseClickSpring: { ...CLICK_SPRING_DEFAULT },
  cursorRotateOnXMovementRatio: 0.5,
  cursorBaseRotation: 0,
  alwaysUseDefaultCursor: false,
  useDefaultCursorIfAppCursorHasLowResolution: true,
  optimizeOriginalCursorTypes: true,
  hideNotMovingCursorAfterMs: null,
  loopCursorPositionBeforeEndMs: null,
  stopCursorMovementInLastPartMs: 0,
  removeCurshorShakeTreshold: 500,
  clickEffect: null,
  clickSoundEffect: null,
  clickSoundEffectVolume: 0.25,
  motionBlurAmount: 1,
  motionBlurCursorAmount: 1,
  motionBlurScreenMoveAmount: 1,
  motionBlurScreenZoomAmount: 1
}

/** Which preset the spring matches, if any (spec 130). */
export function presetFor(spring: SpringParams, disabled: boolean): 'smooth' | 'medium' | 'rapid' | 'none' | null {
  if (disabled) return 'none'
  return CURSOR_PRESETS.find((p) => p.spring.stiffness === spring.stiffness && p.spring.damping === spring.damping && p.spring.mass === spring.mass)?.id ?? null
}

/**
 * Spec 140: drops samples that jump more than `thresholdPx` (in recording
 * pixels) and come straight back, so accessibility tools' spikes never reach the spring.
 */
export function removeShakes(samples: readonly CursorSample[], thresholdPx: number, recording: { width: number; height: number }): CursorSample[] {
  if (thresholdPx <= 0 || samples.length < 3) return [...samples]
  const dist = (a: CursorSample, b: CursorSample): number => Math.hypot((a.x - b.x) * recording.width, (a.y - b.y) * recording.height)
  const out: CursorSample[] = [samples[0]!]
  for (let i = 1; i < samples.length - 1; i += 1) {
    const prev = out[out.length - 1]!
    const cur = samples[i]!
    const next = samples[i + 1]!
    const spike = dist(prev, cur) > thresholdPx && dist(prev, next) < thresholdPx
    if (!spike) out.push(cur)
  }
  out.push(samples[samples.length - 1]!)
  return out
}

/** The last time the cursor moved at or before `timeMs` (now, while a move is in progress), or null if it never did. */
export function lastMoveBefore(samples: readonly CursorSample[], timeMs: number): number | null {
  let last: number | null = null
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1]!
    const b = samples[i]!
    const moving = a.x !== b.x || a.y !== b.y
    if (b.timeMs > timeMs) {
      if (moving && a.timeMs <= timeMs) last = timeMs
      break
    }
    if (moving) last = b.timeMs
  }
  return last
}

export interface CursorTargetOptions {
  /** Source range of the recording the cursor rules apply to (spec 81). */
  startMs: number
  endMs: number
  config: Pick<CursorConfig, 'hideCursor' | 'hideNotMovingCursorAfterMs' | 'loopCursorPositionBeforeEndMs' | 'stopCursorMovementInLastPartMs'>
  clipHidden: boolean
}

export interface CursorTarget {
  position: Point
  visible: boolean
}

/**
 * Where the cursor should head at `timeMs`, after the end-of-video rules
 * (specs 138–139), idle hiding (137) and the hide flags (127).
 */
export function cursorTarget(samples: readonly CursorSample[], timeMs: number, o: CursorTargetOptions): CursorTarget {
  if (o.config.hideCursor || o.clipHidden || samples.length === 0) return { position: cursorAt(samples, timeMs), visible: false }
  const loop = o.config.loopCursorPositionBeforeEndMs
  const stop = o.config.stopCursorMovementInLastPartMs
  if (loop !== null && loop > 0 && timeMs >= o.endMs - loop) {
    const first = samples[0]!
    return { position: { x: first.x, y: first.y }, visible: true }
  }
  let t = timeMs
  if (stop > 0 && timeMs > o.endMs - stop) t = o.endMs - stop
  const idle = o.config.hideNotMovingCursorAfterMs
  if (idle !== null && idle > 0) {
    const last = lastMoveBefore(samples, t)
    const since = last === null ? t - o.startMs : t - last
    if (since > idle) return { position: cursorAt(samples, t), visible: false }
  }
  return { position: cursorAt(samples, t), visible: true }
}

export interface CursorMotion {
  x: SpringState
  y: SpringState
  /** 1 at rest; the click spring pulls it down on mouse-down (spec 131). */
  press: SpringState
}

export function cursorAtRest(p: Point): CursorMotion {
  return { x: { value: p.x, velocity: 0 }, y: { value: p.y, velocity: 0 }, press: { value: 1, velocity: 0 } }
}

/** Spec 128–129: spring towards the target, or jump when smoothing is off. */
export function cursorStep(m: CursorMotion, target: Point, dtMs: number, spring: SpringParams, smooth: boolean, pressed: boolean, clickSpring: SpringParams): CursorMotion {
  const press = springStep(m.press, pressed ? 0.8 : 1, dtMs, clickSpring)
  if (!smooth) return { x: { value: target.x, velocity: 0 }, y: { value: target.y, velocity: 0 }, press }
  return { x: springStep(m.x, target.x, dtMs, spring), y: springStep(m.y, target.y, dtMs, spring), press }
}

/** Spec 132–133: degrees; horizontal velocity (fractions per second) times the ratio, plus the base angle. */
export function cursorRotation(m: CursorMotion, ratio: number, baseDeg: number): number {
  const deg = Math.max(-35, Math.min(35, m.x.velocity * 12 * ratio))
  return baseDeg + deg
}

/** True while a recorded mouse button is held: clicks are instants, so hold each for 120 ms. */
export function isPressed(clicks: readonly ClickEvent[], timeMs: number, holdMs = 120): boolean {
  return clicks.some((c) => timeMs >= c.timeMs && timeMs < c.timeMs + holdMs)
}

/** Spec 141: clicks whose effect is still animating at `timeMs`, with progress 0–1. */
export function activeClickEffects(clicks: readonly ClickEvent[], timeMs: number, durationMs = 450): { click: ClickEvent; progress: number }[] {
  return clicks.filter((c) => timeMs >= c.timeMs && timeMs < c.timeMs + durationMs).map((c) => ({ click: c, progress: (timeMs - c.timeMs) / durationMs }))
}

/** Spec 145: blur radius in pixels from the smoothed speed (fractions per second) and the amounts. */
export function cursorBlurPx(m: CursorMotion, boxWidth: number, master: number, cursorAmount: number): number {
  const speed = Math.hypot(m.x.velocity, m.y.velocity) * boxWidth
  return Math.min(12, (speed / 400) * master * cursorAmount)
}
