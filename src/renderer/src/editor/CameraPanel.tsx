import {
  CAMERA_SIZE_MAX,
  CAMERA_SIZE_MIN,
  cellPoint,
  ENABLE_CAMERA_QUESTION,
  LAYOUT_HELP,
  NO_CAMERA_RECORDED,
  POSITION_LABELS,
  positionCell,
  ROUNDNESS_MAX,
  SPLIT_RATIOS,
  ZOOM_SCALE_DEFAULT,
  ZOOM_SCALE_MAX,
  ZOOM_SCALE_MIN,
  type CameraConfig,
  type CameraLayout,
  type LayoutType,
  type Point01
} from '@core/editor/cameraLayout'
import { formatTimecode } from '@core/time'
import { CAMERA_LOOKS, lookFilter, sharpenLabel } from '@core/editor/looks'
import { clampSilenceMs, HIDE_SILENCE_DEFAULT_MS, HIDE_SILENCE_MAX_MS, HIDE_SILENCE_MIN_MS, NO_MIC_FOR_SILENCE, NO_SPEECH_FOUND } from '@core/editor/speech'

const LAYOUT_TYPES: LayoutType[] = ['both', 'split', 'only-camera', 'only-screen']
/** Card labels from the Camera board; the long names stay on the timeline and in tooltips. */
const SHORT_LAYOUT_NAMES: Record<LayoutType, string> = { both: 'Overlay', split: 'Split', 'only-camera': 'Fullscreen', 'only-screen': 'Hidden' }

function PositionGrid({ value, onChange }: { value: Point01; onChange: (p: Point01) => void }): React.JSX.Element {
  const cell = positionCell(value)
  return (
    <div className="posgrid" role="group" aria-label="Camera position">
      {POSITION_LABELS.map((label, i) => (
        <button key={label} type="button" aria-label={label} aria-pressed={cell === i} title={label} onClick={() => onChange(cellPoint(i))} />
      ))}
    </div>
  )
}

function LayoutPicker({ value, onChange, disabled }: { value: LayoutType; onChange: (t: LayoutType) => void; disabled?: boolean }): React.JSX.Element {
  return (
    <div className="laypick" role="group" aria-label="Layout mode">
      {LAYOUT_TYPES.map((t) => (
        <button key={t} type="button" aria-pressed={value === t} title={LAYOUT_HELP[t]} disabled={disabled} onClick={() => onChange(t)}>
          <span className={`laypick__thumb laypick__thumb--${t}`}><span /></span>
          {SHORT_LAYOUT_NAMES[t]}
        </button>
      ))}
    </div>
  )
}

interface PanelProps {
  config: CameraConfig
  hasCamera: boolean
  /** Spec 286 needs the microphone track. */
  hasMic: boolean
  /** Spec 286: what the speech check found. */
  speechState: 'off' | 'checking' | 'found' | 'none'
  /** Spec 286: a muted microphone never hides the camera. */
  micMuted: boolean
  layouts: CameraLayout[]
  /** True while a timeline layout covers the playhead (spec 152's warning). */
  customPlaying: boolean
  onConfig: (patch: Partial<CameraConfig>) => void
  onAction: (id: string) => void
}

