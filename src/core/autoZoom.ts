import type { ClickEvent, Ms, Point, ZoomRegion } from './project'

export interface AutoZoomOptions {
  /** Zoom scale applied to every automatic region. */
  scale: number
  /** How long before a click the zoom starts moving in. */
  leadMs: Ms
  /** How long after the last click the zoom holds before moving out. */
  tailMs: Ms
  /** Clicks closer together than this share one region. */
  mergeGapMs: Ms
}

export const defaultAutoZoomOptions: AutoZoomOptions = {
  scale: 2,
  leadMs: 600,
  tailMs: 1200,
  mergeGapMs: 1500
}

/**
 * Turn the clicks of a recording into zoom regions. Clicks that happen close
 * together are merged into one region centred on their average position, so
 * the camera does not jitter between neighbouring buttons.
 */
export function autoZooms(
  clicks: readonly ClickEvent[],
  durationMs: Ms,
  options: Partial<AutoZoomOptions> = {}
): ZoomRegion[] {
  const opts = { ...defaultAutoZoomOptions, ...options }
  const sorted = [...clicks].sort((a, b) => a.timeMs - b.timeMs)
  const regions: ZoomRegion[] = []
  let group: ClickEvent[] = []

  const flush = (): void => {
    const first = group[0]
    const last = group[group.length - 1]
    if (!first || !last) return
    regions.push({
      id: `zoom-${regions.length + 1}`,
      startMs: clamp(first.timeMs - opts.leadMs, 0, durationMs),
      endMs: clamp(last.timeMs + opts.tailMs, 0, durationMs),
      center: average(group.map((c) => c.position)),
      scale: opts.scale,
      automatic: true
    })
    group = []
  }

  for (const click of sorted) {
    const last = group[group.length - 1]
    if (last && click.timeMs - last.timeMs > opts.tailMs + opts.mergeGapMs) flush()
    group.push(click)
  }
  flush()

  return regions.filter((r) => r.endMs > r.startMs)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function average(points: readonly Point[]): Point {
  const n = points.length || 1
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / n,
    y: points.reduce((sum, p) => sum + p.y, 0) / n
  }
}
