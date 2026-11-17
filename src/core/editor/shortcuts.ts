/**
 * Keystroke overlays (specs 199–204, Shortcuts board): which recorded key
 * presses become on-screen labels, how they are hidden, and how a label is
 * laid out. Labels come from the helper as "⌃⌥⇧⌘" prefixes plus a key name.
 */
import type { KeyEvent } from '../project'

export interface ShortcutConfig {
  /** Spec 199. */
  showShortcuts: boolean
  /** Spec 200. */
  showShortcutsWithSingleLetters: boolean
  /** Spec 201: 0.5–2. */
  shortcutsSizeRatio: number
  /** Specs 202–203: { "<recordingTimeMs>": true } for hidden occurrences. */
  hiddenShortcuts: Record<string, true>
  /** Board: whole kinds switched off. */
  disabledShortcutKinds: ShortcutKind[]
}

export const defaultShortcutConfig: ShortcutConfig = {
  showShortcuts: false,
  showShortcutsWithSingleLetters: false,
  shortcutsSizeRatio: 1,
  hiddenShortcuts: {},
  disabledShortcutKinds: []
}

export const SIZE_MIN = 0.5
export const SIZE_MAX = 2
export const SIZE_PRESETS: readonly { label: string; ratio: number }[] = [
  { label: 'Small', ratio: 0.7 },
  { label: 'Medium', ratio: 1 },
  { label: 'Large', ratio: 1.4 }
]
/** How long a label stays after the press, and how long it fades. */
export const LABEL_SHOW_MS = 1400
export const LABEL_FADE_MS = 300
export const ENABLE_QUESTION = 'Shortcut labels are disabled in your project, do you want to enable them?'
export const ENABLE_BUTTON = 'Enable shortcuts'
export const NO_KEYS = 'No keyboard shortcuts were recorded. Keystrokes need the Input Monitoring permission while recording.'

export type ShortcutKind = 'copyPaste' | 'navigation' | 'system' | 'other'
export const KIND_LABELS: Record<Exclude<ShortcutKind, 'other'>, { name: string; sub: string }> = {
  copyPaste: { name: 'Copy and paste', sub: '⌘C ⌘V ⌘X' },
  navigation: { name: 'Navigation', sub: '⌘Tab, ⌘` , arrows with modifiers' },
  system: { name: 'App switching and system', sub: '⌘Space, ⌘Q, ⌃↑' }
}

const MODIFIERS = ['⌃', '⌥', '⇧', '⌘'] as const

/** "⌘⇧P" → ["⌘", "⇧", "P"]; "Space" → ["Space"]. */
export function parseLabel(label: string): string[] {
  const keys: string[] = []
  let rest = label
  while (rest.length > 0 && (MODIFIERS as readonly string[]).includes(rest[0]!)) {
    keys.push(rest[0]!)
    rest = rest.slice(1)
  }
  if (rest) keys.push(rest === '⇥' ? 'Tab' : rest)
  return keys
}

export function isCombination(label: string): boolean {
  return parseLabel(label).length > 1
}

export function kindOf(label: string): ShortcutKind {
  const keys = parseLabel(label)
  const key = keys[keys.length - 1] ?? ''
  const mods = keys.slice(0, -1)
  if (mods.length === 1 && mods[0] === '⌘' && ['C', 'V', 'X'].includes(key)) return 'copyPaste'
  if (mods.includes('⌘') && (key === 'Tab' || key === '`' || key === 'Space' || key === 'Q' || key === 'H' || key === 'M')) return key === 'Tab' || key === '`' ? 'navigation' : 'system'
  if (mods.length > 0 && ['←', '→', '↑', '↓', '↖', '↘', '⇞', '⇟'].includes(key)) return mods.includes('⌃') && (key === '↑' || key === '↓' || key === '←' || key === '→') ? 'system' : 'navigation'
  return 'other'
}

export interface ShortcutEvent {
  timeMs: number
  label: string
  keys: string[]
  kind: ShortcutKind
  /** Spec 202: hidden by the user, still on the track. */
  hidden: boolean
  /** Board: its whole kind is switched off. */
  kindDisabled: boolean
}

