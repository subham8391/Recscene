/**
 * The Recscene project model. Everything here is plain data so it can be
 * serialised into the project bundle on disk and shared by main and renderer.
 */

/** Milliseconds from the start of the recording. */
export type Ms = number

/** A point in normalised screen space: 0..1 on both axes. */
export interface Point {
  x: number
  y: number
}

export interface ClickEvent {
  timeMs: Ms
  position: Point
  button: 'left' | 'right' | 'middle'
}

export interface KeyEvent {
  timeMs: Ms
  /** Display string such as "⌘C". */
  label: string
}

export type { ZoomRange } from './editor/zooms'

import { defaultClip, type Clip } from './editor/clips'
import type { ZoomRange } from './editor/zooms'
import { defaultCursorConfig, type CursorConfig } from './editor/cursor'
import { defaultBackgroundConfig, type BackgroundConfig } from './editor/background'
export type { Clip } from './editor/clips'

export interface Recording {
  id: string
  createdAt: string
  durationMs: Ms
  screen: { width: number; height: number; file: string }
  camera?: { width: number; height: number; file: string }
  microphone?: { file: string }
  clicks: ClickEvent[]
  keys: KeyEvent[]
}

export interface ProjectMeta {
  /** Spec 26: times (ms) flagged with ⌘⌥⌃F while recording. */
  recordingFlags: Ms[]
}

export interface ProjectConfig extends CursorConfig, BackgroundConfig {
  /** Spec 48: "x:y" or null for Auto. */
  defaultOutputAspectRatio: string | null
  /** Spec 81: the usable part of the source, [start, end] in ms. */
  recordingRange: [number, number] | null
  /** Spec 100: fractions of the recording, or null for no crop. */
  recordingCrop: { x: number; y: number; width: number; height: number } | null
  /** Spec 92: typing bursts (by start time) the user already handled. */
  resolvedTypingSuggestions: number[]
  /** Spec 114. */
  alwaysKeepZoomedIn: boolean
  /** Spec 123. */
  screenMovementSpring: { stiffness: number; damping: number; mass: number }
}

export const defaultProjectConfig: ProjectConfig = {
  ...defaultCursorConfig,
  ...defaultBackgroundConfig,
  defaultOutputAspectRatio: null,
  recordingRange: null,
  recordingCrop: null,
  resolvedTypingSuggestions: [],
  alwaysKeepZoomedIn: false,
  screenMovementSpring: { stiffness: 200, damping: 40, mass: 2.25 }
}

export interface Project {
  version: 1
  name: string
  meta: ProjectMeta
  config: ProjectConfig
  recording: Recording
  zooms: ZoomRange[]
  clips: Clip[]
  /** ISO timestamps (spec 73–74). */
  updatedAt?: string
  lastSavedAt?: string
}

/** Fills in anything an older project.json lacks. */
export function normaliseProject(raw: unknown): Project {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Project>
  const recording = r.recording ?? { id: 'unknown', createdAt: new Date(0).toISOString(), durationMs: 0, screen: { width: 0, height: 0, file: 'screen.mov' }, clicks: [], keys: [] }
  return {
    version: 1,
    name: typeof r.name === 'string' ? r.name : 'Untitled',
    meta: { recordingFlags: Array.isArray(r.meta?.recordingFlags) ? r.meta.recordingFlags.filter((n): n is number => typeof n === 'number') : [] },
    config: { ...defaultProjectConfig, ...(typeof r.config === 'object' && r.config ? r.config : {}) },
    recording: { ...recording, clicks: recording.clicks ?? [], keys: recording.keys ?? [] },
    zooms: Array.isArray(r.zooms) ? r.zooms : [],
    clips: Array.isArray(r.clips) && r.clips.length > 0 ? r.clips : [defaultClip(recording.durationMs)],
    ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
    ...(r.lastSavedAt ? { lastSavedAt: r.lastSavedAt } : {})
  }
}
