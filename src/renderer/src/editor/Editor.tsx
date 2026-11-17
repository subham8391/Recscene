import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actionForKey } from '@core/editor/actions'
import { ASPECT_OPTIONS, aspectLabel, type Box } from '@core/editor/aspect'
import {
  applyTypingSuggestion,
  canResetAll,
  clipAtOutput,
  clipAtSource,
  clipSettings,
  isAudioMuted,
  joinClips,
  mergeWith,
  outputDurationMs,
  outputToSource,
  removeClip,
  removeTrim,
  resetAllClips,
  rippleRemoveBefore,
  splitClip,
  typingGroups,
  updateClip,
  type Clip,
  type ClipSettings,
  type TypingGroup
} from '@core/editor/clips'
import { applyCropAspect, cropFromFractions, cropToFractions } from '@core/editor/crop'
import { addZoomAt, automaticZooms, duplicateZoom, removeZoom, setAllDisabled, splitZoom, stepZoomLevel, updateZoom, zoomSettings, type ZoomRange, type ZoomSettings } from '@core/editor/zooms'
import { appPrefsFrom } from '@core/appPrefs'
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
import { BackgroundPanel } from './BackgroundPanel'
import { ClipPanel } from './ClipPanel'
import { CommandMenu } from './CommandMenu'
import { CursorPanel } from './CursorPanel'
import { ExportDialog } from './ExportDialog'
import { CropTool } from './CropTool'
import { Stage, type StageHandle } from './Stage'
import { Timeline, type TrackId, type TrackVisibility } from './Timeline'
import { ZoomPanel } from './ZoomPanel'
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
  const [sourceDurationMs, setSourceDurationMs] = useState(opened.project.recording.durationMs)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [draftClips, setDraftClips] = useState<Clip[] | null>(null)
  const [clipboard, setClipboard] = useState<ClipSettings | null>(null)
  const [cropping, setCropping] = useState(false)
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null)
  const [draftZooms, setDraftZooms] = useState<ZoomRange[] | null>(null)
  const [zoomClipboard, setZoomClipboard] = useState<ZoomSettings | null>(null)
  const [defaultZoomLevel, setDefaultZoomLevel] = useState(2)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [recBox, setRecBox] = useState<Box>({ x: 0, y: 0, width: 0, height: 0 })
  const stage = useRef<StageHandle>(null)
  const lastTick = useRef<number | null>(null)
  const timeRef = useRef(0)

  const clips = draftClips ?? project.clips
  const zooms = draftZooms ?? project.zooms
  const selectedZoom = zooms.find((z) => z.id === selectedZoomId) ?? null
  const selectedZoomIndex = selectedZoom ? zooms.indexOf(selectedZoom) : -1
  const shownProject = draftZooms ? { ...project, zooms: draftZooms } : project
  const durationMs = outputDurationMs(clips)
  const sourceMs = outputToSource(clips, preview ?? pb.timeMs)
  const currentClip = clipAtOutput(clips, pb.timeMs)?.clip ?? null
  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null
  const selectedIndex = selectedClip ? clips.indexOf(selectedClip) : -1
  const typing = useMemo(() => typingGroups(project.recording.keys).filter((g) => !project.config.resolvedTypingSuggestions.includes(g.startMs)), [project.recording.keys, project.config.resolvedTypingSuggestions])

  useEffect(() => {
    timeRef.current = pb.timeMs
  }, [pb.timeMs])

  useEffect(() => {
    void window.recscene.prefs.get().then((raw) => setDefaultZoomLevel(appPrefsFrom(raw).defaultZoomLevel ?? 2))
  }, [])

  const backgroundImage = project.config.backgroundImage
  useEffect(() => {
    if (!backgroundImage) return
    void window.recscene.project.mediaUrl(backgroundImage).then(setBackgroundImageUrl)
  }, [backgroundImage])

  const importBackground = (source: File | ArrayBuffer): void => {
    void window.recscene.project
      .importBackgroundImage(source)
      .then((r) => {
        setBackgroundImageUrl(r.url)
        edit({ ...project, config: { ...project.config, backgroundType: 'image', backgroundImage: r.file } })
      })
      .catch((err: unknown) => notify(err instanceof Error ? err.message.replace(/^.*?: (?=[A-Z])/, '') : String(err)))
  }

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

  const setClips = (next: Clip[]): void => edit({ ...project, clips: next })
  const notify = (toast: string): void => {
    setSaved((s) => ({ ...s, toast }))
    window.setTimeout(() => setSaved((s) => (s.toast === toast ? { ...s, toast: null } : s)), 2000)
  }
  const applyTyping = (group: TypingGroup, speed: number): void => {
    const r = applyTypingSuggestion(clips, group, speed)
    edit({ ...project, clips: r.clips, config: { ...project.config, resolvedTypingSuggestions: [...project.config.resolvedTypingSuggestions, group.startMs] } })
    if (!r.applied) notify('The part you want to cut is too short')
  }
  const ignoreTyping = (group: TypingGroup): void => edit({ ...project, config: { ...project.config, resolvedTypingSuggestions: [...project.config.resolvedTypingSuggestions, group.startMs] } })

  const setZooms = (next: ZoomRange[]): void => edit({ ...project, zooms: next })
  const setDefaultLevel = (level: number): void => {
    setDefaultZoomLevel(level)
    void window.recscene.prefs.set({ defaultZoomLevel: level })
  }
  const addZoom = (sourceMsAt: number, type: 'follow-click-groups' | 'manual' = 'follow-click-groups'): void => {
    const r = addZoomAt(zooms, sourceMsAt, sourceDurationMs, defaultZoomLevel, type)
    if (r.error) return notify(r.error)
    setZooms(r.zooms)
    setSelectedClipId(null)
    if (r.zoom) setSelectedZoomId(r.zoom.id)
  }

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
        case 'timelineZoomIn': return selectedZoom ? setZooms(zooms.map((z) => (z.id === selectedZoom.id ? stepZoomLevel(z, 1) : z))) : setView((v) => zoomView(v, 0.75, D, pb.timeMs))
        case 'timelineZoomOut': return selectedZoom ? setZooms(zooms.map((z) => (z.id === selectedZoom.id ? stepZoomLevel(z, -1) : z))) : setView((v) => zoomView(v, 1.25, D, pb.timeMs))
        case 'toggleAudioScrubber': return setPrefs({ playbackAudioScrubber: !prefs.playbackAudioScrubber })
        case 'undo': return setHistory((h) => (canUndo(h) ? undo(h) : h))
        case 'redo': return setHistory((h) => (canRedo(h) ? redo(h) : h))
        case 'toggleSidebar': return setLayout((l) => toggleSidebar(l))
        case 'toggleTimeline': return setLayout((l) => toggleTimeline(l))
        case 'togglePreviewMode': return setLayout((l) => togglePreview(l))
        case 'toggleWaveform': return setPrefs({ hideAudioWaveform: !prefs.hideAudioWaveform })
        case 'toggleSmoothWaveform': return setPrefs({ enableSmoothWaveform: !prefs.enableSmoothWaveform })
        case 'toggleTimelineScrollbar': return setPrefs({ alwaysShowTimelineScrollbar: !prefs.alwaysShowTimelineScrollbar })
        case 'closeSidebarItem': return void (setOverlay(null), setSelectedClipId(null), setSelectedZoomId(null), setCropping(false))
        case 'addZoom': return addZoom(outputToSource(clips, pb.timeMs))
        case 'addManualZoom': return addZoom(outputToSource(clips, pb.timeMs), 'manual')
        case 'duplicateZoom': return selectedZoom ? setZooms(duplicateZoom(zooms, selectedZoom.id, sourceDurationMs)) : undefined
        case 'toggleZoomDisabled': return selectedZoom ? setZooms(updateZoom(zooms, selectedZoom.id, { isDisabled: !selectedZoom.isDisabled })) : undefined
        case 'disableAllZooms': return setZooms(setAllDisabled(zooms, true))
        case 'enableAllZooms': return setZooms(setAllDisabled(zooms, false))
        case 'applyZoomLevelToAll':
          if (!selectedZoom) return
          setZooms(zooms.map((z) => ({ ...z, zoom: selectedZoom.zoom })))
          return notify('Zoom level applied to all zooms')
        case 'restoreDefaultZooms': return void (setSelectedZoomId(null), setZooms(automaticZooms(project.recording.clicks, sourceDurationMs, defaultZoomLevel)))
        case 'removeAllZooms': return void (setSelectedZoomId(null), setZooms([]))
        case 'cut':
          if (!selectedZoom) return
          setZoomClipboard(zoomSettings(selectedZoom))
          setSelectedZoomId(null)
          setZooms(removeZoom(zooms, selectedZoom.id))
          return notify('Zoom range copied')
        case 'splitSliceAtCurrentTime': {
          if (selectedZoom) {
            const r = splitZoom(zooms, outputToSource(clips, pb.timeMs))
            if (r.error) return notify(r.error)
            return setZooms(r.zooms)
          }
          const r = splitClip(clips, outputToSource(clips, pb.timeMs))
          if (r.error) return notify(r.error)
          return setClips(r.clips)
        }
        case 'removeSlice': {
          if (selectedZoom) {
            setSelectedZoomId(null)
            return setZooms(removeZoom(zooms, selectedZoom.id))
          }
          const target = selectedClip ?? currentClip
          if (!target || clips.length <= 1) return
          setSelectedClipId(null)
          return setClips(removeClip(clips, target.id))
        }
        case 'rippleRemoveSlice': {
          const next = rippleRemoveBefore(clips, outputToSource(clips, pb.timeMs))
          if (next.length === clips.length) return notify('No cut before the playhead')
          return setClips(next)
        }
        case 'mergeWithPrevious': return selectedClip ? setClips(mergeWith(clips, selectedClip.id, 'previous')) : undefined
        case 'mergeWithNext': return selectedClip ? setClips(mergeWith(clips, selectedClip.id, 'next')) : undefined
        case 'applySpeedToAll': return selectedClip ? setClips(clips.map((c) => ({ ...c, speed: selectedClip.speed }))) : undefined
        case 'resetAllClips':
          if (!canResetAll(clips, sourceDurationMs)) return
          if (!window.confirm('Are you sure you want to reset trims and cuts for all slices')) return
          setSelectedClipId(null)
          return setClips(resetAllClips(sourceDurationMs))
        case 'crop': return void (setPb((p) => ({ ...p, playing: false })), setCropping(true))
        case 'paste': {
          if (zoomClipboard && (selectedZoom || !clipboard)) {
            if (selectedZoom) {
              setZooms(updateZoom(zooms, selectedZoom.id, zoomClipboard))
              return notify('Zoom range settings pasted')
            }
            const r = addZoomAt(zooms, outputToSource(clips, pb.timeMs), sourceDurationMs, zoomClipboard.zoom, zoomClipboard.type)
            if (r.error) return notify(r.error)
            setZooms(r.zoom ? updateZoom(r.zooms, r.zoom.id, zoomClipboard) : r.zooms)
            return notify('Zoom range settings pasted')
          }
          if (!clipboard) return
          const target = clipAtSource(clips, outputToSource(clips, pb.timeMs))
          if (!target) return
          setClips(updateClip(clips, target.id, clipboard))
          return notify('Slice settings pasted')
        }
        case 'track:zooms': return selectedZoom ? setZooms(updateZoom(zooms, selectedZoom.id, { zoom: 1 })) : undefined
        case 'track:layouts': return selectedZoom ? setZooms(updateZoom(zooms, selectedZoom.id, { zoom: 1.2 })) : toggleTrack('layouts')
        case 'track:shortcuts': return selectedZoom ? setZooms(updateZoom(zooms, selectedZoom.id, { zoom: 1.4 })) : toggleTrack('shortcuts')
        case 'track:masks': return selectedZoom ? setZooms(updateZoom(zooms, selectedZoom.id, { zoom: 1.6 })) : toggleTrack('masks')
        case 'save': return void save()
        case 'saveAs': return void window.recscene.project.saveAs(project)
        case 'openProject': return void window.recscene.project.pick()
        case 'openLastProject': return
        case 'showInFinder': return void window.recscene.project.showInFinder()
        case 'copyFrame':
          if (selectedZoom) {
            setZoomClipboard(zoomSettings(selectedZoom))
            return notify('Zoom range copied')
          }
          if (selectedClip) {
            setClipboard(clipSettings(selectedClip))
            return notify('Slice settings copied')
          }
          return void stage.current?.frameAsPng(2160).then((png) => window.recscene.project.copyFrame(png)).then(() => setSaved((s) => ({ ...s, toast: 'Current frame image copied to clipboard' }))).catch(() => setSaved((s) => ({ ...s, toast: 'Failed to copy current frame to clipboard' })))
        case 'exportFrame':
          return void stage.current?.frameAsPng(2160).then((png) => window.recscene.project.exportFrame(png, pb.timeMs))
        case 'export': return void (setPb((p) => ({ ...p, playing: false })), setExporting(true))
        case 'commandMenu': return setOverlay((o) => (o === 'command' ? null : 'command'))
        case 'shortcutsGuide': return setOverlay((o) => (o === 'guide' ? null : 'guide'))
        default:
          if (id.startsWith('sidebar:')) setPanel(id.slice('sidebar:'.length))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [durationMs, pb.timeMs, prefs, project, save, setPrefs, clips, selectedClip, currentClip, clipboard, sourceDurationMs, setClips, zooms, selectedZoom, zoomClipboard, defaultZoomLevel, setZooms]
  )

  useEffect(() => window.recscene.onEditorAction(run), [run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (overlay) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (selectedZoom && !e.metaKey && !e.altKey && !e.ctrlKey && /^[0-9]$/.test(e.key)) {
        const presets = [defaultZoomLevel, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6]
        const level = presets[Number(e.key)]
        if (level !== undefined) {
          e.preventDefault()
          setZooms(updateZoom(zooms, selectedZoom.id, { zoom: level }))
          if (e.key !== '0') setDefaultLevel(level)
          return
        }
      }
      const action = actionForKey(e)
      if (!action) return
      e.preventDefault()
      run(action.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, overlay, selectedZoom, zooms, defaultZoomLevel])

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
          <button type="button" className={`btn btn--ghost${cropping ? ' btn--on' : ''}`} aria-pressed={cropping} title="Crop the recording (specs 100–101)" onClick={() => run('crop')}>Crop</button>
          <button type="button" className="btn btn--ghost" disabled title="Masks arrive with specs 189–198">Mask</button>
        </div>
        <button type="button" className="btn btn--ghost" disabled title="Shareable links arrive with specs 236–245">Share link</button>
        <button type="button" className="btn btn--accent" title="Export ⌘E" onClick={() => run('export')}>Export</button>
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
        <Stage
          ref={stage}
          project={shownProject}
          cursor={opened.cursor}
          sourceDurationMs={sourceDurationMs}
          clipState={{ hidden: !!currentClip?.hideCursor, smooth: !currentClip?.disableSmoothMouseMovement }}
          clickSoundUrl={(kind) => (project.config.clickSoundEffect ? opened.media.assets + `/sounds/clicks/${project.config.clickSoundEffect}/${kind}.wav` : null)}
          backgroundImageUrl={backgroundImage ? backgroundImageUrl : null}
          assetsUrl={opened.media.assets}
          screenUrl={opened.media.screen}
          micUrl={opened.media.mic}
          sourceMs={sourceMs}
          playing={pb.playing && preview === null && !cropping}
          rate={pb.speed * (currentClip?.speed ?? 1)}
          micVolume={currentClip && !isAudioMuted(currentClip) ? currentClip.volume : 0}
          previewMaxHeight={prefs.playbackPreviewMaxHeight}
          onDuration={(ms) => {
            if (ms > 0 && Math.abs(ms - sourceDurationMs) > 50) {
              setSourceDurationMs(ms)
              setView(initialView(ms))
              const only = project.clips[0]
              if (project.clips.length === 1 && only && only.sourceStartMs === 0 && Math.abs(only.sourceEndMs - sourceDurationMs) < 50) setHistory(createHistory({ ...project, clips: [{ ...only, sourceEndMs: ms }] }))
            }
          }}
          onBox={setRecBox}
        >
          {cropping && (
            <CropTool
              recording={project.recording.screen}
              initial={project.config.recordingCrop}
              box={{ x: recBox.x - 16, y: recBox.y - 16, width: recBox.width, height: recBox.height }}
              onConfirm={(fractions) => { edit({ ...project, config: { ...project.config, recordingCrop: fractions } }); setCropping(false) }}
              onCancel={() => setCropping(false)}
            />
          )}
        </Stage>
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
          <button type="button" className="btn btn--ghost" title="Add a 3 s zoom at the playhead" onClick={() => run('addZoom')}>+ Zoom</button>
          <button type="button" className="btn btn--ghost" title="Show command menu… ⌘K" onClick={() => run('commandMenu')}>⌘K</button>
        </div>
      </main>

      {sidebar && (
        <aside className="inspector" aria-label="Inspector">
          {selectedZoom ? (
            <>
              <div className="inspector__head"><span className="tl__dot" style={{ background: 'var(--zoom)' }} /><h2>Zoom</h2><span className="muted">{selectedZoomIndex + 1} of {zooms.length}</span><span className="tl__spacer" /><button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedZoomId(null)}>Close <kbd>⎋</kbd></button></div>
              <ZoomPanel
                project={project}
                zooms={zooms}
                zoom={selectedZoom}
                index={selectedZoomIndex}
                cursor={opened.cursor}
                screenUrl={opened.media.screen}
                defaultZoomLevel={defaultZoomLevel}
                onZooms={setZooms}
                onConfig={(config) => edit({ ...project, config })}
                onDefaultLevel={setDefaultLevel}
                onAction={run}
              />
            </>
          ) : selectedClip ? (
            <>
              <div className="inspector__head"><span className="tl__dot" style={{ background: 'var(--clip)' }} /><h2>Clip</h2><span className="muted">{selectedIndex + 1} of {clips.length}</span><span className="tl__spacer" /><button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedClipId(null)}>Close <kbd>⎋</kbd></button></div>
              <ClipPanel
                clips={clips}
                clip={selectedClip}
                index={selectedIndex}
                sourceDurationMs={sourceDurationMs}
                hasMic={!!opened.media.mic}
                typing={typing}
                clipboard={clipboard}
                onClips={setClips}
                onAction={run}
                onApplyTyping={applyTyping}
                onIgnoreTyping={ignoreTyping}
                onCrop={() => run('crop')}
                onCropAspect={(ratio) => edit({ ...project, config: { ...project.config, recordingCrop: cropToFractions(applyCropAspect(cropFromFractions(project.config.recordingCrop, project.recording.screen), ratio, project.recording.screen), project.recording.screen) } })}
              />
            </>
          ) : (
            <>
          <h2>{PANELS.find((p) => p.id === panel)?.label}</h2>
          {panel === 'background' ? (
            <BackgroundPanel
              project={project}
              assetsUrl={opened.media.assets}
              backgroundImageUrl={backgroundImage ? backgroundImageUrl : null}
              onConfig={(patch) => edit({ ...project, config: { ...project.config, ...patch } })}
              onPickImage={() => void window.recscene.project.pickBackgroundImage().then((r) => { if (r) { setBackgroundImageUrl(r.url); edit({ ...project, config: { ...project.config, backgroundType: 'image', backgroundImage: r.file } }) } })}
              onDropImage={importBackground}
              onPasteImage={importBackground}
            />
          ) : panel === 'cursor' ? (
            <CursorPanel
              config={project.config}
              hasCursor={opened.cursor.length > 0}
              clipHidden={!!currentClip?.hideCursor}
              onConfig={(patch) => edit({ ...project, config: { ...project.config, ...patch } })}
              onPreviewSound={() => {
                const url = project.config.clickSoundEffect ? opened.media.assets + `/sounds/clicks/${project.config.clickSoundEffect}/click.wav` : null
                if (!url) return
                const a = new Audio(url)
                a.volume = project.config.clickSoundEffectVolume
                void a.play().catch(() => undefined)
              }}
            />
          ) : (
          <p className="muted">This panel's controls arrive with its own specs. The shell, playback, timeline, undo and saving are in place.</p>
          )}
          <dl className="recorder__result">
            <dt>Recording</dt><dd>{project.recording.screen.width}×{project.recording.screen.height} · {formatTimecode(durationMs)}</dd>
            <dt>Captured</dt><dd>{project.recording.clicks.length} clicks · {project.recording.keys.length} keystrokes · {project.meta.recordingFlags.length} flags · {opened.markers.length} markers</dd>
            <dt>History</dt><dd>{history.past.length} undo · {history.future.length} redo</dd>
            <dt>Clips</dt><dd>{clips.length} · click a clip on the timeline to edit it</dd>
            <dt>Zooms</dt><dd>{zooms.length} · click the Zooms track to add one</dd>
          </dl>
            </>
          )}
        </aside>
      )}

      {timeline && (
        <Timeline
          project={shownProject}
          clips={clips}
          sourceDurationMs={sourceDurationMs}
          markers={opened.markers}
          durationMs={durationMs}
          timeMs={pb.timeMs}
          view={view}
          setView={setView}
          visible={visible}
          toggleTrack={toggleTrack}
          onSeek={(ms) => setPb((p) => seek(p, ms, durationMs))}
          onPreview={setPreview}
          selectedClipId={selectedClipId}
          onSelectClip={(id) => { setSelectedClipId(id); if (id) setSelectedZoomId(null) }}
          onTrimPreview={setDraftClips}
          onTrimCommit={(next) => { setDraftClips(null); setClips(next) }}
          onRemoveTrim={(id, edge) => setClips(removeTrim(clips, id, edge, sourceDurationMs))}
          onJoin={(rightId) => setClips(joinClips(clips, rightId))}
          selectedZoomId={selectedZoomId}
          onSelectZoom={(id) => { setSelectedZoomId(id); if (id) setSelectedClipId(null) }}
          onAddZoomAt={(ms) => addZoom(ms)}
          onZoomPreview={setDraftZooms}
          onZoomCommit={() => { const next = draftZooms; setDraftZooms(null); if (next) setZooms(next) }}
          micUrl={opened.media.mic}
          showWaveform={!prefs.hideAudioWaveform}
          smoothWaveform={prefs.enableSmoothWaveform}
          alwaysShowScrollbar={prefs.alwaysShowTimelineScrollbar}
          audioScrubber={prefs.playbackAudioScrubber}
          onToggleAudioScrubber={() => run('toggleAudioScrubber')}
        />
      )}

      {overlay && <CommandMenu mode={overlay} onRun={(id) => { setOverlay(null); run(id) }} onClose={() => setOverlay(null)} />}
      {exporting && (
        <ExportDialog
          input={{ project, clips, sourceDurationMs, screenUrl: opened.media.screen, micUrl: opened.media.mic, backgroundImageUrl: backgroundImage ? backgroundImageUrl : null, assetsUrl: opened.media.assets, cursor: opened.cursor, projectName: project.name }}
          durationMs={durationMs}
          onClose={() => setExporting(false)}
          onNotice={notify}
        />
      )}
    </div>
  )
}

function agoLabel(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return new Date(iso).toLocaleTimeString()
}

