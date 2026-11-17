/**
 * Zoom ranges (specs 102–122): when and how far the camera zooms, and where it
 * looks. Times are source milliseconds; positions are fractions of the frame.
 */
import type { ClickEvent, Point } from '../project'

export type ZoomType = 'follow-click-groups' | 'follow-mouse' | 'manual'

export interface ZoomRange {
  id: string
  startMs: number
  endMs: number
  type: ZoomType
  /** 1 = no zoom, 4 = four times. */
  zoom: number
  /** Spec 112: 0–0.45 of the visible area. */
  snapToEdgesRatio: number
  /** Spec 107: fractions of the frame. */
  manualTargetPoint: Point
  isDisabled: boolean
  hasInstantAnimation: boolean
  /** True for zooms the app generated from clicks. */
  isSystem: boolean
}

export type ZoomSettings = Pick<ZoomRange, 'type' | 'zoom' | 'isDisabled' | 'manualTargetPoint' | 'snapToEdgesRatio'>

export const ZOOM_MIN = 1
export const ZOOM_MAX = 4
export const ZOOM_STEP = 0.2
export const BUILTIN_DEFAULT_ZOOM = 2
export const MIN_ZOOM_MS = 1000
export const MIN_SPLIT_MS = 100
export const DEFAULT_ZOOM_LENGTH_MS = 3000
export const SNAP_DEFAULT = 0.25
export const SNAP_MAX = 0.45
/** Spec 108: number keys 1–9 pick these levels; 0 restores the default. */
export const ZOOM_PRESETS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6] as const

let counter = 0
export const newZoomId = (): string => `zoom-${Date.now().toString(36)}-${(counter += 1)}`

export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 1000) / 1000))
}

export function makeZoom(startMs: number, endMs: number, defaultZoom: number, overrides: Partial<ZoomRange> = {}): ZoomRange {
  return {
    id: newZoomId(),
    startMs: Math.round(startMs),
    endMs: Math.round(endMs),
    type: 'follow-click-groups',
    zoom: clampZoom(defaultZoom),
    snapToEdgesRatio: SNAP_DEFAULT,
    manualTargetPoint: { x: 0.5, y: 0.5 },
    isDisabled: false,
    hasInstantAnimation: false,
    isSystem: false,
    ...overrides
  }
}

const sorted = (zooms: readonly ZoomRange[]): ZoomRange[] => [...zooms].sort((a, b) => a.startMs - b.startMs)

/**
 * Spec 102: every click becomes click−300 … click+2500 ms (clamped); ranges
 * that overlap or sit less than 2500 ms apart merge, repeated until stable;
 * clicks in the last second are ignored.
 */
export function automaticZooms(clicks: readonly ClickEvent[], durationMs: number, defaultZoom: number): ZoomRange[] {
  const usable = clicks.filter((c) => c.timeMs < durationMs - 1000).map((c) => c.timeMs).sort((a, b) => a - b)
  let ranges = usable.map((t) => ({ start: Math.max(0, t - 300), end: Math.min(durationMs, t + 2500) }))
  let changed = true
  while (changed) {
    changed = false
    const merged: { start: number; end: number }[] = []
    for (const r of ranges) {
      const last = merged[merged.length - 1]
      if (last && r.start - last.end < 2500) {
        last.end = Math.max(last.end, r.end)
        changed = true
      } else merged.push({ ...r })
    }
    ranges = merged
  }
  return ranges.filter((r) => r.end - r.start >= MIN_ZOOM_MS).map((r) => makeZoom(r.start, r.end, defaultZoom, { isSystem: true }))
}

/** Spec 104: the free gap around `timeMs`, or null when less than 1000 ms is free. */
export function freeRangeAt(zooms: readonly ZoomRange[], timeMs: number, durationMs: number): { start: number; end: number } | null {
  const list = sorted(zooms)
  if (list.some((z) => timeMs >= z.startMs && timeMs < z.endMs)) return null
  const prevEnd = Math.max(0, ...list.filter((z) => z.endMs <= timeMs).map((z) => z.endMs))
  const nextStart = Math.min(durationMs, ...list.filter((z) => z.startMs > timeMs).map((z) => z.startMs))
  return nextStart - prevEnd >= MIN_ZOOM_MS ? { start: prevEnd, end: nextStart } : null
}

/** Spec 104: a 3 s zoom at the time (or the dragged range), fitted into the free space. */
export function addZoomAt(zooms: readonly ZoomRange[], timeMs: number, durationMs: number, defaultZoom: number, type: ZoomType = 'follow-click-groups', lengthMs = DEFAULT_ZOOM_LENGTH_MS): { zooms: ZoomRange[]; zoom?: ZoomRange; error?: string } {
  const free = freeRangeAt(zooms, timeMs, durationMs)
  if (!free) return { zooms: [...zooms], error: 'Could not insert zoom at currently selected time' }
  const start = Math.max(free.start, Math.min(timeMs, free.end - MIN_ZOOM_MS))
  const end = Math.min(free.end, start + lengthMs)
  if (end - start < MIN_ZOOM_MS) return { zooms: [...zooms], error: 'Could not insert zoom at currently selected time' }
  const zoom = makeZoom(start, end, defaultZoom, { type })
  return { zooms: sorted([...zooms, zoom]), zoom }
}

