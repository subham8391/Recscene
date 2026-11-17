import { describe, expect, it } from 'vitest'
import { countOf, defaultShortcutConfig, isCombination, keyWidth, kindOf, LABEL_FADE_MS, LABEL_SHOW_MS, labelAt, labelMetrics, parseLabel, setAllHidden, setHidden, setHiddenForLabel, setKindDisabled, shortcutEvents, summary } from './shortcuts'

const keys = [
  { timeMs: 1400, label: '⌘T' },
  { timeMs: 3000, label: 'A' },
  { timeMs: 4100, label: '⌘C' },
  { timeMs: 6200, label: '⇧⌘P' },
  { timeMs: 14200, label: '⌘C' },
  { timeMs: 16600, label: '⌘⇥' },
  { timeMs: 28800, label: '⌘Q' }
]
const on = { ...defaultShortcutConfig, showShortcuts: true }

describe('labels', () => {
  it('splits modifiers from the key and recognises combinations', () => {
    expect(parseLabel('⇧⌘P')).toEqual(['⇧', '⌘', 'P'])
    expect(parseLabel('Space')).toEqual(['Space'])
    expect(parseLabel('⌘⇥')).toEqual(['⌘', 'Tab'])
    expect(isCombination('⌘C')).toBe(true)
    expect(isCombination('A')).toBe(false)
    expect(kindOf('⌘V')).toBe('copyPaste')
    expect(kindOf('⌘⇥')).toBe('navigation')
    expect(kindOf('⌘Q')).toBe('system')
    expect(kindOf('⌃↑')).toBe('system')
    expect(kindOf('⌥←')).toBe('navigation')
    expect(kindOf('⇧⌘P')).toBe('other')
  })

  it('lists combinations only unless single keys are on (specs 199–200)', () => {
    expect(shortcutEvents(keys, on).map((e) => e.label)).toEqual(['⌘T', '⌘C', '⇧⌘P', '⌘C', '⌘⇥', '⌘Q'])
    expect(shortcutEvents(keys, { ...on, showShortcutsWithSingleLetters: true })).toHaveLength(7)
    expect(summary(shortcutEvents(keys, on))).toBe('6 pressed')
  })

  it('shows the latest press for a while and fades it', () => {
    const events = shortcutEvents(keys, on)
    expect(labelAt(events, 1000, on)).toBeNull()
    expect(labelAt(events, 1500, on)).toMatchObject({ event: { label: '⌘T' }, opacity: 1 })
    expect(labelAt(events, 1400 + LABEL_SHOW_MS + LABEL_FADE_MS / 2, on)?.opacity).toBeCloseTo(0.5)
    expect(labelAt(events, 1400 + LABEL_SHOW_MS + LABEL_FADE_MS + 1, on)).toBeNull()
    expect(labelAt(events, 6300, on)?.event.label).toBe('⇧⌘P')
    expect(labelAt(events, 6300, { ...on, showShortcuts: false })).toBeNull()
  })

  it('hides one, all of a kind, every label and whole kinds (specs 202–203)', () => {
    let c = setHidden(on, 4100, true)
    let events = shortcutEvents(keys, c)
    expect(events.find((e) => e.timeMs === 4100)?.hidden).toBe(true)
    expect(labelAt(events, 4200, c)).toBeNull()
    expect(labelAt(events, 2000, c)?.event.label).toBe('⌘T')
    expect(summary(events)).toBe('6 pressed · 1 hidden')
    c = setHiddenForLabel(c, events, '⌘C', true)
    events = shortcutEvents(keys, c)
    expect(events.filter((e) => e.hidden).map((e) => e.timeMs)).toEqual([4100, 14200])
    expect(countOf(events, '⌘C')).toBe(2)
    c = setHidden(c, 4100, false)
    expect(Object.keys(c.hiddenShortcuts)).toEqual(['14200'])
    c = setAllHidden(c, events, true)
    expect(Object.keys(c.hiddenShortcuts)).toHaveLength(6)
    c = setAllHidden(c, events, false)
    expect(c.hiddenShortcuts).toEqual({})
    c = setKindDisabled(c, 'copyPaste', true)
    events = shortcutEvents(keys, c)
    expect(events.filter((e) => e.kindDisabled).map((e) => e.label)).toEqual(['⌘C', '⌘C'])
    expect(labelAt(events, 4200, c)).toBeNull()
    expect(labelAt(events, 14300, c)).toBeNull()
    expect(labelAt(events, 16700, c)?.event.label).toBe('⌘⇥')
    expect(setKindDisabled(c, 'copyPaste', false).disabledShortcutKinds).toEqual([])
  })

  it('scales the label with the frame and the ratio (spec 201)', () => {
    const m = labelMetrics(1080, 1)
    expect(m.key).toBeCloseTo(54)
    expect(labelMetrics(1080, 2).key).toBeCloseTo(108)
    expect(labelMetrics(1080, 5).key).toBeCloseTo(108)
    expect(keyWidth('P', 54)).toBe(54)
    expect(keyWidth('Space', 54)).toBeGreaterThan(54)
  })
})
