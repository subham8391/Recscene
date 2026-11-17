import { describe, expect, it } from 'vitest'
import { markRecent, projectNameFromDir, pruneRecent, RECENT_LIMIT } from './recentProjects'

describe('recent projects', () => {
  it('moves the opened project to the front and caps the list', () => {
    let list = ['/a.recscene', '/b.recscene']
    list = markRecent(list, '/b.recscene')
    expect(list).toEqual(['/b.recscene', '/a.recscene'])
    for (let i = 0; i < 20; i += 1) list = markRecent(list, `/p${i}.recscene`)
    expect(list).toHaveLength(RECENT_LIMIT)
    expect(list[0]).toBe('/p19.recscene')
  })

  it('prunes missing entries and names projects', () => {
    expect(pruneRecent(['/x', '/y'], (p) => p === '/y')).toEqual(['/y'])
    expect(projectNameFromDir('/Users/me/Recscene Projects/Demo 2.recscene')).toBe('Demo 2')
  })
})
