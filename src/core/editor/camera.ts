/**
 * The virtual camera (specs 106, 112, 115, 123–124): where the viewport looks
 * and how far it is zoomed at a moment, and the spring that moves it there.
 */
import type { Point } from '../project'
import { zoomAt, type ZoomRange } from './zooms'

export interface CursorSample {
  timeMs: number
  x: number
  y: number
}

export interface Viewport {
  /** Centre of the visible area as fractions of the frame. */
  center: Point
  scale: number
}

export interface SpringParams {
  stiffness: number
  damping: number
  mass: number
}

/** Spec 123 presets. */
export const SPRING_FOCUSED: SpringParams = { stiffness: 200, damping: 40, mass: 2.25 }
export const SPRING_SMOOTH: SpringParams = { stiffness: 90, damping: 26, mass: 2.25 }

/** Linear interpolation between the two samples around `timeMs`; the frame centre when there is no data. */
export function cursorAt(samples: readonly CursorSample[], timeMs: number): Point {
  if (samples.length === 0) return { x: 0.5, y: 0.5 }
  let lo = 0
  let hi = samples.length - 1
  if (timeMs <= samples[0]!.timeMs) return { x: samples[0]!.x, y: samples[0]!.y }
  if (timeMs >= samples[hi]!.timeMs) return { x: samples[hi]!.x, y: samples[hi]!.y }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (samples[mid]!.timeMs <= timeMs) lo = mid
    else hi = mid
  }
  const a = samples[lo]!
  const b = samples[hi]!
  const t = b.timeMs === a.timeMs ? 0 : (timeMs - a.timeMs) / (b.timeMs - a.timeMs)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Spec 112/124: keeps the viewport inside the frame. The visible half-size is
 * 1/(2·scale); a centre within `snap` of the edge (as a fraction of the visible
 * area) snaps to it, otherwise it is clamped so nothing outside the frame shows.
 */
export function clampCenter(center: Point, scale: number, snap: number): Point {
  const half = 1 / (2 * scale)
  const snapPx = snap * (2 * half)
  const axis = (v: number): number => {
    if (scale <= 1) return 0.5
    if (v - half < snapPx) return half
    if (1 - v - half < snapPx) return 1 - half
    return Math.min(1 - half, Math.max(half, v))
  }
  return { x: axis(center.x), y: axis(center.y) }
}

/** The target the camera should move towards at `timeMs`. */
export function targetViewport(timeMs: number, zooms: readonly ZoomRange[], cursor: (ms: number) => Point): Viewport {
  const z = zoomAt(zooms, timeMs)
  if (!z || z.zoom <= 1) return { center: { x: 0.5, y: 0.5 }, scale: 1 }
  const raw = z.type === 'manual' ? z.manualTargetPoint : cursor(timeMs)
  return { center: clampCenter(raw, z.zoom, z.type === 'manual' ? 0 : z.snapToEdgesRatio), scale: z.zoom }
}

export interface SpringState {
  value: number
  velocity: number
}

/** One semi-implicit Euler step of a damped spring towards `target`. */
export function springStep(s: SpringState, target: number, dtMs: number, p: SpringParams): SpringState {
  const dt = Math.min(0.064, Math.max(0, dtMs / 1000))
  const steps = Math.max(1, Math.ceil(dt / 0.004))
  const h = dt / steps
  let { value, velocity } = s
  for (let i = 0; i < steps; i += 1) {
    const force = -p.stiffness * (value - target) - p.damping * velocity
    velocity += (force / p.mass) * h
    value += velocity * h
  }
  if (Math.abs(value - target) < 1e-4 && Math.abs(velocity) < 1e-3) return { value: target, velocity: 0 }
  return { value, velocity }
}

export interface CameraState {
  x: SpringState
  y: SpringState
  scale: SpringState
}

export function cameraAtRest(v: Viewport): CameraState {
  return { x: { value: v.center.x, velocity: 0 }, y: { value: v.center.y, velocity: 0 }, scale: { value: v.scale, velocity: 0 } }
}

/** Moves the camera towards the target; `instant` (spec 115) jumps there. */
export function cameraStep(c: CameraState, target: Viewport, dtMs: number, p: SpringParams, instant: boolean): CameraState {
  if (instant) return cameraAtRest(target)
  return { x: springStep(c.x, target.center.x, dtMs, p), y: springStep(c.y, target.center.y, dtMs, p), scale: springStep(c.scale, target.scale, dtMs, p) }
}

export function cameraViewport(c: CameraState): Viewport {
  return { center: { x: c.x.value, y: c.y.value }, scale: Math.max(1, c.scale.value) }
}

/** CSS transform for a layer of `width`×`height` so that `viewport` fills the same box. */
export function viewportTransform(v: Viewport, width: number, height: number): string {
  const s = v.scale
  const tx = width / 2 - v.center.x * width * s
  const ty = height / 2 - v.center.y * height * s
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`
}
