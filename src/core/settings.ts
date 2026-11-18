/**
 * The Settings window (specs 252–254, 256–272, 66, 68–70, 79, 197, 231–232,
 * 29–30, 34–35, 41, Settings board): every app preference in one typed
 * model, remappable shortcuts, and the diagnostics report.
 */
import { ACTIONS, type ActionDef } from './editor/actions'

export type Appearance = 'system' | 'light' | 'dark'
export type EnergyMode = 'high-performance' | 'low-power'
export type QualityMode = 'high-quality' | 'high-speed'

export interface AppSettings {
  // General
  startAtStartup: boolean
  hideDockIcon: boolean
  autoSaveProject: boolean
  appearance: Appearance
  enableSnow: boolean
  analyticsEnabled: boolean
  // Recording
  recordingCountdownDuration: number | null
  createAutomaticZooms: boolean
  defaultZoomLevel: number | null
  maximumWebcamHeight: 720 | 1080
  enableVoiceRecordingEnhancements: boolean
  enableAutoGainControl: boolean
  showRecordingWidget: boolean
  showQuickExportWidget: boolean
  hideDesktopContentWhileRecording: boolean
  hideAppDockIconWhileRecording: boolean
  blockShortcutsWhileRecording: boolean
  playRecordingSounds: boolean
  useLastProjectConfigForNewProjects: boolean
  lowDiskSpaceWarning: boolean
  // Editing
  hideAudioWaveform: boolean
  enableSmoothWaveform: boolean
  alwaysShowTimelineScrollbar: boolean
  playbackAudioScrubber: boolean
  playbackPreviewMaxHeight: 480 | 720 | 1080 | 1440 | 2160
  detectMaskedContentShift: boolean
  optimizePreviewRendering: boolean
  playbackEnergyMode: EnergyMode
  playbackQualityMode: QualityMode
  /** Spec 70: motion blur in the preview. Off by default, as in Screen Studio; the export keeps the blur. */
  previewMotionBlur: boolean
  defaultPresetId: string | null
  // Shortcuts (spec 66): action id → accelerator
  shortcutOverrides: Record<string, string>
  // Advanced
  logLevel: 0 | 1 | 2 | 3
  diagnosticEmail: string
  bypassNetworkCertificateValidation: boolean
  betaUpdates: boolean
  onboardingDone: boolean
}

export const defaultSettings: AppSettings = {
  startAtStartup: false,
  hideDockIcon: false,
  autoSaveProject: true,
  appearance: 'system',
  enableSnow: true,
  analyticsEnabled: false,
  recordingCountdownDuration: null,
  createAutomaticZooms: true,
  defaultZoomLevel: 1.135,
  maximumWebcamHeight: 1080,
  enableVoiceRecordingEnhancements: false,
  enableAutoGainControl: true,
  showRecordingWidget: true,
  showQuickExportWidget: true,
  hideDesktopContentWhileRecording: false,
  hideAppDockIconWhileRecording: true,
  blockShortcutsWhileRecording: false,
  playRecordingSounds: true,
  useLastProjectConfigForNewProjects: false,
  lowDiskSpaceWarning: true,
  hideAudioWaveform: false,
  enableSmoothWaveform: true,
  alwaysShowTimelineScrollbar: false,
  playbackAudioScrubber: false,
  playbackPreviewMaxHeight: 1080,
  detectMaskedContentShift: false,
  optimizePreviewRendering: true,
  playbackEnergyMode: 'high-performance',
  playbackQualityMode: 'high-quality',
  previewMotionBlur: false,
  defaultPresetId: null,
  shortcutOverrides: {},
  logLevel: 2,
  diagnosticEmail: '',
  bypassNetworkCertificateValidation: false,
  betaUpdates: false,
  onboardingDone: false
}

