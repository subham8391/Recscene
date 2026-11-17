import type { Ms } from './project'

/** "m:ss" for the timeline ruler and clip labels, e.g. 65_000 → "1:05". */
export function formatDuration(ms: Ms): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** "m:ss.t" with tenths for the playhead readout, e.g. 65_240 → "1:05.2". */
export function formatTimecode(ms: Ms): string {
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100)
  return `${formatDuration(ms)}.${tenths}`
}
