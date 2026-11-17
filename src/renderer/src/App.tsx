import { useEffect, useState } from 'react'
import type { OpenedProject } from '@core/projectFile'
import { Editor } from './editor/Editor'
import { ProjectsHome } from './home/ProjectsHome'

/** The main window: the editor when a project is open, otherwise the projects home. */
export function App(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [opened, setOpened] = useState<OpenedProject | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void window.recscene.version().then(setVersion)
    void window.recscene.project.current().then((p) => p && setOpened(p))
    const offOpened = window.recscene.project.onOpened(setOpened)
    const offClosed = window.recscene.project.onClosed(() => setOpened(null))
    const offNotice = window.recscene.onNotice(setNotice)
    return () => {
      offOpened()
      offClosed()
      offNotice()
    }
  }, [])

  if (opened) return <Editor key={opened.projectDir} opened={opened} notice={notice} onDismissNotice={() => setNotice(null)} />
  return <ProjectsHome version={version} notice={notice} onDismissNotice={() => setNotice(null)} />
}
