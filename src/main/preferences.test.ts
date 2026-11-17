import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Preferences } from './preferences'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('Preferences', () => {
  it('starts empty when the file is missing or broken, and persists sets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'recscene-prefs-'))
    dirs.push(dir)
    const file = join(dir, 'nested', 'preferences.json')
    const prefs = new Preferences(file)
    expect(prefs.all()).toEqual({})
    prefs.set({ recordingCountdownDuration: 3000 })
    prefs.set({ recordMicrophone: false })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ recordingCountdownDuration: 3000, recordMicrophone: false })
    expect(new Preferences(file).get('recordingCountdownDuration')).toBe(3000)
  })
})
