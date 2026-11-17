import { describe, expect, it } from 'vitest'
import {
  checkProjectName,
  duplicateName,
  filterProjects,
  formatBytes,
  noMatches,
  projectChip,
  projectCountLabel,
  projectMeta,
  qualityLabel,
  relativeTime,
  sectionProjects,
  sortProjects,
  storageLine,
  unfinishedBannerTitle,
  type ProjectSummary
} from './projectsHome'

const summary = (over: Partial<ProjectSummary>): ProjectSummary => ({
  projectDir: `/p/${over.name ?? 'A'}.recscene`,
  name: 'A',
  durationMs: 60_000,
  updatedAt: '2026-11-17T10:00:00.000Z',
  sizeBytes: 100,
  height: 1080,
  aspect: 'auto',
  noCursor: false,
  thumbnail: null,
  screen: 'recscene-media://project/x/screen.mov',
  ...over
})

const now = new Date(2026, 10, 17, 12, 0, 0) // 17 Nov 2026 12:00 local

describe('listing', () => {
  it('sorts by last edit, newest first, names breaking ties', () => {
    const list = [summary({ name: 'B', updatedAt: '2026-11-01T00:00:00Z' }), summary({ name: 'C', updatedAt: '2026-11-10T00:00:00Z' }), summary({ name: 'A', updatedAt: '2026-11-10T00:00:00Z' })]
    expect(sortProjects(list).map((p) => p.name)).toEqual(['A', 'C', 'B'])
  })

  it('matches every word of the query in any order, ignoring case', () => {
    const list = [summary({ name: 'Onboarding walkthrough v3' }), summary({ name: 'Billing settings demo' })]
    expect(filterProjects(list, 'v3 onboarding').map((p) => p.name)).toEqual(['Onboarding walkthrough v3'])
    expect(filterProjects(list, '  ')).toHaveLength(2)
    expect(filterProjects(list, 'demo billing x')).toHaveLength(0)
    expect(noMatches(' tour ')).toBe('No projects match “tour”')
  })

  it('shows the recent section in recent order and drops missing bundles', () => {
    const all = [summary({ name: 'A' }), summary({ name: 'B' })]
    expect(sectionProjects('recent', all, ['/p/B.recscene', '/p/gone.recscene', '/p/A.recscene']).map((p) => p.name)).toEqual(['B', 'A'])
    expect(sectionProjects('all', all, []).map((p) => p.name)).toEqual(['A', 'B'])
    expect(projectCountLabel(1)).toBe('1 project')
    expect(projectCountLabel(42)).toBe('42 projects')
  })
})

describe('card text', () => {
  it('describes the edit time relative to now', () => {
    expect(relativeTime(new Date(2026, 10, 17, 11, 59, 30).toISOString(), now)).toBe('just now')
    expect(relativeTime(new Date(2026, 10, 17, 11, 48).toISOString(), now)).toBe('12 min ago')
    expect(relativeTime(new Date(2026, 10, 17, 9, 0).toISOString(), now)).toBe('3 h ago')
    expect(relativeTime(new Date(2026, 10, 16, 23, 0).toISOString(), now)).toBe('yesterday')
    expect(relativeTime(new Date(2026, 10, 14, 9, 0).toISOString(), now)).toBe('Sat')
    expect(relativeTime(new Date(2026, 10, 3, 9, 0).toISOString(), now)).toBe('3 Nov')
    expect(relativeTime(new Date(2025, 10, 3, 9, 0).toISOString(), now)).toBe('3 Nov 2025')
    expect(relativeTime('garbage', now)).toBe('')
  })

  it('builds the meta line and the chip', () => {
    const p = summary({ updatedAt: new Date(2026, 10, 17, 11, 48).toISOString(), height: 2160 })
    expect(projectMeta(p, now)).toBe('Edited 12 min ago · 4K')
    expect(projectMeta(summary({ updatedAt: p.updatedAt, height: 0 }), now)).toBe('Edited 12 min ago')
    expect(qualityLabel(1080)).toBe('1080p')
    expect(qualityLabel(900)).toBe('720p')
    expect(qualityLabel(480)).toBe('480p')
    expect(projectChip(summary({ aspect: '9:16' }))).toBe('9:16')
    expect(projectChip(summary({ aspect: '16:9' }))).toBeNull()
    expect(projectChip(summary({ noCursor: true }))).toBe('No cursor')
  })
})

describe('storage', () => {
  it('formats sizes like Finder', () => {
    expect(formatBytes(38 * 1024 ** 3)).toBe('38 GB')
    expect(formatBytes(1.25 * 1024 ** 3)).toBe('1.3 GB')
    expect(formatBytes(512 * 1024 ** 2)).toBe('512 MB')
    expect(formatBytes(2.5 * 1024 ** 2)).toBe('2.5 MB')
    expect(formatBytes(0)).toBe('0.1 MB')
    expect(formatBytes(-1)).toBe('0 MB')
  })

  it('writes the storage line and the bar fraction', () => {
    const s = storageLine(38 * 1024 ** 3, 212 * 1024 ** 3)
    expect(s.label).toBe('38 GB of projects · 212 GB free')
    expect(s.fraction).toBeCloseTo(0.152, 3)
    expect(storageLine(0, 0).fraction).toBe(0)
  })
})

describe('names', () => {
  it('validates a rename against the folder', () => {
    expect(checkProjectName('  Demo.recscene ', ['Other'])).toEqual({ ok: true, name: 'Demo' })
    expect(checkProjectName('', [])).toMatchObject({ ok: false })
    expect(checkProjectName('a/b', [])).toMatchObject({ ok: false, reason: expect.stringContaining('/') })
    expect(checkProjectName('.hidden', [])).toMatchObject({ ok: false })
    expect(checkProjectName('x'.repeat(121), [])).toMatchObject({ ok: false })
    expect(checkProjectName('demo', ['Demo'])).toMatchObject({ ok: false, reason: 'A project with this name already exists' })
    expect(checkProjectName('Demo', ['Demo'], 'Demo')).toEqual({ ok: true, name: 'Demo' })
  })

  it('names duplicates "copy", "copy 2", …', () => {
    expect(duplicateName('Demo', ['Demo'])).toBe('Demo copy')
    expect(duplicateName('Demo', ['Demo', 'demo copy'])).toBe('Demo copy 2')
    expect(duplicateName('Demo', ['Demo', 'Demo copy', 'Demo copy 2'])).toBe('Demo copy 3')
  })
})

describe('unfinished banner', () => {
  it('names the count and the latest start', () => {
    const a = { dir: '/a', name: 'a', startedAt: new Date(2026, 10, 17, 9, 58).toISOString() }
    const b = { dir: '/b', name: 'b', startedAt: new Date(2026, 10, 16, 8, 5).toISOString() }
    expect(unfinishedBannerTitle([a], now)).toBe('1 unfinished recording from 09:58 today')
    expect(unfinishedBannerTitle([b, a], now)).toBe('2 unfinished recordings, the latest from 09:58 today')
    expect(unfinishedBannerTitle([b], now)).toBe('1 unfinished recording from 08:05 yesterday')
    expect(unfinishedBannerTitle([], now)).toBe('')
  })
})
