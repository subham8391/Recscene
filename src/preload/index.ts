import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import type { PickerPrefs, PickerState, RecordRequest } from '@core/recordingPicker'
import type { SessionState } from '@core/recordingSession'

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
  picker: {
    state: (): Promise<PickerState> => ipcRenderer.invoke('picker:state') as Promise<PickerState>,
    savePrefs: (values: Partial<PickerPrefs>): Promise<PickerPrefs> => ipcRenderer.invoke('picker:savePrefs', values) as Promise<PickerPrefs>,
    record: (request: RecordRequest): Promise<{ projectDir: string }> => ipcRenderer.invoke('picker:record', request) as Promise<{ projectDir: string }>,
    cancel: (): Promise<void> => ipcRenderer.invoke('picker:cancel') as Promise<void>,
    onCover: (listener: () => void): (() => void) => on('picker:cover', listener)
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
