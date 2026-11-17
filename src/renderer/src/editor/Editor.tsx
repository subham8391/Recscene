import { useCallback, useEffect, useRef, useState } from 'react'
import { actionForKey } from '@core/editor/actions'
import { ASPECT_OPTIONS, aspectLabel } from '@core/editor/aspect'
import { canRedo, canUndo, createHistory, record, redo, undo } from '@core/editor/history'
import { showsSidebar, showsTimeline, togglePreview, toggleSidebar, toggleTimeline, type LayoutState } from '@core/editor/layout'
import {
  goToFirstFrame,
  goToLastFrame,
  initialPlayback,
  playBackwardOrIncreaseSpeed,
  playForwardOrIncreaseSpeed,
  seek,
  setSpeed,
  SPEED_CHOICES,
  speedLabel,
  step,
  stopAndResetSpeed,
  tick,
  togglePlay,
  type PlaybackState
} from '@core/editor/playback'
import { initialView, keepVisible, zoomView, type TimelineView } from '@core/editor/timelineView'
import type { Project } from '@core/project'
import { formatTimecode } from '@core/time'
import type { OpenedProject } from '@core/projectFile'
import { CommandMenu } from './CommandMenu'
import { Stage, type StageHandle } from './Stage'
import { Timeline, type TrackId, type TrackVisibility } from './Timeline'
import { useEditorPrefs } from './useEditorPrefs'

const PANELS: { id: string; label: string; key: string }[] = [
  { id: 'background', label: 'Background', key: '⌘1' },
  { id: 'cursor', label: 'Cursor', key: '⌘2' },
  { id: 'camera', label: 'Camera', key: '⌘3' },
  { id: 'captions', label: 'Captions', key: '⌘4' },
  { id: 'audio', label: 'Audio', key: '⌘5' },
  { id: 'shortcuts', label: 'Shortcuts', key: '⌘6' },
  { id: 'animations', label: 'Animations', key: '⌘7' },
  { id: 'device', label: 'Device', key: '⌘8' }
]

interface Props {
  opened: OpenedProject
  notice: string | null
  onDismissNotice: () => void
}

