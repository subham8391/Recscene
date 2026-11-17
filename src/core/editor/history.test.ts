import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, createHistory, HISTORY_SIZE, record, redo, undo } from './history'

describe('history', () => {
  it('records, undoes and redoes', () => {
    let h = createHistory(0)
    h = record(record(h, 1), 2)
    expect(canUndo(h)).toBe(true)
    h = undo(h)
    expect(h.present).toBe(1)
    expect(canRedo(h)).toBe(true)
    h = redo(h)
    expect(h.present).toBe(2)
    expect(undo(undo(undo(h))).present).toBe(0)
  })

  it('drops the redo stack on a new change and caps the buffer', () => {
    let h = record(record(createHistory(0), 1), 2)
    h = record(undo(h), 5)
    expect(h.future).toEqual([])
    for (let i = 0; i < HISTORY_SIZE + 20; i += 1) h = record(h, i + 100)
    expect(h.past).toHaveLength(HISTORY_SIZE)
    expect(record(h, h.present)).toBe(h)
  })
})
