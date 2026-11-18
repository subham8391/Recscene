import { Icon } from '../editor/railIcons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDuration } from '@core/time'
import {
  DELETE_CONFIRM,
  DELETE_DETAIL,
  EMPTY_LIBRARY,
  EMPTY_RECENT,
  FOLDER_OUTSIDE_WARNING,
  filterProjects,
  noMatches,
  projectChip,
  projectCountLabel,
  projectMeta,
  sectionProjects,
  storageLine,
  UNFINISHED_BANNER_DETAIL,
  unfinishedBannerTitle,
  type HomeSection,
  type ProjectSummary,
  type UnfinishedRecording
} from '@core/projectsHome'

interface Props {
  version: string
  notice: string | null
  onDismissNotice: () => void
}

interface Folder {
  path: string
  isDefault: boolean
  outsideMainStorage: boolean
}

interface Library {
  projects: ProjectSummary[]
  recentDirs: string[]
  storage: { usedBytes: number; freeBytes: number }
  unfinished: UnfinishedRecording[]
  folder: Folder
}

const GRADIENTS = [
  'linear-gradient(135deg,#1b2b5a,#5a3a8a 45%,#c9608a)',
  'linear-gradient(135deg,#0f3d3a,#176b5d 50%,#86c6a1)',
  'linear-gradient(135deg,#3a1d5c,#7a2f6b)',
  'linear-gradient(135deg,#1d3a5c,#0b1226)',
  'linear-gradient(135deg,#6b4bd6,#2b1d6b)',
  'linear-gradient(135deg,#e2b96b,#b0642f)',
  'linear-gradient(135deg,#2f5d8a,#1a2a44)',
  'linear-gradient(135deg,#444,#111)'
]

function gradientFor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]!
}

async function loadLibrary(): Promise<Library> {
  const [projects, recent, storage, unfinished, folder] = await Promise.all([
    window.recscene.library.list(),
    window.recscene.project.recent(),
    window.recscene.library.storage(),
    window.recscene.library.unfinished(),
    window.recscene.library.folder()
  ])
  return { projects, recentDirs: recent.map((r) => r.projectDir), storage, unfinished, folder }
}

/** Draws one frame of the footage at up to 480×270 so a project without a cached thumbnail gets one. */
async function drawThumbnail(screenUrl: string): Promise<ArrayBuffer> {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.preload = 'auto'
  video.src = screenUrl
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Video failed to load'))
  })
  video.currentTime = Math.min(1, Math.max(0, video.duration / 2))
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve()
    video.onerror = () => reject(new Error('Video failed to seek'))
  })
  const canvas = document.createElement('canvas')
  const scale = Math.min(480 / video.videoWidth, 270 / video.videoHeight)
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  video.removeAttribute('src')
  video.load()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No thumbnail')
  return blob.arrayBuffer()
}

/** IPC errors arrive as "Error invoking remote method '…': Error: <reason>"; only the reason is shown. */
function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.replace(/^Error invoking remote method '[^']*': /, '').replace(/^Error: /, '')
}

/**
 * The projects home (Projects board; specs 7, 40, 75, 255): every project in
 * the projects folder with search, rename, duplicate, trash, the unfinished
 * recording banner, storage and the projects folder.
 */
