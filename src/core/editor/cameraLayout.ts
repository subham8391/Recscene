/**
 * Camera layouts (specs 148–164 and the Camera board): how the webcam track
 * is placed over, beside or instead of the screen, the default layout and
 * the timeline layouts that override it for a while.
 */
import type { Box } from './aspect'
import { springStep, type SpringParams, type SpringState } from './camera'
import type { Ms } from '../project'

/** `both` is the camera overlay, `split` puts them side by side, `only-camera` fills the frame, `only-screen` hides the camera. */
export type LayoutType = 'both' | 'split' | 'only-camera' | 'only-screen'

export interface Point01 {
  x: number
  y: number
}

export interface DefaultLayout {
  type: LayoutType
  /** Fraction of the frame's shorter side (spec 152), 0.2–1. */
  cameraSize: number
  /** 0,0 top-left … 1,1 bottom-right, 0.5 centred (spec 154). */
  cameraPositionPoint: Point01
}

export interface CameraConfig {
  /** Spec 148. */
  hideCamera: boolean
  /** Spec 149. */
  mirrorCamera: boolean
  /** Spec 150. */
  cameraAspectRatio: 'original' | 'square'
  /** Spec 151: 0–0.5 of the shorter side. */
  cameraRoundness: number
  /** Spec 153: 1 means no shrink. */
  cameraScaleDuringZoom: number
  /** Spec 155. */
  defaultLayout: DefaultLayout
  /** Split layouts: the camera's share of the width (board: ½ · ½ or ⅔ · ⅓ screen · camera). */
  splitRatio: number
  /** Split layouts: camera on the left instead of the right. */
  splitFlip: boolean
  /** Spec 286: stored for the audio panel; null means never hide. */
  hideDuringSilenceMs: number | null
  /** Spec 287's camera delay (ms, −200…200): shifts the camera track against the screen. */
  cameraDelayMs: number
}

export const defaultCameraConfig: CameraConfig = {
  hideCamera: false,
  mirrorCamera: false,
  cameraAspectRatio: 'original',
  cameraRoundness: 0.25,
  cameraScaleDuringZoom: 0.7,
  defaultLayout: { type: 'both', cameraSize: 0.35, cameraPositionPoint: { x: 1, y: 1 } },
  splitRatio: 0.5,
  splitFlip: false,
  hideDuringSilenceMs: null,
  cameraDelayMs: 0
}

export const CAMERA_SIZE_MIN = 0.2
export const CAMERA_SIZE_MAX = 1
export const ROUNDNESS_MAX = 0.5
export const ZOOM_SCALE_MIN = 0.25
export const ZOOM_SCALE_MAX = 0.8
export const ZOOM_SCALE_DEFAULT = 0.7
export const SPLIT_RATIOS: readonly { label: string; ratio: number }[] = [
  { label: '½ · ½', ratio: 0.5 },
  { label: '⅔ · ⅓', ratio: 1 / 3 }
]
export const LAYOUT_NAMES: Record<LayoutType, string> = { both: 'Camera overlay', split: 'Split screen', 'only-camera': 'Fullscreen camera', 'only-screen': 'Hide camera' }
export const LAYOUT_HELP: Record<LayoutType, string> = {
  both: 'Show both camera and screen',
  split: 'Screen and camera side by side',
  'only-camera': 'Show camera in fullscreen mode',
  'only-screen': 'Only show the screen and hide the camera'
}

/** A timeline layout (spec 156). `cameraSize` null inherits the default layout's size (spec 157). */
export interface CameraLayout {
  id: string
  sourceStartMs: Ms
  sourceEndMs: Ms
  type: LayoutType
  cameraSize: number | null
  cameraPositionPoint: Point01
  isDisabled: boolean
}

export const MIN_LAYOUT_MS = 1000
export const MIN_LAYOUT_SPLIT_MS = 100
export const DEFAULT_LAYOUT_LENGTH_MS = 3000
export const NO_SPACE = 'Not enough space in selected timeline position to add a new layout'
export const NO_CAMERA_RECORDED = 'No camera recorded'
export const ENABLE_CAMERA_QUESTION = 'Webcam is disabled in your project, do you want to enable it?'

let counter = 0
export const newLayoutId = (): string => `layout-${Date.now().toString(36)}-${(counter += 1)}`

const sorted = (list: readonly CameraLayout[]): CameraLayout[] => [...list].sort((a, b) => a.sourceStartMs - b.sourceStartMs)

/** The timeline layout covering `timeMs`, disabled ones included. */
export function layoutAt(layouts: readonly CameraLayout[], timeMs: number): CameraLayout | undefined {
  return layouts.find((l) => timeMs >= l.sourceStartMs && timeMs < l.sourceEndMs)
}

