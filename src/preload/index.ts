import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import type { PickerPrefs, PickerState, RecordRequest } from '@core/recordingPicker'

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
    state: (): Promise<{ startedAt: number }> => ipcRenderer.invoke('widget:state') as Promise<{ startedAt: number }>,
    stop: (): Promise<void> => ipcRenderer.invoke('widget:stop') as Promise<void>
  }
}

export type RecsceneApi = typeof api

contextBridge.exposeInMainWorld('recscene', api)
