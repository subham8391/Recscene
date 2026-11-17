/**
 * App-wide recording preferences that live in Settings rather than the picker
 * (specs 29, 30, 34, 35, 39, 41). Parsed from whatever is on disk.
 */
export interface AppPrefs {
  /** Spec 29. */
  hideDesktopContentWhileRecording: boolean
  /** Spec 30. */
  hideAppDockIconWhileRecording: boolean
  /** Spec 34: suspend the flag and prompter shortcuts while recording. ⇧⌘R still finishes the recording. */
  blockShortcutsWhileRecording: boolean
  /** Spec 35. */
  playRecordingSounds: boolean
  /** Spec 41. */
  actionAfterRecording: 'create-project' | 'quick-export'
}

export const defaultAppPrefs: AppPrefs = {
  hideDesktopContentWhileRecording: false,
  hideAppDockIconWhileRecording: true,
  blockShortcutsWhileRecording: false,
  playRecordingSounds: true,
  actionAfterRecording: 'create-project'
}

export function appPrefsFrom(raw: unknown): AppPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof AppPrefs, unknown>>
  const bool = (key: keyof AppPrefs): boolean => (typeof r[key] === 'boolean' ? (r[key] as boolean) : (defaultAppPrefs[key] as boolean))
  return {
    hideDesktopContentWhileRecording: bool('hideDesktopContentWhileRecording'),
    hideAppDockIconWhileRecording: bool('hideAppDockIconWhileRecording'),
    blockShortcutsWhileRecording: bool('blockShortcutsWhileRecording'),
    playRecordingSounds: bool('playRecordingSounds'),
    actionAfterRecording: r.actionAfterRecording === 'quick-export' ? 'quick-export' : 'create-project'
  }
}

/** Spec 39: the recording stops itself below this much free space on the projects volume. */
export const LOW_DISK_SPACE_BYTES = 2 * 1024 ** 3
export const LOW_DISK_SPACE_MESSAGE = 'Recording was stopped because there is not enough disk space to continue recording.'

export function isLowDiskSpace(freeBytes: number, threshold = LOW_DISK_SPACE_BYTES): boolean {
  return Number.isFinite(freeBytes) && freeBytes >= 0 && freeBytes < threshold
}
