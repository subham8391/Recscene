/**
 * Pure logic behind the recording picker (specs 1–5, 13, 17, 21, 31, 39).
 * Rectangles are in display points with a top-left origin, matching the helper.
 */
import type { CameraInfo, Permissions, WindowTarget } from './captureProtocol'

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
  /** Spec 27: whether the speaker notes window is shown while recording. */
  showSpeakerNotes: boolean
  /** Spec 29: also exposed in Settings › Recording. */
  hideDesktopContentWhileRecording: boolean
  /** Spec 15: on by default; the picker shows "Disable auto gain control". */
  enableAutoGainControl: boolean
  /** Spec 16: enhancement applied while the microphone is captured. */
  enableVoiceRecordingEnhancements: boolean
  /** Spec 8: record the webcam as a second track. */
  recordCamera: boolean
  /** Spec 8: the chosen camera's id, or null for the first one. */
  cameraDeviceId: string | null
  /** Spec 8: the live preview bubble while recording is on screen only, never in the output. */
  hideCameraPreview: boolean
  /** Spec 11: the preview bubble is cropped square or shows the full sensor frame. */
  webcamPreviewType: WebcamPreviewType
  /** Spec 10. */
  maximumWebcamHeight: WebcamHeight
  /** Spec 41: the quick export widget (42–47) after a recording instead of the editor. */
  showQuickExportWidget: boolean
}

export type WebcamPreviewType = 'square' | 'full-frame'
export type WebcamHeight = 720 | 1080
export const WEBCAM_HEIGHTS: readonly WebcamHeight[] = [720, 1080]

export const defaultPickerPrefs: PickerPrefs = {
  source: 'display',
  recordingCountdownDuration: null,
  recordingAreaCropPresets: [],
  recordMicrophone: true,
  systemAudio: 'all',
  recordingAreaCover: true,
  lastArea: null,
  showSpeakerNotes: false,
  hideDesktopContentWhileRecording: false,
  enableAutoGainControl: true,
  enableVoiceRecordingEnhancements: false,
  recordCamera: false,
  cameraDeviceId: null,
  hideCameraPreview: false,
  webcamPreviewType: 'square',
  maximumWebcamHeight: 1080,
  showQuickExportWidget: true
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
    lastArea: isRect(r.lastArea) ? { x: r.lastArea.x, y: r.lastArea.y, width: r.lastArea.width, height: r.lastArea.height } : null,
    showSpeakerNotes: r.showSpeakerNotes === true,
    hideDesktopContentWhileRecording: r.hideDesktopContentWhileRecording === true,
    enableAutoGainControl: r.enableAutoGainControl !== false,
    enableVoiceRecordingEnhancements: r.enableVoiceRecordingEnhancements === true,
    recordCamera: r.recordCamera === true,
    cameraDeviceId: typeof r.cameraDeviceId === 'string' && r.cameraDeviceId ? r.cameraDeviceId : null,
    hideCameraPreview: r.hideCameraPreview === true,
    webcamPreviewType: r.webcamPreviewType === 'full-frame' ? 'full-frame' : 'square',
    maximumWebcamHeight: r.maximumWebcamHeight === 720 ? 720 : 1080,
    showQuickExportWidget: r.showQuickExportWidget !== false
  }
}

export const CAMERA_MISSING = 'Camera you have previously selected seems to not be connected anymore'
export const NO_CAMERA = 'No camera is connected'
export const NO_CAMERA_PERMISSION = 'Recscene does not have permission to use your webcam'

/**
 * Spec 8: which camera a recording would use. The remembered device when it
 * is still connected, otherwise the first one with a note that the remembered
 * one is gone; null when none is connected or the camera is off.
 */
export function selectedCamera(prefs: PickerPrefs, cameras: readonly CameraInfo[]): { camera: CameraInfo | null; missing: boolean } {
  if (!prefs.recordCamera) return { camera: null, missing: false }
  const remembered = prefs.cameraDeviceId ? cameras.find((c) => c.id === prefs.cameraDeviceId) : undefined
  if (remembered) return { camera: remembered, missing: false }
  return { camera: cameras[0] ?? null, missing: prefs.cameraDeviceId !== null && cameras.length > 0 }
}

/** The camera row's second line: "FaceTime HD Camera · 1080p" or "Don't record camera". */
export function cameraLabel(prefs: PickerPrefs, cameras: readonly CameraInfo[]): string {
  const { camera } = selectedCamera(prefs, cameras)
  if (!prefs.recordCamera) return "Don't record camera"
  if (!camera) return NO_CAMERA
  return `${camera.name} · ${Math.min(camera.maxHeight, prefs.maximumWebcamHeight)}p`
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
  /** Spec 8: webcams the helper can record. */
  cameras: CameraInfo[]
}

/** What the picker sends back when Record is pressed. */
export interface RecordRequest {
  source: 'display' | 'window' | 'area'
  displayId: number
  windowId?: number
  area?: Rect
  mic: boolean
  systemAudio: boolean
  micAutoGain: boolean
  micEnhance: boolean
  /** Spec 8: the camera id to record, or null for none. */
  camera: string | null
  /** Spec 10. */
  cameraMaxHeight: WebcamHeight
}
