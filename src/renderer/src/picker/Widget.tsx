import { useEffect, useState } from 'react'
import { formatClock } from '@core/recordingPicker'
import { elapsedMs, isPaused, type SessionState } from '@core/recordingSession'

type Snapshot = (SessionState & { toast: string | null }) | null

/** The floating recording widget (specs 22–26, 32), drawn after the recording-flow board. */
export function Widget(): React.JSX.Element {
  const [snap, setSnap] = useState<Snapshot>(null)
  const [now, setNow] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void window.recscene.widget.state().then((s) => {
      setSnap(s)
      setNow(Date.now())
    })
    const off = window.recscene.widget.onUpdate(setSnap)
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => {
      off()
      window.clearInterval(id)
    }
  }, [])

  const run = (name: string, action: () => Promise<unknown>): void => {
    setBusy(name)
    void action().finally(() => setBusy(null))
  }

  const paused = snap ? isPaused(snap.clock) : false
  const clock = snap && now ? formatClock(elapsedMs(snap.clock, now)) : '00:00'

  return (
    <div className={`widget${paused ? ' widget--paused' : ''}`} role="group" aria-label="Recording in progress controls">
      <span className="widget__dot" aria-hidden="true" />
      <span className="widget__clock">{clock}</span>
      {snap?.toast ? <span className="widget__toast" role="status">{snap.toast}</span> : <span className="widget__sep" aria-hidden="true" />}
      <button type="button" className="widget__btn" aria-label={paused ? 'Resume recording' : 'Pause'} disabled={busy !== null} onClick={() => run('pause', () => (paused ? window.recscene.widget.resume() : window.recscene.widget.pause()))}>
        {paused ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l12 8-12 8z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        )}
      </button>
      <button type="button" className="widget__btn" aria-label="Add recording marker" disabled={busy !== null} onClick={() => run('marker', () => window.recscene.widget.marker())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v18M6 9l6-6 6 6" /></svg>
      </button>
      <button type="button" className="widget__btn" aria-label="Add recording flag (⌘⌥⌃F)" disabled={busy !== null} onClick={() => run('flag', () => window.recscene.widget.flag())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 21V4h12l-3 4 3 4H5" /></svg>
      </button>
      <span className="widget__sep" aria-hidden="true" />
      <button type="button" className="widget__btn" aria-label="Restart entire recording" disabled={busy !== null} onClick={() => run('restart', () => window.recscene.widget.restart())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></svg>
      </button>
      <button type="button" className="widget__btn widget__btn--danger" aria-label="Cancel recording" disabled={busy !== null} onClick={() => run('cancel', () => window.recscene.widget.cancel())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <button type="button" className="widget__stop" disabled={busy !== null} onClick={() => run('stop', () => window.recscene.widget.stop())}>
        {busy === 'stop' ? 'Saving…' : 'Stop'}
      </button>
    </div>
  )
}