/** What plays at `timeMs`: the enabled timeline layout there, else the default (spec 155, 161). */
export function effectiveLayout(config: CameraConfig, layouts: readonly CameraLayout[], timeMs: number): { type: LayoutType; cameraSize: number; cameraPositionPoint: Point01; custom: CameraLayout | null } {
  const d = config.defaultLayout
  if (config.hideCamera) return { type: 'only-screen', cameraSize: d.cameraSize, cameraPositionPoint: d.cameraPositionPoint, custom: null }
  const l = layoutAt(layouts, timeMs)
  if (!l || l.isDisabled) return { type: d.type, cameraSize: d.cameraSize, cameraPositionPoint: d.cameraPositionPoint, custom: null }
  return { type: l.type, cameraSize: l.cameraSize ?? d.cameraSize, cameraPositionPoint: l.cameraPositionPoint, custom: l }
}

export function freeLayoutRangeAt(layouts: readonly CameraLayout[], timeMs: number, durationMs: number): { start: number; end: number } | null {
  const list = sorted(layouts)
  if (list.some((l) => timeMs >= l.sourceStartMs && timeMs < l.sourceEndMs)) return null
  const prevEnd = Math.max(0, ...list.filter((l) => l.sourceEndMs <= timeMs).map((l) => l.sourceEndMs))
  const nextStart = Math.min(durationMs, ...list.filter((l) => l.sourceStartMs > timeMs).map((l) => l.sourceStartMs))
  return nextStart - prevEnd >= MIN_LAYOUT_MS ? { start: prevEnd, end: nextStart } : null
}

/** Spec 156: a layout in the free slot at `timeMs`; new layouts start fullscreen unless a type is given. */
export function addLayoutAt(layouts: readonly CameraLayout[], timeMs: number, durationMs: number, type: LayoutType = 'only-camera', position: Point01 = { x: 1, y: 1 }, lengthMs = DEFAULT_LAYOUT_LENGTH_MS): { layouts: CameraLayout[]; layout?: CameraLayout; error?: string } {
  const free = freeLayoutRangeAt(layouts, timeMs, durationMs)
  if (!free) return { layouts: [...layouts], error: NO_SPACE }
  const start = Math.max(free.start, Math.min(timeMs, free.end - MIN_LAYOUT_MS))
  const end = Math.min(free.end, start + lengthMs)
  if (end - start < MIN_LAYOUT_MS) return { layouts: [...layouts], error: NO_SPACE }
  const layout: CameraLayout = { id: newLayoutId(), sourceStartMs: Math.round(start), sourceEndMs: Math.round(end), type, cameraSize: null, cameraPositionPoint: { ...position }, isDisabled: false }
  return { layouts: sorted([...layouts, layout]), layout }
}

/** Drag on the track: move or resize within the neighbours and the minimum length. */
export function moveLayout(layouts: readonly CameraLayout[], id: string, patch: { startMs?: number; endMs?: number }, durationMs: number): CameraLayout[] {
  const list = sorted(layouts)
  const i = list.findIndex((l) => l.id === id)
  const l = list[i]
  if (!l) return list
  const minStart = list[i - 1]?.sourceEndMs ?? 0
  const maxEnd = list[i + 1]?.sourceStartMs ?? durationMs
  let startMs = patch.startMs ?? l.sourceStartMs
  let endMs = patch.endMs ?? l.sourceEndMs
  if (patch.startMs !== undefined && patch.endMs !== undefined) {
    const len = endMs - startMs
    startMs = Math.max(minStart, Math.min(maxEnd - len, startMs))
    endMs = startMs + len
  } else if (patch.startMs !== undefined) {
    startMs = Math.max(minStart, Math.min(endMs - MIN_LAYOUT_MS, startMs))
  } else {
    endMs = Math.min(maxEnd, Math.max(startMs + MIN_LAYOUT_MS, endMs))
  }
  list[i] = { ...l, sourceStartMs: Math.round(startMs), sourceEndMs: Math.round(endMs) }
  return list
}

export function updateLayout(layouts: readonly CameraLayout[], id: string, patch: Partial<Omit<CameraLayout, 'id'>>): CameraLayout[] {
  return layouts.map((l) => (l.id === id ? { ...l, ...patch } : l))
}

export function removeLayout(layouts: readonly CameraLayout[], id: string): CameraLayout[] {
  return layouts.filter((l) => l.id !== id)
}

