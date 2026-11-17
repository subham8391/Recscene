import { describe, expect, it } from 'vitest'
import { importedBundleName, isImportable, isUnfinishedBundle } from './recovery'

describe('isUnfinishedBundle', () => {
  it('needs footage and no project file', () => {
    expect(isUnfinishedBundle({ name: 'A.recscene', files: ['screen.mov'] })).toBe(true)
    expect(isUnfinishedBundle({ name: 'A.recscene', files: ['screen.mov', 'project.json'] })).toBe(false)
    expect(isUnfinishedBundle({ name: 'A.recscene', files: [] })).toBe(false)
    expect(isUnfinishedBundle({ name: 'notes', files: ['screen.mov'] })).toBe(false)
  })
})

describe('imports', () => {
  it('accepts mp4, mov, m4v and gif in any case', () => {
    expect(isImportable('Demo.MP4')).toBe(true)
    expect(isImportable('clip.gif')).toBe(true)
    expect(isImportable('clip.webm')).toBe(false)
  })

  it('names the bundle after the file and avoids clashes', () => {
    expect(importedBundleName('demo.mp4', [])).toBe('demo.recscene')
    expect(importedBundleName('demo.mp4', ['demo.recscene', 'demo 2.recscene'])).toBe('demo 3.recscene')
    expect(importedBundleName('.gif', [])).toBe('Imported video.recscene')
  })
})
