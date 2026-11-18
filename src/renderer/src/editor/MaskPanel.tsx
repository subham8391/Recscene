import { BLUR_MAX, BLUR_MIN, DISABLED_HELP, MASK_TYPES, OFF_RANGE_NOTE, OPACITY_MAX, OPACITY_MIN, regionFromPx, regionToPx, type Mask, type MaskRegion } from '@core/editor/masks'
import { formatTimecode } from '@core/time'

interface Props {
  masks: Mask[]
  mask: Mask
  index: number
  recording: { width: number; height: number }
  /** True when the playhead is outside the mask (spec 192's warning, 196's buttons). */
  offRange: boolean
  hasClipboard: boolean
  onMask: (patch: Partial<Mask>) => void
  onAction: (id: string) => void
}

/** The Mask editor from the Masks board (specs 189–196, 198). */
export function MaskPanel({ masks, mask, index, recording, offRange, hasClipboard, onMask, onAction }: Props): React.JSX.Element {
  const px = regionToPx(mask.region, recording)
  const setPx = (key: keyof MaskRegion, value: number): void => {
    if (!Number.isFinite(value)) return
    onMask({ region: regionFromPx({ ...px, [key]: value }, recording) })
  }
  const field = (key: keyof MaskRegion, label: string): React.JSX.Element => (
    <label className="field--stack"><span>{label}</span><input className="input input--num" type="number" value={Math.round(px[key])} onChange={(e) => setPx(key, Number(e.target.value))} /></label>
  )
  return (
    <div className="panel-body">
      {offRange && (
        <section className="card card--warn">
          <p className="note">{OFF_RANGE_NOTE}</p>
          <div className="grid2">
            <button type="button" className="btn btn--ghost" onClick={() => onAction('focusTimelineOnMask')}>Focus timeline</button>
            <button type="button" className="btn btn--ghost" onClick={() => onAction('focusTimelineOnMaskStart')}>Go to start</button>
          </div>
        </section>
      )}
      <section className="sec">
        <h3>Mask type</h3>
        <div className="grid2">
          {MASK_TYPES.map((t) => (
            <button key={t.id} type="button" className={`choice${mask.type === t.id ? ' choice--on' : ''}`} aria-pressed={mask.type === t.id} onClick={() => onMask({ type: t.id })}><b>{t.name}</b><small>{t.sub}</small></button>
          ))}
        </div>
      </section>
      {mask.type === 'sensitive-data' ? (
        <section className="sec">
          <div className="hd"><h3>Blur strength</h3><span>{mask.blurStrength} px</span></div>
          <input type="range" min={BLUR_MIN} max={BLUR_MAX} step={1} value={mask.blurStrength} aria-label="Blur strength" onChange={(e) => onMask({ blurStrength: Number(e.target.value) })} />
          <p className="note">Blur permanently removes the pixels in the export. The original stays inside the .recscene project.</p>
        </section>
      ) : (
        <section className="sec">
          <div className="hd"><h3>Dim everything else</h3><span>{Math.round(mask.highlightMaskOpacity * 100)}%</span></div>
          <input type="range" min={OPACITY_MIN} max={OPACITY_MAX} step={0.01} value={mask.highlightMaskOpacity} aria-label="Highlight mask opacity" onChange={(e) => onMask({ highlightMaskOpacity: Number(e.target.value) })} />
          {masks.length > 1 && <button type="button" className="btn btn--ghost" onClick={() => onAction('applyHighlightOpacityToAll')}>Apply to all masks</button>}
        </section>
      )}
      <section className="sec">
        <h3>Size and position</h3>
        <div className="fields4">
          {field('x', 'X')}{field('y', 'Y')}{field('width', 'W')}{field('height', 'H')}
        </div>
        <p className="note">Arrow keys nudge 1 px, ⇧ 10 px. A mask covers its whole time range at one position.</p>
      </section>
      <section className="card">
        <label className="toggle"><span><b>Feather edge</b><small>Soft {6} px edge so the blur does not look cut out.</small></span><input type="checkbox" checked={mask.featherEdge} onChange={(e) => onMask({ featherEdge: e.target.checked })} /></label>
        <label className="toggle"><span><b>Enabled</b><small>{DISABLED_HELP}</small></span><input type="checkbox" checked={!mask.isDisabled} onChange={(e) => onMask({ isDisabled: !e.target.checked })} /></label>
        <label className="toggle"><span><b>Detect masked content shift</b><small>Experimental: moves the mask if the page scrolls. Not built yet.</small></span><input type="checkbox" disabled /></label>
      </section>
      <section className="grid2">
        <button type="button" className="btn btn--ghost" onClick={() => onAction('copyMask')}>Copy mask</button>
        <button type="button" className="btn btn--ghost" disabled={!hasClipboard} onClick={() => onAction('paste')}>Paste settings</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('splitSliceAtCurrentTime')}>Split at playhead <kbd>C</kbd></button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('disableAllMasks')}>Disable all masks</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('removeAllMasks')}>Remove all masks</button>
        <button type="button" className="btn btn--ghost btn--danger" onClick={() => onAction('removeSlice')}>Remove <kbd>⌫</kbd></button>
      </section>
      <p className="note">Mask {index + 1} of {masks.length} · {formatTimecode(mask.sourceStartMs)} – {formatTimecode(mask.sourceEndMs)}</p>
    </div>
  )
}
