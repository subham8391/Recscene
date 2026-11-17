import type { RecordedEvents } from './captureProtocol'
import type { RecordingMarker } from './recordingSession'
import { defaultProjectConfig, type Project } from './project'

/** The folder name for a new recording, e.g. "Recording 2026-11-17 at 15.09.recscene". */
export function recordingFolderName(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} at ${p(date.getHours())}.${p(date.getMinutes())}`
  return `Recording ${stamp}.recscene`
}

export interface NewProjectInput {
  id: string
  name: string
  createdAt: string
  durationMs: number
  screen: { width: number; height: number; file: string }
  mic?: { file: string }
  events: RecordedEvents
  flags?: number[]
}

/** Builds the project document written as project.json after a recording stops. */
export function newProject(input: NewProjectInput): Project {
  return {
    version: 1,
    name: input.name,
    meta: { recordingFlags: input.flags ?? [] },
    config: { ...defaultProjectConfig },
    recording: {
      id: input.id,
      createdAt: input.createdAt,
      durationMs: input.durationMs,
      screen: input.screen,
      ...(input.mic ? { microphone: input.mic } : {}),
      clicks: input.events.clicks,
      keys: input.events.keys
    },
    zooms: [],
    clips: []
  }
}

/** A project as the editor receives it: the document, its markers and media URLs the renderer may load. */
export interface OpenedProject {
  projectDir: string
  project: Project
  markers: RecordingMarker[]
  media: { screen: string; mic?: string; systemAudio?: string }
}
