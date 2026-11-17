/** Undo and redo over whole project snapshots (spec 63): a buffer of 100 states. */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export const HISTORY_SIZE = 100

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

export function record<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h
  const past = [...h.past, h.present].slice(-HISTORY_SIZE)
  return { past, present: next, future: [] }
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0

export function undo<T>(h: History<T>): History<T> {
  const previous = h.past[h.past.length - 1]
  if (previous === undefined) return h
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[0]
  if (next === undefined) return h
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1) }
}
