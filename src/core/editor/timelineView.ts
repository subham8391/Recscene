/** The visible window of the timeline and its ruler (specs 58–59). */
export interface TimelineView {
  /** Start of the visible window, ms. */
  startMs: number
  /** Width of the visible window, ms. */
  visibleMs: number
}

export const MIN_VISIBLE_MS = 2000
export const MAX_VISIBLE_MS = 10 * 60 * 1000
/** A fresh project opens on its first minute, like Screen Studio, so the timeline scrolls from the start. */
export const INITIAL_VISIBLE_MS = 60 * 1000

export function maxVisible(durationMs: number): number {
  return Math.max(MIN_VISIBLE_MS, Math.min(MAX_VISIBLE_MS, durationMs))
}

export function initialView(durationMs: number): TimelineView {
  return { startMs: 0, visibleMs: Math.min(maxVisible(durationMs), INITIAL_VISIBLE_MS) }
}

function clampView(v: TimelineView, durationMs: number): TimelineView {
  const visibleMs = Math.min(maxVisible(durationMs), Math.max(MIN_VISIBLE_MS, v.visibleMs))
  const startMs = Math.min(Math.max(0, durationMs - visibleMs), Math.max(0, v.startMs))
  return { startMs, visibleMs }
}

/** ⌘= shows 75% of the current span, ⌘- shows 125%, around the anchor (the playhead by default). */
export function zoomView(v: TimelineView, factor: number, durationMs: number, anchorMs = v.startMs + v.visibleMs / 2): TimelineView {
  const visibleMs = v.visibleMs * factor
  const ratio = v.visibleMs > 0 ? (anchorMs - v.startMs) / v.visibleMs : 0.5
  return clampView({ startMs: anchorMs - ratio * visibleMs, visibleMs }, durationMs)
}

/** The slider's 0–100 value: 0 = whole project, 100 = 2 s. */
export function zoomToSlider(v: TimelineView, durationMs: number): number {
  const max = maxVisible(durationMs)
  if (max <= MIN_VISIBLE_MS) return 0
  const t = Math.log(max / v.visibleMs) / Math.log(max / MIN_VISIBLE_MS)
  return Math.round(Math.min(1, Math.max(0, t)) * 100)
}

export function sliderToZoom(value: number, v: TimelineView, durationMs: number, anchorMs?: number): TimelineView {
  const max = maxVisible(durationMs)
  const visibleMs = max / Math.pow(max / MIN_VISIBLE_MS, Math.min(1, Math.max(0, value / 100)))
  return zoomView(v, visibleMs / v.visibleMs, durationMs, anchorMs)
}

export function panView(v: TimelineView, deltaMs: number, durationMs: number): TimelineView {
  return clampView({ ...v, startMs: v.startMs + deltaMs }, durationMs)
}

/** Scrolls just enough to keep the playhead inside the window (spec 59). */
export function keepVisible(v: TimelineView, timeMs: number, durationMs: number): TimelineView {
  if (timeMs < v.startMs) return clampView({ ...v, startMs: timeMs }, durationMs)
  if (timeMs > v.startMs + v.visibleMs) return clampView({ ...v, startMs: timeMs - v.visibleMs * 0.8 }, durationMs)
  return v
}

export function timeAtX(v: TimelineView, x: number, width: number, durationMs: number): number {
  const t = v.startMs + (x / Math.max(1, width)) * v.visibleMs
  return Math.min(Math.max(0, t), durationMs)
}

export function xAtTime(v: TimelineView, timeMs: number, width: number): number {
  return ((timeMs - v.startMs) / v.visibleMs) * width
}

/** Tick spacing that gives roughly 6–12 labels across the window. */
export function rulerTicks(v: TimelineView): { timeMs: number; label: string }[] {
  const steps = [250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000]
  const stepMs = steps.find((s) => v.visibleMs / s <= 12) ?? 600_000
  const first = Math.ceil(v.startMs / stepMs) * stepMs
  const ticks: { timeMs: number; label: string }[] = []
  for (let t = first; t <= v.startMs + v.visibleMs; t += stepMs) ticks.push({ timeMs: t, label: rulerLabel(t, stepMs) })
  return ticks
}

function rulerLabel(ms: number, stepMs: number): string {
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  const secs = stepMs < 1000 ? s.toFixed(2).replace(/\.?0+$/, '') : String(Math.round(s))
  return `${m}:${secs.padStart(2, '0')}`
}

export function visibleLabel(v: TimelineView): string {
  return v.visibleMs >= 60_000 ? `${(v.visibleMs / 60_000).toFixed(1).replace(/\.0$/, '')} minutes visible` : `${Math.round(v.visibleMs / 1000)} seconds visible`
}
