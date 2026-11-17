import { useEffect, useState } from 'react'
import type { RecordingResult } from '@core/captureProtocol'
import { formatTimecode } from '@core/time'

/**
 * The editor shell from the design canvas: tool rail, stage, inspector and
 * timeline. Every panel is a placeholder until its feature lands; the layout,
 * sizes and tokens are the ones the laptop boards were drawn with.
 */
export function App(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [last, setLast] = useState<RecordingResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void window.recscene.version().then(setVersion)
    const offFinished = window.recscene.onRecordingFinished(setLast)
    const offNotice = window.recscene.onNotice(setNotice)
    return () => {
      offFinished()
      offNotice()
    }
  }, [])

  return (
    <div className="app">
      <header className="titlebar">
        <span className="titlebar__name">Recscene</span>
        <span className="titlebar__project">{last ? last.projectDir.split('/').pop()?.replace('.recscene', '') : 'Untitled recording'}</span>
        <span className="titlebar__version">{version && `v${version}`}</span>
      </header>
      <nav className="rail" aria-label="Editor panels">
        {['Zooms', 'Clips', 'Cursor', 'Camera', 'Background', 'Masks', 'Shortcuts', 'Captions', 'Audio', 'Enhance'].map((name) => (
          <button key={name} className="rail__item" type="button">
            {name}
          </button>
        ))}
      </nav>
      <main className="stage">
        <div className="stage__frame">
          <p className="stage__motto">Record the screen. Make it a scene.</p>
          {notice && (
            <p className="notice" role="alert">
              {notice} <button type="button" className="btn btn--ghost" onClick={() => setNotice(null)}>Dismiss</button>
            </p>
          )}
          <button className="btn btn--accent" type="button" onClick={() => void window.recscene.openPicker()}>
            New recording <kbd>⇧⌘R</kbd>
          </button>
          {last && (
            <dl className="recorder__result">
              <dt>Saved to</dt>
              <dd>{last.projectDir}</dd>
              <dt>Length</dt>
              <dd>
                {formatTimecode(last.durationMs)} · {last.frames} frames · {last.width}×{last.height}
              </dd>
              <dt>Captured</dt>
              <dd>
                {last.clicks} clicks · {last.keys} keystrokes · {last.cursorSamples} cursor samples
              </dd>
            </dl>
          )}
        </div>
      </main>
      <aside className="inspector" aria-label="Inspector">
        <h2>Zooms</h2>
        <p className="muted">Automatic zooms follow your clicks. Adjust them here once a recording is loaded.</p>
      </aside>
      <footer className="timeline" aria-label="Timeline">
        <span className="timeline__playhead">{formatTimecode(0)}</span>
        <div className="timeline__tracks" />
      </footer>
    </div>
  )
}
