import { countOf, ENABLE_BUTTON, ENABLE_QUESTION, isShown, KIND_LABELS, NO_KEYS, SIZE_MAX, SIZE_MIN, SIZE_PRESETS, type ShortcutConfig, type ShortcutEvent, type ShortcutKind } from '@core/editor/shortcuts'
import { formatTransport } from '@core/time'

interface Props {
  config: ShortcutConfig
  events: ShortcutEvent[]
  hasKeys: boolean
  trackVisible: boolean
  onConfig: (patch: Partial<ShortcutConfig>) => void
  onHide: (timeMs: number, hidden: boolean) => void
  onHideLabel: (label: string, hidden: boolean) => void
  onHideAll: (hidden: boolean) => void
  onKind: (kind: ShortcutKind, disabled: boolean) => void
  onSeek: (sourceMs: number) => void
  onToggleTrack: () => void
}

/** The Keyboard Shortcuts inspector from the Shortcuts board (specs 199–204). */
export function ShortcutsPanel({ config, events, hasKeys, trackVisible, onConfig, onHide, onHideLabel, onHideAll, onKind, onSeek, onToggleTrack }: Props): React.JSX.Element {
  if (!hasKeys) return <div className="panel-body"><p className="note">{NO_KEYS}</p></div>
  const allHidden = events.length > 0 && events.every((e) => e.hidden)
  const kinds = Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[]
  return (
    <div className="panel-body">
      {!config.showShortcuts && (
        <section className="card card--warn">
          <p className="note">{ENABLE_QUESTION}</p>
          <button type="button" className="btn btn--accent" onClick={() => onConfig({ showShortcuts: true })}>{ENABLE_BUTTON}</button>
        </section>
      )}
      <section className="card">
        <label className="toggle"><span><b>Show pressed shortcuts</b><small>Key combinations with a modifier, e.g. ⌘C, ⌘⇧P.</small></span><input type="checkbox" checked={config.showShortcuts} onChange={(e) => onConfig({ showShortcuts: e.target.checked })} /></label>
        <label className="toggle"><span><b>Show single-key presses</b><small>Letters, digits and arrows pressed on their own. Off by default so typing stays private.</small></span><input type="checkbox" checked={config.showShortcutsWithSingleLetters} onChange={(e) => onConfig({ showShortcutsWithSingleLetters: e.target.checked })} /></label>
      </section>
      {config.showShortcuts && (
        <section className="sec">
          <div className="hd"><h3>Label size</h3><span>{Math.round(config.shortcutsSizeRatio * 100)}%</span></div>
          <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={config.shortcutsSizeRatio} aria-label="Shortcut labels size" onChange={(e) => onConfig({ shortcutsSizeRatio: Number(e.target.value) })} />
          <div className="seg" role="group" aria-label="Size presets">
            {SIZE_PRESETS.map((p) => <button key={p.label} type="button" aria-pressed={Math.abs(config.shortcutsSizeRatio - p.ratio) < 0.01} onClick={() => onConfig({ shortcutsSizeRatio: p.ratio })}>{p.label}</button>)}
          </div>
        </section>
      )}
      <section className="sec">
        <div className="hd"><h3>Shortcuts in this recording <span className="chip chip--count">{events.length}</span></h3></div>
        <div className="keylist">
          {events.map((e) => (
            <div key={e.timeMs} className={`keylist__row${isShown(e) ? '' : ' keylist__row--off'}`}>
              <button type="button" className="keylist__time" onClick={() => onSeek(e.timeMs)} title="Go to this press">{formatTransport(e.timeMs).slice(0, -1)}</button>
              <span className="keylist__label">{e.label}</span>
              <span className="muted keylist__kind">{e.kindDisabled ? 'kind off' : ''}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onHide(e.timeMs, !e.hidden)}>{e.hidden ? 'Show' : 'Hide'}</button>
              {countOf(events, e.label) > 1 && <button type="button" className="btn btn--ghost btn--sm" title={`${e.hidden ? 'Show' : 'Hide'} every ${e.label}`} onClick={() => onHideLabel(e.label, !e.hidden)}>{e.hidden ? 'Show' : 'Hide'} all {e.label}</button>}
            </div>
          ))}
        </div>
        <p className="note">Hiding one occurrence keeps the others. "Hide all ⌘C" hides every press of that combination; a hidden shortcut shows hollow on the track and can be restored here.</p>
      </section>
      <section className="sec">
        <h3>Disable by kind</h3>
        <div className="card">
          {kinds.map((k) => (
            <label key={k} className="toggle"><span><b>{KIND_LABELS[k].name}</b><small>{KIND_LABELS[k].sub}</small></span><input type="checkbox" checked={!config.disabledShortcutKinds.includes(k)} onChange={(e) => onKind(k, !e.target.checked)} /></label>
          ))}
        </div>
      </section>
      <section className="grid2">
        <button type="button" className="btn btn--ghost" onClick={() => onHideAll(!allHidden)}>{allHidden ? 'Show all shortcuts' : 'Hide all shortcuts'}</button>
        <button type="button" className="btn btn--ghost" disabled={Object.keys(config.hiddenShortcuts).length === 0} onClick={() => onHideAll(false)}>Restore hidden</button>
        <button type="button" className="btn btn--ghost" onClick={onToggleTrack}>{trackVisible ? 'Hide the Shortcuts track' : 'Show the Shortcuts track'}</button>
      </section>
    </div>
  )
}
