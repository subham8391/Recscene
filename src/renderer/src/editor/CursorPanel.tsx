import { CLICK_SPRING_DEFAULT, CURSOR_PRESETS, CURSOR_SETS, CURSOR_SIZE_DEFAULT, CURSOR_SIZE_MAX, CURSOR_SIZE_MIN, presetFor, type CursorConfig } from '@core/editor/cursor'

interface Props {
  config: CursorConfig
  hasCursor: boolean
  clipHidden: boolean
  onConfig: (patch: Partial<CursorConfig>) => void
  onPreviewSound: () => void
}

const Slider = ({ id, label, value, min, max, step, format, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }): React.JSX.Element => (
  <div className="sec">
    <div className="hd"><label htmlFor={id}>{label}</label><span>{format(value)}</span></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
)

/** The Cursor panel from the Cursor board (specs 125–147). */
export function CursorPanel({ config: c, hasCursor, clipHidden, onConfig, onPreviewSound }: Props): React.JSX.Element {
  if (!hasCursor) return <p className="muted">There is no mouse cursor recorded</p>
  const preset = presetFor(c.mouseMovementSpring, c.disableMouseMovementSpring)
  const spring = (patch: Partial<CursorConfig['mouseMovementSpring']>): void => onConfig({ mouseMovementSpring: { ...c.mouseMovementSpring, ...patch }, disableMouseMovementSpring: false })

  return (
    <div className="panel-body">
      {clipHidden && <p className="note">Cursor is hidden in this part of the recording, so you will not see changes you make to it.</p>}
      <section className="card">
        <label className="toggle"><span><b>Show cursor</b><small>Hide it for the whole video; clips can hide it individually.</small></span><input type="checkbox" checked={!c.hideCursor} onChange={(e) => onConfig({ hideCursor: !e.target.checked })} /></label>
      </section>
      {c.hideCursor ? null : (
        <>
          <section className="card">
            <label className="toggle"><span><b>Always use default system cursor</b><small>Don't change cursor, even if selecting text, etc.</small></span><input type="checkbox" checked={c.alwaysUseDefaultCursor} onChange={(e) => onConfig({ alwaysUseDefaultCursor: e.target.checked })} /></label>
            <label className="toggle"><span><b>Sharp cursor fallback</b><small>Use the set's vector cursor when a captured cursor image is low resolution.</small></span><input type="checkbox" checked={c.useDefaultCursorIfAppCursorHasLowResolution} onChange={(e) => onConfig({ useDefaultCursorIfAppCursorHasLowResolution: e.target.checked })} /></label>
            <label className="toggle"><span><b>Optimise cursor type changes</b><small>Recscene will try to minimize rapid cursor changes (eg when quickly moving over some elements) when this option is enabled.</small></span><input type="checkbox" checked={c.optimizeOriginalCursorTypes} onChange={(e) => onConfig({ optimizeOriginalCursorTypes: e.target.checked })} /></label>
            <small className="note">Cursor types are not recorded yet, so the pointer is drawn throughout; these three settings take effect once they are.</small>
          </section>

          <section className="sec">
            <h3>Cursor set</h3>
            <div className="seg" role="group" aria-label="Cursor set">
              {CURSOR_SETS.map((s) => <button key={s.id} type="button" aria-pressed={c.cursorSet.id === s.id} onClick={() => onConfig({ cursorSet: { id: s.id } })}>{s.label}</button>)}
            </div>
          </section>

          <Slider id="csize" label="Size" value={c.cursorSize} min={CURSOR_SIZE_MIN} max={CURSOR_SIZE_MAX} step={0.05} format={(v) => `${v.toFixed(2).replace(/\.?0+$/, '')}×`} onChange={(v) => onConfig({ cursorSize: v })} />
          <div className="grid2"><button type="button" className="btn btn--ghost btn--sm" onClick={() => onConfig({ cursorSize: CURSOR_SIZE_DEFAULT })}>Reset to {CURSOR_SIZE_DEFAULT}×</button></div>
          {c.cursorSize < 0.75 && <p className="note">With small cursor size, consider disabling mouse cursor motion blur as it might reduce cursor visibility</p>}

          <section className="sec">
            <h3>Animation style</h3>
            <div className="seg" role="group" aria-label="Cursor animation style">
              {CURSOR_PRESETS.map((p) => <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => onConfig({ mouseMovementSpring: { ...p.spring }, disableMouseMovementSpring: false })}>{p.label}</button>)}
              <button type="button" aria-pressed={preset === 'none'} title="Use the recorded coordinates frame by frame" onClick={() => onConfig({ disableMouseMovementSpring: true })}>None</button>
            </div>
            {preset !== 'none' && (
              <>
                <Slider id="rig" label="Rigidity" value={c.mouseMovementSpring.stiffness} min={5} max={600} step={1} format={String} onChange={(v) => spring({ stiffness: v })} />
                <Slider id="smo" label="Smoothness" value={c.mouseMovementSpring.damping} min={5} max={200} step={1} format={String} onChange={(v) => spring({ damping: v })} />
                <Slider id="mom" label="Momentum" value={c.mouseMovementSpring.mass} min={0.1} max={10} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => spring({ mass: v })} />
                {preset === null && <button type="button" className="btn btn--ghost btn--sm" onClick={() => onConfig({ mouseMovementSpring: { ...CURSOR_PRESETS[0]!.spring } })}>Reset to Smooth</button>}
              </>
            )}
            <p className="note">Smoothing off is useful when recording precise drawing or when the exact recorded position matters.</p>
          </section>

          <section className="sec">
            <h3>Click effect</h3>
            <div className="seg" role="group" aria-label="Click effect">
              {([null, 'circle', 'ripple'] as const).map((v) => <button key={String(v)} type="button" aria-pressed={c.clickEffect === v} onClick={() => onConfig({ clickEffect: v })}>{v === null ? 'None' : v === 'circle' ? 'Circle' : 'Ripple'}</button>)}
            </div>
            <div className="hd"><label htmlFor="csnd">Click sound</label></div>
            <div className="grid2">
              <select id="csnd" className="input" value={c.clickSoundEffect ?? 'none'} onChange={(e) => onConfig({ clickSoundEffect: e.target.value === 'none' ? null : (e.target.value as 'apple-magic-mouse') })}>
                <option value="none">None</option>
                <option value="apple-magic-mouse">Magic Mouse™</option>
                <option value="logitech-mx-master">MX Master™</option>
              </select>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!c.clickSoundEffect} onClick={onPreviewSound}>Preview</button>
            </div>
            <Slider id="cvol" label="Sound volume" value={c.clickSoundEffectVolume} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ clickSoundEffectVolume: v })} />
            <p className="note">Sound will not be played for parts with a playback speed greater than 2x.</p>
          </section>

          <section className="card">
            <label className="toggle"><span><b>Hide cursor when idle</b><small>After {((c.hideNotMovingCursorAfterMs ?? 2000) / 1000).toFixed(1)} s without movement; fades back in on the next move.</small></span><input type="checkbox" checked={c.hideNotMovingCursorAfterMs !== null} onChange={(e) => onConfig({ hideNotMovingCursorAfterMs: e.target.checked ? 2000 : null })} /></label>
            {c.hideNotMovingCursorAfterMs !== null && <input type="range" min={500} max={5000} step={100} value={c.hideNotMovingCursorAfterMs} onChange={(e) => onConfig({ hideNotMovingCursorAfterMs: Number(e.target.value) })} aria-label="Idle time before hiding" />}
            <label className="toggle"><span><b>Rotate while moving</b><small>If cursor is moving horizontally, it will slightly rotate as if it is chasing the mouse.</small></span><input type="checkbox" checked={c.cursorRotateOnXMovementRatio > 0} onChange={(e) => onConfig({ cursorRotateOnXMovementRatio: e.target.checked ? 0.5 : 0 })} /></label>
            {c.cursorRotateOnXMovementRatio > 0 && <input type="range" min={0} max={2} step={0.05} value={c.cursorRotateOnXMovementRatio} onChange={(e) => onConfig({ cursorRotateOnXMovementRatio: Number(e.target.value) })} aria-label="Rotation ratio" />}
            <Slider id="crot" label="Base rotation" value={c.cursorBaseRotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => onConfig({ cursorBaseRotation: v })} />
            <label className="toggle"><span><b>Remove shakes</b><small>If you use some accessibility apps that can control your mouse, sudden short jumps are filtered out.</small></span><input type="checkbox" checked={c.removeCurshorShakeTreshold > 0} onChange={(e) => onConfig({ removeCurshorShakeTreshold: e.target.checked ? 500 : 0 })} /></label>
            {c.removeCurshorShakeTreshold > 0 && <input type="range" min={100} max={2000} step={20} value={c.removeCurshorShakeTreshold} onChange={(e) => onConfig({ removeCurshorShakeTreshold: Number(e.target.value) })} aria-label="Shake threshold" />}
          </section>

          <section className="card">
            <label className="toggle"><span><b>Loop cursor position</b><small>Near the end of the video, cursor will move back to its initial position.</small></span><input type="checkbox" checked={c.loopCursorPositionBeforeEndMs !== null} onChange={(e) => onConfig({ loopCursorPositionBeforeEndMs: e.target.checked ? 1000 : null, ...(e.target.checked ? { stopCursorMovementInLastPartMs: 0 } : {}) })} /></label>
            {c.loopCursorPositionBeforeEndMs !== null ? (
              <Slider id="cloop" label="How long before the end to reset the position" value={c.loopCursorPositionBeforeEndMs} min={1000} max={4000} step={100} format={(v) => `${(v / 1000).toFixed(1)}s`} onChange={(v) => onConfig({ loopCursorPositionBeforeEndMs: v })} />
            ) : (
              <Slider id="cstop" label="Stop cursor movement at the end" value={c.stopCursorMovementInLastPartMs} min={0} max={5000} step={50} format={(v) => `${(v / 1000).toFixed(1)}s`} onChange={(v) => onConfig({ stopCursorMovementInLastPartMs: v })} />
            )}
            <small className="note">Near the end of the video, the last mouse movement often leads to clicking "Stop Recording", which you might not want to be visible.</small>
          </section>

          <section className="sec">
            <Slider id="mb" label="Motion blur" value={c.motionBlurAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurAmount: v })} />
            <details>
              <summary className="muted">Advanced motion blur settings</summary>
              <Slider id="mbc" label="Cursor" value={c.motionBlurCursorAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurCursorAmount: v })} />
              <Slider id="mbm" label="Screen movement" value={c.motionBlurScreenMoveAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurScreenMoveAmount: v })} />
              <Slider id="mbz" label="Screen zoom" value={c.motionBlurScreenZoomAmount} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ motionBlurScreenZoomAmount: v })} />
              <small className="note">Screen blur is applied by the GPU renderer when it arrives; the cursor blur shows in the preview now.</small>
            </details>
          </section>
          <p className="note">Click spring: {c.mouseClickSpring.stiffness}/{c.mouseClickSpring.damping}/{c.mouseClickSpring.mass} (default {CLICK_SPRING_DEFAULT.stiffness}/{CLICK_SPRING_DEFAULT.damping}/{CLICK_SPRING_DEFAULT.mass}).</p>
        </>
      )}
    </div>
  )
}
