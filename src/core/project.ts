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

export interface ZoomRegion {
  id: string
  startMs: Ms
  endMs: Ms
  /** Centre of the zoom in normalised screen space. */
  center: Point
  /** 1 = no zoom. 2 = the screen is shown at twice its size. */
  scale: number
  /** True when the app created it from clicks; false when the user drew it. */
  automatic: boolean
}

export interface Clip {
  id: string
  startMs: Ms
  endMs: Ms
  /** Playback rate; 1 = real time. */
  speed: number
}

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

export interface Project {
  version: 1
  name: string
  recording: Recording
  zooms: ZoomRegion[]
  clips: Clip[]
}