/** The editor shell (specs 48–79) around an open project. */
export function Editor({ opened, notice, onDismissNotice }: Props): React.JSX.Element {
  const [prefs, setPrefs] = useEditorPrefs()
  const [history, setHistory] = useState(() => createHistory(opened.project))
  const project = history.present
  const [durationMs, setDurationMs] = useState(opened.project.recording.durationMs)
  const [pb, setPb] = useState<PlaybackState>(() => initialPlayback(prefs.playbackLoop))
  const [preview, setPreview] = useState<number | null>(null)
  const [view, setView] = useState<TimelineView>(() => initialView(opened.project.recording.durationMs))
  const [visible, setVisible] = useState<TrackVisibility>({ zooms: true, layouts: false, masks: false, shortcuts: opened.project.recording.keys.length > 0 })
  const [layout, setLayout] = useState<LayoutState>('edit')
  const [panel, setPanel] = useState('background')
  const [overlay, setOverlay] = useState<'command' | 'guide' | null>(null)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [aspectOpen, setAspectOpen] = useState(false)
  const [saved, setSaved] = useState<{ at: string | null; dirty: boolean; toast: string | null }>({ at: opened.project.lastSavedAt ?? null, dirty: false, toast: null })
  const stage = useRef<StageHandle>(null)
  const lastTick = useRef<number | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    timeRef.current = pb.timeMs
  }, [pb.timeMs])

  // The playback clock (specs 52–57); the loop preference is global (spec 57) and the view follows the playhead (spec 59).
  const loop = prefs.playbackLoop
  useEffect(() => {
    if (!pb.playing) {
      lastTick.current = null
      return
    }
    let raf = 0
    const frame = (now: number): void => {
      const elapsed = lastTick.current === null ? 0 : now - lastTick.current
      lastTick.current = now
      setPb((p) => tick({ ...p, loop }, elapsed, durationMs))
      setView((v) => keepVisible(v, timeRef.current, durationMs))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [pb.playing, durationMs, loop])

  const edit = useCallback((next: Project) => {
    setHistory((h) => record(h, { ...next, updatedAt: new Date().toISOString() }))
    setSaved((s) => ({ ...s, dirty: true }))
  }, [])

  const save = useCallback(async () => {
    const { lastSavedAt } = await window.recscene.project.save(project)
    setSaved({ at: lastSavedAt, dirty: false, toast: 'Project saved' })
    window.setTimeout(() => setSaved((s) => ({ ...s, toast: null })), 2000)
  }, [project])

  // Autosave every 30 s while dirty (spec 73).
  useEffect(() => {
    if (!prefs.autoSaveProject) return
    const id = window.setInterval(() => {
      if (saved.dirty) void save()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [prefs.autoSaveProject, saved.dirty, save])

  const toggleTrack = (id: TrackId): void => {
    if (id === 'zooms') return
    setVisible((v) => ({ ...v, [id]: !v[id] }))
  }

  const run = useCallback(
    (id: string): void => {
      const D = durationMs
      switch (id) {
        case 'togglePlay': return setPb((p) => togglePlay(p, D))
        case 'playForwardOrIncreaseSpeed': return setPb((p) => playForwardOrIncreaseSpeed(p, D))
        case 'playBackwardOrIncreaseSpeed': return setPb((p) => playBackwardOrIncreaseSpeed(p, D))
        case 'stopAndResetSpeed': return setPb((p) => stopAndResetSpeed(p))
        case 'moveBackwards': return setPb((p) => step(p, 'back', false, D))
        case 'moveForwards': return setPb((p) => step(p, 'forward', false, D))
        case 'moveBackwardsFast': return setPb((p) => step(p, 'back', true, D))
        case 'moveForwardsFast': return setPb((p) => step(p, 'forward', true, D))
        case 'goToFirstFrame': return setPb((p) => goToFirstFrame(p))
        case 'goToLastFrame': return setPb((p) => goToLastFrame(p, D))
        case 'toggleLoop': return setPrefs({ playbackLoop: !prefs.playbackLoop })
        case 'timelineZoomIn': return setView((v) => zoomView(v, 0.75, D, pb.timeMs))
        case 'timelineZoomOut': return setView((v) => zoomView(v, 1.25, D, pb.timeMs))
        case 'toggleAudioScrubber': return setPrefs({ playbackAudioScrubber: !prefs.playbackAudioScrubber })
        case 'undo': return setHistory((h) => (canUndo(h) ? undo(h) : h))
        case 'redo': return setHistory((h) => (canRedo(h) ? redo(h) : h))
        case 'toggleSidebar': return setLayout((l) => toggleSidebar(l))
        case 'toggleTimeline': return setLayout((l) => toggleTimeline(l))
        case 'togglePreviewMode': return setLayout((l) => togglePreview(l))
        case 'toggleWaveform': return setPrefs({ hideAudioWaveform: !prefs.hideAudioWaveform })
        case 'toggleSmoothWaveform': return setPrefs({ enableSmoothWaveform: !prefs.enableSmoothWaveform })
        case 'toggleTimelineScrollbar': return setPrefs({ alwaysShowTimelineScrollbar: !prefs.alwaysShowTimelineScrollbar })
        case 'closeSidebarItem': return setOverlay(null)
        case 'track:zooms': return
        case 'track:layouts': return toggleTrack('layouts')
        case 'track:shortcuts': return toggleTrack('shortcuts')
        case 'track:masks': return toggleTrack('masks')
        case 'save': return void save()
        case 'saveAs': return void window.recscene.project.saveAs(project)
        case 'openProject': return void window.recscene.project.pick()
        case 'openLastProject': return
        case 'showInFinder': return void window.recscene.project.showInFinder()
        case 'copyFrame':
          return void stage.current?.frameAsPng(2160).then((png) => window.recscene.project.copyFrame(png)).then(() => setSaved((s) => ({ ...s, toast: 'Current frame image copied to clipboard' }))).catch(() => setSaved((s) => ({ ...s, toast: 'Failed to copy current frame to clipboard' })))
        case 'exportFrame':
          return void stage.current?.frameAsPng(2160).then((png) => window.recscene.project.exportFrame(png, pb.timeMs))
        case 'commandMenu': return setOverlay((o) => (o === 'command' ? null : 'command'))
        case 'shortcutsGuide': return setOverlay((o) => (o === 'guide' ? null : 'guide'))
        default:
          if (id.startsWith('sidebar:')) setPanel(id.slice('sidebar:'.length))
      }
    },
    [durationMs, pb.timeMs, prefs, project, save, setPrefs]
  )

  useEffect(() => window.recscene.onEditorAction(run), [run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (overlay) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const action = actionForKey(e)
      if (!action) return
      e.preventDefault()
      run(action.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, overlay])

  const shownTime = preview ?? pb.timeMs
  const aspect = aspectLabel(project.config.defaultOutputAspectRatio, project.recording.screen)
  const savedLabel = saved.toast ?? (saved.dirty ? 'unsaved changes' : saved.at ? `saved ${agoLabel(saved.at)}` : 'not saved yet')
  const sidebar = showsSidebar(layout)
  const timeline = showsTimeline(layout)

  return (
    <div className={`app app--${layout}`}>
      <header className="titlebar">
        <span className="titlebar__name">{project.name}</span>
        <span className="titlebar__project">· {savedLabel}</span>
        <div className="titlebar__center">
          <div className="menu-anchor">
            <button type="button" className="btn btn--ghost" aria-haspopup="listbox" aria-expanded={aspectOpen} title="Output aspect ratio" onClick={() => setAspectOpen((o) => !o)}>{aspect} ▾</button>
            {aspectOpen && (
              <div role="listbox" className="menu">
                {ASPECT_OPTIONS.map((o) => (
                  <button key={o.label} type="button" role="option" aria-selected={o.value === project.config.defaultOutputAspectRatio} className="menu__item" title={o.tip} onClick={() => { edit({ ...project, config: { ...project.config, defaultOutputAspectRatio: o.value } }); setAspectOpen(false) }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn btn--ghost" disabled title="Crop arrives with specs 100–101">Crop <kbd>C</kbd></button>
          <button type="button" className="btn btn--ghost" disabled title="Masks arrive with specs 189–198">Mask</button>
        </div>
        <button type="button" className="btn btn--ghost" disabled title="Shareable links arrive with specs 236–245">Share link</button>
        <button type="button" className="btn btn--accent" disabled title="Export arrives with specs 233–235">Export</button>
      </header>

      {sidebar && (
        <nav className="rail" aria-label="Editor panels">
          {PANELS.map((p) => (
            <button key={p.id} type="button" className={`rail__item${panel === p.id ? ' rail__item--on' : ''}`} aria-pressed={panel === p.id} title={`${p.label} ${p.key}`} onClick={() => setPanel(p.id)}>{p.label}</button>
          ))}
        </nav>
      )}

      <main className="stage">
        {notice && (
          <p className="notice stage__notice" role="alert">
            {notice} <button type="button" className="btn btn--ghost" onClick={onDismissNotice}>Dismiss</button>
          </p>
        )}
        <Stage ref={stage} project={project} screenUrl={opened.media.screen} micUrl={opened.media.mic} timeMs={shownTime} playing={pb.playing && preview === null} speed={pb.speed} previewMaxHeight={prefs.playbackPreviewMaxHeight} onDuration={(ms) => { if (ms > 0 && Math.abs(ms - durationMs) > 50) { setDurationMs(ms); setView(initialView(ms)) } }} />
        <div className="transport">
          <span className="transport__time">{formatTimecode(shownTime)}</span>
          <span className="muted">/ {formatTimecode(durationMs)}</span>
          <span className="transport__spacer" />
          <button type="button" className="transport__btn" aria-label="Go to first frame (⌘←)" onClick={() => run('goToFirstFrame')}>⏮</button>
          <button type="button" className="transport__play" aria-label={pb.playing ? 'Pause (Space)' : 'Play (Space)'} onClick={() => run('togglePlay')}>{pb.playing ? '❚❚' : '▶'}</button>
          <button type="button" className="transport__btn" aria-label="Go to last frame (⌘→)" onClick={() => run('goToLastFrame')}>⏭</button>
          <span className="transport__spacer" />
          <div className="menu-anchor">
            <button type="button" className="btn btn--ghost" aria-haspopup="listbox" aria-expanded={speedOpen} title="Playback speed · L faster, J backward, K reset" onClick={() => setSpeedOpen((o) => !o)}>{speedLabel(pb.speed)}</button>
            {speedOpen && (
              <div role="listbox" className="menu menu--up">
                {SPEED_CHOICES.map((s) => (
                  <button key={s} type="button" role="option" aria-selected={Math.abs(pb.speed) === s} className="menu__item" onClick={() => { setPb((p) => setSpeed(p, p.speed < 0 ? -s : s)); setSpeedOpen(false) }}>{s}×</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={`btn btn--ghost${prefs.playbackLoop ? ' btn--on' : ''}`} aria-pressed={prefs.playbackLoop} title="Loop playback" onClick={() => run('toggleLoop')}>⟳</button>
          <select className="input" aria-label="Preview size" value={prefs.playbackPreviewMaxHeight} onChange={(e) => setPrefs({ playbackPreviewMaxHeight: Number(e.target.value) as 480 })}>
            {[480, 720, 1080, 1440, 2160].map((h) => <option key={h} value={h}>{h}p</option>)}
          </select>
          <button type="button" className="btn btn--ghost" title="Show command menu… ⌘K" onClick={() => run('commandMenu')}>⌘K</button>
        </div>
      </main>

      {sidebar && (
        <aside className="inspector" aria-label="Inspector">
          <h2>{PANELS.find((p) => p.id === panel)?.label}</h2>
          <p className="muted">This panel's controls arrive with its own specs. The shell, playback, timeline, undo and saving are in place.</p>
          <dl className="recorder__result">
            <dt>Recording</dt><dd>{project.recording.screen.width}×{project.recording.screen.height} · {formatTimecode(durationMs)}</dd>
            <dt>Captured</dt><dd>{project.recording.clicks.length} clicks · {project.recording.keys.length} keystrokes · {project.meta.recordingFlags.length} flags · {opened.markers.length} markers</dd>
            <dt>History</dt><dd>{history.past.length} undo · {history.future.length} redo</dd>
          </dl>
        </aside>
      )}

      {timeline && (
        <Timeline
          project={project}
          markers={opened.markers}
          durationMs={durationMs}
          timeMs={pb.timeMs}
          view={view}
          setView={setView}
          visible={visible}
          toggleTrack={toggleTrack}
          onSeek={(ms) => setPb((p) => seek(p, ms, durationMs))}
          onPreview={setPreview}
          micUrl={opened.media.mic}
          showWaveform={!prefs.hideAudioWaveform}
          smoothWaveform={prefs.enableSmoothWaveform}
          alwaysShowScrollbar={prefs.alwaysShowTimelineScrollbar}
          audioScrubber={prefs.playbackAudioScrubber}
          onToggleAudioScrubber={() => run('toggleAudioScrubber')}
        />
      )}

      {overlay && <CommandMenu mode={overlay} onRun={(id) => { setOverlay(null); run(id) }} onClose={() => setOverlay(null)} />}
    </div>
  )
}

function agoLabel(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return new Date(iso).toLocaleTimeString()
}