/** Spec 163. */
export function splitLayout(layouts: readonly CameraLayout[], timeMs: number): { layouts: CameraLayout[]; error?: string } {
  const list = sorted(layouts)
  const i = list.findIndex((l) => timeMs > l.sourceStartMs && timeMs < l.sourceEndMs)
  const l = list[i]
  if (!l) return { layouts: list, error: 'No layout at the playhead' }
  if (timeMs - l.sourceStartMs < MIN_LAYOUT_SPLIT_MS || l.sourceEndMs - timeMs < MIN_LAYOUT_SPLIT_MS) return { layouts: list, error: 'New duration is too short' }
  const left = { ...l, sourceEndMs: Math.round(timeMs) }
  const right = { ...l, id: newLayoutId(), sourceStartMs: Math.round(timeMs) }
  return { layouts: [...list.slice(0, i), left, right, ...list.slice(i + 1)] }
}

/** Spec 162: what copy and paste carry between layouts. */
export interface LayoutSettings {
  type: LayoutType
  cameraSize: number | null
  cameraPositionPoint: Point01
  isDisabled: boolean
}

export const layoutSettings = (l: CameraLayout): LayoutSettings => ({ type: l.type, cameraSize: l.cameraSize, cameraPositionPoint: { ...l.cameraPositionPoint }, isDisabled: l.isDisabled })

export function pasteLayoutSettings(layouts: readonly CameraLayout[], id: string, s: LayoutSettings): CameraLayout[] {
  return updateLayout(layouts, id, { type: s.type, cameraSize: s.cameraSize, cameraPositionPoint: { ...s.cameraPositionPoint }, isDisabled: s.isDisabled })
}

/** Spec 160: one size for every layout and the default. */
export function applyCameraSizeToAll(config: CameraConfig, layouts: readonly CameraLayout[], size: number): { config: CameraConfig; layouts: CameraLayout[] } {
  return { config: { ...config, defaultLayout: { ...config.defaultLayout, cameraSize: size } }, layouts: layouts.map((l) => ({ ...l, cameraSize: size })) }
}

export type MoveDirection = 'up' | 'down' | 'left' | 'right'

/** Specs 158–159: the anchor steps through 0 → 0.5 → 1 on one axis; null when already at that edge. */
export function stepPosition(p: Point01, dir: MoveDirection): Point01 | null {
  const grid = (v: number): number => (v < 0.25 ? 0 : v > 0.75 ? 1 : 0.5)
  const x = grid(p.x)
  const y = grid(p.y)
  if (dir === 'left') return x === 0 ? null : { x: x - 0.5, y }
  if (dir === 'right') return x === 1 ? null : { x: x + 0.5, y }
  if (dir === 'up') return y === 0 ? null : { x, y: y - 0.5 }
  return y === 1 ? null : { x, y: y + 0.5 }
}

export const POSITION_LABELS = ['Top left', 'Top', 'Top right', 'Left', 'Centre', 'Right', 'Bottom left', 'Bottom', 'Bottom right'] as const

/** The 3 × 3 grid cell index for a point, for the panel's position picker. */
export function positionCell(p: Point01): number {
  const grid = (v: number): number => (v < 0.25 ? 0 : v > 0.75 ? 2 : 1)
  return grid(p.y) * 3 + grid(p.x)
}

export const cellPoint = (cell: number): Point01 => ({ x: (cell % 3) / 2, y: Math.floor(cell / 3) / 2 })

export function clampCameraSize(v: number): number {
  return Math.min(CAMERA_SIZE_MAX, Math.max(CAMERA_SIZE_MIN, v))
}

/** Where the camera and the screen go for a frame, in frame pixels. */
export interface Placement {
  /** The camera box, or null when hidden. Fractions of the frame are easy to animate, so pixels come from `frame`. */
  camera: Box | null
  /** The part of the frame the screen composition may use (the whole frame unless split). */
  screen: Box
  /** Corner radius of the camera box in px. */
  radius: number
  /** Source crop of the camera video (fractions) for the square shape. */
  crop: { x: number; y: number; width: number; height: number }
}

export interface PlacementInput {
  frame: { width: number; height: number }
  cameraFrame: { width: number; height: number }
  type: LayoutType
  cameraSize: number
  position: Point01
  config: CameraConfig
  /** True while a zoom is active (spec 153). */
  zoomed: boolean
  /** The background padding fraction, so the overlay keeps the same margin the screen has (spec 154). */
  paddingRatio: number
}

