/**
 * Pure logic behind the recording picker (specs 1–5, 13, 17, 21, 31, 39).
 * Rectangles are in display points with a top-left origin, matching the helper.
 */
import type { Permissions, WindowTarget } from './captureProtocol'

export type SourceKind = 'display' | 'window' | 'area' | 'device'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface DisplayInfo {
  id: number
  bounds: Rect
  scale: number
  isMain: boolean
}

/** Spec 21: no countdown, 3 s, 5 s or 10 s. */
export const COUNTDOWN_OPTIONS: readonly (number | null)[] = [null, 3000, 5000, 10000]

/** Spec 3: the smaller of the two minimums the bundle mentions. */
export const MIN_AREA_SIZE = 150

export type SystemAudioMode = 'all' | 'none'

export interface PickerPrefs {
  source: SourceKind
  recordingCountdownDuration: number | null
  recordingAreaCropPresets: Size[]
  recordMicrophone: boolean
  systemAudio: SystemAudioMode
  recordingAreaCover: boolean
  lastArea: Rect | null
}

export const defaultPickerPrefs: PickerPrefs = {
  source: 'display',
  recordingCountdownDuration: null,
  recordingAreaCropPresets: [],
  recordMicrophone: true,
  systemAudio: 'all',
  recordingAreaCover: true,
  lastArea: null
}

const isSize = (v: unknown): v is Size =>
  typeof v === 'object' && v !== null && Number.isFinite((v as Size).width) && Number.isFinite((v as Size).height)

const isRect = (v: unknown): v is Rect => isSize(v) && Number.isFinite((v as Rect).x) && Number.isFinite((v as Rect).y)

/** Reads whatever is on disk and fills in defaults for anything missing or malformed. */
export function pickerPrefsFrom(raw: unknown): PickerPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof PickerPrefs, unknown>>
  const source = r.source
  const countdown = r.recordingCountdownDuration
  return {
    source: source === 'display' || source === 'window' || source === 'area' ? source : defaultPickerPrefs.source,
    recordingCountdownDuration: COUNTDOWN_OPTIONS.includes(countdown as number | null) ? (countdown as number | null) : null,
    recordingAreaCropPresets: Array.isArray(r.recordingAreaCropPresets) ? r.recordingAreaCropPresets.filter(isSize).map(({ width, height }) => ({ width, height })) : [],
    recordMicrophone: typeof r.recordMicrophone === 'boolean' ? r.recordMicrophone : defaultPickerPrefs.recordMicrophone,
    systemAudio: r.systemAudio === 'none' ? 'none' : 'all',
    recordingAreaCover: typeof r.recordingAreaCover === 'boolean' ? r.recordingAreaCover : true,
    lastArea: isRect(r.lastArea) ? { x: r.lastArea.x, y: r.lastArea.y, width: r.lastArea.width, height: r.lastArea.height } : null
  }
}

export function countdownLabel(ms: number | null): string {
  return ms === null ? 'No countdown' : `${ms / 1000} s`
}

/** The display whose bounds contain the point; the main display when none does. */
export function displayUnderPoint(displays: readonly DisplayInfo[], point: { x: number; y: number }): DisplayInfo | undefined {
  const hit = displays.find(
    (d) => point.x >= d.bounds.x && point.x < d.bounds.x + d.bounds.width && point.y >= d.bounds.y && point.y < d.bounds.y + d.bounds.height
  )
  return hit ?? displays.find((d) => d.isMain) ?? displays[0]
}

/** Turns two drag corners into a rectangle; the drag may go in any direction. */
export function rectFromDrag(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  }
}

/**
 * Keeps an area recordable: at least the minimum size, inside the display
 * (an area cannot span displays), rounded to whole points.
 */
export function clampArea(rect: Rect, display: Rect, minSize = MIN_AREA_SIZE): Rect {
  const maxW = Math.max(minSize, display.width)
  const maxH = Math.max(minSize, display.height)
  const width = Math.round(Math.min(maxW, Math.max(minSize, rect.width)))
  const height = Math.round(Math.min(maxH, Math.max(minSize, rect.height)))
  const x = Math.round(Math.min(display.x + display.width - width, Math.max(display.x, rect.x)))
  const y = Math.round(Math.min(display.y + display.height - height, Math.max(display.y, rect.y)))
  return { x, y, width, height }
}

export const ASPECT_PRESETS: readonly { label: string; ratio: number | null }[] = [
  { label: 'Free', ratio: null },
  { label: '16:9', ratio: 16 / 9 },
  { label: '16:10', ratio: 16 / 10 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '1:1', ratio: 1 },
  { label: '9:16', ratio: 9 / 16 }
]

/** Resizes the area to the ratio, keeping its width and its top-left corner, then clamps. */
export function applyAspect(rect: Rect, ratio: number | null, display: Rect): Rect {
  if (ratio === null) return clampArea(rect, display)
  const height = Math.round(rect.width / ratio)
  return clampArea({ ...rect, height }, display)
}

/** Spec 4: saved width×height pairs, no duplicates, newest first. */
export function addSavedDimensions(list: readonly Size[], size: Size): Size[] {
  const clean = { width: Math.round(size.width), height: Math.round(size.height) }
  if (clean.width < MIN_AREA_SIZE || clean.height < MIN_AREA_SIZE) return [...list]
  return [clean, ...list.filter((s) => s.width !== clean.width || s.height !== clean.height)]
}

export function removeSavedDimensions(list: readonly Size[], size: Size): Size[] {
  return list.filter((s) => s.width !== size.width || s.height !== size.height)
}

/** Applies a saved size to the current area, keeping its top-left corner (position is not saved). */
export function applySavedDimensions(rect: Rect, size: Size, display: Rect): Rect {
  return clampArea({ ...rect, width: size.width, height: size.height }, display)
}

/** Spec 39: stop automatically when free space on the projects volume drops below this. */
export const LOW_DISK_SPACE_BYTES = 2 * 1024 ** 3

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/** "00:42" for the recording widget. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

/** What the picker window needs from the main process to render. */
export interface PickerState {
  displays: DisplayInfo[]
  /** The display the picker opened on (the one under the mouse). */
  displayId: number
  windows: WindowTarget[]
  permissions: Permissions
  prefs: PickerPrefs
  freeSpaceBytes: number
}

/** What the picker sends back when Record is pressed. */
export interface RecordRequest {
  source: 'display' | 'window' | 'area'
  displayId: number
  windowId?: number
  area?: Rect
  mic: boolean
  systemAudio: boolean
}
