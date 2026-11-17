import { contextBridge, ipcRenderer } from 'electron'

/** The only surface the renderer can reach. Keep it small and typed. */
const api = {
  platform: process.platform,
  version: (): Promise<string> => ipcRenderer.invoke('app:version') as Promise<string>
}

export type RecsceneApi = typeof api

contextBridge.exposeInMainWorld('recscene', api)
