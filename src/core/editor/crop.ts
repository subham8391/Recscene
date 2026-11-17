/** The crop tool (specs 100–101). Pixel rectangles inside the recording; stored as fractions. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_CROP_PX = 200

export const CROP_ASPECTS: { label: string; ratio: number | null }[] = [
  { label: 'Any', ratio: null },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '1:1', ratio: 1 },
  { label: '3:4', ratio: 3 / 4 },
  { label: '9:16', ratio: 9 / 16 }
]

export function fullCrop(recording: { width: number; height: number }): CropRect {
  return { x: 0, y: 0, width: recording.width, height: recording.height }
}

/** Keeps the rectangle inside the recording, at least 200×200 (or the recording when smaller). */
export function clampCrop(c: CropRect, recording: { width: number; height: number }): CropRect {
  const minW = Math.min(MIN_CROP_PX, recording.width)
  const minH = Math.min(MIN_CROP_PX, recording.height)
  const width = Math.round(Math.min(recording.width, Math.max(minW, c.width)))
  const height = Math.round(Math.min(recording.height, Math.max(minH, c.height)))
  const x = Math.round(Math.min(recording.width - width, Math.max(0, c.x)))
  const y = Math.round(Math.min(recording.height - height, Math.max(0, c.y)))
  return { x, y, width, height }
}

export const isCropTooSmall = (c: CropRect): boolean => c.width < MIN_CROP_PX || c.height < MIN_CROP_PX

/** Applies a ratio keeping the width (or the height when the width would overflow). */
export function applyCropAspect(c: CropRect, ratio: number | null, recording: { width: number; height: number }): CropRect {
  if (ratio === null) return clampCrop(c, recording)
  let width = c.width
  let height = Math.round(width / ratio)
  if (height > recording.height) {
    height = recording.height
    width = Math.round(height * ratio)
  }
  return clampCrop({ ...c, width, height }, recording)
}

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

/** Moves one corner; with a ratio the opposite corner stays fixed and the box keeps its shape. */
export function resizeCropHandle(c: CropRect, handle: CropHandle, dx: number, dy: number, ratio: number | null, recording: { width: number; height: number }): CropRect {
  const right = c.x + c.width
  const bottom = c.y + c.height
  let x1 = handle.includes('w') ? c.x + dx : c.x
  let x2 = handle.includes('e') ? right + dx : right
  let y1 = handle.includes('n') ? c.y + dy : c.y
  let y2 = handle.includes('s') ? bottom + dy : bottom
  if (ratio !== null) {
    const w = x2 - x1
    const h = Math.round(w / ratio)
    if (handle.includes('n')) y1 = y2 - h
    else y2 = y1 + h
  }
  if (x2 - x1 < MIN_CROP_PX) {
    if (handle.includes('w')) x1 = x2 - MIN_CROP_PX
    else x2 = x1 + MIN_CROP_PX
  }
  if (y2 - y1 < MIN_CROP_PX) {
    if (handle.includes('n')) y1 = y2 - MIN_CROP_PX
    else y2 = y1 + MIN_CROP_PX
  }
  return clampCrop({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 }, recording)
}

/** Spec 101: arrows 1 px, shift 10 px, command 100 px. */
export function nudgeStep(e: { shiftKey: boolean; metaKey: boolean }): number {
  return e.metaKey ? 100 : e.shiftKey ? 10 : 1
}

export function moveCrop(c: CropRect, dx: number, dy: number, recording: { width: number; height: number }): CropRect {
  return clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, recording)
}

/** Stored as fractions of the recording (spec 100); null means no crop. */
export function cropToFractions(c: CropRect, recording: { width: number; height: number }): CropRect | null {
  if (c.x === 0 && c.y === 0 && c.width === recording.width && c.height === recording.height) return null
  return { x: c.x / recording.width, y: c.y / recording.height, width: c.width / recording.width, height: c.height / recording.height }
}

export function cropFromFractions(f: CropRect | null, recording: { width: number; height: number }): CropRect {
  if (!f) return fullCrop(recording)
  return clampCrop({ x: f.x * recording.width, y: f.y * recording.height, width: f.width * recording.width, height: f.height * recording.height }, recording)
}