/** Dragging an edge or the whole zoom, clamped to neighbours, the recording and the 1 s minimum. */
export function moveZoom(zooms: readonly ZoomRange[], id: string, patch: { startMs?: number; endMs?: number }, durationMs: number): ZoomRange[] {
  const list = sorted(zooms)
  const i = list.findIndex((z) => z.id === id)
  const z = list[i]
  if (!z) return list
  const minStart = list[i - 1]?.endMs ?? 0
  const maxEnd = list[i + 1]?.startMs ?? durationMs
  let startMs = patch.startMs ?? z.startMs
  let endMs = patch.endMs ?? z.endMs
  if (patch.startMs !== undefined && patch.endMs !== undefined) {
    const len = endMs - startMs
    startMs = Math.max(minStart, Math.min(maxEnd - len, startMs))
    endMs = startMs + len
  } else if (patch.startMs !== undefined) {
    startMs = Math.max(minStart, Math.min(endMs - MIN_ZOOM_MS, startMs))
  } else {
    endMs = Math.min(maxEnd, Math.max(startMs + MIN_ZOOM_MS, endMs))
  }
  list[i] = { ...z, startMs: Math.round(startMs), endMs: Math.round(endMs) }
  return list
}

export function updateZoom(zooms: readonly ZoomRange[], id: string, patch: Partial<ZoomRange>): ZoomRange[] {
  return zooms.map((z) => (z.id === id ? { ...z, ...patch, ...(patch.zoom !== undefined ? { zoom: clampZoom(patch.zoom) } : {}) } : z))
}

/** Spec 111: ±0.2 on the zoom grid. */
export function stepZoomLevel(z: ZoomRange, direction: 1 | -1): ZoomRange {
  const next = direction > 0 ? Math.floor(z.zoom / ZOOM_STEP + 1e-6) * ZOOM_STEP + ZOOM_STEP : z.zoom - ZOOM_STEP
  return { ...z, zoom: clampZoom(next) }
}

/** Spec 110. */
export function applyLevelToAll(zooms: readonly ZoomRange[], id: string): ZoomRange[] {
  const level = zooms.find((z) => z.id === id)?.zoom
  return level === undefined ? [...zooms] : zooms.map((z) => ({ ...z, zoom: level }))
}

/** Spec 117. */
export function setAllDisabled(zooms: readonly ZoomRange[], disabled: boolean): ZoomRange[] {
  return zooms.map((z) => ({ ...z, isDisabled: disabled }))
}

/** Spec 119: a copy right after the original, capped at the next zoom; nothing when under 1 s is free. */
export function duplicateZoom(zooms: readonly ZoomRange[], id: string, durationMs: number): ZoomRange[] {
  const list = sorted(zooms)
  const i = list.findIndex((z) => z.id === id)
  const z = list[i]
  if (!z) return list
  const cap = list[i + 1]?.startMs ?? durationMs
  const end = Math.min(cap, z.endMs + (z.endMs - z.startMs))
  if (end - z.endMs < MIN_ZOOM_MS) return list
  return sorted([...list, { ...z, id: newZoomId(), startMs: z.endMs, endMs: end, isSystem: false }])
}

/** Spec 120. */
export function zoomSettings(z: ZoomRange): ZoomSettings {
  return { type: z.type, zoom: z.zoom, isDisabled: z.isDisabled, manualTargetPoint: { ...z.manualTargetPoint }, snapToEdgesRatio: z.snapToEdgesRatio }
}

/** Spec 121: same rules as clip splitting but with a 100 ms minimum per part. */
export function splitZoom(zooms: readonly ZoomRange[], timeMs: number): { zooms: ZoomRange[]; error?: string } {
  const list = sorted(zooms)
  const i = list.findIndex((z) => timeMs > z.startMs && timeMs < z.endMs)
  const z = list[i]
  if (!z) return { zooms: list, error: 'No zoom at the playhead' }
  if (timeMs - z.startMs < MIN_SPLIT_MS || z.endMs - timeMs < MIN_SPLIT_MS) return { zooms: list, error: 'The part you want to cut is too short' }
  const left = { ...z, endMs: Math.round(timeMs) }
  const right = { ...z, id: newZoomId(), startMs: Math.round(timeMs), isSystem: false }
  return { zooms: [...list.slice(0, i), left, right, ...list.slice(i + 1)] }
}

export function removeZoom(zooms: readonly ZoomRange[], id: string): ZoomRange[] {
  return zooms.filter((z) => z.id !== id)
}

export function zoomAt(zooms: readonly ZoomRange[], timeMs: number): ZoomRange | null {
  return zooms.find((z) => !z.isDisabled && timeMs >= z.startMs && timeMs < z.endMs) ?? null
}

export const isAutoType = (t: ZoomType): boolean => t !== 'manual'