/** The Camera inspector from the Camera board (specs 148–155, 160, 164, delay from 287). */
export function CameraPanel({ config, hasCamera, hasMic, speechState, micMuted, layouts, customPlaying, onConfig, onAction }: PanelProps): React.JSX.Element {
  if (!hasCamera) {
    return (
      <div className="panel-body">
        <p className="note">{NO_CAMERA_RECORDED}. Turn the camera on in the recording picker to get a webcam track next time.</p>
      </div>
    )
  }
  const d = config.defaultLayout
  const setDefault = (patch: Partial<typeof d>): void => onConfig({ defaultLayout: { ...d, ...patch } })
  if (config.hideCamera) {
    return (
      <div className="panel-body">
        <section className="card">
          <label className="toggle"><span><b>Hide camera</b><small>The camera layer is left out of the preview and the export; the recording stays in the project.</small></span><input type="checkbox" checked onChange={() => onConfig({ hideCamera: false })} /></label>
          <p className="note">{ENABLE_CAMERA_QUESTION}</p>
          <button type="button" className="btn btn--ghost" onClick={() => onConfig({ hideCamera: false })}>Enable camera <kbd>H</kbd></button>
        </section>
      </div>
    )
  }
  return (
    <div className="panel-body">
      <section className="sec">
        <h3>Default layout</h3>
        <LayoutPicker value={d.type} onChange={(type) => setDefault({ type })} />
        <p className="note">Add layouts on the Layouts track to change this over time: fullscreen camera, hide camera, split. {customPlaying ? 'Custom layout is played on the timeline, so you might not see the changes you make.' : ''}</p>
      </section>

      {d.type === 'both' && (
        <section className="sec camlayout">
          <div className="camlayout__pos">
            <h3>Position</h3>
            <PositionGrid value={d.cameraPositionPoint} onChange={(cameraPositionPoint) => setDefault({ cameraPositionPoint })} />
          </div>
          <div className="camlayout__sliders">
            <div className="hd"><h3>Size</h3><span>{Math.round(d.cameraSize * 100)}%</span></div>
            <input type="range" min={CAMERA_SIZE_MIN} max={CAMERA_SIZE_MAX} step={0.01} value={d.cameraSize} aria-label="Camera size" onChange={(e) => setDefault({ cameraSize: Number(e.target.value) })} />
            <div className="hd"><h3>Roundness</h3><span>{Math.round(config.cameraRoundness * 100)}%</span></div>
            <input type="range" min={0} max={ROUNDNESS_MAX} step={0.01} value={config.cameraRoundness} aria-label="Roundness" onChange={(e) => onConfig({ cameraRoundness: Number(e.target.value) })} />
            <div className="seg" role="group" aria-label="Camera shape">
              <button type="button" aria-pressed={config.cameraAspectRatio === 'original'} onClick={() => onConfig({ cameraAspectRatio: 'original' })}>Original</button>
              <button type="button" aria-pressed={config.cameraAspectRatio === 'square'} onClick={() => onConfig({ cameraAspectRatio: 'square' })}>Square</button>
            </div>
          </div>
        </section>
      )}

      {d.type === 'split' && (
        <section className="sec">
          <h3>Split ratio</h3>
          <div className="seg" role="group" aria-label="Split ratio">
            {SPLIT_RATIOS.map((r) => <button key={r.label} type="button" aria-pressed={Math.abs(config.splitRatio - r.ratio) < 0.01} onClick={() => onConfig({ splitRatio: r.ratio })}>{r.label}</button>)}
          </div>
          <label className="toggle"><span><b>Flip sides</b><small>Camera on the left.</small></span><input type="checkbox" checked={config.splitFlip} onChange={(e) => onConfig({ splitFlip: e.target.checked })} /></label>
        </section>
      )}

      {d.type !== 'both' && (
        <section className="sec">
          <div className="hd"><h3>Roundness</h3><span>{Math.round(config.cameraRoundness * 100)}%</span></div>
          <input type="range" min={0} max={ROUNDNESS_MAX} step={0.01} value={config.cameraRoundness} aria-label="Roundness" onChange={(e) => onConfig({ cameraRoundness: Number(e.target.value) })} />
          <div className="seg" role="group" aria-label="Camera shape">
            <button type="button" aria-pressed={config.cameraAspectRatio === 'original'} onClick={() => onConfig({ cameraAspectRatio: 'original' })}>Original</button>
            <button type="button" aria-pressed={config.cameraAspectRatio === 'square'} onClick={() => onConfig({ cameraAspectRatio: 'square' })}>Square</button>
          </div>
        </section>
      )}

      <section className="card">
        <label className="toggle"><span><b>Make smaller during zoom</b><small>Shrinks to {Math.round((config.cameraScaleDuringZoom < 1 ? config.cameraScaleDuringZoom : ZOOM_SCALE_DEFAULT) * 100)}% so it never covers what you zoom into.</small></span><input type="checkbox" checked={config.cameraScaleDuringZoom < 1} onChange={(e) => onConfig({ cameraScaleDuringZoom: e.target.checked ? ZOOM_SCALE_DEFAULT : 1 })} /></label>
        {config.cameraScaleDuringZoom < 1 && (
          <>
            <div className="hd"><span>Size during zoom</span><span>{Math.round(config.cameraScaleDuringZoom * 100)}%</span></div>
            <input type="range" min={ZOOM_SCALE_MIN} max={ZOOM_SCALE_MAX} step={0.01} value={config.cameraScaleDuringZoom} aria-label="Camera size during zoom" onChange={(e) => onConfig({ cameraScaleDuringZoom: Number(e.target.value) })} />
          </>
        )}
        <label className="toggle"><span><b>Mirror horizontally</b></span><input type="checkbox" checked={config.mirrorCamera} onChange={(e) => onConfig({ mirrorCamera: e.target.checked })} /></label>
        <label className="toggle"><span><b>Face tracking</b><small>Centres the picture on your face. Done locally. Not built yet.</small></span><input type="checkbox" disabled /></label>
        <label className="toggle"><span><b>Hide during silence</b><small>{hasMic ? (config.hideDuringSilenceMs !== null ? `Minimum silence ${(config.hideDuringSilenceMs / 1000).toFixed(1)} s` : 'Drops the camera while nobody speaks.') : NO_MIC_FOR_SILENCE}</small></span><input type="checkbox" disabled={!hasMic} checked={config.hideDuringSilenceMs !== null} onChange={(e) => onConfig({ hideDuringSilenceMs: e.target.checked ? HIDE_SILENCE_DEFAULT_MS : null })} /></label>
        {config.hideDuringSilenceMs !== null && (
          <>
            <div className="hd"><span>Minimum silence duration</span><span>{(config.hideDuringSilenceMs / 1000).toFixed(1)} s</span></div>
            <input type="range" min={HIDE_SILENCE_MIN_MS} max={HIDE_SILENCE_MAX_MS} step={100} value={config.hideDuringSilenceMs} aria-label="Minimum silence duration" onChange={(e) => onConfig({ hideDuringSilenceMs: clampSilenceMs(Number(e.target.value)) })} onDoubleClick={() => onConfig({ hideDuringSilenceMs: HIDE_SILENCE_DEFAULT_MS })} />
            {speechState === 'checking' && <p className="note">Checking the microphone for speech…</p>}
            {speechState === 'none' && <p className="note">{NO_SPEECH_FOUND}</p>}
            {micMuted && <p className="note">The microphone is muted, so the camera never hides.</p>}
          </>
        )}
      </section>

      <section className="sec">
        <div className="hd"><h3>Color grading</h3><span>{config.lut === 'original' ? 'Off' : `${Math.round(config.lutIntensity * 100)}%`}</span></div>
        <div className="looks" role="group" aria-label="Camera look">
          {CAMERA_LOOKS.map((l) => (
            <button key={l.id} type="button" aria-pressed={config.lut === l.id} title={l.description} onClick={() => onConfig({ lut: l.id })}>
              <span className="looks__swatch" style={{ filter: lookFilter(l.id, 1) || undefined }} />
              {l.name}
            </button>
          ))}
        </div>
        {config.lut !== 'original' && (
          <>
            <div className="hd"><span>Color grading intensity</span><span>{Math.round(config.lutIntensity * 100)}%</span></div>
            <input type="range" min={0} max={1} step={0.01} value={config.lutIntensity} aria-label="Color grading intensity" onChange={(e) => onConfig({ lutIntensity: Number(e.target.value) })} onDoubleClick={() => onConfig({ lutIntensity: 1 })} />
          </>
        )}
        <div className="hd"><span>Sharpen</span><span>{sharpenLabel(config.sharpen01)}</span></div>
        <input type="range" min={0} max={1} step={0.01} value={config.sharpen01} aria-label="Sharpen" onChange={(e) => onConfig({ sharpen01: Number(e.target.value) })} onDoubleClick={() => onConfig({ sharpen01: 0 })} />
        <p className="note">Looks are colour filters applied in the preview and the export; custom .cube LUT files are not supported yet.</p>
      </section>

      <section className="sec">
        <h3>Advanced</h3>
        <div className="hd"><span>Camera delay</span><span>{config.cameraDelayMs} ms</span></div>
        <input type="range" min={-200} max={200} step={5} value={config.cameraDelayMs} aria-label="Camera delay" onChange={(e) => onConfig({ cameraDelayMs: Number(e.target.value) })} />
        <p className="note">If lips move after the words, raise it; before, lower it.</p>
        <div className="grid2">
          <button type="button" className="btn btn--ghost" onClick={() => onAction('toggleHideCamera')}>Hide camera <kbd>H</kbd></button>
          <button type="button" className="btn btn--ghost" disabled={layouts.length === 0} onClick={() => onAction('removeAllLayouts')}>Remove all layouts</button>
        </div>
      </section>

      <section className="sec">
        <h3>Dynamic camera layout</h3>
        <p className="note">To create a new camera layout click on the camera layouts timeline or use the buttons below.</p>
        <div className="grid2">
          <button type="button" className="btn btn--ghost" onClick={() => onAction('addLayout')}>Add camera layout</button>
          <button type="button" className="btn btn--ghost" onClick={() => onAction('addScreenLayout')}>Add screen layout</button>
          <button type="button" className="btn btn--ghost" onClick={() => onAction('addBothLayout')}>Add both layout</button>
          <button type="button" className="btn btn--ghost" onClick={() => onAction('addSplitLayout')}>Add split layout</button>
        </div>
      </section>
    </div>
  )
}

