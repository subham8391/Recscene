import type { Ms } from './project'

/** "m:ss" for the timeline ruler and clip labels, e.g. 65_000 → "1:05". */
export function formatDuration(ms: Ms): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** "mm:ss.cc" with hundredths for the transport readout (Main board), e.g. 65_240 → "01:05.24". */
export function formatTransport(ms: Ms): string {
  const t = Math.max(0, ms)
  const minutes = Math.floor(t / 60_000)
  const seconds = Math.floor((t % 60_000) / 1000)
  const hundredths = Math.floor((t % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}

/** "m:ss.t" with tenths for the playhead readout, e.g. 65_240 → "1:05.2". */
export function formatTimecode(ms: Ms): string {
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100)
  return `${formatDuration(ms)}.${tenths}`
}

/** "just now", "12 s ago", "5 min ago", "2 h ago" or "3 days ago" for save and generation stamps. */
export function agoLabel(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (Number.isNaN(s)) return ''
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}
