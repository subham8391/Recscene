import { describe, expect, it } from 'vitest'
import { newProject, recordingFolderName } from './projectFile'

describe('recordingFolderName', () => {
  it('uses a readable local timestamp and the bundle extension', () => {
    expect(recordingFolderName(new Date(2026, 10, 17, 9, 5))).toBe('Recording 2026-11-17 at 09.05.recscene')
  })
})

describe('newProject', () => {
  it('starts with no zooms or clips and keeps the recording data', () => {
    const project = newProject({
      id: 'rec-1',
      name: 'Demo',
      createdAt: '2026-11-17T09:05:00.000Z',
      durationMs: 5000,
      screen: { width: 3600, height: 2338, file: 'screen.mov' },
      events: { clicks: [{ timeMs: 10, position: { x: 0.5, y: 0.5 }, button: 'left' }], keys: [], cursor: [] }
    })
    expect(project.version).toBe(1)
    expect(project.zooms).toEqual([])
    expect(project.recording.clicks).toHaveLength(1)
    expect(project.recording.microphone).toBeUndefined()
  })

  it('records the microphone file when there is one', () => {
    const project = newProject({
      id: 'rec-2',
      name: 'Demo',
      createdAt: '2026-11-17T09:05:00.000Z',
      durationMs: 1,
      screen: { width: 2, height: 2, file: 'screen.mov' },
      mic: { file: 'mic.m4a' },
      events: { clicks: [], keys: [], cursor: [] }
    })
    expect(project.recording.microphone).toEqual({ file: 'mic.m4a' })
  })
})