/** Reads the preferences file into the model; anything missing or malformed takes its default. */
export function settingsFrom(raw: Record<string, unknown>): AppSettings {
  const d = defaultSettings
  const bool = (k: keyof AppSettings): boolean => (typeof raw[k] === 'boolean' ? (raw[k] as boolean) : (d[k] as boolean))
  const countdown = raw['recordingCountdownDuration']
  const h = raw['playbackPreviewMaxHeight']
  const zoom = raw['defaultZoomLevel']
  const overridesRaw = raw['shortcutOverrides']
  const overrides: Record<string, string> = {}
  if (typeof overridesRaw === 'object' && overridesRaw) for (const [k, v] of Object.entries(overridesRaw as Record<string, unknown>)) if (typeof v === 'string' && v) overrides[k] = v
  const level = raw['logLevel']
  return {
    startAtStartup: bool('startAtStartup'),
    hideDockIcon: bool('hideDockIcon'),
    autoSaveProject: bool('autoSaveProject'),
    appearance: raw['appearance'] === 'light' || raw['appearance'] === 'dark' ? raw['appearance'] : 'system',
    enableSnow: bool('enableSnow'),
    analyticsEnabled: bool('analyticsEnabled'),
    recordingCountdownDuration: [null, 3000, 5000, 10000].includes(countdown as number | null) ? (countdown as number | null) : null,
    createAutomaticZooms: bool('createAutomaticZooms'),
    defaultZoomLevel: typeof zoom === 'number' && Number.isFinite(zoom) ? Math.min(4, Math.max(1, zoom)) : zoom === null ? null : d.defaultZoomLevel,
    maximumWebcamHeight: raw['maximumWebcamHeight'] === 720 ? 720 : 1080,
    enableVoiceRecordingEnhancements: bool('enableVoiceRecordingEnhancements'),
    enableAutoGainControl: bool('enableAutoGainControl'),
    showRecordingWidget: bool('showRecordingWidget'),
    showQuickExportWidget: bool('showQuickExportWidget'),
    hideDesktopContentWhileRecording: bool('hideDesktopContentWhileRecording'),
    hideAppDockIconWhileRecording: bool('hideAppDockIconWhileRecording'),
    blockShortcutsWhileRecording: bool('blockShortcutsWhileRecording'),
    playRecordingSounds: bool('playRecordingSounds'),
    useLastProjectConfigForNewProjects: bool('useLastProjectConfigForNewProjects'),
    lowDiskSpaceWarning: bool('lowDiskSpaceWarning'),
    hideAudioWaveform: bool('hideAudioWaveform'),
    enableSmoothWaveform: bool('enableSmoothWaveform'),
    alwaysShowTimelineScrollbar: bool('alwaysShowTimelineScrollbar'),
    playbackAudioScrubber: bool('playbackAudioScrubber'),
    playbackPreviewMaxHeight: h === 480 || h === 720 || h === 1080 || h === 1440 || h === 2160 ? h : 1080,
    detectMaskedContentShift: bool('detectMaskedContentShift'),
    optimizePreviewRendering: bool('optimizePreviewRendering'),
    playbackEnergyMode: raw['playbackEnergyMode'] === 'low-power' ? 'low-power' : 'high-performance',
    playbackQualityMode: raw['playbackQualityMode'] === 'high-speed' ? 'high-speed' : 'high-quality',
    previewMotionBlur: bool('previewMotionBlur'),
    defaultPresetId: typeof raw['defaultPresetId'] === 'string' && raw['defaultPresetId'] ? (raw['defaultPresetId'] as string) : null,
    shortcutOverrides: overrides,
    logLevel: level === 0 || level === 1 || level === 3 ? level : 2,
    diagnosticEmail: typeof raw['diagnosticEmail'] === 'string' ? (raw['diagnosticEmail'] as string) : '',
    bypassNetworkCertificateValidation: bool('bypassNetworkCertificateValidation'),
    betaUpdates: bool('betaUpdates'),
    onboardingDone: bool('onboardingDone')
  }
}

export const SETTINGS_TABS = ['general', 'recording', 'editing', 'shortcuts', 'advanced', 'experimental', 'account'] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]
export const TAB_LABELS: Record<SettingsTab, string> = { general: 'General', recording: 'Recording', editing: 'Editing', shortcuts: 'Shortcuts', advanced: 'Advanced', experimental: 'Experimental', account: 'Account' }

// --- Shortcuts (spec 66) ------------------------------------------------------------------

/** Global shortcuts live outside the editor's action registry; their ids are stable keys in the overrides map. */
export const GLOBAL_SHORTCUTS: readonly { id: string; label: string; sub: string; shortcut: string }[] = [
  { id: 'global:record', label: 'Start / stop recording', sub: 'Global · also opens the recording picker', shortcut: 'Cmd+Shift+R' },
  { id: 'global:flag', label: 'Create recording flag', sub: 'Global · shows as a timeline marker', shortcut: 'Cmd+Alt+Ctrl+F' },
  { id: 'global:prompter', label: 'Speaker notes prompter', sub: 'Global', shortcut: 'Cmd+Alt+.' }
]

/** Editor actions the Shortcuts tab lets you remap (the rest keep their registry defaults). */
export const EDITOR_SHORTCUT_IDS = ['commandMenu', 'shortcutsGuide', 'splitSliceAtCurrentTime', 'rippleRemoveSlice', 'playForwardOrIncreaseSpeed', 'playBackwardOrIncreaseSpeed', 'stopAndResetSpeed', 'togglePlay', 'toggleHideCamera', 'export', 'save', 'togglePreviewMode'] as const

