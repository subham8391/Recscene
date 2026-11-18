/**
 * The editor's action registry (specs 49, 52–58, 63–65, 72–78): one list
 * that drives keyboard handling, the ⌘K command menu and the shortcuts guide.
 */
export type ActionGroup = 'Playback' | 'Slice' | 'Zoom' | 'Camera' | 'Mask' | 'Shortcuts' | 'Audio' | 'Captions' | 'Presets' | 'View' | 'Editor' | 'Project' | 'Sidebar' | 'Export' | 'Clipboard' | 'Help'

export interface ActionDef {
  id: string
  label: string
  group: ActionGroup
  /** Electron-style accelerator, e.g. "Cmd+Shift+Z", "Space", "J". Modifiers: Cmd, Shift, Alt, Ctrl. */
  shortcut?: string
}

export const ACTIONS: readonly ActionDef[] = [
  { id: 'togglePlay', label: 'Play / Pause', group: 'Playback', shortcut: 'Space' },
  { id: 'playForwardOrIncreaseSpeed', label: 'Play or increase speed', group: 'Playback', shortcut: 'L' },
  { id: 'playBackwardOrIncreaseSpeed', label: 'Play backward or increase speed', group: 'Playback', shortcut: 'J' },
  { id: 'stopAndResetSpeed', label: 'Stop and reset speed', group: 'Playback', shortcut: 'K' },
  { id: 'moveBackwards', label: 'Move backwards', group: 'Playback', shortcut: 'ArrowLeft' },
  { id: 'moveForwards', label: 'Move forwards', group: 'Playback', shortcut: 'ArrowRight' },
  { id: 'moveBackwardsFast', label: 'Move backwards fast', group: 'Playback', shortcut: 'Shift+ArrowLeft' },
  { id: 'moveForwardsFast', label: 'Move forwards fast', group: 'Playback', shortcut: 'Shift+ArrowRight' },
  { id: 'goToFirstFrame', label: 'Go to first frame', group: 'Playback', shortcut: 'Cmd+ArrowLeft' },
  { id: 'goToLastFrame', label: 'Go to last frame', group: 'Playback', shortcut: 'Cmd+ArrowRight' },
  { id: 'toggleLoop', label: 'Loop playback', group: 'Playback' },
  { id: 'timelineZoomIn', label: 'Zoom in (timeline, or the selected zoom’s level)', group: 'Playback', shortcut: 'Cmd+=' },
  { id: 'timelineZoomOut', label: 'Zoom out (timeline, or the selected zoom’s level)', group: 'Playback', shortcut: 'Cmd+-' },
  { id: 'toggleAudioScrubber', label: 'Enable audio scrubber (experimental)', group: 'Playback' },
  { id: 'splitSliceAtCurrentTime', label: 'Split slice at current time', group: 'Slice', shortcut: 'C' },
  { id: 'removeSlice', label: 'Remove slice', group: 'Slice', shortcut: 'Backspace' },
  { id: 'rippleRemoveSlice', label: 'Remove slice before previous cut', group: 'Slice', shortcut: 'X' },
  { id: 'mergeWithPrevious', label: 'Merge with previous slice', group: 'Slice' },
  { id: 'mergeWithNext', label: 'Merge with next slice', group: 'Slice' },
  { id: 'applySpeedToAll', label: 'Apply speed to all slices', group: 'Slice' },
  { id: 'resetAllClips', label: 'Reset trims and cuts for all slices', group: 'Slice' },
  { id: 'crop', label: 'Crop recording…', group: 'Editor' },
  { id: 'addZoom', label: 'Add zoom', group: 'Zoom' },
  { id: 'addManualZoom', label: 'Add manual zoom', group: 'Zoom' },
  { id: 'duplicateZoom', label: 'Duplicate zoom', group: 'Zoom' },
  { id: 'toggleZoomDisabled', label: 'Enable / disable zoom', group: 'Zoom' },
  { id: 'disableAllZooms', label: 'Disable all zooms', group: 'Zoom' },
  { id: 'enableAllZooms', label: 'Enable all zooms', group: 'Zoom' },
  { id: 'applyZoomLevelToAll', label: 'Apply zoom level to all zooms', group: 'Zoom' },
  { id: 'restoreDefaultZooms', label: 'Restore default zoom ranges', group: 'Zoom' },
  { id: 'removeAllZooms', label: 'Remove all zooms', group: 'Zoom' },
  { id: 'toggleHideCamera', label: 'Hide camera', group: 'Camera', shortcut: 'H' },
  { id: 'addLayout', label: 'Add layout (fullscreen camera)', group: 'Camera' },
  { id: 'addBothLayout', label: 'Add both layout', group: 'Camera' },
  { id: 'addSplitLayout', label: 'Add split screen layout', group: 'Camera' },
  { id: 'addScreenLayout', label: 'Add screen layout (hide camera)', group: 'Camera' },
  { id: 'toggleLayoutDisabled', label: 'Enable / disable layout', group: 'Camera' },
  { id: 'copyLayout', label: 'Copy layout', group: 'Camera' },
  { id: 'applyCameraLayoutSizeToAll', label: 'Apply camera size to all other layouts', group: 'Camera' },
  { id: 'removeAllLayouts', label: 'Remove all layouts', group: 'Camera' },
  { id: 'moveLayoutCameraUp', label: 'Move layout camera up', group: 'Camera' },
  { id: 'moveLayoutCameraDown', label: 'Move layout camera down', group: 'Camera' },
  { id: 'moveLayoutCameraLeft', label: 'Move layout camera left', group: 'Camera' },
  { id: 'moveLayoutCameraRight', label: 'Move layout camera right', group: 'Camera' },
  { id: 'setLayoutModeDefault', label: 'Set camera layout mode to default (both)', group: 'Camera' },
  { id: 'setLayoutModeFullscreen', label: 'Set camera layout mode to fullscreen', group: 'Camera' },
  { id: 'setLayoutModeHide', label: 'Set camera layout mode to hide', group: 'Camera' },
  { id: 'addSensitiveDataMask', label: 'Add sensitive data mask', group: 'Mask' },
  { id: 'addHighlightMask', label: 'Add highlight mask', group: 'Mask' },
  { id: 'changeMaskTypeToHighlight', label: 'Change mask type to highlight', group: 'Mask' },
  { id: 'changeMaskTypeToSensitiveData', label: 'Change mask type to sensitive data', group: 'Mask' },
  { id: 'toggleMaskDisabled', label: 'Toggle mask disabled', group: 'Mask' },
  { id: 'disableAllMasks', label: 'Disable all masks', group: 'Mask' },
  { id: 'copyMask', label: 'Copy mask', group: 'Mask' },
  { id: 'applyHighlightOpacityToAll', label: 'Apply highlight mask opacity to all masks', group: 'Mask' },
  { id: 'focusTimelineOnMask', label: 'Focus the timeline on the mask', group: 'Mask' },
  { id: 'focusTimelineOnMaskStart', label: 'Focus the timeline on the mask start', group: 'Mask' },
  { id: 'removeAllMasks', label: 'Remove all masks', group: 'Mask' },
  { id: 'toggleShowShortcuts', label: 'Show keyboard shortcuts', group: 'Shortcuts' },
  { id: 'hideAllShortcuts', label: 'Hide all shortcuts', group: 'Shortcuts' },
  { id: 'showAllShortcuts', label: 'Show all shortcuts', group: 'Shortcuts' },
  { id: 'muteMicrophone', label: 'Mute microphone', group: 'Audio' },
  { id: 'muteSystemAudio', label: 'Mute system audio', group: 'Audio' },
  { id: 'muteBackgroundAudio', label: 'Mute background audio', group: 'Audio' },
  { id: 'removeBackgroundAudio', label: 'Remove background audio', group: 'Audio' },
  { id: 'openAudioLibraryFolder', label: 'Open audio library folder', group: 'Audio' },
  { id: 'recordVoiceover', label: 'Record voiceover…', group: 'Audio' },
  { id: 'removeAllVoiceovers', label: 'Remove all voiceovers', group: 'Audio' },
  { id: 'track:voiceovers', label: 'Toggle Voiceovers track', group: 'View', shortcut: '6' },
  { id: 'generateTranscript', label: 'Generate transcript', group: 'Captions' },
  { id: 'regenerateTranscript', label: 'Re-generate transcript', group: 'Captions' },
  { id: 'toggleHideTranscript', label: 'Hide transcript', group: 'Captions' },
  { id: 'editTranscript', label: 'Edit transcript', group: 'Captions' },
  { id: 'exportTranscript', label: 'Export transcript', group: 'Captions' },
  { id: 'removeFillerWords', label: 'Remove filler words', group: 'Captions' },
  { id: 'tightenPauses', label: 'Tighten pauses', group: 'Captions' },
  { id: 'track:captions', label: 'Toggle Captions track', group: 'View', shortcut: '5' },
  { id: 'presets', label: 'Presets…', group: 'Presets' },
  { id: 'createPreset', label: 'Create new preset', group: 'Presets' },
  { id: 'importPreset', label: 'Import preset…', group: 'Presets' },
  { id: 'cut', label: 'Cut zoom', group: 'Clipboard', shortcut: 'Cmd+X' },
  { id: 'paste', label: 'Paste slice settings', group: 'Clipboard', shortcut: 'Cmd+V' },
  { id: 'undo', label: 'Undo', group: 'Editor', shortcut: 'Cmd+Z' },
  { id: 'redo', label: 'Redo', group: 'Editor', shortcut: 'Cmd+Shift+Z' },
  { id: 'toggleSidebar', label: 'Show editor sidebar', group: 'View' },
  { id: 'toggleTimeline', label: 'Show editor timeline', group: 'View' },
  { id: 'togglePreviewMode', label: 'Enter preview mode', group: 'View', shortcut: 'Cmd+Shift+Enter' },
  { id: 'toggleWaveform', label: 'Show audio waveform', group: 'View' },
  { id: 'toggleSmoothWaveform', label: 'Smooth waveform', group: 'View' },
  { id: 'toggleTimelineScrollbar', label: 'Always show timeline scrollbar', group: 'View' },
  { id: 'reelMode:off', label: 'Reel mode: disable', group: 'View' },
  { id: 'reelMode:instagram', label: 'Reel mode: Instagram', group: 'View' },
  { id: 'reelMode:tiktok', label: 'Reel mode: TikTok', group: 'View' },
  { id: 'sidebar:background', label: 'Background & Screen', group: 'Sidebar', shortcut: 'Cmd+1' },
  { id: 'sidebar:cursor', label: 'Cursor', group: 'Sidebar', shortcut: 'Cmd+2' },
  { id: 'sidebar:camera', label: 'Camera', group: 'Sidebar', shortcut: 'Cmd+3' },
  { id: 'sidebar:captions', label: 'Captions', group: 'Sidebar', shortcut: 'Cmd+4' },
  { id: 'sidebar:audio', label: 'Audio', group: 'Sidebar', shortcut: 'Cmd+5' },
  { id: 'sidebar:shortcuts', label: 'Keyboard Shortcuts', group: 'Sidebar', shortcut: 'Cmd+6' },
  { id: 'sidebar:animations', label: 'Animation', group: 'Sidebar', shortcut: 'Cmd+7' },
  { id: 'sidebar:zooms', label: 'Zooms', group: 'Sidebar' },
  { id: 'sidebar:clips', label: 'Clips', group: 'Sidebar' },
  { id: 'sidebar:masks', label: 'Masks', group: 'Sidebar' },
  { id: 'closeSidebarItem', label: 'Close', group: 'Sidebar', shortcut: 'Escape' },
  { id: 'track:zooms', label: 'Toggle Zooms track', group: 'View', shortcut: '1' },
  { id: 'track:layouts', label: 'Toggle Camera Layouts track', group: 'View', shortcut: '2' },
  { id: 'track:shortcuts', label: 'Toggle Shortcuts track', group: 'View', shortcut: '3' },
  { id: 'track:masks', label: 'Toggle Masks track', group: 'View', shortcut: '4' },
  { id: 'save', label: 'Save', group: 'Project', shortcut: 'Cmd+S' },
  { id: 'saveAs', label: 'Save as…', group: 'Project', shortcut: 'Cmd+Shift+S' },
  { id: 'openProject', label: 'Open project…', group: 'Project', shortcut: 'Cmd+O' },
  { id: 'openLastProject', label: 'Open last project', group: 'Project', shortcut: 'Cmd+Alt+Z' },
  { id: 'showInFinder', label: 'Show project in Finder', group: 'Project', shortcut: 'Cmd+Shift+O' },
  { id: 'closeProject', label: 'Close project (back to projects)', group: 'Project', shortcut: 'Cmd+Shift+W' },
  { id: 'copyFrame', label: 'Copy current frame as image / slice settings', group: 'Clipboard', shortcut: 'Cmd+C' },
  { id: 'export', label: 'Export video…', group: 'Export', shortcut: 'Cmd+E' },
  { id: 'exportFrame', label: 'Export current frame as image…', group: 'Export' },
  { id: 'copyZipProject', label: 'Copy and zip project', group: 'Export' },
  { id: 'extractRawFiles', label: 'Extract raw recording files…', group: 'Export' },
  { id: 'openSettings', label: 'Settings…', group: 'Help', shortcut: 'Cmd+,' },
  { id: 'checkForUpdates', label: 'Check for updates…', group: 'Help' },
  { id: 'openChangelog', label: 'Open changelog', group: 'Help' },
  { id: 'openAppDataFolder', label: 'Open app data folder', group: 'Help' },
  { id: 'commandMenu', label: 'Show command menu…', group: 'Help', shortcut: 'Cmd+K' },
  { id: 'shortcutsGuide', label: 'Show shortcuts guide', group: 'Help', shortcut: 'Cmd+/' }
]

