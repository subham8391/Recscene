/**
 * Masks (specs 189–198, Masks board): rectangles over the recording that
 * blur sensitive data or dim everything but a highlight, for a time range.
 * Regions are fractions of the full recording frame, so they survive crops
 * and resolution changes; the editor converts to pixels for display.
 */
import type { Ms } from '../project'

export type MaskType = 'sensitive-data' | 'highlight'

export interface MaskRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface Mask {
  id: string
  sourceStartMs: Ms
  sourceEndMs: Ms
  type: MaskType
  region: MaskRegion
  /** Spec 190: how dark the rest of the frame gets, 0.1–0.9. Stored for every mask (spec 191). */
  highlightMaskOpacity: number
  /** Board: blur radius in px at 1080p output, 4–40. */
  blurStrength: number
  /** Board: soft 6 px edge so the blur does not look cut out. */
  featherEdge: boolean
  isDisabled: boolean
}

export const MASK_TYPES: readonly { id: MaskType; name: string; sub: string }[] = [
  { id: 'sensitive-data', name: 'Sensitive data', sub: 'Blur the area for its whole range.' },
  { id: 'highlight', name: 'Highlight', sub: 'Dim everything except the area.' }
]
export const OPACITY_MIN = 0.1
export const OPACITY_MAX = 0.9
export const OPACITY_DEFAULT = 0.5
export const BLUR_MIN = 4
export const BLUR_MAX = 40
export const BLUR_DEFAULT = 18
export const FEATHER_PX = 6
export const MIN_MASK_MS = 500
export const MIN_MASK_SPLIT_MS = 100
export const DEFAULT_MASK_LENGTH_MS = 4000
/** Smallest region, as a fraction of the frame on each axis. */
export const MIN_REGION = 0.01
export const DEFAULT_REGION: MaskRegion = { x: 0.33, y: 0.4, width: 0.34, height: 0.2 }

export const NO_SPACE = 'Not enough space in selected timeline position to add a new mask'
export const COVER_NOTE = 'Make sure the mask covers the entire part of the timeline where sensitive data is present.'
export const OFF_RANGE_NOTE = 'Preview is showing different part of the recording than the one covered by the mask.'
export const DISABLED_HELP = 'When disabled, the mask will not be applied, but it will still be present in the timeline.'

let counter = 0
export const newMaskId = (): string => `mask-${Date.now().toString(36)}-${(counter += 1)}`

const sorted = (list: readonly Mask[]): Mask[] => [...list].sort((a, b) => a.sourceStartMs - b.sourceStartMs)
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Keeps a region inside the frame and at least the minimum size. */
export function clampRegion(r: MaskRegion): MaskRegion {
  const width = Math.min(1, Math.max(MIN_REGION, r.width))
  const height = Math.min(1, Math.max(MIN_REGION, r.height))
  return { x: clamp01(Math.min(1 - width, r.x)), y: clamp01(Math.min(1 - height, r.y)), width, height }
}

export function maskAt(masks: readonly Mask[], timeMs: number): Mask | undefined {
  return masks.find((m) => timeMs >= m.sourceStartMs && timeMs < m.sourceEndMs)
}

/** The mask that renders at `timeMs` (one at a time: masks cannot overlap), or null when disabled or none. */
export function activeMask(masks: readonly Mask[], timeMs: number): Mask | null {
  const m = maskAt(masks, timeMs)
  return m && !m.isDisabled ? m : null
}

export function freeMaskRangeAt(masks: readonly Mask[], timeMs: number, durationMs: number): { start: number; end: number } | null {
  const list = sorted(masks)
  if (list.some((m) => timeMs >= m.sourceStartMs && timeMs < m.sourceEndMs)) return null
  const prevEnd = Math.max(0, ...list.filter((m) => m.sourceEndMs <= timeMs).map((m) => m.sourceEndMs))
  const nextStart = Math.min(durationMs, ...list.filter((m) => m.sourceStartMs > timeMs).map((m) => m.sourceStartMs))
  return nextStart - prevEnd >= MIN_MASK_MS ? { start: prevEnd, end: nextStart } : null
}

