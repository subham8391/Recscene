import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import type { Project } from '@core/project'
import type { PickerPrefs, PickerState, RecordRequest } from '@core/recordingPicker'
import type { SessionState } from '@core/recordingSession'
import type { SpeakerNotesPrefs } from '@core/speakerNotes'
import type { OpenedProject } from '@core/projectFile'
import type { ExportSettings, ExportTarget } from '@core/editor/exportSettings'
import type { ProjectSummary, UnfinishedRecording } from '@core/projectsHome'
import type { MusicTrack } from '@core/editor/audio'
import type { Transcript } from '@core/editor/captions'

export interface ProjectsFolder {
  path: string
  isDefault: boolean
  outsideMainStorage: boolean
}

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
    onOpened: (listener: (opened: OpenedProject) => void): (() => void) => on('project:opened', listener),
    close: (): Promise<void> => ipcRenderer.invoke('project:close') as Promise<void>,
    onClosed: (listener: () => void): (() => void) => on('project:closed', listener),
    pickBackgroundImage: (): Promise<{ file: string; url: string } | null> => ipcRenderer.invoke('project:pickBackgroundImage') as Promise<{ file: string; url: string } | null>,
    /** A dropped File (its path is resolved here) or pasted PNG bytes. */
    importBackgroundImage: (source: File | ArrayBuffer): Promise<{ file: string; url: string }> =>
      ipcRenderer.invoke('project:importBackgroundImage', source instanceof ArrayBuffer ? source : webUtils.getPathForFile(source)) as Promise<{ file: string; url: string }>,
    mediaUrl: (file: string): Promise<string | null> => ipcRenderer.invoke('project:mediaUrl', file) as Promise<string | null>
  },
  /** Captions (specs 205–212): on-device transcription through the helper and subtitle files. */
  captions: {
    locales: (): Promise<string[]> => ipcRenderer.invoke('captions:locales') as Promise<string[]>,
    generate: (locale: string | null): Promise<Transcript> => ipcRenderer.invoke('captions:generate', locale) as Promise<Transcript>,
    exportFile: (format: 'srt' | 'vtt' | 'txt', content: string, name: string): Promise<string | null> => ipcRenderer.invoke('captions:export', format, content, name) as Promise<string | null>
  },
  /** Background music (specs 218–219). */
  music: {
    catalogue: (): Promise<MusicTrack[]> => ipcRenderer.invoke('music:catalogue') as Promise<MusicTrack[]>,
    library: (): Promise<string[]> => ipcRenderer.invoke('music:library') as Promise<string[]>,
    openLibraryFolder: (): Promise<void> => ipcRenderer.invoke('music:openLibraryFolder') as Promise<void>,
    pickFile: (): Promise<{ file: string; url: string } | null> => ipcRenderer.invoke('music:pickFile') as Promise<{ file: string; url: string } | null>,
    importFile: (file: File): Promise<{ file: string; url: string }> => ipcRenderer.invoke('music:importFile', webUtils.getPathForFile(file)) as Promise<{ file: string; url: string }>
  },
  /** The projects home (Projects board; specs 7, 40, 75, 255). */
  library: {
    list: (): Promise<ProjectSummary[]> => ipcRenderer.invoke('library:list') as Promise<ProjectSummary[]>,
    storage: (): Promise<{ usedBytes: number; freeBytes: number }> => ipcRenderer.invoke('library:storage') as Promise<{ usedBytes: number; freeBytes: number }>,
    rename: (projectDir: string, name: string): Promise<{ projectDir: string; name: string }> => ipcRenderer.invoke('library:rename', projectDir, name) as Promise<{ projectDir: string; name: string }>,
    duplicate: (projectDir: string): Promise<{ projectDir: string; name: string }> => ipcRenderer.invoke('library:duplicate', projectDir) as Promise<{ projectDir: string; name: string }>,
    trash: (projectDir: string): Promise<void> => ipcRenderer.invoke('library:trash', projectDir) as Promise<void>,
    showInFinder: (projectDir: string): Promise<void> => ipcRenderer.invoke('library:showInFinder', projectDir) as Promise<void>,
    saveThumbnail: (projectDir: string, png: ArrayBuffer): Promise<string> => ipcRenderer.invoke('library:saveThumbnail', projectDir, png) as Promise<string>,
    unfinished: (): Promise<UnfinishedRecording[]> => ipcRenderer.invoke('library:unfinished') as Promise<UnfinishedRecording[]>,
    recover: (dir: string): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke('library:recover', dir) as Promise<{ ok: boolean; message: string }>,
    deleteUnfinished: (dir: string): Promise<void> => ipcRenderer.invoke('library:deleteUnfinished', dir) as Promise<void>,
    createFromVideo: (): Promise<void> => ipcRenderer.invoke('library:createFromVideo') as Promise<void>,
    folder: (): Promise<ProjectsFolder> => ipcRenderer.invoke('library:folder') as Promise<ProjectsFolder>,
    chooseFolder: (): Promise<ProjectsFolder> => ipcRenderer.invoke('library:chooseFolder') as Promise<ProjectsFolder>,
    resetFolder: (): Promise<void> => ipcRenderer.invoke('library:resetFolder') as Promise<void>
  },
  onEditorAction: (listener: (id: string) => void): (() => void) => on('editor:action', listener),
  export: {
    settings: (): Promise<{ last: unknown; defaults: unknown }> => ipcRenderer.invoke('export:settings') as Promise<{ last: unknown; defaults: unknown }>,
    saveSettings: (settings: ExportSettings, asDefault: boolean): Promise<void> => ipcRenderer.invoke('export:saveSettings', settings, asDefault) as Promise<void>,
    begin: (args: { target: ExportTarget; projectName: string; settings: ExportSettings; size: { width: number; height: number } }): Promise<{ id: string; target: ExportTarget; destination: string; settings: ExportSettings } | null> =>
      ipcRenderer.invoke('export:begin', args) as Promise<{ id: string; target: ExportTarget; destination: string; settings: ExportSettings } | null>,
    chunk: (id: string, chunk: ArrayBuffer, position: number): Promise<void> => ipcRenderer.invoke('export:chunk', id, chunk, position) as Promise<void>,
    audio: (id: string, wav: ArrayBuffer): Promise<void> => ipcRenderer.invoke('export:audio', id, wav) as Promise<void>,
    finish: (id: string): Promise<{ path: string; durationMs: number | null }> => ipcRenderer.invoke('export:finish', id) as Promise<{ path: string; durationMs: number | null }>,
    cancel: (id: string): Promise<void> => ipcRenderer.invoke('export:cancel', id) as Promise<void>,
    reveal: (path: string): Promise<void> => ipcRenderer.invoke('export:reveal', path) as Promise<void>
  },
  picker: {
    state: (): Promise<PickerState> => ipcRenderer.invoke('picker:state') as Promise<PickerState>,
    savePrefs: (values: Partial<PickerPrefs>): Promise<PickerPrefs> => ipcRenderer.invoke('picker:savePrefs', values) as Promise<PickerPrefs>,
    record: (request: RecordRequest): Promise<{ projectDir: string }> => ipcRenderer.invoke('picker:record', request) as Promise<{ projectDir: string }>,
    cancel: (): Promise<void> => ipcRenderer.invoke('picker:cancel') as Promise<void>,
    onCover: (listener: () => void): (() => void) => on('picker:cover', listener),
    /** Spec 8: asks macOS for camera access on the app's behalf. */
    askCamera: (): Promise<boolean> => ipcRenderer.invoke('picker:askCamera') as Promise<boolean>
  },
  /** The live camera bubble while recording (specs 8, 11). */
  cameraPreview: {
    state: (): Promise<{ cameraName: string; previewType: 'square' | 'full-frame' } | null> => ipcRenderer.invoke('campreview:state') as Promise<{ cameraName: string; previewType: 'square' | 'full-frame' } | null>
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
