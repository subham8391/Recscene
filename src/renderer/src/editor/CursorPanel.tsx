import { CLICK_SPRING_DEFAULT, CURSOR_PRESETS, CURSOR_SETS, CURSOR_SIZE_DEFAULT, CURSOR_SIZE_MAX, CURSOR_SIZE_MIN, CUSTOM_SET_COLOURS, presetFor, type CursorConfig, type CursorSetId } from '@core/editor/cursor'

interface Props {
  config: CursorConfig
  hasCursor: boolean
  clipHidden: boolean
  onConfig: (patch: Partial<CursorConfig>) => void
  onPreviewSound: () => void
}

const Slider = ({ id, label, value, min, max, step, format, hint, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; hint?: string; onChange: (v: number) => void }): React.JSX.Element => (
  <div className="sec">
    <div className="hd"><label htmlFor={id}>{label}</label><span>{format(value)}</span></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    {hint && <p className="note">{hint}</p>}
  </div>
)

/** The three named sets are a segmented control; Halloween and the custom colours are swatches (Cursor board). */
const NAMED_SETS = CURSOR_SETS.slice(0, 3)
const COLOUR_SETS: { id: CursorSetId; label: string; colour: string }[] = [
  { id: 'halloween', label: 'Halloween', colour: '#ff8a1f' },
  ...CUSTOM_SET_COLOURS.map((colour, i) => ({ id: `custom-${i + 1}` as CursorSetId, label: `Custom ${i + 1}`, colour }))
]

const STYLE_HINTS: Record<string, string> = {
  smooth: 'Fluid, cinematic movement.',
  medium: 'Balanced: follows the mouse closely without jitter.',
  rapid: 'Snappy, close to the recorded motion.',
  none: 'The recorded coordinates frame by frame; for precise drawing or when the exact position matters.'
}