/** Spec 192: a mask of the default length in the free slot at `timeMs`. */
export function addMaskAt(masks: readonly Mask[], timeMs: number, durationMs: number, type: MaskType = 'sensitive-data', settings?: Partial<MaskSettings>, lengthMs = DEFAULT_MASK_LENGTH_MS): { masks: Mask[]; mask?: Mask; error?: string } {
  const free = freeMaskRangeAt(masks, timeMs, durationMs)
  if (!free) return { masks: [...masks], error: NO_SPACE }
  const start = Math.max(free.start, Math.min(timeMs, free.end - MIN_MASK_MS))
  const end = Math.min(free.end, start + lengthMs)
  if (end - start < MIN_MASK_MS) return { masks: [...masks], error: NO_SPACE }
  const mask: Mask = {
    id: newMaskId(),
    sourceStartMs: Math.round(start),
    sourceEndMs: Math.round(end),
    type: settings?.type ?? type,
    region: clampRegion(settings?.region ?? DEFAULT_REGION),
    highlightMaskOpacity: settings?.highlightMaskOpacity ?? OPACITY_DEFAULT,
    blurStrength: settings?.blurStrength ?? BLUR_DEFAULT,
    featherEdge: settings?.featherEdge ?? true,
    isDisabled: false
  }
  return { masks: sorted([...masks, mask]), mask }
}

/** Drag on the track: move or resize within the neighbours and the minimum length. */
export function moveMask(masks: readonly Mask[], id: string, patch: { startMs?: number; endMs?: number }, durationMs: number): Mask[] {
  const list = sorted(masks)
  const i = list.findIndex((m) => m.id === id)
  const m = list[i]
  if (!m) return list
  const minStart = list[i - 1]?.sourceEndMs ?? 0
  const maxEnd = list[i + 1]?.sourceStartMs ?? durationMs
  let startMs = patch.startMs ?? m.sourceStartMs
  let endMs = patch.endMs ?? m.sourceEndMs
  if (patch.startMs !== undefined && patch.endMs !== undefined) {
    const len = endMs - startMs
    startMs = Math.max(minStart, Math.min(maxEnd - len, startMs))
    endMs = startMs + len
  } else if (patch.startMs !== undefined) {
    startMs = Math.max(minStart, Math.min(endMs - MIN_MASK_MS, startMs))
  } else {
    endMs = Math.min(maxEnd, Math.max(startMs + MIN_MASK_MS, endMs))
  }
  list[i] = { ...m, sourceStartMs: Math.round(startMs), sourceEndMs: Math.round(endMs) }
  return list
}

export function updateMask(masks: readonly Mask[], id: string, patch: Partial<Omit<Mask, 'id'>>): Mask[] {
  return masks.map((m) => (m.id === id ? { ...m, ...patch, ...(patch.region ? { region: clampRegion(patch.region) } : {}) } : m))
}

export function removeMask(masks: readonly Mask[], id: string): Mask[] {
  return masks.filter((m) => m.id !== id)
}

export function splitMask(masks: readonly Mask[], timeMs: number): { masks: Mask[]; error?: string } {
  const list = sorted(masks)
  const i = list.findIndex((m) => timeMs > m.sourceStartMs && timeMs < m.sourceEndMs)
  const m = list[i]
  if (!m) return { masks: list, error: 'No mask at the playhead' }
  if (timeMs - m.sourceStartMs < MIN_MASK_SPLIT_MS || m.sourceEndMs - timeMs < MIN_MASK_SPLIT_MS) return { masks: list, error: 'New duration is too short' }
  const left = { ...m, sourceEndMs: Math.round(timeMs) }
  const right = { ...m, id: newMaskId(), sourceStartMs: Math.round(timeMs) }
  return { masks: [...list.slice(0, i), left, right, ...list.slice(i + 1)] }
}

/** Spec 194: disable every mask (there is no enable-all command). */
export function disableAllMasks(masks: readonly Mask[]): Mask[] {
  return masks.map((m) => ({ ...m, isDisabled: true }))
}