/** Specs 150–155: the camera box for a layout. */
export function placeCamera(input: PlacementInput): Placement {
  const { frame, cameraFrame, type, config } = input
  const whole: Box = { x: 0, y: 0, width: frame.width, height: frame.height }
  const square = config.cameraAspectRatio === 'square'
  const srcRatio = cameraFrame.width > 0 && cameraFrame.height > 0 ? cameraFrame.width / cameraFrame.height : 16 / 9
  const crop = square
    ? srcRatio >= 1
      ? { x: (1 - 1 / srcRatio) / 2, y: 0, width: 1 / srcRatio, height: 1 }
      : { x: 0, y: (1 - srcRatio) / 2, width: 1, height: srcRatio }
    : { x: 0, y: 0, width: 1, height: 1 }
  const ratio = square ? 1 : srcRatio
  if (type === 'only-screen') return { camera: null, screen: whole, radius: 0, crop }
  if (type === 'only-camera') {
    // Fill the frame with the camera (cover), roundness still applies to the box.
    const scale = Math.max(frame.width / ratio, frame.height)
    const w = scale * ratio
    const h = scale
    const box = { x: (frame.width - w) / 2, y: (frame.height - h) / 2, width: w, height: h }
    return { camera: box, screen: whole, radius: config.cameraRoundness * Math.min(w, h), crop }
  }
  if (type === 'split') {
    const camShare = Math.min(0.8, Math.max(0.2, config.splitRatio))
    const gap = frame.width * 0.02
    const camW = frame.width * camShare - gap / 2
    const screenW = frame.width - camW - gap
    const camX = config.splitFlip ? 0 : screenW + gap
    const screenX = config.splitFlip ? camW + gap : 0
    const pad = frame.height * input.paddingRatio
    const availH = frame.height - pad * 2
    let h = availH
    let w = h * ratio
    if (w > camW) {
      w = camW
      h = w / ratio
    }
    const box = { x: camX + (camW - w) / 2, y: (frame.height - h) / 2, width: w, height: h }
    return { camera: box, screen: { x: screenX, y: 0, width: screenW, height: frame.height }, radius: config.cameraRoundness * Math.min(w, h), crop }
  }
  // Overlay: size is a fraction of the shorter side, shrunk during zooms, anchored at the position point inside the padding.
  const shorter = Math.min(frame.width, frame.height)
  const size = shorter * clampCameraSize(input.cameraSize) * (input.zoomed ? Math.min(1, Math.max(ZOOM_SCALE_MIN, config.cameraScaleDuringZoom)) : 1)
  const h = ratio >= 1 ? size : size * ratio
  const w = ratio >= 1 ? size * ratio : size
  const margin = shorter * Math.max(0.02, input.paddingRatio * 0.5)
  const x = margin + (frame.width - w - margin * 2) * Math.min(1, Math.max(0, input.position.x))
  const y = margin + (frame.height - h - margin * 2) * Math.min(1, Math.max(0, input.position.y))
  return { camera: { x, y, width: w, height: h }, screen: whole, radius: config.cameraRoundness * Math.min(w, h), crop }
}

/** The camera box animated between layouts (spec 156): four springs plus opacity for hide/show. */
export interface CameraMotion {
  x: SpringState
  y: SpringState
  width: SpringState
  height: SpringState
  alpha: SpringState
}

export const LAYOUT_SPRING: SpringParams = { stiffness: 170, damping: 26, mass: 1 }

export function cameraMotionAtRest(box: Box | null, frame: { width: number; height: number }): CameraMotion {
  const b = box ?? { x: frame.width / 2, y: frame.height / 2, width: 0, height: 0 }
  const s = (value: number): SpringState => ({ value, velocity: 0 })
  return { x: s(b.x), y: s(b.y), width: s(b.width), height: s(b.height), alpha: s(box ? 1 : 0) }
}

/** One step towards the target box; a hidden camera shrinks into its last spot and fades. */
export function cameraMotionStep(m: CameraMotion, box: Box | null, dtMs: number, instant = false): CameraMotion {
  const target = box ?? { x: m.x.value + m.width.value / 2, y: m.y.value + m.height.value / 2, width: 0, height: 0 }
  if (instant) return { x: { value: target.x, velocity: 0 }, y: { value: target.y, velocity: 0 }, width: { value: target.width, velocity: 0 }, height: { value: target.height, velocity: 0 }, alpha: { value: box ? 1 : 0, velocity: 0 } }
  return {
    x: springStep(m.x, target.x, dtMs, LAYOUT_SPRING),
    y: springStep(m.y, target.y, dtMs, LAYOUT_SPRING),
    width: springStep(m.width, target.width, dtMs, LAYOUT_SPRING),
    height: springStep(m.height, target.height, dtMs, LAYOUT_SPRING),
    alpha: springStep(m.alpha, box ? 1 : 0, dtMs, { stiffness: 300, damping: 34, mass: 1 })
  }
}

export function motionBox(m: CameraMotion): Box {
  return { x: m.x.value, y: m.y.value, width: Math.max(0, m.width.value), height: Math.max(0, m.height.value) }
}

/** The camera's source time for a screen time (spec 287's delay). */
export function cameraTimeMs(sourceMs: number, config: CameraConfig): number {
  return Math.max(0, sourceMs - config.cameraDelayMs)
}
