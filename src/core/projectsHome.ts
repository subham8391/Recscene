/**
 * The projects home (Projects board; specs 7, 40, 75, 255): what the library
 * shows for each `.recscene` bundle in the projects folder, how it is sorted,
 * searched and renamed, and the storage line.
 */

export interface ProjectSummary {
  projectDir: string
  name: string
  durationMs: number
  /** ISO time of the last edit (project.updatedAt, else lastSavedAt, else the recording's createdAt). */
  updatedAt: string
  /** Bytes used by the bundle on disk. */
  sizeBytes: number
  /** The recording's pixel height, for the quality label. */
  height: number
  /** The project's output aspect ratio, e.g. "auto" or "9:16"; a non-default one becomes the card chip. */
  aspect: string
  /** True when no cursor was recorded (spec 7 imports, recoveries without events): zooms cannot follow clicks. */
  noCursor: boolean
  /** Media URL of a cached thumbnail, when one exists. */
  thumbnail: string | null
  /** Media URL of the screen footage, so a thumbnail can be drawn when none is cached. */
  screen: string
}

export interface UnfinishedRecording {
  dir: string
  name: string
  /** ISO time the recording started (the footage's creation time). */
  startedAt: string
}

export type HomeSection = 'recent' | 'all'

/** Newest edit first; ties keep the name order so the list is stable. */
export function sortProjects(list: readonly ProjectSummary[]): ProjectSummary[] {
  return [...list].sort((a, b) => (a.updatedAt === b.updatedAt ? a.name.localeCompare(b.name) : a.updatedAt < b.updatedAt ? 1 : -1))
}

/** Every word of the query has to appear in the name, in any order, ignoring case. */
export function filterProjects(list: readonly ProjectSummary[], query: string): ProjectSummary[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...list]
  return list.filter((p) => {
    const name = p.name.toLowerCase()
    return words.every((w) => name.includes(w))
  })
}

/** The Recent section lists the recent-projects list (spec 75) in its order; All lists everything newest first. */
export function sectionProjects(section: HomeSection, all: readonly ProjectSummary[], recentDirs: readonly string[]): ProjectSummary[] {
  if (section === 'all') return sortProjects(all)
  const byDir = new Map(all.map((p) => [p.projectDir, p]))
  return recentDirs.map((d) => byDir.get(d)).filter((p): p is ProjectSummary => p !== undefined)
}

export function projectCountLabel(count: number): string {
  return count === 1 ? '1 project' : `${count} projects`
}

/** "1080p", "4K", "720p"… from the recording height. */
export function qualityLabel(height: number): string {
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  return height > 0 ? `${Math.round(height)}p` : ''
}

const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "Mon", "3 Nov", "3 Nov 2025". */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const diff = now.getTime() - then.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS)
  if (days <= 0) return `${Math.floor(diff / 3_600_000)} h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return WEEKDAYS[then.getDay()]!
  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`
  return then.getFullYear() === now.getFullYear() ? date : `${date} ${then.getFullYear()}`
}

/** The card's second line: "Edited 12 min ago · 1080p". */
export function projectMeta(p: ProjectSummary, now: Date): string {
  const parts = [`Edited ${relativeTime(p.updatedAt, now)}`]
  const quality = qualityLabel(p.height)
  if (quality) parts.push(quality)
  return parts.join(' · ')
}

/** The card chip: a non-default output aspect ratio or "No cursor"; nothing for a plain 16:9 recording. */
export function projectChip(p: ProjectSummary): string | null {
  if (p.aspect && p.aspect !== 'auto' && p.aspect !== '16:9') return p.aspect
  if (p.noCursor) return 'No cursor'
  return null
}

/** "512 MB", "1.2 GB", "38 GB": one decimal below 10, none above. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 MB'
  const gb = bytes / 1024 ** 3
  if (gb >= 10) return `${Math.round(gb)} GB`
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 ** 2
  if (mb >= 10) return `${Math.round(mb)} MB`
  return `${Math.max(mb, 0.1).toFixed(1)} MB`
}

/** "38 GB of projects · 212 GB free" and the used fraction for the bar. */
export function storageLine(usedBytes: number, freeBytes: number): { label: string; fraction: number } {
  const total = usedBytes + freeBytes
  return {
    label: `${formatBytes(usedBytes)} of projects · ${formatBytes(freeBytes)} free`,
    fraction: total > 0 ? Math.min(1, usedBytes / total) : 0
  }
}

export const NAME_MAX_LENGTH = 120

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string }

/**
 * A new project name doubles as the bundle's folder name: trimmed, without
 * the extension, no path separators, and unused by another project.
 */
export function checkProjectName(input: string, existingNames: readonly string[], currentName?: string): NameCheck {
  const name = input.trim().replace(/\.recscene$/i, '').trim()
  if (!name) return { ok: false, reason: 'Project name cannot be empty' }
  if (name.length > NAME_MAX_LENGTH) return { ok: false, reason: `Project name is too long (max ${NAME_MAX_LENGTH} characters)` }
  if (/[/:\\]/.test(name)) return { ok: false, reason: 'Project name cannot contain / : or \\' }
  if (name.startsWith('.')) return { ok: false, reason: 'Project name cannot start with a dot' }
  const taken = existingNames.some((n) => n.toLowerCase() === name.toLowerCase() && n !== currentName)
  if (taken) return { ok: false, reason: 'A project with this name already exists' }
  return { ok: true, name }
}

/** "Demo" → "Demo copy", then "Demo copy 2", … */
export function duplicateName(name: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()))
  const base = `${name} copy`
  let candidate = base
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) candidate = `${base} ${n}`
  return candidate
}

function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "1 unfinished recording from 09:58 today" / "2 unfinished recordings, the latest from 09:58 yesterday". */
export function unfinishedBannerTitle(list: readonly UnfinishedRecording[], now: Date): string {
  const latest = [...list].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0]
  if (!latest) return ''
  const started = new Date(latest.startedAt)
  const days = Math.round((startOfDay(now) - startOfDay(started)) / DAY_MS)
  const day = days <= 0 ? 'today' : days === 1 ? 'yesterday' : relativeTime(latest.startedAt, now)
  const when = `${clock(started)} ${day}`
  return list.length === 1 ? `1 unfinished recording from ${when}` : `${list.length} unfinished recordings, the latest from ${when}`
}

export const UNFINISHED_BANNER_DETAIL = 'Recscene closed while recording. Recover it as a project or delete it.'
export const DELETE_CONFIRM = (name: string): string => `Move “${name}” to the Trash?`
export const DELETE_DETAIL = 'The project and its recording go to the macOS Trash, where you can put them back.'
export const EMPTY_LIBRARY = 'No projects yet. Start a new recording or create a project from a video.'
export const EMPTY_RECENT = 'Nothing opened recently. All projects lists everything in the projects folder.'
export const noMatches = (query: string): string => `No projects match “${query.trim()}”`
export const FOLDER_OUTSIDE_WARNING = 'Projects folder path is outside of the main storage.'