export function ProjectsHome({ version, notice, onDismissNotice }: Props): React.JSX.Element {
  const [lib, setLib] = useState<Library | null>(null)
  const [section, setSection] = useState<HomeSection>('recent')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<{ projectDir: string; x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState<{ projectDir: string; value: string; error: string | null } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const thumbnailQueue = useRef<{ busy: boolean; tried: Set<string> }>({ busy: false, tried: new Set() })

  const refresh = useCallback(() => {
    void loadLibrary().then((next) => {
      setLib(next)
      setNow(new Date())
    })
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    const tick = window.setInterval(() => setNow(new Date()), 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(tick)
    }
  }, [refresh])

  // Projects without a cached thumbnail get one drawn from the footage, one at a time.
  useEffect(() => {
    const q = thumbnailQueue.current
    if (!lib || q.busy) return
    const next = lib.projects.find((p) => !p.thumbnail && !q.tried.has(p.projectDir))
    if (!next) return
    q.busy = true
    q.tried.add(next.projectDir)
    void drawThumbnail(next.screen)
      .then((png) => window.recscene.library.saveThumbnail(next.projectDir, png))
      .then((url) => setLib((l) => (l ? { ...l, projects: l.projects.map((p) => (p.projectDir === next.projectDir ? { ...p, thumbnail: url } : p)) } : l)))
      .catch(() => setLib((l) => (l ? { ...l } : l)))
      .finally(() => {
        q.busy = false
      })
  }, [lib])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(null)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [menu])

  const open = (projectDir: string): void => {
    void window.recscene.project.open(projectDir).catch(() => refresh())
  }

  const startRename = (p: ProjectSummary): void => {
    setMenu(null)
    setRenaming({ projectDir: p.projectDir, value: p.name, error: null })
  }

  const commitRename = async (): Promise<void> => {
    if (!renaming) return
    try {
      const result = await window.recscene.library.rename(renaming.projectDir, renaming.value)
      setRenaming(null)
      setToast(`Renamed to “${result.name}”`)
      refresh()
    } catch (error) {
      setRenaming({ ...renaming, error: errorText(error) })
    }
  }

  const duplicate = async (projectDir: string): Promise<void> => {
    setMenu(null)
    const result = await window.recscene.library.duplicate(projectDir)
    setToast(`Duplicated as “${result.name}”`)
    refresh()
  }

  const trash = async (projectDir: string): Promise<void> => {
    setDeleting(null)
    await window.recscene.library.trash(projectDir)
    setToast('Project moved to the Trash')
    refresh()
  }

  const recover = async (dir: string): Promise<void> => {
    const result = await window.recscene.library.recover(dir)
    if (!result.ok) setToast(result.message)
    refresh()
  }

  const deleteUnfinished = async (dir: string): Promise<void> => {
    await window.recscene.library.deleteUnfinished(dir).catch(() => undefined)
    setToast('Unfinished recording deleted')
    refresh()
  }

  const chooseFolder = async (): Promise<void> => {
    await window.recscene.library.chooseFolder()
    refresh()
  }

  const resetFolder = async (): Promise<void> => {
    await window.recscene.library.resetFolder()
    refresh()
  }

  const all = lib?.projects ?? []
  const shown = filterProjects(sectionProjects(section, all, lib?.recentDirs ?? []), query)
  const storage = lib ? storageLine(lib.storage.usedBytes, lib.storage.freeBytes) : null
  const latestUnfinished = lib?.unfinished[0]
  const menuProject = menu ? all.find((p) => p.projectDir === menu.projectDir) : undefined
  const deletingProject = deleting ? all.find((p) => p.projectDir === deleting) : undefined

  return (
    <div className="home">
      <nav className="home__nav" aria-label="Library">
        <div className="home__drag" aria-hidden="true" />
        <button type="button" className={`home__navitem${section === 'recent' ? ' home__navitem--on' : ''}`} aria-current={section === 'recent'} onClick={() => setSection('recent')}>
          <span className="home__navlabel"><Icon name="recent" size={16} />Recent</span><span className="home__count">{lib ? sectionProjects('recent', all, lib.recentDirs).length : ''}</span>
        </button>
        <button type="button" className={`home__navitem${section === 'all' ? ' home__navitem--on' : ''}`} aria-current={section === 'all'} onClick={() => setSection('all')}>
          <span className="home__navlabel"><Icon name="all" size={16} />All projects</span><span className="home__count">{lib ? all.length : ''}</span>
        </button>
        <div className="home__spacer" />
        <section className="home__storage" aria-label="Storage">
          <span className="home__storage-title">Storage</span>
          <span className="home__bar" aria-hidden="true"><span style={{ width: `${Math.round((storage?.fraction ?? 0) * 100)}%` }} /></span>
          <span className="muted">{storage?.label ?? '…'}</span>
          <span className="home__folder" title={lib?.folder.path}>{lib?.folder.path.replace(/^\/Users\/[^/]+/, '~')}</span>
          {lib?.folder.outsideMainStorage && <span className="home__warn">{FOLDER_OUTSIDE_WARNING}</span>}
          <span className="home__folder-actions">
            <button type="button" className="home__link" onClick={() => void chooseFolder()}>Change folder…</button>
            {lib && !lib.folder.isDefault && <button type="button" className="home__link" onClick={() => void resetFolder()}>Use default</button>}
          </span>
        </section>
        <span className="home__version">{version && `Recscene v${version}`}</span>
      </nav>

      <main className="home__main">
        <header className="home__head">
          <h1>{section === 'recent' ? 'Recent projects' : 'All projects'}</h1>
          <span className="muted home__total">{lib ? projectCountLabel(all.length) : ''}</span>
          <div className="home__spacer" />
          <label htmlFor="home-search" className="sr-only">Search projects</label>
          <input id="home-search" className="home__search" type="search" placeholder="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="btn btn--ghost home__ghost" onClick={() => void window.recscene.library.createFromVideo()}>Create from video…</button>
          <button type="button" className="home__record" onClick={() => void window.recscene.openPicker()}><span className="home__dot" />New recording</button>
        </header>

        <div className="home__body" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void window.recscene.project.openDropped(f).catch((err: unknown) => setToast(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']*': (Error: )?/, '') : String(err))) }}>
          {notice && (
            <p className="notice" role="alert">
              {notice} <button type="button" className="btn btn--ghost" onClick={onDismissNotice}>Dismiss</button>
            </p>
          )}
          {toast && <p className="notice" role="status">{toast}</p>}

          {lib && latestUnfinished && (
            <section className="home__banner" aria-label="Unfinished recordings">
              <span className="home__banner-dot" />
              <div className="home__banner-text">
                <span className="home__banner-title">{unfinishedBannerTitle(lib.unfinished, now)}</span>
                <span className="muted">{UNFINISHED_BANNER_DETAIL}</span>
              </div>
              <div className="home__spacer" />
              <button type="button" className="home__recover" onClick={() => void recover(latestUnfinished.dir)}>Recover</button>
              <button type="button" className="home__delete" onClick={() => void deleteUnfinished(latestUnfinished.dir)}>Delete</button>
            </section>
          )}

          {lib && shown.length === 0 && (
            <p className="home__empty muted">{query.trim() ? noMatches(query) : section === 'recent' && all.length > 0 ? EMPTY_RECENT : EMPTY_LIBRARY}</p>
          )}

          <div className="home__grid">
            {shown.map((p) => {
              const chip = projectChip(p)
              const isRenaming = renaming?.projectDir === p.projectDir
              return (
                <article
                  key={p.projectDir}
                  className="home__card"
                  tabIndex={0}
                  aria-label={p.name}
                  onClick={() => { if (!isRenaming) open(p.projectDir) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isRenaming) open(p.projectDir) }}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ projectDir: p.projectDir, x: e.clientX, y: e.clientY }) }}
                >
                  <span className="home__thumb" style={{ background: gradientFor(p.name) }}>
                    {p.thumbnail ? <img src={p.thumbnail} alt="" draggable={false} /> : <span className="home__thumb-screen" />}
                    <span className="home__dur">{formatDuration(p.durationMs)}</span>
                  </span>
                  <span className="home__card-body">
                    {isRenaming ? (
                      <span className="home__rename" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={renaming.value}
                          aria-label="Project name"
                          aria-invalid={renaming.error !== null}
                          onChange={(e) => setRenaming({ ...renaming, value: e.target.value, error: null })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRename()
                            if (e.key === 'Escape') setRenaming(null)
                          }}
                          onBlur={() => void commitRename()}
                        />
                        {renaming.error && <span className="home__error" role="alert">{renaming.error}</span>}
                      </span>
                    ) : (
                      <span className="home__name">{p.name}</span>
                    )}
                    <span className="home__meta">{projectMeta(p, now)}</span>
                    {chip && <span className="home__chip">{chip}</span>}
                  </span>
                </article>
              )
            })}
          </div>
        </div>
      </main>

      {menu && menuProject && (
        <div role="menu" className="menu home__menu" style={{ left: menu.x, top: menu.y }} onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" role="menuitem" className="menu__item" onClick={() => { setMenu(null); open(menuProject.projectDir) }}>Open</button>
          <button type="button" role="menuitem" className="menu__item" onClick={() => startRename(menuProject)}>Rename</button>
          <button type="button" role="menuitem" className="menu__item" onClick={() => void duplicate(menuProject.projectDir)}>Duplicate</button>
          <button type="button" role="menuitem" className="menu__item" onClick={() => { setMenu(null); void window.recscene.library.showInFinder(menuProject.projectDir) }}>Show in Finder</button>
          <button type="button" role="menuitem" className="menu__item home__menu-danger" onClick={() => { setMenu(null); setDeleting(menuProject.projectDir) }}>Move to Trash…</button>
        </div>
      )}

      {deletingProject && (
        <div className="cmd__backdrop" onMouseDown={() => setDeleting(null)}>
          <div role="alertdialog" aria-labelledby="home-delete-title" className="home__dialog" onMouseDown={(e) => e.stopPropagation()}>
            <h2 id="home-delete-title">{DELETE_CONFIRM(deletingProject.name)}</h2>
            <p className="muted">{DELETE_DETAIL}</p>
            <div className="home__dialog-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button type="button" className="btn btn--danger" autoFocus onClick={() => void trash(deletingProject.projectDir)}>Move to Trash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