export interface KeyLike {
  key: string
  code?: string
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
}

const KEY_ALIASES: Record<string, string> = { ' ': 'Space', Esc: 'Escape', '+': '=', Plus: '=' }

/** True when the key event matches the accelerator. Letters match case-insensitively. */
export function matchesShortcut(shortcut: string, e: KeyLike): boolean {
  const parts = shortcut.split('+').map((p) => p.trim())
  const key = parts.pop() ?? ''
  const need = { meta: parts.includes('Cmd'), shift: parts.includes('Shift'), alt: parts.includes('Alt'), ctrl: parts.includes('Ctrl') }
  if (need.meta !== e.metaKey || need.shift !== e.shiftKey || need.alt !== e.altKey || need.ctrl !== e.ctrlKey) return false
  const pressed = KEY_ALIASES[e.key] ?? e.key
  if (pressed.toLowerCase() === key.toLowerCase()) return true
  // Shift changes the printed character; fall back to the physical key for digits and symbols.
  const code = e.code ?? ''
  return (code === `Digit${key}` || code === `Key${key.toUpperCase()}` || (key === '=' && code === 'Equal') || (key === '-' && code === 'Minus') || (key === '/' && code === 'Slash'))
}

/** The action whose shortcut matches, if any. Later entries never shadow earlier ones. */
export function actionForKey(e: KeyLike, actions: readonly ActionDef[] = ACTIONS): ActionDef | undefined {
  return actions.find((a) => a.shortcut && matchesShortcut(a.shortcut, e))
}

