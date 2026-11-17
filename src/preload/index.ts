import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import type { Project } from '@core/project'
import type { PickerPrefs, PickerState, RecordRequest } from '@core/recordingPicker'
import type { SessionState } from '@core/recordingSession'
import type { SpeakerNotesPrefs } from '@core/speakerNotes'
import type { OpenedProject } from '@core/projectFile'

export interface SessionSnapshot extends SessionState {
  toast: string | null
}

const on = <T>(channel: string, listener: (payload: T) => void): (() => void) => {
  const handler = (_event: unknown, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

/** The only surface the renderer can reach. Keep it small and typed. */
const api = {
  platform: process.platform,
  version: (): Promise<string> => ipcRenderer.invoke('app:version') as Promise<string>,
  openPicker: (): Promise<void> => ipcRenderer.invoke('app:openPicker') as Promise<void>,
  projectsRoot: (): Promise<string> => ipcRenderer.invoke('app:projectsRoot') as Promise<string>,
  onRecordingFinished: (listener: (result: RecordingResult) => void): (() => void) => on('recording:finished', listener),
  onNotice: (listener: (message: string) => void): (() => void) => on('app:notice', listener),
  /** App-wide preferences the editor reads and writes (specs 57, 60–62, 67, 73). */
  prefs: {
    get: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('prefs:get') as Promise<Record<string, unknown>>,
    set: (values: Record<string, unknown>): Promise<void> => ipcRenderer.invoke('prefs:set', values) as Promise<void>
  },
  project: {
    current: (): Promise<OpenedProject | null> => ipcRenderer.invoke('project:current') as Promise<OpenedProject | null>,
    open: (projectDir: string): Promise<OpenedProject> => ipcRenderer.invoke('project:open', projectDir) as Promise<OpenedProject>,
    pick: (): Promise<OpenedProject | null> => ipcRenderer.invoke('project:pick') as Promise<OpenedProject | null>,
    save: (project: Project): Promise<{ lastSavedAt: string }> => ipcRenderer.invoke('project:save', project) as Promise<{ lastSavedAt: string }>,
    saveAs: (project: Project): Promise<OpenedProject | null> => ipcRenderer.invoke('project:saveAs', project) as Promise<OpenedProject | null>,
    recent: (): Promise<{ projectDir: string; name: string }[]> => ipcRenderer.invoke('project:recent') as Promise<{ projectDir: string; name: string }[]>,
    showInFinder: (): Promise<void> => ipcRenderer.invoke('project:showInFinder') as Promise<void>,
    copyFrame: (png: ArrayBuffer): Promise<void> => ipcRenderer.invoke('project:copyFrame', png) as Promise<void>,
    exportFrame: (png: ArrayBuffer, timeMs: number): Promise<string | null> => ipcRenderer.invoke('project:exportFrame', png, timeMs) as Promise<string | null>,
    onOpened: (listener: (opened: OpenedProject) => void): (() => void) => on('project:opened', listener)
  },
  onEditorAction: (listener: (id: string) => void): (() => void) => on('editor:action', listener),
  picker: {
    state: (): Promise<PickerState> => ipcRenderer.invoke('picker:state') as Promise<PickerState>,
    savePrefs: (values: Partial<PickerPrefs>): Promise<PickerPrefs> => ipcRenderer.invoke('picker:savePrefs', values) as Promise<PickerPrefs>,
    record: (request: RecordRequest): Promise<{ projectDir: string }> => ipcRenderer.invoke('picker:record', request) as Promise<{ projectDir: string }>,
    cancel: (): Promise<void> => ipcRenderer.invoke('picker:cancel') as Promise<void>,
    onCover: (listener: () => void): (() => void) => on('picker:cover', listener)
  },
  notes: {
    prefs: (): Promise<SpeakerNotesPrefs> => ipcRenderer.invoke('notes:prefs') as Promise<SpeakerNotesPrefs>,
    save: (values: Partial<SpeakerNotesPrefs>): Promise<SpeakerNotesPrefs> => ipcRenderer.invoke('notes:save', values) as Promise<SpeakerNotesPrefs>,
    close: (): Promise<void> => ipcRenderer.invoke('notes:close') as Promise<void>,
    onUpdate: (listener: (prefs: SpeakerNotesPrefs) => void): (() => void) => on('notes:update', listener),
    onTogglePrompter: (listener: () => void): (() => void) => on('notes:togglePrompter', listener)
  },
  widget: {
    state: (): Promise<SessionSnapshot | null> => ipcRenderer.invoke('widget:state') as Promise<SessionSnapshot | null>,
    onUpdate: (listener: (snapshot: SessionSnapshot | null) => void): (() => void) => on('widget:update', listener),
    stop: (): Promise<void> => ipcRenderer.invoke('widget:stop') as Promise<void>,
    pause: (): Promise<void> => ipcRenderer.invoke('widget:pause') as Promise<void>,
    resume: (): Promise<void> => ipcRenderer.invoke('widget:resume') as Promise<void>,
    marker: (): Promise<void> => ipcRenderer.invoke('widget:marker') as Promise<void>,
    flag: (): Promise<void> => ipcRenderer.invoke('widget:flag') as Promise<void>,
    restart: (): Promise<boolean> => ipcRenderer.invoke('widget:restart') as Promise<boolean>,
    cancel: (): Promise<boolean> => ipcRenderer.invoke('widget:cancel') as Promise<boolean>
  }
}

export type RecsceneApi = typeof api

contextBridge.exposeInMainWorld('recscene', api)
