import { useEffect, useState } from 'react'
import { formatClock } from '@core/recordingPicker'

/** The floating recording widget (spec 32). Pause, flag, restart and delete land with specs 22–26. */
export function Widget(): React.JSX.Element {
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    void window.recscene.widget.state().then((s) => {
      setStartedAt(s.startedAt)
      setNow(Date.now())
    })
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const stop = (): void => {
    setStopping(true)
    void window.recscene.widget.stop()
  }

  return (
    <div className="widget" role="group" aria-label="Recording in progress controls">
      <span className="widget__dot" aria-hidden="true" />
      <span className="widget__clock">{startedAt && now ? formatClock(now - startedAt) : '00:00'}</span>
      <span className="widget__sep" aria-hidden="true" />
      <button type="button" className="widget__btn" aria-label="Pause (coming with spec 22)" disabled>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
      </button>
      <button type="button" className="widget__btn" aria-label="Add recording flag (coming with spec 26)" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 21V4h12l-3 4 3 4H5" /></svg>
      </button>
      <button type="button" className="widget__btn" aria-label="Restart (coming with spec 23)" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></svg>
      </button>
      <button type="button" className="widget__btn widget__btn--danger" aria-label="Delete recording (coming with spec 24)" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
      </button>
      <button type="button" className="widget__stop" onClick={stop} disabled={stopping}>
        {stopping ? 'Saving…' : 'Stop'}
      </button>
    </div>
  )
}