interface LayoutProps {
  config: CameraConfig
  layouts: CameraLayout[]
  layout: CameraLayout
  index: number
  /** True when the playhead is outside this layout (spec 157's warning). */
  notPlaying: boolean
  onLayouts: (layouts: CameraLayout[]) => void
  onAction: (id: string) => void
}

/** The camera layout editor (specs 156–164): what one timeline layout shows. */
export function LayoutPanel({ config, layouts, layout, index, notPlaying, onLayouts, onAction }: LayoutProps): React.JSX.Element {
  const set = (patch: Partial<CameraLayout>): void => onLayouts(layouts.map((l) => (l.id === layout.id ? { ...l, ...patch } : l)))
  const custom = layout.cameraSize !== null
  return (
    <div className="panel-body">
      <section className="sec">
        <h3>Layout mode</h3>
        <LayoutPicker value={layout.type} onChange={(type) => set({ type })} />
        {notPlaying && <p className="note">This layout is not played on the timeline, so you may not see the changes you make.</p>}
        <p className="note">Keys 1, 2 and 3 set both, fullscreen and hide while a layout is selected.</p>
      </section>
      {layout.type === 'both' && (
        <section className="sec">
          <div className="hd hd--grid"><h3>Position</h3><PositionGrid value={layout.cameraPositionPoint} onChange={(cameraPositionPoint) => set({ cameraPositionPoint })} /></div>
          <p className="note">Arrow keys move the camera between the nine spots.</p>
          <label className="toggle"><span><b>Custom camera size</b><small>When enabled, you can set a custom camera size that will be used while this layout is active.</small></span><input type="checkbox" checked={custom} onChange={(e) => set({ cameraSize: e.target.checked ? config.defaultLayout.cameraSize : null })} /></label>
          {custom && (
            <>
              <div className="hd"><span>Camera size</span><span>{Math.round((layout.cameraSize ?? 0) * 100)}%</span></div>
              <input type="range" min={CAMERA_SIZE_MIN} max={CAMERA_SIZE_MAX} step={0.01} value={layout.cameraSize ?? config.defaultLayout.cameraSize} aria-label="Custom camera size" onChange={(e) => set({ cameraSize: Number(e.target.value) })} />
              <button type="button" className="btn btn--ghost" disabled={layouts.length < 2} onClick={() => onAction('applyCameraLayoutSizeToAll')}>Apply camera size to all other layouts</button>
            </>
          )}
        </section>
      )}
      <section className="card">
        <label className="toggle"><span><b>Enabled</b><small>A disabled layout stays on the track; the default layout plays instead.</small></span><input type="checkbox" checked={!layout.isDisabled} onChange={(e) => set({ isDisabled: !e.target.checked })} /></label>
      </section>
      <section className="grid2">
        <button type="button" className="btn btn--ghost" onClick={() => onAction('splitSliceAtCurrentTime')}>Split at playhead <kbd>C</kbd></button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('copyLayout')}>Copy layout</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('paste')}>Paste settings</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('removeAllLayouts')}>Remove all layouts</button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={() => onAction('removeSlice')}>Remove layout <kbd>⌫</kbd></button>
      </section>
      <p className="note">Layout {index + 1} of {layouts.length} · {formatTimecode(layout.sourceStartMs)} – {formatTimecode(layout.sourceEndMs)}</p>
    </div>
  )
}