/** The registry with the user's overrides applied (an empty override restores the default). */
export function withOverrides(actions: readonly ActionDef[], overrides: Record<string, string>): ActionDef[] {
  return actions.map((a) => (overrides[a.id] ? { ...a, shortcut: overrides[a.id] } : a))
}

export function effectiveGlobalShortcut(id: string, overrides: Record<string, string>): string {
  return overrides[id] ?? GLOBAL_SHORTCUTS.find((g) => g.id === id)?.shortcut ?? ''
}

const CODE_KEYS: Record<string, string> = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`' }

/** Builds a registry-style accelerator ("Cmd+Shift+R") from a key event; null for a bare modifier. */
export function acceleratorFromEvent(e: { key: string; code?: string; metaKey: boolean; shiftKey: boolean; altKey: boolean; ctrlKey: boolean }): string | null {
  if (['Meta', 'Shift', 'Alt', 'Control'].includes(e.key)) return null
  const parts: string[] = []
  if (e.metaKey) parts.push('Cmd')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  let key = e.key
  if (key === ' ') key = 'Space'
  else if (e.code && /^Key[A-Z]$/.test(e.code)) key = e.code.slice(3)
  else if (e.code && /^Digit[0-9]$/.test(e.code)) key = e.code.slice(5)
  else if (e.code && CODE_KEYS[e.code]) key = CODE_KEYS[e.code]!
  else if (key.length === 1) key = key.toUpperCase()
  parts.push(key)
  return parts.join('+')
}

/** Electron wants CommandOrControl / Control / Alt / Shift. */
export function toElectronAccelerator(acc: string): string {
  return acc.split('+').map((p) => (p === 'Cmd' ? 'CommandOrControl' : p === 'Ctrl' ? 'Control' : p === 'ArrowLeft' ? 'Left' : p === 'ArrowRight' ? 'Right' : p === 'ArrowUp' ? 'Up' : p === 'ArrowDown' ? 'Down' : p)).join('+')
}

/** Spec 66: a global shortcut must not clash with another global one; editor ones must not clash with each other. */
export function shortcutConflict(id: string, accelerator: string, overrides: Record<string, string>): string | null {
  const norm = (s: string): string => s.toLowerCase()
  const isGlobal = id.startsWith('global:')
  if (isGlobal) {
    for (const g of GLOBAL_SHORTCUTS) if (g.id !== id && norm(effectiveGlobalShortcut(g.id, overrides)) === norm(accelerator)) return g.label
    return null
  }
  for (const a of withOverrides(ACTIONS, overrides)) if (a.id !== id && a.shortcut && norm(a.shortcut) === norm(accelerator)) return a.label
  return null
}

// --- Diagnostics (spec 257) ------------------------------------------------------------

export interface DiagnosticsInput {
  appVersion: string
  macOS: string
  model: string
  arch: string
  memoryGb: number
  cameras: string[]
  microphone: string
  permissions: Record<string, string | boolean>
  email: string
}

/** Spec 257: the report that "Share diagnostics info" copies (there is no support server). */
export function diagnosticsReport(d: DiagnosticsInput): string {
  const perms = Object.entries(d.permissions).map(([k, v]) => `  ${k}: ${typeof v === 'boolean' ? (v ? 'granted' : 'missing') : v}`).join('\n')
  return [
    'Recscene diagnostics',
    `App: ${d.appVersion}`,
    `macOS: ${d.macOS} (${d.arch})`,
    `Mac: ${d.model}, ${d.memoryGb} GB`,
    `Cameras: ${d.cameras.length ? d.cameras.join(', ') : 'none'}`,
    `Microphone: ${d.microphone || 'default'}`,
    'Permissions:',
    perms,
    d.email ? `Contact: ${d.email}` : ''
  ].filter((l) => l !== '').join('\n')
}

export const isValidEmail = (s: string): boolean => s === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export const RESET_CONFIRM = 'Are you sure you want to reset all preferences? This will include all your recording preferences.'

/** Spec 79: the snow button shows only between 20 December and 5 January. */
export function isSnowSeason(d: Date): boolean {
  const m = d.getMonth()
  const day = d.getDate()
  return (m === 11 && day >= 20) || (m === 0 && day <= 5)
}

/** Spec 253: the Dock icon hides only when no project window is open and nothing records. */
export function shouldHideDock(settings: Pick<AppSettings, 'hideDockIcon'>, openWindows: number, recording: boolean): boolean {
  return settings.hideDockIcon && openWindows === 0 && !recording
}
