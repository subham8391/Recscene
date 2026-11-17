import { useEffect, useState } from 'react'
import type { OpenedProject } from '@core/projectFile'
import { Editor } from './editor/Editor'

/** The main window: the editor when a project is open, otherwise the start screen. */
export function App(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [opened, setOpened] = useState<OpenedProject | null>(null)
  const [recent, setRecent] = useState<{ projectDir: string; name: string }[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void window.recscene.version().then(setVersion)
    void window.recscene.project.current().then((p) => p && setOpened(p))
    void window.recscene.project.recent().then(setRecent)
    const offOpened = window.recscene.project.onOpened((p) => {
      setOpened(p)
      void window.recscene.project.recent().then(setRecent)
    })
    const offNotice = window.recscene.onNotice(setNotice)
    return () => {
      offOpened()
      offNotice()
    }
  }, [])

  if (opened) return <Editor key={opened.projectDir} opened={opened} notice={notice} onDismissNotice={() => setNotice(null)} />

  return (
    <div className="start">
      <header className="titlebar">
        <span className="titlebar__name">Recscene</span>
        <span className="titlebar__version">{version && `v${version}`}</span>
      </header>
      <main className="start__body">
        <p className="stage__motto">Record the screen. Make it a scene.</p>
        {notice && (
          <p className="notice" role="alert">
            {notice} <button type="button" className="btn btn--ghost" onClick={() => setNotice(null)}>Dismiss</button>
          </p>
        )}
        <div className="start__actions">
          <button className="btn btn--accent" type="button" onClick={() => void window.recscene.openPicker()}>New recording <kbd>⇧⌘R</kbd></button>
          <button className="btn btn--ghost" type="button" onClick={() => void window.recscene.project.pick()}>Open project… <kbd>⌘O</kbd></button>
        </div>
        {recent.length > 0 && (
          <section className="start__recent" aria-label="Recent projects">
            <h2 className="muted">Recent</h2>
            <ul>
              {recent.map((r) => (
                <li key={r.projectDir}>
                  <button type="button" className="start__project" onClick={() => void window.recscene.project.open(r.projectDir)}>
                    <span>{r.name}</span><span className="muted">{r.projectDir.replace(/\/[^/]+$/, '')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
