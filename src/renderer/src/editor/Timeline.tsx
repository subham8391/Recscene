import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clipOutputMs, outputOffsets, sourceToOutput, trimClip, trimmedMs, type Clip } from '@core/editor/clips'
import { speedLabel } from '@core/editor/playback'
import { panView, rulerTicks, sliderToZoom, timeAtX, visibleLabel, xAtTime, zoomToSlider, zoomView, type TimelineView } from '@core/editor/timelineView'
import { waveformBars } from '@core/editor/waveform'
import { isAutoType, moveZoom, type ZoomRange } from '@core/editor/zooms'
import { LAYOUT_NAMES, moveLayout, type CameraLayout } from '@core/editor/cameraLayout'
import { maskLabel, moveMask, type Mask } from '@core/editor/masks'
import { outputToSource } from '@core/editor/clips'
import type { Project } from '@core/project'
import { formatClock } from '@core/recordingPicker'
import type { RecordingMarker } from '@core/recordingSession'

export type TrackId = 'zooms' | 'layouts' | 'masks' | 'shortcuts'

export interface TrackVisibility {
  zooms: true
  layouts: boolean
  masks: boolean
  shortcuts: boolean
}

interface Props {
  project: Project
  clips: Clip[]
  sourceDurationMs: number
  markers: RecordingMarker[]
  durationMs: number
  timeMs: number
  view: TimelineView
  setView: (v: TimelineView) => void
  visible: TrackVisibility
  toggleTrack: (id: TrackId) => void
  onSeek: (ms: number) => void
  onPreview: (ms: number | null) => void
  selectedClipId: string | null
  onSelectClip: (id: string | null) => void
  /** Live clips while an edge is dragged; `commit` writes to history. */
  onTrimPreview: (clips: Clip[]) => void
  onTrimCommit: (clips: Clip[]) => void
  onRemoveTrim: (id: string, edge: 'start' | 'end') => void
  onJoin: (rightId: string) => void
  selectedZoomId: string | null
  onSelectZoom: (id: string | null) => void
  onAddZoomAt: (sourceMs: number) => void
  onZoomPreview: (zooms: ZoomRange[]) => void
  onZoomCommit: (zooms: ZoomRange[]) => void
  /** Camera layouts track (spec 156), shown when the project has a camera. */
  hasCamera: boolean
  selectedLayoutId: string | null
  onSelectLayout: (id: string | null) => void
  onAddLayoutAt: (sourceMs: number) => void
  onLayoutPreview: (layouts: CameraLayout[]) => void
  onLayoutCommit: (layouts: CameraLayout[]) => void
  /** Masks track (specs 189, 192). */
  selectedMaskId: string | null
  onSelectMask: (id: string | null) => void
  onAddMaskAt: (sourceMs: number) => void
  onMaskPreview: (masks: Mask[]) => void
  onMaskCommit: (masks: Mask[]) => void
  micUrl?: string
  showWaveform: boolean
  smoothWaveform: boolean
  alwaysShowScrollbar: boolean
  audioScrubber: boolean
  onToggleAudioScrubber: () => void
}

const TRACKS: { id: TrackId; name: string; color: string; key: string; forced?: boolean }[] = [
  { id: 'zooms', name: 'Zooms', color: 'var(--zoom)', key: '1', forced: true },
  { id: 'layouts', name: 'Camera Layouts', color: 'var(--layout)', key: '2' },
  { id: 'shortcuts', name: 'Shortcuts', color: 'var(--shortcut)', key: '3' },
  { id: 'masks', name: 'Masks', color: 'var(--mask)', key: '4' }
]