export const hiddenKey = (timeMs: number): string => String(Math.round(timeMs))

/** The presses the overlay considers (spec 200 decides single keys), oldest first. */
export function shortcutEvents(keys: readonly KeyEvent[], config: ShortcutConfig): ShortcutEvent[] {
  return [...keys]
    .filter((k) => config.showShortcutsWithSingleLetters || isCombination(k.label))
    .sort((a, b) => a.timeMs - b.timeMs)
    .map((k) => {
      const kind = kindOf(k.label)
      return { timeMs: k.timeMs, label: k.label, keys: parseLabel(k.label), kind, hidden: config.hiddenShortcuts[hiddenKey(k.timeMs)] === true, kindDisabled: config.disabledShortcutKinds.includes(kind) }
    })
}

export const isShown = (e: ShortcutEvent): boolean => !e.hidden && !e.kindDisabled

/** The label on screen at `timeMs`: the latest shown press within the show window, with its fade. */
export function labelAt(events: readonly ShortcutEvent[], timeMs: number, config: ShortcutConfig): { event: ShortcutEvent; opacity: number } | null {
  if (!config.showShortcuts) return null
  let best: ShortcutEvent | null = null
  for (const e of events) {
    if (e.timeMs > timeMs) break
    if (isShown(e)) best = e
  }
  if (!best) return null
  const age = timeMs - best.timeMs
  if (age > LABEL_SHOW_MS + LABEL_FADE_MS) return null
  const opacity = age <= LABEL_SHOW_MS ? 1 : 1 - (age - LABEL_SHOW_MS) / LABEL_FADE_MS
  return { event: best, opacity: Math.max(0, Math.min(1, opacity)) }
}

/** Spec 202: one occurrence. */
export function setHidden<C extends ShortcutConfig>(config: C, timeMs: number, hidden: boolean): C {
  const next = { ...config.hiddenShortcuts }
  if (hidden) next[hiddenKey(timeMs)] = true
  else delete next[hiddenKey(timeMs)]
  return { ...config, hiddenShortcuts: next }
}

/** Spec 203: every occurrence of one combination. */
export function setHiddenForLabel<C extends ShortcutConfig>(config: C, events: readonly ShortcutEvent[], label: string, hidden: boolean): C {
  return events.filter((e) => e.label === label).reduce((c, e) => setHidden(c, e.timeMs, hidden), config)
}

/** Spec 203: every label. */
export function setAllHidden<C extends ShortcutConfig>(config: C, events: readonly ShortcutEvent[], hidden: boolean): C {
  return hidden ? events.reduce((c, e) => setHidden(c, e.timeMs, true), config) : { ...config, hiddenShortcuts: {} }
}

export function countOf(events: readonly ShortcutEvent[], label: string): number {
  return events.filter((e) => e.label === label).length
}

export function setKindDisabled<C extends ShortcutConfig>(config: C, kind: ShortcutKind, disabled: boolean): C {
  const kinds = config.disabledShortcutKinds.filter((k) => k !== kind)
  return { ...config, disabledShortcutKinds: disabled ? [...kinds, kind] : kinds }
}

/** "12 pressed · 2 hidden" for the panel head. */
export function summary(events: readonly ShortcutEvent[]): string {
  const hidden = events.filter((e) => e.hidden).length
  return `${events.length} pressed${hidden ? ` · ${hidden} hidden` : ''}`
}

/** Label geometry for a frame of this height (spec 201 scales it): key cap size, font, gap, padding, bottom margin. */
export function labelMetrics(frameHeight: number, ratio: number): { key: number; font: number; gap: number; pad: number; bottom: number; radius: number } {
  const key = Math.max(12, frameHeight * 0.05 * Math.min(SIZE_MAX, Math.max(SIZE_MIN, ratio)))
  return { key, font: key * 0.44, gap: key * 0.18, pad: key * 0.24, bottom: frameHeight * 0.06, radius: key * 0.3 }
}

/** Width of one key cap for its text, so the canvas and the DOM agree roughly. */
export function keyWidth(text: string, key: number): number {
  return Math.max(key, key * 0.3 + text.length * key * 0.42)
}
