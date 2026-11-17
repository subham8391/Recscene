import { contextBridge, ipcRenderer } from 'electron'
import type { DisplayTarget, Permissions, RecordingResult, StartOptions, WindowTarget } from '@core/captureProtocol'

export type RendererStartOptions = Omit<StartOptions, 'outputDir'>

/** The only surface the renderer can reach. Keep it small and typed. */
const api = {
  platform: process.platform,
  version: (): Promise<string> => ipcRenderer.invoke('app:version') as Promise<string>,
  capture: {
    permissions: (request = false): Promise<Permissions> => ipcRenderer.invoke('capture:permissions', request) as Promise<Permissions>,
    listTargets: (): Promise<{ displays: DisplayTarget[]; windows: WindowTarget[] }> =>
      ipcRenderer.invoke('capture:list') as Promise<{ displays: DisplayTarget[]; windows: WindowTarget[] }>,
    start: (options: RendererStartOptions): Promise<{ projectDir: string }> =>
      ipcRenderer.invoke('capture:start', options) as Promise<{ projectDir: string }>,
    stop: (): Promise<RecordingResult> => ipcRenderer.invoke('capture:stop') as Promise<RecordingResult>,
    projectsRoot: (): Promise<string> => ipcRenderer.invoke('capture:projectsRoot') as Promise<string>,
    onWarning: (listener: (message: string) => void): (() => void) => {
      const handler = (_event: unknown, message: string): void => listener(message)
      ipcRenderer.on('capture:warning', handler)
      return () => ipcRenderer.removeListener('capture:warning', handler)
    }
  }
}

export type RecsceneApi = typeof api

contextBridge.exposeInMainWorld('recscene', api)
