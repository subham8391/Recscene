import { describe, expect, it } from 'vitest'
import { CANNOT_CONNECT, DEEP_LINK_CALLBACK, deviceFromRow, deviceName, devicesLabel, deviceSub, friendlyError, initials, LOOPBACK_CALLBACK, parseCallback, seenLabel, SIGN_IN_CANCELLED, SIGN_IN_INCOMPLETE, sortDevices, userFromSession, type AccountDevice } from './auth'

const dev = (id: string, lastSeenAt: string, extra: Partial<AccountDevice> = {}): AccountDevice => ({ id, name: `Mac ${id}`, model: null, appVersion: null, activatedAt: lastSeenAt, lastSeenAt, ...extra })

describe('parseCallback', () => {
  it('reads the code from the deep link and the loopback url', () => {
    expect(parseCallback(`${DEEP_LINK_CALLBACK}?code=abc`)).toEqual({ kind: 'code', code: 'abc' })
    expect(parseCallback(`${DEEP_LINK_CALLBACK}/?code=abc`)).toEqual({ kind: 'code', code: 'abc' })
    expect(parseCallback(`${LOOPBACK_CALLBACK}?code=xyz&state=1`)).toEqual({ kind: 'code', code: 'xyz' })
  })
  it('ignores other urls', () => {
    expect(parseCallback('recscene://open?project=x')).toBeNull()
    expect(parseCallback('http://127.0.0.1:51797/favicon.ico')).toBeNull()
    expect(parseCallback('not a url')).toBeNull()
  })
  it('turns provider errors into a message, and a bare callback into the incomplete notice', () => {
    expect(parseCallback(`${DEEP_LINK_CALLBACK}?error=access_denied&error_description=User+denied+access`)).toEqual({ kind: 'error', message: SIGN_IN_CANCELLED })
    expect(parseCallback(`${DEEP_LINK_CALLBACK}?error=server_error&error_description=Unable+to+exchange+external+code`)).toEqual({ kind: 'error', message: 'Unable to exchange external code' })
    expect(parseCallback(DEEP_LINK_CALLBACK)).toEqual({ kind: 'error', message: SIGN_IN_INCOMPLETE })
  })
})

describe('userFromSession', () => {
  it('takes the name and picture Google puts in the metadata', () => {
    const u = userFromSession({ id: 'u1', email: 'sub@example.com', user_metadata: { full_name: 'Subham Das', avatar_url: 'https://img/x.png' }, app_metadata: { provider: 'google' } })
    expect(u).toEqual({ id: 'u1', email: 'sub@example.com', name: 'Subham Das', avatarUrl: 'https://img/x.png', provider: 'google' })
  })
  it('falls back to name, picture, the metadata email and the email provider', () => {
    const u = userFromSession({ id: 'u2', email: null, user_metadata: { name: 'S', picture: 'p', email: 'm@x.io' } })
    expect(u).toEqual({ id: 'u2', email: 'm@x.io', name: 'S', avatarUrl: 'p', provider: 'email' })
    expect(userFromSession({ id: 'u3', email: 'a@b.c', user_metadata: { full_name: '  ' } }).name).toBeNull()
  })
})

describe('deviceName and friendlyError', () => {
  it('prefers the computer name and strips .local from the host name', () => {
    expect(deviceName('Subham’s MacBook Pro', 'x.local')).toBe('Subham’s MacBook Pro')
    expect(deviceName('  ', 'studio.local')).toBe('studio')
    expect(deviceName(null, '')).toBe('This Mac')
  })
  it('maps network failures and refusals to plain words', () => {
    expect(friendlyError('TypeError: fetch failed')).toBe(CANNOT_CONNECT)
    expect(friendlyError('getaddrinfo ENOTFOUND x.supabase.co')).toBe(CANNOT_CONNECT)
    expect(friendlyError('access_denied')).toBe(SIGN_IN_CANCELLED)
    expect(friendlyError('Invalid login credentials')).toBe('Invalid login credentials')
  })
})

describe('devices', () => {
  const now = Date.parse('2026-11-18T12:00:00Z')
  it('sorts this Mac first, then the most recently seen', () => {
    const list = [dev('b', '2026-11-10T00:00:00Z'), dev('me', '2026-01-01T00:00:00Z'), dev('a', '2026-11-17T00:00:00Z')]
    expect(sortDevices(list, 'me').map((d) => d.id)).toEqual(['me', 'a', 'b'])
  })
  it('labels when a device was last seen', () => {
    expect(seenLabel('2026-11-18T11:58:00Z', now)).toBe('Active now')
    expect(seenLabel(new Date(now - 3 * 3_600_000).toISOString(), now)).toMatch(/Seen (today|yesterday)/)
    expect(seenLabel(new Date(now - 3 * 86_400_000).toISOString(), now)).toBe('Seen 3 days ago')
    expect(seenLabel('2026-10-02T09:00:00Z', now)).toBe('Seen on 2 Oct 2026')
    expect(seenLabel('garbage', now)).toBe('Seen')
  })
  it('describes a device with its model, activity and version', () => {
    expect(deviceSub(dev('me', '2026-01-01T00:00:00Z', { model: 'MacBook Pro', appVersion: '0.1.0' }), 'me', now)).toBe('MacBook Pro · Active now · Recscene 0.1.0')
    expect(deviceSub(dev('x', '2026-11-18T11:59:00Z'), 'me', now)).toBe('Active now')
  })
  it('maps a table row and counts seats', () => {
    expect(deviceFromRow({ id: 'd', name: 'Studio', model: 'Mac Studio', app_version: '0.1.0', activated_at: 'a', last_seen_at: 'b' })).toEqual({ id: 'd', name: 'Studio', model: 'Mac Studio', appVersion: '0.1.0', activatedAt: 'a', lastSeenAt: 'b' })
    expect(deviceFromRow({})).toEqual({ id: '', name: 'Mac', model: null, appVersion: null, activatedAt: '', lastSeenAt: '' })
    expect(devicesLabel(1)).toBe('1 device')
    expect(devicesLabel(3)).toBe('3 devices')
  })
  it('builds avatar initials', () => {
    expect(initials({ name: 'Subham Das', email: 's@x.io' })).toBe('SD')
    expect(initials({ name: 'Subham', email: 's@x.io' })).toBe('SU')
    expect(initials({ name: null, email: 'k@x.io' })).toBe('K')
    expect(initials({ name: null, email: '' })).toBe('?')
  })
})
