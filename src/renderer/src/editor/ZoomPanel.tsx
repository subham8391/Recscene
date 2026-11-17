import { useRef } from 'react'
import { cursorAt, SPRING_FOCUSED, SPRING_SMOOTH, type CursorSample } from '@core/editor/camera'
import { applyLevelToAll, isAutoType, SNAP_MAX, ZOOM_MAX, ZOOM_MIN, ZOOM_PRESETS, type ZoomRange, updateZoom } from '@core/editor/zooms'
import type { Project } from '@core/project'
import { formatTimecode } from '@core/time'

interface Props {
  project: Project
  zooms: ZoomRange[]
  zoom: ZoomRange
  index: number
  cursor: CursorSample[]
  screenUrl: string
  defaultZoomLevel: number
  onZooms: (zooms: ZoomRange[]) => void
  onConfig: (config: Project['config']) => void
  onDefaultLevel: (level: number) => void
  onAction: (id: string) => void
}

/** The Zoom inspector from the Main board (specs 105–123 controls). */
export function ZoomPanel({ project, zooms, zoom, index, cursor, screenUrl, defaultZoomLevel, onZooms, onConfig, onDefaultLevel, onAction }: Props): React.JSX.Element {
  const picker = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<ZoomRange>): void => onZooms(updateZoom(zooms, zoom.id, patch))
  const auto = isAutoType(zoom.type)
  const midMs = (zoom.startMs + zoom.endMs) / 2
  const spring = project.config.screenMovementSpring
  const preset = spring.stiffness === SPRING_SMOOTH.stiffness ? 'smooth' : 'focused'
  const place = (e: React.MouseEvent): void => {
    const r = picker.current?.getBoundingClientRect()
    if (!r || e.buttons === 0) return
    set({ manualTargetPoint: { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) } })
  }
  const followPoint = cursorAt(cursor, midMs)

  return (
    <div className="panel-body">
      <section className="sec">
        <h3>Zoom mode</h3>
        <div className="grid2">
          <button type="button" className={`choice${auto ? ' choice--on' : ''}`} aria-pressed={auto} onClick={() => set({ type: 'follow-mouse' })}><b>Auto</b><small>Zoomed camera will automatically try to keep the mouse cursor visible.</small></button>
          <button type="button" className={`choice${!auto ? ' choice--on' : ''}`} aria-pressed={!auto} onClick={() => set({ type: 'manual' })}><b>Manual</b><small>You can manually pick part of the video that will be zoomed in.</small></button>
        </div>
        {!auto && (
          <div ref={picker} className="target" style={{ aspectRatio: `${project.recording.screen.width} / ${project.recording.screen.height}` }} onMouseDown={place} onMouseMove={place} aria-label="Drag the dot to the part of the frame to zoom into">
            <video className="target__frame" src={`${screenUrl}#t=${(midMs / 1000).toFixed(2)}`} muted preload="metadata" />
            <span className="target__dot" style={{ left: `${zoom.manualTargetPoint.x * 100}%`, top: `${zoom.manualTargetPoint.y * 100}%` }} />
          </div>
        )}
        {auto && <p className="note">At {formatTimecode(midMs)} the cursor is at {Math.round(followPoint.x * 100)}%, {Math.round(followPoint.y * 100)}% of the frame.</p>}
      </section>

      <section className="sec">
        <div className="hd"><h3>Zoom level</h3><span>{Math.round(zoom.zoom * 100)}%</span></div>
        <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.005} value={zoom.zoom} onChange={(e) => { set({ zoom: Number(e.target.value) }); onDefaultLevel(Number(e.target.value)) }} />
        <div className="seg" role="group" aria-label="Zoom level presets">
          {ZOOM_PRESETS.map((lvl, i) => (
            <button key={lvl} type="button" aria-pressed={Math.abs(zoom.zoom - lvl) < 0.001} title={`Key ${i + 1}`} onClick={() => { set({ zoom: lvl }); onDefaultLevel(lvl) }}>{lvl}</button>
          ))}
          <button type="button" title="Key 0 · default level" onClick={() => set({ zoom: defaultZoomLevel })}>0</button>
        </div>
        <button type="button" className="btn btn--ghost" disabled={zooms.length < 2} onClick={() => onZooms(applyLevelToAll(zooms, zoom.id))}>Apply zoom level to all other zooms</button>
        <p className="note">⌘= and ⌘- change the level by 0.2 while a zoom is selected. The slider also sets the default for new zooms.</p>
      </section>

      {auto && (
        <section className="sec">
          <div className="hd"><h3>Snap to edges</h3><span>{Math.round(zoom.snapToEdgesRatio * 100)}% of visible area</span></div>
          <input type="range" min={0} max={SNAP_MAX} step={0.01} value={zoom.snapToEdgesRatio} onChange={(e) => set({ snapToEdgesRatio: Number(e.target.value) })} />
          <p className="note">If zoom center is close to edge of recording - it will snap to it, showing a bit of background on the side.</p>
        </section>
      )}

      <section className="card">
        <label className="toggle"><span><b>Instant animation</b><small>If enabled, the zoom will be applied instantly without any animation.</small></span><input type="checkbox" checked={zoom.hasInstantAnimation} onChange={(e) => set({ hasInstantAnimation: e.target.checked })} /></label>
        <label className="toggle"><span><b>Enabled</b><small>Disabled zooms stay on the track but do not zoom.</small></span><input type="checkbox" checked={!zoom.isDisabled} onChange={(e) => set({ isDisabled: !e.target.checked })} /></label>
        <label className="toggle"><span><b>Always keep zoomed in</b><small>Crops the view to the output ratio and follows the cursor for the whole video.</small></span><input type="checkbox" checked={project.config.alwaysKeepZoomedIn} onChange={(e) => onConfig({ ...project.config, alwaysKeepZoomedIn: e.target.checked })} /></label>
      </section>

      <section className="sec">
        <h3>Screen movement</h3>
        <div className="seg" role="group" aria-label="Screen movement physics">
          <button type="button" aria-pressed={preset === 'focused'} title="Animation stabilizes quickly making it easier to follow and read the content" onClick={() => onConfig({ ...project.config, screenMovementSpring: { ...SPRING_FOCUSED } })}>Focused</button>
          <button type="button" aria-pressed={preset === 'smooth'} title="Animation is more fluid. Great for more creative content not focused on reading" onClick={() => onConfig({ ...project.config, screenMovementSpring: { ...SPRING_SMOOTH } })}>Smooth</button>
        </div>
      </section>

      <section className="grid2">
        <button type="button" className="btn btn--ghost" onClick={() => onAction('splitSliceAtCurrentTime')}>Split at playhead <kbd>C</kbd></button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('duplicateZoom')}>Duplicate</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('copyFrame')}>Copy zoom</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('paste')}>Paste settings</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction(zooms.some((z) => !z.isDisabled) ? 'disableAllZooms' : 'enableAllZooms')}>{zooms.some((z) => !z.isDisabled) ? 'Disable all' : 'Enable all'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('restoreDefaultZooms')}>Restore default zooms</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('removeAllZooms')}>Remove all zooms</button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={() => onAction('removeSlice')}>Remove <kbd>⌫</kbd></button>
      </section>
      <p className="note">Zoom {index + 1} of {zooms.length} · {formatTimecode(zoom.startMs)} – {formatTimecode(zoom.endMs)}{zoom.isSystem ? ' · created from clicks' : ''}</p>
    </div>
  )
}