/** The timeline (specs 50–51, 58–62, 80–87): toolbar, ruler, clips with trim handles, tracks, waveform, playhead. */
export function Timeline(props: Props): React.JSX.Element {
  const { project, clips, sourceDurationMs, markers, durationMs, timeMs, view, setView, visible, toggleTrack, onSeek, onPreview, selectedClipId, onSelectClip, onTrimPreview, onTrimCommit, onRemoveTrim, onJoin, selectedZoomId, onSelectZoom, onAddZoomAt, onZoomPreview, onZoomCommit, hasCamera, selectedLayoutId, onSelectLayout, onAddLayoutAt, onLayoutPreview, onLayoutCommit, selectedMaskId, onSelectMask, onAddMaskAt, onMaskPreview, onMaskCommit, micUrl, showWaveform, smoothWaveform, alwaysShowScrollbar, audioScrubber, onToggleAudioScrubber } = props
  const zoomDrag = useRef<{ id: string; mode: 'move' | 'start' | 'end'; startX: number; origin: ZoomRange[]; moved: boolean } | null>(null)
  const layoutDrag = useRef<{ id: string; mode: 'move' | 'start' | 'end'; startX: number; origin: CameraLayout[]; moved: boolean } | null>(null)
  const maskDrag = useRef<{ id: string; mode: 'move' | 'start' | 'end'; startX: number; origin: Mask[]; moved: boolean } | null>(null)
  const lane = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1)
  const [tracksOpen, setTracksOpen] = useState(false)
  const [bars, setBars] = useState<number[]>([])
  const drag = useRef<{ id: string; edge: 'start' | 'end'; startX: number; origin: Clip[]; speed: number; targetMs: number | null } | null>(null)

  useEffect(() => {
    const el = lane.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(1, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const wantBars = !!micUrl && showWaveform
  useEffect(() => {
    if (!micUrl || !showWaveform) return
    let cancelled = false
    void (async () => {
      try {
        const buf = await (await fetch(micUrl)).arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buf)
        if (!cancelled) setBars(waveformBars(decoded.getChannelData(0), 600, smoothWaveform))
        void ctx.close()
      } catch {
        if (!cancelled) setBars([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [micUrl, showWaveform, smoothWaveform])

  const timeFromEvent = useCallback(
    (e: React.MouseEvent): number => {
      const rect = lane.current?.getBoundingClientRect()
      return timeAtX(view, e.clientX - (rect?.left ?? 0), width, durationMs)
    },
    [view, width, durationMs]
  )

  const onWheel = (e: React.WheelEvent): void => {
    if (e.metaKey) setView(zoomView(view, e.deltaY > 0 ? 1.1 : 0.9, durationMs, timeFromEvent(e)))
    else setView(panView(view, (e.deltaX || e.deltaY) * (view.visibleMs / width), durationMs))
  }

  // Trim handles (spec 80): pixels → output ms → source ms through the clip's speed.
  const onHandleDown = (id: string, edge: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation()
    const clip = clips.find((c) => c.id === id)
    if (!clip) return
    drag.current = { id, edge, startX: e.clientX, origin: clips, speed: clip.speed, targetMs: null }
    onSelectClip(id)
  }
  // Zoom items (spec 104): drag the body to move, the edges to resize; output px → source ms through the clip under it.
  const onZoomDown = (id: string, mode: 'move' | 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation()
    zoomDrag.current = { id, mode, startX: e.clientX, origin: project.zooms, moved: false }
    onSelectZoom(id)
  }
  // Layout items (spec 156) drag exactly like zooms.
  const onLayoutDown = (id: string, mode: 'move' | 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation()
    layoutDrag.current = { id, mode, startX: e.clientX, origin: project.layouts, moved: false }
    onSelectLayout(id)
  }
  const onMaskDown = (id: string, mode: 'move' | 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation()
    maskDrag.current = { id, mode, startX: e.clientX, origin: project.masks, moved: false }
    onSelectMask(id)
  }
  const onMouseMove = (e: React.MouseEvent): void => {
    const md = maskDrag.current
    if (md) {
      const m = md.origin.find((x) => x.id === md.id)
      if (!m) return
      const clip = clips.find((c) => m.sourceStartMs >= c.sourceStartMs && m.sourceStartMs <= c.sourceEndMs) ?? clips[0]
      const deltaMs = ((e.clientX - md.startX) / width) * view.visibleMs * (clip?.speed ?? 1)
      md.moved = true
      const patch = md.mode === 'move' ? { startMs: m.sourceStartMs + deltaMs, endMs: m.sourceEndMs + deltaMs } : md.mode === 'start' ? { startMs: m.sourceStartMs + deltaMs } : { endMs: m.sourceEndMs + deltaMs }
      onMaskPreview(moveMask(md.origin, md.id, patch, sourceDurationMs))
      return
    }
    const ld = layoutDrag.current
    if (ld) {
      const l = ld.origin.find((x) => x.id === ld.id)
      if (!l) return
      const clip = clips.find((c) => l.sourceStartMs >= c.sourceStartMs && l.sourceStartMs <= c.sourceEndMs) ?? clips[0]
      const deltaMs = ((e.clientX - ld.startX) / width) * view.visibleMs * (clip?.speed ?? 1)
      ld.moved = true
      const patch = ld.mode === 'move' ? { startMs: l.sourceStartMs + deltaMs, endMs: l.sourceEndMs + deltaMs } : ld.mode === 'start' ? { startMs: l.sourceStartMs + deltaMs } : { endMs: l.sourceEndMs + deltaMs }
      onLayoutPreview(moveLayout(ld.origin, ld.id, patch, sourceDurationMs))
      return
    }
    const zd = zoomDrag.current
    if (zd) {
      const z = zd.origin.find((x) => x.id === zd.id)
      if (!z) return
      const clip = clips.find((c) => z.startMs >= c.sourceStartMs && z.startMs <= c.sourceEndMs) ?? clips[0]
      const deltaMs = ((e.clientX - zd.startX) / width) * view.visibleMs * (clip?.speed ?? 1)
      zd.moved = true
      const patch = zd.mode === 'move' ? { startMs: z.startMs + deltaMs, endMs: z.endMs + deltaMs } : zd.mode === 'start' ? { startMs: z.startMs + deltaMs } : { endMs: z.endMs + deltaMs }
      onZoomPreview(moveZoom(zd.origin, zd.id, patch, sourceDurationMs))
      return
    }
    const d = drag.current
    if (!d) {
      onPreview(timeFromEvent(e))
      return
    }
    const clip = d.origin.find((c) => c.id === d.id)
    if (!clip) return
    const deltaMs = ((e.clientX - d.startX) / width) * view.visibleMs * d.speed
    const target = (d.edge === 'start' ? clip.sourceStartMs : clip.sourceEndMs) + deltaMs
    d.targetMs = target
    onTrimPreview(trimClip(d.origin, d.id, d.edge, target, sourceDurationMs))
  }
  const onMouseUp = (): void => {
    const md = maskDrag.current
    maskDrag.current = null
    if (md?.moved) onMaskCommit(project.masks)
    const ld = layoutDrag.current
    layoutDrag.current = null
    if (ld?.moved) onLayoutCommit(project.layouts)
    const zd = zoomDrag.current
    zoomDrag.current = null
    if (zd?.moved) onZoomCommit(project.zooms)
    const d = drag.current
    drag.current = null
    if (d && d.targetMs !== null) onTrimCommit(trimClip(d.origin, d.id, d.edge, d.targetMs, sourceDurationMs))
  }

  const ticks = useMemo(() => rulerTicks(view), [view])
  const x = (ms: number): number => xAtTime(view, ms, width)
  const pct = (ms: number): string => `${(x(ms) / width) * 100}%`
  const offsets = outputOffsets(clips)
  const visibleCount = 1 + Number(visible.layouts) + Number(visible.masks) + Number(visible.shortcuts)
  const rows = TRACKS.filter((t) => t.forced || visible[t.id])
  const atOutput = (sourceMs: number): number | null => sourceToOutput(clips, sourceMs)

  return (
    <section aria-label="Timeline" className={`tl${alwaysShowScrollbar ? ' tl--scrollbar' : ''}`}>
      <div className="tl__bar">
        <div className="menu-anchor">
          <button type="button" className="btn btn--ghost" aria-haspopup="listbox" aria-expanded={tracksOpen} title="Visible timeline tracks" onClick={() => setTracksOpen((o) => !o)}>
            {visibleCount} visible timeline {visibleCount === 1 ? 'track' : 'tracks'} ▾
          </button>
          {tracksOpen && (
            <div role="listbox" className="menu tl__tracksmenu" aria-label="Visible timeline tracks">
              {TRACKS.map((t) => (
                <label key={t.id} className="menu__check" title={`${t.name} track`}>
                  <input type="checkbox" checked={t.forced || visible[t.id]} disabled={t.forced} onChange={() => toggleTrack(t.id)} />
                  <span className="tl__dot" style={{ background: t.color }} />
                  {t.name}
                  <kbd>{t.key}</kbd>
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" className={`btn btn--ghost${audioScrubber ? ' btn--on' : ''}`} aria-pressed={audioScrubber} title={audioScrubber ? 'Disable audio scrubber' : 'Enable audio scrubber (experimental)'} onClick={onToggleAudioScrubber}>♪ scrub</button>
        <span className="muted tl__hint">C splits at the playhead · drag the yellow handles to trim · ⌫ removes the selected clip</span>
        <span className="tl__spacer" />
        <label className="tl__zoom" title={`Timeline zoom — ${visibleLabel(view)}`}>
          <span className="muted">Timeline zoom</span>
          <input type="range" min={0} max={100} value={zoomToSlider(view, durationMs)} onChange={(e) => setView(sliderToZoom(Number(e.target.value), view, durationMs, timeMs))} />
        </label>
      </div>
      <div className="tl__body">
        <div className="tl__names">
          <div className="tl__ruler-pad" />
          <div className="tl__name"><span className="tl__dot" style={{ background: 'var(--clip)' }} />Clips</div>
          {rows.map((t) => <div key={t.id} className="tl__name"><span className="tl__dot" style={{ background: t.color }} />{t.name}</div>)}
          {wantBars && <div className="tl__name"><span className="tl__dot" style={{ background: 'var(--text3)' }} />Audio</div>}
        </div>
        <div ref={lane} className="tl__lane" onWheel={onWheel} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => { onMouseUp(); onPreview(null) }} onClick={(e) => { if (!drag.current) { onSeek(timeFromEvent(e)); if ((e.target as HTMLElement).classList.contains('tl__row') || (e.target as HTMLElement).classList.contains('tl__ruler')) onSelectClip(null) } }}>
          <div className="tl__ruler">
            {ticks.map((t) => <span key={t.timeMs} className="tl__tick" style={{ left: pct(t.timeMs) }}>{t.label}</span>)}
            {markers.map((m, i) => { const o = atOutput(m.timeMs); return o === null ? null : <span key={`m${i}`} className="tl__marker" style={{ left: pct(o) }} title={`Marker ${formatClock(m.timeMs)}${m.label ? ` · ${m.label}` : ''}`} /> })}
            {project.meta.recordingFlags.map((f, i) => { const o = atOutput(f); return o === null ? null : <span key={`f${i}`} className="tl__flag" style={{ left: pct(o) }} title={`Flag ${formatClock(f)}`}>⚑</span> })}
          </div>
          <div className="tl__row tl__row--clips">
            {clips.map((c, i) => {
              const start = offsets[i] ?? 0
              const end = start + clipOutputMs(c)
              const left = x(start)
              const w = Math.max(2, x(end) - left)
              const trimStart = trimmedMs(clips, c.id, 'start', sourceDurationMs)
              const trimEnd = trimmedMs(clips, c.id, 'end', sourceDurationMs)
              const selected = c.id === selectedClipId
              return (
                <div key={c.id} className={`tl__clip${selected ? ' tl__clip--on' : ''}`} style={{ left, width: w }} onClick={(e) => { e.stopPropagation(); onSelectClip(c.id); onSeek(timeFromEvent(e)) }} title={`Clip ${i + 1} · ${speedLabel(c.speed)} · ${formatClock(clipOutputMs(c))}`}>
                  <span className="tl__clip__label">{speedLabel(c.speed)} · {formatClock(clipOutputMs(c))}{c.hideCursor ? ' · Hide' : ''}</span>
                  <span className="tl__handle tl__handle--start" onMouseDown={onHandleDown(c.id, 'start')} title="Trim start" />
                  <span className="tl__handle tl__handle--end" onMouseDown={onHandleDown(c.id, 'end')} title="Trim end" />
                  {(trimStart > 0 || (i > 0 && trimStart === 0)) && (
                    <button type="button" className="tl__bubble tl__bubble--start" onClick={(e) => { e.stopPropagation(); if (trimStart > 0) onRemoveTrim(c.id, 'start'); else onJoin(c.id) }} title={trimStart > 0 ? `Undo trim · ${formatClock(trimStart)} trimmed` : 'Join clips'}>
                      {trimStart > 0 ? `✂ ${formatClock(trimStart)}` : '⟷'}
                    </button>
                  )}
                  {trimEnd > 0 && i === clips.length - 1 && (
                    <button type="button" className="tl__bubble tl__bubble--end" onClick={(e) => { e.stopPropagation(); onRemoveTrim(c.id, 'end') }} title={`Undo trim · ${formatClock(trimEnd)} trimmed`}>✂ {formatClock(trimEnd)}</button>
                  )}
                </div>
              )
            })}
          </div>
          {rows.map((t) => (
            <div key={t.id} className="tl__row" data-track={t.id} title={t.id === 'zooms' ? 'Click or drag to add zoom on cursor' : t.id === 'layouts' ? (hasCamera ? 'Click to create a new camera layout' : 'No camera recorded') : t.id === 'masks' ? 'Click or drag to create a new mask' : undefined} onClick={(e) => { if (e.target !== e.currentTarget) return; if (t.id === 'zooms') { e.stopPropagation(); onAddZoomAt(outputToSource(clips, timeFromEvent(e))) } else if (t.id === 'layouts' && hasCamera) { e.stopPropagation(); onAddLayoutAt(outputToSource(clips, timeFromEvent(e))) } else if (t.id === 'masks') { e.stopPropagation(); onAddMaskAt(outputToSource(clips, timeFromEvent(e))) } }}>
              {t.id === 'masks' && project.masks.map((m) => {
                const a = atOutput(m.sourceStartMs)
                const b = atOutput(m.sourceEndMs)
                if (a === null || b === null) return null
                return (
                  <div key={m.id} className={`tl__zi tl__zi--mask${m.isDisabled ? ' tl__zi--off' : ''}${m.id === selectedMaskId ? ' tl__zi--on' : ''}`} style={{ left: x(a), width: Math.max(2, x(b) - x(a)) }} onMouseDown={onMaskDown(m.id, 'move')} onClick={(e) => { e.stopPropagation(); if (!maskDrag.current) onSelectMask(m.id) }} title={`${maskLabel(m)} · ${formatClock(m.sourceEndMs - m.sourceStartMs)}`}>
                    <span className="tl__zi__label">{maskLabel(m)}</span>
                    <span className="tl__handle tl__handle--start" onMouseDown={onMaskDown(m.id, 'start')} />
                    <span className="tl__handle tl__handle--end" onMouseDown={onMaskDown(m.id, 'end')} />
                  </div>
                )
              })}
              {t.id === 'layouts' && project.layouts.map((l) => {
                const a = atOutput(l.sourceStartMs)
                const b = atOutput(l.sourceEndMs)
                if (a === null || b === null) return null
                return (
                  <div key={l.id} className={`tl__zi tl__zi--layout${l.isDisabled ? ' tl__zi--off' : ''}${l.id === selectedLayoutId ? ' tl__zi--on' : ''}`} style={{ left: x(a), width: Math.max(2, x(b) - x(a)) }} onMouseDown={onLayoutDown(l.id, 'move')} onClick={(e) => { e.stopPropagation(); if (!layoutDrag.current) onSelectLayout(l.id) }} title={`${LAYOUT_NAMES[l.type]} · ${formatClock(l.sourceEndMs - l.sourceStartMs)}`}>
                    <span className="tl__zi__label">{LAYOUT_NAMES[l.type]}</span>
                    <span className="tl__handle tl__handle--start" onMouseDown={onLayoutDown(l.id, 'start')} />
                    <span className="tl__handle tl__handle--end" onMouseDown={onLayoutDown(l.id, 'end')} />
                  </div>
                )
              })}
              {t.id === 'zooms' && project.zooms.map((z) => {
                const a = atOutput(z.startMs)
                const b = atOutput(z.endMs)
                if (a === null || b === null) return null
                return (
                  <div key={z.id} className={`tl__zi${z.isDisabled ? ' tl__zi--off' : ''}${z.id === selectedZoomId ? ' tl__zi--on' : ''}`} style={{ left: x(a), width: Math.max(2, x(b) - x(a)) }} onMouseDown={onZoomDown(z.id, 'move')} onClick={(e) => { e.stopPropagation(); if (!zoomDrag.current) onSelectZoom(z.id) }} title={`${isAutoType(z.type) ? 'Auto' : 'Manual'} · ${z.zoom.toFixed(2)}× · ${formatClock(z.endMs - z.startMs)}`}>
                    <span className="tl__zi__label">{isAutoType(z.type) ? 'Auto' : 'Manual'} · {Math.round(z.zoom * 100)}%</span>
                    <span className="tl__handle tl__handle--start" onMouseDown={onZoomDown(z.id, 'start')} />
                    <span className="tl__handle tl__handle--end" onMouseDown={onZoomDown(z.id, 'end')} />
                  </div>
                )
              })}
              {t.id === 'shortcuts' && project.recording.keys.map((k, i) => { const o = atOutput(k.timeMs); return o === null ? null : <span key={i} className="tl__chip" style={{ left: pct(o) }}>{k.label}</span> })}
            </div>
          ))}
          {wantBars && (
            <div className="tl__row tl__wave">
              {bars.map((b, i) => { const o = atOutput((i / bars.length) * sourceDurationMs); return o === null ? null : <span key={i} style={{ left: pct(o), height: `${Math.max(4, b * 100)}%` }} /> })}
            </div>
          )}
          <div className="tl__playhead" style={{ left: pct(timeMs) }} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
