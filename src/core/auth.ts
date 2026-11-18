/**
 * Accounts and devices (specs 275–278, 282; Account board): the pure part of
 * signing in with Google through Supabase and registering this Mac as a seat.
 * The main process does the network work; everything here is testable.
 */

export interface AccountUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  /** The identity provider the session came from, `google` for the only one built. */
  provider: string
}

export interface AccountDevice {
  id: string
  name: string
  model: string | null
  appVersion: string | null
  activatedAt: string
  lastSeenAt: string
}

export type SignInPhase = 'idle' | 'waiting' | 'exchanging'

export interface AccountState {
  /** False when the build has no Supabase URL and key. */
  configured: boolean
  phase: SignInPhase
  user: AccountUser | null
  /** This Mac's seat id (stable per installation). */
  deviceId: string
  devices: AccountDevice[]
  error: string | null
}

export const PROTOCOL = 'recscene'
export const CALLBACK_PATH = '/auth/callback'
/** Packaged builds come back through the deep link (spec 275: "returns to the app"). */
export const DEEP_LINK_CALLBACK = `${PROTOCOL}://auth/callback`
/** Development builds listen on the loopback instead; macOS only routes custom schemes to signed bundles. */
export const LOOPBACK_PORT = 51797
export const LOOPBACK_CALLBACK = `http://127.0.0.1:${LOOPBACK_PORT}${CALLBACK_PATH}`

export const NOT_CONFIGURED = 'Sign-in is not set up in this build: no account server is configured.'
export const SIGN_IN_WAITING = 'Finish signing in with Google in your browser, then come back to Recscene.'
export const SIGN_IN_CANCELLED = 'Sign-in cancelled.'
export const SIGN_IN_DONE = 'Recscene is active on this Mac.'
export const SIGN_IN_INCOMPLETE = 'That sign-in did not complete. Try again.'
export const CANNOT_CONNECT = 'Cannot connect to Recscene servers. Please check your internet connection and try again.'
export const DEVICE_DEACTIVATED = 'Device deactivated'
export const DEACTIVATE_FAILED = 'An error occurred while deactivating the device. Please try again.'
export const DEACTIVATE_CONFIRM = { title: 'Deactivate your device', detail: 'Recscene will no longer be activated on this device.' }
export const SEAT_NOTE = 'Deactivating frees a seat without signing out of the dashboard. You can re-activate any time.'
export const SIGN_OUT_NOTE = 'If you have more than one account, sign out to use a different one.'
export const LICENCE_NOTE = 'What a licence covers is not decided yet: recording, editing and export run without one.'
export const BROWSER_DONE_PAGE = '<!doctype html><meta charset="utf-8"><title>Recscene</title><body style="font: 15px -apple-system, system-ui; color: #222; padding: 48px; text-align: center"><p><b>Signed in.</b> You can close this tab and return to Recscene.</p></body>'
export const BROWSER_FAILED_PAGE = '<!doctype html><meta charset="utf-8"><title>Recscene</title><body style="font: 15px -apple-system, system-ui; color: #222; padding: 48px; text-align: center"><p><b>Sign-in did not complete.</b> Close this tab and try again from Recscene.</p></body>'

export type CallbackResult = { kind: 'code'; code: string } | { kind: 'error'; message: string }

/** Reads the sign-in callback (deep link or loopback hit); null when the url is something else. */
export function parseCallback(url: string): CallbackResult | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const deepLink = u.protocol === `${PROTOCOL}:` && `${u.host}${u.pathname}`.replace(/\/$/, '') === 'auth/callback'
  const loopback = (u.protocol === 'http:' || u.protocol === 'https:') && u.pathname.replace(/\/$/, '') === CALLBACK_PATH
  if (!deepLink && !loopback) return null
  const description = u.searchParams.get('error_description') ?? u.searchParams.get('error')
  if (description) return { kind: 'error', message: friendlyError(description.replace(/\+/g, ' ')) }
  const code = u.searchParams.get('code')
  if (code) return { kind: 'code', code }
  return { kind: 'error', message: SIGN_IN_INCOMPLETE }
}

/** Supabase's `User` shape, reduced to what the Account tab shows. */
export function userFromSession(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null }): AccountUser {
  const meta = u.user_metadata ?? {}
  const str = (k: string): string | null => (typeof meta[k] === 'string' && (meta[k] as string).trim() ? (meta[k] as string).trim() : null)
  const provider = typeof u.app_metadata?.['provider'] === 'string' ? (u.app_metadata['provider'] as string) : 'email'
  return { id: u.id, email: u.email ?? str('email') ?? '', name: str('full_name') ?? str('name'), avatarUrl: str('avatar_url') ?? str('picture'), provider }
}

/** The seat's name: the Mac's computer name, else its host name without `.local`. */
export function deviceName(computerName: string | null | undefined, host: string): string {
  const c = computerName?.trim()
  if (c) return c
  return host.replace(/\.local$/i, '') || 'This Mac'
}

/** Messages from the auth server that deserve plain words. */
export function friendlyError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('fetch failed') || m.includes('failed to fetch') || m.includes('enotfound') || m.includes('econnrefused') || m.includes('network')) return CANNOT_CONNECT
  if (m.includes('access_denied') || m.includes('user denied') || m.includes('cancel')) return SIGN_IN_CANCELLED
  return message
}

/** This Mac first, then by the time last seen. */
export function sortDevices(devices: AccountDevice[], thisId: string): AccountDevice[] {
  return [...devices].sort((a, b) => {
    if (a.id === thisId) return -1
    if (b.id === thisId) return 1
    return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt)
  })
}

/** "Active now", "Seen today", "Seen yesterday", "Seen 3 days ago", "Seen on 2 Nov 2026". */
export function seenLabel(iso: string, now: number): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'Seen'
  const ageMs = now - t
  if (ageMs < 5 * 60_000) return 'Active now'
  const day = 86_400_000
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - t) / day) + 1
  if (t >= startOfToday.getTime()) return 'Seen today'
  if (days === 1) return 'Seen yesterday'
  if (days < 14) return `Seen ${days} days ago`
  return `Seen on ${new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function deviceSub(device: AccountDevice, thisId: string, now: number): string {
  const parts: string[] = []
  if (device.model) parts.push(device.model)
  parts.push(device.id === thisId ? 'Active now' : seenLabel(device.lastSeenAt, now))
  if (device.appVersion) parts.push(`Recscene ${device.appVersion}`)
  return parts.join(' · ')
}

/** Avatar fallback: up to two initials from the name, else the email's first letter. */
export function initials(user: Pick<AccountUser, 'name' | 'email'>): string {
  const words = (user.name ?? '').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (user.email[0] ?? '?').toUpperCase()
}

/** "1 device" / "3 devices". */
export function devicesLabel(count: number): string {
  return `${count} ${count === 1 ? 'device' : 'devices'}`
}

/** Maps a `devices` row (snake_case) to the renderer shape. */
export function deviceFromRow(row: Record<string, unknown>): AccountDevice {
  const s = (k: string): string | null => (typeof row[k] === 'string' ? (row[k] as string) : null)
  return { id: s('id') ?? '', name: s('name') ?? 'Mac', model: s('model'), appVersion: s('app_version'), activatedAt: s('activated_at') ?? '', lastSeenAt: s('last_seen_at') ?? '' }
}
