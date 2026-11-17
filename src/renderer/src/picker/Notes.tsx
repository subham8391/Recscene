import { useEffect, useRef, useState } from 'react'
import { FONT_SIZES, prompterOffset, type SpeakerNotesPrefs } from '@core/speakerNotes'

/** The speaker notes window with the teleprompter (specs 27–28), after the recording-flow board. */
export function Notes(): React.JSX.Element {
  const [prefs, setPrefs] = useState<SpeakerNotesPrefs | null>(null)
  const [running, setRunning] = useState<{ since: number; from: number } | null>(null)
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.recscene.notes.prefs().then(setPrefs)
    const offUpdate = window.recscene.notes.onUpdate(setPrefs)
    const offToggle = window.recscene.notes.onTogglePrompter(() => setRunning((r) => (r ? null : { since: Date.now(), from: scroller.current?.scrollTop ?? 0 })))
    return () => {
      offUpdate()
      offToggle()
    }
  }, [])

  useEffect(() => {
    if (!running || !prefs) return
    const el = scroller.current
    if (!el) return
    const id = window.setInterval(() => {
      const max = el.scrollHeight - el.clientHeight
      const next = Math.min(max, running.from + prompterOffset(Date.now() - running.since, prefs.prompterSpeed, max))
      el.scrollTop = next
      setOffset(next)
      if (next >= max) setRunning(null)
    }, 40)
    return () => window.clearInterval(id)
  }, [running, prefs])

  if (!prefs) return <div className="notes" />

  const save = (values: Partial<SpeakerNotesPrefs>): void => {
    setPrefs((p) => (p ? { ...p, ...values } : p))
    void window.recscene.notes.save(values)
  }
  const toggle = (): void => setRunning((r) => (r ? null : { since: Date.now(), from: scroller.current?.scrollTop ?? 0 }))

  return (
    <div className="notes" style={{ opacity: prefs.speakerNotesOpacity }} role="region" aria-label="Speaker notes">
      <div className="notes__head">
        <span>Speaker notes · not recorded</span>
        <span className="notes__spacer" />
        <button type="button" className="notes__btn" onClick={() => setEditing((e) => !e)}>{editing ? 'Done' : 'Edit'}</button>
        <button type="button" className="notes__btn" aria-label="Close speaker notes" onClick={() => void window.recscene.notes.close()}>×</button>
      </div>
      {editing ? (
        <textarea
          className="notes__edit"
          style={{ fontSize: prefs.speakerNotesFontSize }}
          value={prefs.speakerNotesText}
          placeholder="Enter your notes here. This window will not be visible in the final recording…"
          onChange={(e) => save({ speakerNotesText: e.target.value })}
        />
      ) : (
        <div ref={scroller} className="notes__body" style={{ fontSize: prefs.speakerNotesFontSize }} onClick={() => !prefs.speakerNotesText && setEditing(true)}>
          {prefs.speakerNotesText ? prefs.speakerNotesText.split('\n').map((line, i) => <p key={i}>{line || '\u00a0'}</p>) : <p className="notes__empty">Enter your notes here. This window will not be visible in the final recording…</p>}
          <div className="notes__tail" />
        </div>
      )}
      <div className="notes__foot">
        <button type="button" className={`notes__btn${running ? ' notes__btn--on' : ''}`} onClick={toggle}>{running ? 'Stop prompter' : 'Start prompter'} ⌥⌘.</button>
        <label className="notes__ctl">Speed<input type="range" min={0} max={100} value={prefs.prompterSpeed} onChange={(e) => save({ prompterSpeed: Number(e.target.value) })} /></label>
        <select className="notes__sel" aria-label="Font size" value={prefs.speakerNotesFontSize} onChange={(e) => save({ speakerNotesFontSize: Number(e.target.value) })}>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s} px</option>)}
        </select>
        <label className="notes__ctl" title="Notepad opacity">◐<input type="range" min={30} max={100} value={Math.round(prefs.speakerNotesOpacity * 100)} onChange={(e) => save({ speakerNotesOpacity: Number(e.target.value) / 100 })} /></label>
        <span className="notes__offset" aria-hidden="true">{running ? `${Math.round(offset)} px` : ''}</span>
      </div>
    </div>
  )
}