/** Spec 191. */
export function applyOpacityToAll(masks: readonly Mask[], opacity: number): Mask[] {
  const v = Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, opacity))
  return masks.map((m) => ({ ...m, highlightMaskOpacity: v }))
}

/** Spec 195: what copy carries; paste applies it to a mask or creates one at the playhead. */
export interface MaskSettings {
  type: MaskType
  region: MaskRegion
  highlightMaskOpacity: number
  blurStrength: number
  featherEdge: boolean
}

export const maskSettings = (m: Mask): MaskSettings => ({ type: m.type, region: { ...m.region }, highlightMaskOpacity: m.highlightMaskOpacity, blurStrength: m.blurStrength, featherEdge: m.featherEdge })

export function pasteMaskSettings(masks: readonly Mask[], id: string, s: MaskSettings): Mask[] {
  return updateMask(masks, id, { type: s.type, region: { ...s.region }, highlightMaskOpacity: s.highlightMaskOpacity, blurStrength: s.blurStrength, featherEdge: s.featherEdge })
}

/** Region fractions → pixels of a frame, and back; used by the fields, the drag tool and the renderers. */
export function regionToPx(r: MaskRegion, frame: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
  return { x: r.x * frame.width, y: r.y * frame.height, width: r.width * frame.width, height: r.height * frame.height }
}

export function regionFromPx(px: { x: number; y: number; width: number; height: number }, frame: { width: number; height: number }): MaskRegion {
  if (frame.width <= 0 || frame.height <= 0) return DEFAULT_REGION
  return clampRegion({ x: px.x / frame.width, y: px.y / frame.height, width: px.width / frame.width, height: px.height / frame.height })
}

/** Spec 192: arrow keys nudge the region by whole recording pixels (⇧ for ten). */
export function nudgeRegion(r: MaskRegion, dx: number, dy: number, frame: { width: number; height: number }): MaskRegion {
  return clampRegion({ ...r, x: r.x + dx / frame.width, y: r.y + dy / frame.height })
}

export type MaskHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

/** Drags a handle by (dx, dy) fractions; edges keep the opposite side fixed, `move` shifts the whole region. */
export function dragRegion(r: MaskRegion, handle: MaskHandle, dx: number, dy: number): MaskRegion {
  if (handle === 'move') return clampRegion({ ...r, x: r.x + dx, y: r.y + dy })
  let { x, y, width, height } = r
  const right = x + width
  const bottom = y + height
  if (handle.includes('w')) x = Math.min(right - MIN_REGION, Math.max(0, x + dx))
  if (handle.includes('e')) width = Math.max(MIN_REGION, Math.min(1 - x, right + dx - x))
  if (handle.includes('n')) y = Math.min(bottom - MIN_REGION, Math.max(0, y + dy))
  if (handle.includes('s')) height = Math.max(MIN_REGION, Math.min(1 - y, bottom + dy - y))
  if (handle.includes('w')) width = right - x
  if (handle.includes('n')) height = bottom - y
  return clampRegion({ x, y, width, height })
}

/** The region inside a cropped view of the recording (fractions of the crop), or null when it lies outside. */
export function regionInCrop(r: MaskRegion, crop: MaskRegion | null): MaskRegion | null {
  if (!crop) return r
  const x0 = Math.max(r.x, crop.x)
  const y0 = Math.max(r.y, crop.y)
  const x1 = Math.min(r.x + r.width, crop.x + crop.width)
  const y1 = Math.min(r.y + r.height, crop.y + crop.height)
  if (x1 <= x0 || y1 <= y0) return null
  return { x: (x0 - crop.x) / crop.width, y: (y0 - crop.y) / crop.height, width: (x1 - x0) / crop.width, height: (y1 - y0) / crop.height }
}

/** Blur radius for a frame of this width (the slider is set for a 1920 px wide output). */
export function blurPxFor(blurStrength: number, frameWidth: number): number {
  return Math.max(0.5, (blurStrength * frameWidth) / 1920)
}

export const maskLabel = (m: Mask): string => (m.type === 'highlight' ? 'Highlight' : 'Blur')
