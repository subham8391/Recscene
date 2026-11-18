/** Export settings (specs 233–237, 245) and the numbers the dialog shows (247). */
export type ExportFormat = 'mp4' | 'gif'
export type ExportQuality = 'web' | 'medium' | 'high'
/** `quick` saves straight into ~/Movies/Recscene without a dialog (specs 42–43). */
export type ExportTarget = 'file' | 'clipboard' | 'link' | 'quick'

export const RESOLUTIONS = [480, 720, 1080, 1440, 2160] as const
export type ExportHeight = (typeof RESOLUTIONS)[number]
export const FRAME_RATES = [24, 30, 60] as const
export type ExportFps = (typeof FRAME_RATES)[number]

export interface ExportSettings {
  format: ExportFormat
  height: ExportHeight
  fps: ExportFps
  quality: ExportQuality
  /** Spec 234: a GIF that plays once. */
  gifDisableLoop: boolean
}

export const defaultExportSettings: ExportSettings = { format: 'mp4', height: 1080, fps: 30, quality: 'high', gifDisableLoop: false }

export const QUALITY_OPTIONS: { id: ExportQuality; label: string; description: string }[] = [
  { id: 'web', label: 'Web (Low)', description: 'Good for sharing on the web, where quality is less important, increasing loading speed. Compression is clearly visible.' },
  { id: 'medium', label: 'Medium', description: 'Good for directly playing on websites. Compression is slightly visible, but not distracting.' },
  { id: 'high', label: 'High', description: 'Highest quality with the largest file. Compression is hardly visible.' }
]

export function exportSettingsFrom(raw: unknown): ExportSettings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof ExportSettings, unknown>>
  return {
    format: r.format === 'gif' ? 'gif' : 'mp4',
    height: (RESOLUTIONS as readonly number[]).includes(r.height as number) ? (r.height as ExportHeight) : defaultExportSettings.height,
    fps: (FRAME_RATES as readonly number[]).includes(r.fps as number) ? (r.fps as ExportFps) : defaultExportSettings.fps,
    quality: r.quality === 'web' || r.quality === 'medium' || r.quality === 'high' ? r.quality : defaultExportSettings.quality,
    gifDisableLoop: r.gifDisableLoop === true
  }
}

/** Output pixel size for a height and ratio; both dimensions even for H.264. */
export function outputSize(height: number, ratio: number): { width: number; height: number } {
  const h = Math.round(height / 2) * 2
  const w = Math.round((h * ratio) / 2) * 2
  return { width: Math.max(2, w), height: Math.max(2, h) }
}

/** Video bitrate in bits per second: tuned per quality at 1080p30 and scaled by pixels and frame rate. */
export function videoBitrate(quality: ExportQuality, width: number, height: number, fps: number): number {
  const base = { web: 4_000_000, medium: 9_000_000, high: 18_000_000 }[quality]
  const pixelScale = (width * height) / (1920 * 1080)
  const fpsScale = fps >= 60 ? 1.5 : fps <= 24 ? 0.9 : 1
  return Math.round(base * Math.max(0.15, pixelScale) * fpsScale)
}

/** Spec 235: %w, %h and %r in a file name. */
export function substitutePlaceholders(name: string, size: { width: number; height: number }, fps: number): string {
  return name.replace(/%w/g, String(size.width)).replace(/%h/g, String(size.height)).replace(/%r/g, String(fps))
}

export interface ExportEstimate {
  frames: number
  /** Bytes; GIFs are estimated from pixels because they are not rate controlled. */
  bytes: number
  /** Seconds, from a render rate in frames per second. */
  seconds: number
}

export function estimateExport(settings: ExportSettings, durationMs: number, ratio: number, renderFps = 20): ExportEstimate {
  const size = outputSize(settings.height, ratio)
  const frames = Math.max(1, Math.ceil((durationMs / 1000) * settings.fps))
  const bytes = settings.format === 'gif' ? frames * size.width * size.height * 0.12 : (videoBitrate(settings.quality, size.width, size.height, settings.fps) / 8) * (durationMs / 1000)
  return { frames, bytes: Math.round(bytes), seconds: Math.ceil(frames / renderFps) }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatSeconds(s: number): string {
  if (s < 60) return `${Math.max(1, Math.round(s))} s`
  const m = Math.floor(s / 60)
  const r = Math.round(s - m * 60)
  return `${m} min ${r} s`
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'audio' | 'finishing' | 'done' | 'cancelled' | 'failed'
  frame: number
  frames: number
  startedAt: number
  message?: string
}

/** Seconds left from the measured pace so far. */
export function remainingSeconds(p: ExportProgress, now: number): number | null {
  if (p.frame <= 0) return null
  const elapsed = (now - p.startedAt) / 1000
  const perFrame = elapsed / p.frame
  return Math.max(0, Math.round(perFrame * (p.frames - p.frame)))
}

/** Render-time pace in frames per second, for the next estimate. */
export function measuredRenderFps(frames: number, elapsedMs: number): number {
  return elapsedMs > 0 ? Math.max(1, (frames / elapsedMs) * 1000) : 20
}
