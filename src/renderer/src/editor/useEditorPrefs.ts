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
}

export const defaultEditorPrefs: EditorPrefs = {
  playbackLoop: false,
  playbackAudioScrubber: false,
  enableSmoothWaveform: true,
  hideAudioWaveform: false,
  alwaysShowTimelineScrollbar: false,
  playbackPreviewMaxHeight: 1080,
  autoSaveProject: true
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
    autoSaveProject: bool('autoSaveProject')
  }
}

export function useEditorPrefs(): [EditorPrefs, (values: Partial<EditorPrefs>) => void] {
  const [prefs, setPrefs] = useState<EditorPrefs>(defaultEditorPrefs)
  useEffect(() => {
    void window.recscene.prefs.get().then((raw) => setPrefs(editorPrefsFrom(raw)))
  }, [])
  const update = useCallback((values: Partial<EditorPrefs>) => {
    setPrefs((p) => ({ ...p, ...values }))
    void window.recscene.prefs.set(values)
  }, [])
  return [prefs, update]
}
