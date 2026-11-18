/** Output aspect ratio (spec 48) and the stage box it produces. */
export interface AspectOption {
  /** Stored as `config.defaultOutputAspectRatio`: "x:y" or null for Auto. */
  value: string | null
  label: string
  tip: string
}

export const ASPECT_OPTIONS: readonly AspectOption[] = [
  { value: null, label: 'Auto', tip: 'Recording + padding' },
  { value: '16:9', label: 'Wide 16:9', tip: 'Horizontal video not cropped on any major social media platform' },
  { value: '1:1', label: 'Square 1:1', tip: 'Instagram feed, LinkedIn' },
  { value: '4:3', label: 'Classic 4:3', tip: 'Older displays and slides' },
  { value: '9:16', label: 'Vertical 9:16', tip: 'TikTok, Instagram Reels, YouTube Shorts' },
  { value: '4:5', label: 'Portrait 4:5', tip: 'Instagram portrait posts' }
]

export function parseRatio(value: string | null): number | null {
  if (!value) return null
  const [w, h] = value.split(':').map(Number)
  return w && h && Number.isFinite(w) && Number.isFinite(h) ? w / h : null
}

/**
 * The output ratio. Auto is the recording plus its padding: the frame grows
 * around the recording with the same gap on every side (Screen Studio's
 * behaviour), so the ratio depends on the padding share of the shorter side.
 */
export function outputRatio(value: string | null, recording: { width: number; height: number }, paddingPercent = 0): number {
  const fixed = parseRatio(value)
  if (fixed) return fixed
  const r = recording.height > 0 && recording.width > 0 ? recording.width / recording.height : 16 / 9
  const p = Math.max(0, Math.min(35, paddingPercent)) / 100
  if (p === 0) return r
  // Landscape: the shorter side is the height, so height = rec·s + 2·p·height and width = rec·s + 2·p·height.
  if (r >= 1) return r * (1 - 2 * p) + 2 * p
  return 1 / ((1 / r) * (1 - 2 * p) + 2 * p)
}

export function aspectLabel(value: string | null, recording: { width: number; height: number }): string {
  if (value) return ASPECT_OPTIONS.find((o) => o.value === value)?.label ?? value
  const r = outputRatio(null, recording)
  const named = ASPECT_OPTIONS.find((o) => o.value && Math.abs((parseRatio(o.value) ?? 0) - r) < 0.02)
  return `Auto (${named ? named.value : r.toFixed(2)})`
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Fits a box of `ratio` inside the stage, centred. */
export function fitBox(stageWidth: number, stageHeight: number, ratio: number): Box {
  if (stageWidth <= 0 || stageHeight <= 0) return { x: 0, y: 0, width: 0, height: 0 }
  let width = stageWidth
  let height = width / ratio
  if (height > stageHeight) {
    height = stageHeight
    width = height * ratio
  }
  return { x: (stageWidth - width) / 2, y: (stageHeight - height) / 2, width, height }
}

/** Where the recording sits inside the output box: contained with `padding` (0–0.4 of the shorter side). */
export function recordingBox(output: Box, recording: { width: number; height: number }, padding = 0): Box {
  const pad = Math.min(output.width, output.height) * Math.min(0.4, Math.max(0, padding))
  const inner = fitBox(output.width - pad * 2, output.height - pad * 2, recording.height > 0 ? recording.width / recording.height : 1)
  return { x: output.x + pad + inner.x, y: output.y + pad + inner.y, width: inner.width, height: inner.height }
}
