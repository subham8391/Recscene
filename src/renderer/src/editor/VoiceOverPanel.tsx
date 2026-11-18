import { ATTACH_HELP, type VoiceOver, type VoiceOverAttach } from '@core/editor/voiceovers'
import { formatTimecode } from '@core/time'

interface Props {
  list: VoiceOver[]
  voiceOver: VoiceOver
  index: number
  onChange: (patch: Partial<Omit<VoiceOver, 'id'>>) => void
  onApplyVolumeToAll: () => void
  onRemove: () => void
}

/** Spec 292's item settings for a recorded voice-over: volume, attach mode, hide and mute the original, disable, remove. */
export function VoiceOverPanel({ list, voiceOver, index, onChange, onApplyVolumeToAll, onRemove }: Props): React.JSX.Element {
  const modes: { id: VoiceOverAttach; label: string }[] = [{ id: 'first-frame', label: 'Independent' }, { id: 'all-frames', label: 'Synchronized' }]
  return (
    <div className="panel-body">
      <section className="sec">
        <div className="hd"><h3>Voiceover volume</h3><span>{Math.round(voiceOver.volume * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={voiceOver.volume} aria-label="Voiceover volume" onChange={(e) => onChange({ volume: Number(e.target.value) })} onDoubleClick={() => onChange({ volume: 1 })} />
        <button type="button" className="btn btn--ghost" disabled={list.length < 2} onClick={onApplyVolumeToAll}>Apply to other voiceovers</button>
      </section>
      <section className="sec">
        <h3>Attach to recording</h3>
        <div className="seg" role="group" aria-label="Attach to recording">
          {modes.map((m) => <button key={m.id} type="button" aria-pressed={voiceOver.attachMode === m.id} onClick={() => onChange({ attachMode: m.id })}>{m.label}</button>)}
        </div>
        <p className="note">{ATTACH_HELP[voiceOver.attachMode]}</p>
      </section>
      <section className="card">
        <label className="toggle"><span><b>Hide &amp; Mute original recording</b><small>When enabled, the original microphone and webcam recording will be hidden and muted while the voiceover is playing.</small></span><input type="checkbox" checked={voiceOver.hideRecording} onChange={(e) => onChange({ hideRecording: e.target.checked })} /></label>
        <label className="toggle"><span><b>Disable</b><small>When disabled, the voiceover will not be applied, but it will still be present in the timeline.</small></span><input type="checkbox" checked={voiceOver.isDisabled} onChange={(e) => onChange({ isDisabled: e.target.checked })} /></label>
      </section>
      <section className="grid2">
        <button type="button" className="btn btn--ghost btn--danger" onClick={onRemove}>Remove voiceover <kbd>⌫</kbd></button>
      </section>
      <p className="note">Voiceover {index + 1} of {list.length} · {formatTimecode(voiceOver.sourceStartMs)} · {formatTimecode(voiceOver.voiceoverDurationMs)} long · {voiceOver.file}</p>
    </div>
  )
}
