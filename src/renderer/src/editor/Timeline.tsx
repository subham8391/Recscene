import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { panView, rulerTicks, sliderToZoom, timeAtX, visibleLabel, xAtTime, zoomToSlider, zoomView, type TimelineView } from '@core/editor/timelineView'
import { waveformBars } from '@core/editor/waveform'
import type { Project } from '@core/project'
import type { RecordingMarker } from '@core/recordingSession'
import { formatClock } from '@core/recordingPicker'
import { speedLabel } from '@core/editor/playback'

export type TrackId = 'zooms' | 'layouts' | 'masks' | 'shortcuts'

export interface TrackVisibility {
  zooms: true
  layouts: boolean
  masks: boolean
  shortcuts: boolean
}

interface Props {
  project: Project
  markers: RecordingMarker[]
  durationMs: number
  timeMs: number
  view: TimelineView
  setView: (v: TimelineView) => void
  visible: TrackVisibility
  toggleTrack: (id: TrackId) => void
  onSeek: (ms: number) => void
  onPreview: (ms: number | null) => void
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

/** The timeline (specs 50–51, 58–62): toolbar, ruler, tracks, waveform, playhead and preview. */
export function Timeline(props: Props): React.JSX.Element {
  const { project, markers, durationMs, timeMs, view, setView, visible, toggleTrack, onSeek, onPreview, micUrl, showWaveform, smoothWaveform, alwaysShowScrollbar, audioScrubber, onToggleAudioScrubber } = props
  const lane = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1)
  const [tracksOpen, setTracksOpen] = useState(false)
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    const el = lane.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(1, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Decode the microphone track once for the waveform (spec 61).
  const wantBars = !!micUrl && showWaveform
  useEffect(() => {
    if (!micUrl || !showWaveform) return
    let cancelled = false
    void (async () => {
      try {
        const buf = await (await fetch(micUrl)).arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buf)
        const samples = decoded.getChannelData(0)
        if (!cancelled) setBars(waveformBars(samples, 600, smoothWaveform))
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

  const ticks = useMemo(() => rulerTicks(view), [view])
  const x = (ms: number): number => xAtTime(view, ms, width)
  const pct = (ms: number): string => `${(x(ms) / width) * 100}%`
  const visibleCount = 1 + Number(visible.layouts) + Number(visible.masks) + Number(visible.shortcuts)
  const rows = TRACKS.filter((t) => t.forced || visible[t.id])

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
        <button type="button" className={`btn btn--ghost${audioScrubber ? ' btn--on' : ''}`} aria-pressed={audioScrubber} title={audioScrubber ? 'Disable audio scrubber' : 'Enable audio scrubber (experimental)'} onClick={onToggleAudioScrubber}>
          ♪ scrub
        </button>
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
          {rows.map((t) => (
            <div key={t.id} className="tl__name"><span className="tl__dot" style={{ background: t.color }} />{t.name}</div>
          ))}
          {showWaveform && micUrl && <div className="tl__name"><span className="tl__dot" style={{ background: 'var(--text3)' }} />Audio</div>}
        </div>
        <div ref={lane} className="tl__lane" onWheel={onWheel} onMouseMove={(e) => onPreview(timeFromEvent(e))} onMouseLeave={() => onPreview(null)} onClick={(e) => onSeek(timeFromEvent(e))}>
          <div className="tl__ruler">
            {ticks.map((t) => (
              <span key={t.timeMs} className="tl__tick" style={{ left: pct(t.timeMs) }}>{t.label}</span>
            ))}
            {markers.map((m, i) => (
              <span key={`m${i}`} className="tl__marker" style={{ left: pct(m.timeMs) }} title={`Marker ${formatClock(m.timeMs)}${m.label ? ` · ${m.label}` : ''}`} />
            ))}
            {project.meta.recordingFlags.map((f, i) => (
              <span key={`f${i}`} className="tl__flag" style={{ left: pct(f) }} title={`Flag ${formatClock(f)}`}>⚑</span>
            ))}
          </div>
          <div className="tl__row">
            {(project.clips.length ? project.clips : [{ id: 'all', startMs: 0, endMs: durationMs, speed: 1 }]).map((c) => (
              <span key={c.id} className="tl__clip" style={{ left: pct(c.startMs), width: `${((x(c.endMs) - x(c.startMs)) / width) * 100}%` }}>
                {speedLabel(c.speed)} · {formatClock(c.endMs - c.startMs)}
              </span>
            ))}
          </div>
          {rows.map((t) => (
            <div key={t.id} className="tl__row" data-track={t.id}>
              {t.id === 'zooms' && project.zooms.map((z) => <span key={z.id} className="tl__item" style={{ left: pct(z.startMs), width: `${((x(z.endMs) - x(z.startMs)) / width) * 100}%`, background: 'var(--zoom)' }} />)}
              {t.id === 'shortcuts' && project.recording.keys.map((k, i) => <span key={i} className="tl__chip" style={{ left: pct(k.timeMs) }}>{k.label}</span>)}
            </div>
          ))}
          {showWaveform && micUrl && (
            <div className="tl__row tl__wave">
              {(wantBars ? bars : []).map((b, i) => <span key={i} style={{ left: pct((i / bars.length) * durationMs), height: `${Math.max(4, b * 100)}%` }} />)}
            </div>
          )}
          <div className="tl__playhead" style={{ left: pct(timeMs) }} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
