import { useEffect, useState } from 'react'
import { formatTimecode } from '@core/time'
import { Recorder } from './Recorder'

/**
 * The editor shell from the design canvas: tool rail, stage, inspector and
 * timeline. Every panel is a placeholder until its feature lands; the layout,
 * sizes and tokens are the ones the laptop boards were drawn with.
 */
export function App(): React.JSX.Element {
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.recscene.version().then(setVersion)
  }, [])

  return (
    <div className="app">
      <header className="titlebar">
        <span className="titlebar__name">Recscene</span>
        <span className="titlebar__project">Untitled recording</span>
        <span className="titlebar__version">{version && `v${version}`}</span>
      </header>
      <nav className="rail" aria-label="Editor panels">
        {['Zooms', 'Camera', 'Cursor', 'Background', 'Masks', 'Audio', 'Captions'].map((name) => (
          <button key={name} className="rail__item" type="button">
            {name}
          </button>
        ))}
      </nav>
      <main className="stage">
        <div className="stage__frame">
          <p className="stage__motto">Record the screen. Make it a scene.</p>
          <Recorder />
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
