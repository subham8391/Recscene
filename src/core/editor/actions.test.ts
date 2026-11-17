import { describe, expect, it } from 'vitest'
import { ACTIONS, actionForKey, filterActions, formatShortcut, groupActions, matchesShortcut } from './actions'

const key = (k: string, mods: Partial<{ metaKey: boolean; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; code: string }> = {}): Parameters<typeof matchesShortcut>[1] => ({
  key: k,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  ...mods
})

describe('shortcuts', () => {
  it('matches keys with the right modifiers only', () => {
    expect(matchesShortcut('Cmd+Shift+Z', key('z', { metaKey: true, shiftKey: true }))).toBe(true)
    expect(matchesShortcut('Cmd+Z', key('z', { metaKey: true, shiftKey: true }))).toBe(false)
    expect(matchesShortcut('Space', key(' '))).toBe(true)
    expect(matchesShortcut('Cmd+=', key('+', { metaKey: true, shiftKey: true }))).toBe(false)
    expect(matchesShortcut('Cmd+=', key('=', { metaKey: true }))).toBe(true)
    expect(matchesShortcut('Cmd+1', key('!', { metaKey: true, shiftKey: true, code: 'Digit1' }))).toBe(false)
    expect(matchesShortcut('Cmd+1', key('1', { metaKey: true, code: 'Digit1' }))).toBe(true)
    expect(matchesShortcut('1', key('1'))).toBe(true)
  })

  it('finds the action for a key and has no duplicate shortcuts', () => {
    expect(actionForKey(key('j'))?.id).toBe('playBackwardOrIncreaseSpeed')
    expect(actionForKey(key('ArrowLeft', { metaKey: true }))?.id).toBe('goToFirstFrame')
    expect(actionForKey(key('q'))).toBeUndefined()
    const shortcuts = ACTIONS.map((a) => a.shortcut).filter(Boolean)
    expect(new Set(shortcuts).size).toBe(shortcuts.length)
  })

  it('formats shortcuts the macOS way', () => {
    expect(formatShortcut('Cmd+Shift+Z')).toBe('⇧⌘Z')
    expect(formatShortcut('Cmd+ArrowLeft')).toBe('⌘←')
    expect(formatShortcut('Space')).toBe('␣')
    expect(formatShortcut('Cmd+Alt+Z')).toBe('⌥⌘Z')
  })

  it('filters and groups for the command menu', () => {
    expect(filterActions('zoom').map((a) => a.id)).toEqual(['timelineZoomIn', 'timelineZoomOut', 'track:zooms'])
    expect(filterActions('⌘k')[0]?.id).toBe('commandMenu')
    expect(groupActions(ACTIONS)[0]?.group).toBe('Playback')
    expect(actionForKey(key('c'))?.id).toBe('splitSliceAtCurrentTime')
    expect(actionForKey(key('Backspace'))?.id).toBe('removeSlice')
  })
})