/** The Cursor panel from the Cursor board (specs 125–147). */
export function CursorPanel({ config: c, hasCursor, clipHidden, onConfig, onPreviewSound }: Props): React.JSX.Element {
  if (!hasCursor) return <p className="muted">There is no mouse cursor recorded</p>
  const preset = presetFor(c.mouseMovementSpring, c.disableMouseMovementSpring)
  const spring = (patch: Partial<CursorConfig['mouseMovementSpring']>): void => onConfig({ mouseMovementSpring: { ...c.mouseMovementSpring, ...patch }, disableMouseMovementSpring: false })
  const s = c.mouseMovementSpring
  const styleHint = `${STYLE_HINTS[preset ?? ''] ?? 'Custom spring.'}${preset === 'none' ? '' : ` Rigidity ${s.stiffness} · smoothness ${s.damping} · momentum ${Number(s.mass.toFixed(1))}.`}`
  const sizeLabel = (v: number): string => `${v.toFixed(2).replace(/\.?0+$/, '')}×`

  return (
    <div className="panel-body">
      {clipHidden && <p className="note">Cursor is hidden in this part of the recording, so you will not see changes you make to it.</p>}
      <section className="card">
        <label className="toggle"><span><b>Show cursor</b><small>Hide it for the whole video; clips can hide it individually.</small></span><input type="checkbox" checked={!c.hideCursor} onChange={(e) => onConfig({ hideCursor: !e.target.checked })} /></label>
        {!c.hideCursor && (
          <>
            <label className="toggle"><span><b>Always use default system cursor</b><small>Ignore the recorded cursor type (I-beam, hand, resize).</small></span><input type="checkbox" checked={c.alwaysUseDefaultCursor} onChange={(e) => onConfig({ alwaysUseDefaultCursor: e.target.checked })} /></label>
            <label className="toggle"><span><b>Sharp cursor fallback</b><small>Draw the set's vector cursor when a captured cursor image is low resolution.</small></span><input type="checkbox" checked={c.useDefaultCursorIfAppCursorHasLowResolution} onChange={(e) => onConfig({ useDefaultCursorIfAppCursorHasLowResolution: e.target.checked })} /></label>
            <label className="toggle"><span><b>Optimise cursor type changes</b><small>Skips rapid type flickers when the mouse crosses small elements.</small></span><input type="checkbox" checked={c.optimizeOriginalCursorTypes} onChange={(e) => onConfig({ optimizeOriginalCursorTypes: e.target.checked })} /></label>
          </>
        )}
      </section>
      {c.hideCursor ? null : (
        <>
          <section className="sec">
            <h3>Cursor set</h3>
            <div className="seg" role="group" aria-label="Cursor set">
              {NAMED_SETS.map((set) => <button key={set.id} type="button" aria-pressed={c.cursorSet.id === set.id} onClick={() => onConfig({ cursorSet: { id: set.id } })}>{set.label}</button>)}
            </div>
            <div className="swatches swatches--8" role="group" aria-label="Coloured cursor sets">
              {COLOUR_SETS.map((set) => <button key={set.id} type="button" className={`swatch${c.cursorSet.id === set.id ? ' swatch--on' : ''}`} aria-pressed={c.cursorSet.id === set.id} title={set.label} style={{ background: set.colour }} onClick={() => onConfig({ cursorSet: { id: set.id } })} />)}
            </div>
          </section>

          <section className="sec">
            <div className="hd"><label htmlFor="csize">Size</label><span>{sizeLabel(c.cursorSize)}</span></div>
            <input id="csize" type="range" min={CURSOR_SIZE_MIN} max={CURSOR_SIZE_MAX} step={0.05} value={c.cursorSize} onChange={(e) => onConfig({ cursorSize: Number(e.target.value) })} onDoubleClick={() => onConfig({ cursorSize: CURSOR_SIZE_DEFAULT })} />
            <div className="hd hd--hint" aria-hidden="true"><span>{CURSOR_SIZE_MIN}×</span><span>double-click resets to {CURSOR_SIZE_DEFAULT}×</span><span>{CURSOR_SIZE_MAX}×</span></div>
            {c.cursorSize < 0.75 && <p className="note">With a small cursor, consider turning cursor motion blur down so it stays visible.</p>}
          </section>

          <section className="sec">
            <h3>Animation style</h3>
            <div className="seg" role="group" aria-label="Cursor animation style">
              {CURSOR_PRESETS.map((p) => <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => onConfig({ mouseMovementSpring: { ...p.spring }, disableMouseMovementSpring: false })}>{p.label}</button>)}
              <button type="button" aria-pressed={preset === 'none'} title="Use the recorded coordinates frame by frame" onClick={() => onConfig({ disableMouseMovementSpring: true })}>None</button>
            </div>
            <p className="note">{styleHint}</p>
            {preset !== 'none' && (
              <details className="disclosure">
                <summary>Customize spring</summary>
                <Slider id="rig" label="Rigidity" value={s.stiffness} min={5} max={600} step={1} format={String} hint="How much do I want to quickly get to the new position?" onChange={(v) => spring({ stiffness: v })} />
                <Slider id="smo" label="Smoothness" value={s.damping} min={5} max={200} step={1} format={String} hint="How much resistance do I feel when I move quickly?" onChange={(v) => spring({ damping: v })} />
                <Slider id="mom" label="Momentum" value={s.mass} min={0.1} max={10} step={0.1} format={(v) => v.toFixed(1)} hint="How hard is it to change my current speed?" onChange={(v) => spring({ mass: v })} />
                {preset === null && <button type="button" className="btn btn--ghost" onClick={() => onConfig({ mouseMovementSpring: { ...CURSOR_PRESETS[0]!.spring } })}>Reset to Smooth</button>}
              </details>
            )}
          </section>

          <section className="sec">
            <h3>Click effect</h3>
            <div className="seg" role="group" aria-label="Click effect">
              {([null, 'circle', 'ripple'] as const).map((v) => <button key={String(v)} type="button" aria-pressed={c.clickEffect === v} onClick={() => onConfig({ clickEffect: v })}>{v === null ? 'None' : v === 'circle' ? 'Circle' : 'Ripple'}</button>)}
            </div>
            <div className="grid2 grid2--fields">
              <label className="field--inline">Click sound
                <select id="csnd" className="input" value={c.clickSoundEffect ?? 'none'} onChange={(e) => onConfig({ clickSoundEffect: e.target.value === 'none' ? null : (e.target.value as 'apple-magic-mouse') })}>
                  <option value="none">None</option>
                  <option value="apple-magic-mouse">Magic Mouse</option>
                  <option value="logitech-mx-master">MX Master</option>
                </select>
              </label>
              <button type="button" className="btn btn--ghost" disabled={!c.clickSoundEffect} onClick={onPreviewSound}>Preview</button>
            </div>
            <div className="hd"><label htmlFor="cvol">Sound volume</label><span>{Math.round(c.clickSoundEffectVolume * 100)}%</span></div>
            <input id="cvol" type="range" min={0} max={1} step={0.01} value={c.clickSoundEffectVolume} onChange={(e) => onConfig({ clickSoundEffectVolume: Number(e.target.value) })} />
            <p className="note">Not played in parts faster than 2×.</p>
          </section>

          <section className="card">
            <label className="toggle"><span><b>Hide cursor when idle</b><small>After {((c.hideNotMovingCursorAfterMs ?? 2000) / 1000).toFixed(1)} s without movement; fades back in on the next move.</small></span><input type="checkbox" checked={c.hideNotMovingCursorAfterMs !== null} onChange={(e) => onConfig({ hideNotMovingCursorAfterMs: e.target.checked ? 2000 : null })} /></label>
            {c.hideNotMovingCursorAfterMs !== null && <input className="toggle__extra" type="range" min={500} max={5000} step={100} value={c.hideNotMovingCursorAfterMs} onChange={(e) => onConfig({ hideNotMovingCursorAfterMs: Number(e.target.value) })} aria-label="Idle time before hiding" />}
            <label className="toggle"><span><b>Rotate while moving</b><small>Tilts slightly as if chasing the mouse.</small></span><input type="checkbox" checked={c.cursorRotateOnXMovementRatio > 0} onChange={(e) => onConfig({ cursorRotateOnXMovementRatio: e.target.checked ? 0.5 : 0 })} /></label>
            {c.cursorRotateOnXMovementRatio > 0 && <input className="toggle__extra" type="range" min={0} max={2} step={0.05} value={c.cursorRotateOnXMovementRatio} onChange={(e) => onConfig({ cursorRotateOnXMovementRatio: Number(e.target.value) })} aria-label="Rotation ratio" />}
            <label className="toggle"><span><b>Stop movement at the end</b><small>Returns to its first position near the end of the video.</small></span><input type="checkbox" checked={c.stopCursorMovementInLastPartMs > 0} onChange={(e) => onConfig({ stopCursorMovementInLastPartMs: e.target.checked ? 1500 : 0, ...(e.target.checked ? { loopCursorPositionBeforeEndMs: null } : {}) })} /></label>
            {c.stopCursorMovementInLastPartMs > 0 && <input className="toggle__extra" type="range" min={50} max={5000} step={50} value={c.stopCursorMovementInLastPartMs} onChange={(e) => onConfig({ stopCursorMovementInLastPartMs: Number(e.target.value) })} aria-label="Stop the cursor this long before the end" />}
            <label className="toggle"><span><b>Remove shakes</b><small>Filters tiny jitters below the threshold.</small></span><input type="checkbox" checked={c.removeCurshorShakeTreshold > 0} onChange={(e) => onConfig({ removeCurshorShakeTreshold: e.target.checked ? 500 : 0 })} /></label>
            {c.removeCurshorShakeTreshold > 0 && <input className="toggle__extra" type="range" min={100} max={2000} step={20} value={c.removeCurshorShakeTreshold} onChange={(e) => onConfig({ removeCurshorShakeTreshold: Number(e.target.value) })} aria-label="Shake threshold" />}
            <label className="toggle"><span><b>Loop cursor position</b><small>Ends where it started so loops are seamless.</small></span><input type="checkbox" checked={c.loopCursorPositionBeforeEndMs !== null} onChange={(e) => onConfig({ loopCursorPositionBeforeEndMs: e.target.checked ? 1000 : null, ...(e.target.checked ? { stopCursorMovementInLastPartMs: 0 } : {}) })} /></label>
            {c.loopCursorPositionBeforeEndMs !== null && <input className="toggle__extra" type="range" min={1000} max={4000} step={100} value={c.loopCursorPositionBeforeEndMs} onChange={(e) => onConfig({ loopCursorPositionBeforeEndMs: Number(e.target.value) })} aria-label="How long before the end to reset the position" />}
          </section>

          <section className="sec">
            <details className="disclosure">
              <summary>Advanced</summary>
              <Slider id="crot" label="Base rotation" value={c.cursorBaseRotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => onConfig({ cursorBaseRotation: v })} />
              <Slider id="mb" label="Motion blur" value={c.motionBlurAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurAmount: v })} />
              <Slider id="mbc" label="Cursor blur" value={c.motionBlurCursorAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurCursorAmount: v })} />
              <Slider id="mbm" label="Screen movement blur" value={c.motionBlurScreenMoveAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurScreenMoveAmount: v })} />
              <Slider id="mbz" label="Screen zoom blur" value={c.motionBlurScreenZoomAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurScreenZoomAmount: v })} />
              <p className="note">Click spring {c.mouseClickSpring.stiffness}/{c.mouseClickSpring.damping}/{c.mouseClickSpring.mass} (default {CLICK_SPRING_DEFAULT.stiffness}/{CLICK_SPRING_DEFAULT.damping}/{CLICK_SPRING_DEFAULT.mass}).</p>
            </details>
          </section>
        </>
      )}
    </div>
  )
}