const SYMBOLS: Record<string, string> = { Cmd: '⌘', Shift: '⇧', Alt: '⌥', Ctrl: '⌃', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: '↩', Escape: '⎋', Space: '␣' }

/** "Cmd+Shift+Z" → "⇧⌘Z" in the macOS modifier order. */
export function formatShortcut(shortcut: string): string {
  const parts = shortcut.split('+')
  const key = parts.pop() ?? ''
  const order = ['Ctrl', 'Alt', 'Shift', 'Cmd']
  return order.filter((m) => parts.includes(m)).map((m) => SYMBOLS[m]).join('') + (SYMBOLS[key] ?? key.toUpperCase())
}

/** Case-insensitive filter over label and group for the command menu and the guide. */
export function filterActions(query: string, actions: readonly ActionDef[] = ACTIONS): ActionDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...actions]
  return actions.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q) || (a.shortcut ? formatShortcut(a.shortcut).toLowerCase().includes(q) : false))
}

export function groupActions(actions: readonly ActionDef[]): { group: ActionGroup; actions: ActionDef[] }[] {
  const groups = new Map<ActionGroup, ActionDef[]>()
  for (const a of actions) groups.set(a.group, [...(groups.get(a.group) ?? []), a])
  return [...groups.entries()].map(([group, list]) => ({ group, actions: list }))
}
