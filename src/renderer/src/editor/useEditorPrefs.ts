import { useCallback, useEffect, useState } from 'react'

/** App-wide editor preferences (specs 57, 60–62, 67, 73) with their defaults. */
export interface EditorPrefs {
  playbackLoop: boolean
  playbackAudioScrubber: boolean
  enableSmoothWaveform: boolean
  hideAudioWaveform: boolean
  alwaysShowTimelineScrollbar: boolean
  playbackPreviewMaxHeight: 480 | 720 | 1080 | 1440 | 2160
  autoSaveProject: boolean
  /** Spec 66: action id → accelerator. */
  shortcutOverrides: Record<string, string>
  /** Spec 70: performance mode turns the preview's motion blur off. */
  playbackQualityMode: 'high-quality' | 'high-speed'
  /** Spec 71. */
  reelPreviewMode: 'instagram' | 'tiktok' | null
  /** Spec 221: the microphone chosen for voice-overs. */
  voiceoverPreferredMicrophoneId: string | null
}

export const defaultEditorPrefs: EditorPrefs = {
  playbackLoop: false,
  playbackAudioScrubber: false,
  enableSmoothWaveform: true,
  hideAudioWaveform: false,
  alwaysShowTimelineScrollbar: false,
  playbackPreviewMaxHeight: 1080,
  autoSaveProject: true,
  shortcutOverrides: {},
  playbackQualityMode: 'high-quality',
  reelPreviewMode: null,
  voiceoverPreferredMicrophoneId: null
}

export function editorPrefsFrom(raw: Record<string, unknown>): EditorPrefs {
  const bool = (k: keyof EditorPrefs): boolean => (typeof raw[k] === 'boolean' ? (raw[k] as boolean) : (defaultEditorPrefs[k] as boolean))
  const h = raw['playbackPreviewMaxHeight']
  return {
    playbackLoop: bool('playbackLoop'),
    playbackAudioScrubber: bool('playbackAudioScrubber'),
    enableSmoothWaveform: bool('enableSmoothWaveform'),
    hideAudioWaveform: bool('hideAudioWaveform'),
    alwaysShowTimelineScrollbar: bool('alwaysShowTimelineScrollbar'),
    playbackPreviewMaxHeight: h === 480 || h === 720 || h === 1080 || h === 1440 || h === 2160 ? h : 1080,
    autoSaveProject: bool('autoSaveProject'),
    shortcutOverrides: typeof raw['shortcutOverrides'] === 'object' && raw['shortcutOverrides'] ? Object.fromEntries(Object.entries(raw['shortcutOverrides'] as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string')) : {},
    playbackQualityMode: raw['playbackQualityMode'] === 'high-speed' ? 'high-speed' : 'high-quality',
    reelPreviewMode: raw['reelPreviewMode'] === 'instagram' || raw['reelPreviewMode'] === 'tiktok' ? raw['reelPreviewMode'] : null,
    voiceoverPreferredMicrophoneId: typeof raw['voiceoverPreferredMicrophoneId'] === 'string' ? raw['voiceoverPreferredMicrophoneId'] : null
  }
}

export function useEditorPrefs(): [EditorPrefs, (values: Partial<EditorPrefs>) => void] {
  const [prefs, setPrefs] = useState<EditorPrefs>(defaultEditorPrefs)
  useEffect(() => {
    void window.recscene.prefs.get().then((raw) => setPrefs(editorPrefsFrom(raw)))
    // The Settings window broadcasts changes so the editor follows without a restart.
    return window.recscene.prefs.onChanged((s) => setPrefs(editorPrefsFrom(s as unknown as Record<string, unknown>)))
  }, [])
  const update = useCallback((values: Partial<EditorPrefs>) => {
    setPrefs((p) => ({ ...p, ...values }))
    void window.recscene.prefs.set(values)
  }, [])
  return [prefs, update]
}
