import { useState } from 'react'
import {
  applySpeedToAll,
  canApplySpeedToAll,
  canResetAll,
  clipSettings,
  hasTrim,
  isAudioMuted,
  mergeWith,
  removeTrim,
  SPEED_GROUPS,
  TYPING_SPEED_DEFAULT,
  TYPING_SPEED_MAX,
  TYPING_SPEED_MIN,
  type Clip,
  type ClipSettings,
  type TypingGroup,
  updateClip,
  VOLUME_OPTIONS
} from '@core/editor/clips'
import { CROP_ASPECTS } from '@core/editor/crop'
import { formatTimecode } from '@core/time'

interface Props {
  clips: Clip[]
  clip: Clip
  index: number
  sourceDurationMs: number
  hasMic: boolean
  typing: TypingGroup[]
  clipboard: ClipSettings | null
  onClips: (clips: Clip[]) => void
  onAction: (id: string) => void
  onApplyTyping: (group: TypingGroup, speed: number) => void
  onIgnoreTyping: (group: TypingGroup) => void
  onCrop: () => void
  onCropAspect: (ratio: number | null) => void
}

/** The Clip inspector from the Clips board (specs 80–99 controls). */
export function ClipPanel({ clips, clip, index, sourceDurationMs, hasMic, typing, clipboard, onClips, onAction, onApplyTyping, onIgnoreTyping, onCrop, onCropAspect }: Props): React.JSX.Element {
  const [typingSpeed, setTypingSpeed] = useState(TYPING_SPEED_DEFAULT)
  const set = (patch: Partial<ClipSettings>): void => onClips(updateClip(clips, clip.id, patch))
  const trimmed = hasTrim(clips, clip.id, sourceDurationMs)
  const prev = clips[index - 1]
  const next = clips[index + 1]

  return (
    <div className="panel-body">
      <section className="sec">
        <h3>Trim</h3>
        <div className="grid2">
          <label className="field--inline">Start<input className="input input--num" value={formatTimecode(clip.sourceStartMs)} readOnly /></label>
          <label className="field--inline">End<input className="input input--num" value={formatTimecode(clip.sourceEndMs)} readOnly /></label>
        </div>
        <div className="grid2">
          <button type="button" className="btn btn--ghost" disabled={!trimmed} onClick={() => onClips(removeTrim(clips, clip.id, 'both', sourceDurationMs))}>Reset trim</button>
          <button type="button" className="btn btn--ghost" disabled={!canResetAll(clips, sourceDurationMs)} onClick={() => onAction('resetAllClips')}>Reset all cuts and trims</button>
        </div>
        <p className="note">Drag the yellow handles at either end of a clip to trim. ⌘Z undoes a trim.</p>
      </section>

      <section className="sec">
        <div className="hd"><h3>Playback speed</h3><span>{clip.speed}×</span></div>
        <input type="range" min={0.25} max={24} step={0.05} value={clip.speed} onChange={(e) => set({ speed: Number(e.target.value) })} />
        {SPEED_GROUPS.map((g) => (
          <div key={g.label} className="seg" role="group" aria-label={`${g.label} speeds`}>
            {g.speeds.map((s) => (
              <button key={s} type="button" aria-pressed={clip.speed === s} onClick={() => set({ speed: s })}>{s}×</button>
            ))}
          </div>
        ))}
        <button type="button" className="btn btn--ghost" disabled={!canApplySpeedToAll(clips, clip.id)} onClick={() => onClips(applySpeedToAll(clips, clip.id))}>Apply speed to all clips</button>
        <p className="note">{isAudioMuted(clip) ? 'Above 2× the clip’s audio is muted automatically.' : 'Audio is muted automatically above 2×.'}</p>
      </section>

      {typing.length > 0 && (
        <section className="card" aria-label="Typing detected">
          <div className="row"><span className="dot" style={{ background: 'var(--clip)' }} /><b>Typing detected · {typing.length} {typing.length === 1 ? 'part' : 'parts'}</b></div>
          <small>You are typing during {typing.length === 1 ? 'this part' : 'these parts'} of the recording. Speed it up using the options below.</small>
          <label className="field--inline">Speed<input type="range" min={TYPING_SPEED_MIN} max={TYPING_SPEED_MAX} step={0.5} value={typingSpeed} onChange={(e) => setTypingSpeed(Number(e.target.value))} /><span>{typingSpeed.toFixed(1)}×</span></label>
          <ul className="typing">
            {typing.map((g) => (
              <li key={g.startMs}>
                <span>{formatTimecode(g.startMs)} – {formatTimecode(g.endMs)} · {g.keystrokes} keys</span>
                <button type="button" className="btn btn--accent btn--sm" onClick={() => onApplyTyping(g, typingSpeed)}>Speed up {typingSpeed.toFixed(1)}×</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onIgnoreTyping(g)}>Ignore</button>
              </li>
            ))}
          </ul>
          {typing.length > 1 && <button type="button" className="btn btn--ghost btn--sm" onClick={() => typing.forEach((g) => onApplyTyping(g, typingSpeed))}>Apply all suggestions</button>}
        </section>
      )}

      {hasMic && (
        <section className="sec">
          <h3>Audio for this clip</h3>
          <div className="hd"><label htmlFor="vmic">Microphone</label><span>{Math.round(clip.volume * 100)}%</span></div>
          <input id="vmic" type="range" min={0} max={1} step={0.01} value={clip.volume} onChange={(e) => set({ volume: Math.round(Number(e.target.value) * 10) / 10 })} list="vol-options" />
          <datalist id="vol-options">{VOLUME_OPTIONS.map((v) => <option key={v} value={v} />)}</datalist>
        </section>
      )}

      <section className="card">
        <label className="toggle"><span><b>Hide cursor in this clip</b><small>Hide mouse cursor during this part of the recording.</small></span><input type="checkbox" checked={clip.hideCursor} onChange={(e) => set({ hideCursor: e.target.checked })} /></label>
        {!clip.hideCursor && (
          <label className="toggle"><span><b>Smooth cursor</b><small>Off keeps the raw cursor motion for this clip only.</small></span><input type="checkbox" checked={!clip.disableSmoothMouseMovement} onChange={(e) => set({ disableSmoothMouseMovement: !e.target.checked })} /></label>
        )}
      </section>

      <section className="sec">
        <h3>Crop</h3>
        <div className="seg" role="group" aria-label="Crop aspect ratio">
          {CROP_ASPECTS.map((a) => <button key={a.label} type="button" onClick={() => onCropAspect(a.ratio)}>{a.label}</button>)}
        </div>
        <p className="note">Arrow keys move a handle 1 px, ⇧ 10 px, ⌘ 100 px. Crop applies to the whole project, not one clip.</p>
        <button type="button" className="btn btn--ghost" onClick={onCrop}>Crop…</button>
      </section>

      <section className="grid2">
        <button type="button" className="btn btn--ghost" onClick={() => onAction('splitSliceAtCurrentTime')}>Split at playhead <kbd>C</kbd></button>
        <button type="button" className="btn btn--ghost" disabled={!next} onClick={() => onClips(mergeWith(clips, clip.id, 'next'))}>Merge with next</button>
        <button type="button" className="btn btn--ghost" disabled={!prev} onClick={() => onClips(mergeWith(clips, clip.id, 'previous'))}>Merge with previous</button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('rippleRemoveSlice')}>Remove till previous cut <kbd>X</kbd></button>
        <button type="button" className="btn btn--ghost" onClick={() => onAction('copyFrame')}>Copy clip settings</button>
        <button type="button" className="btn btn--ghost" disabled={!clipboard} onClick={() => onAction('paste')}>Paste settings</button>
        <button type="button" className="btn btn--ghost" disabled={clips.length <= 1} onClick={() => onAction('resetAllClips')}>Remove all clips</button>
        <button type="button" className="btn btn--ghost btn--danger" disabled={clips.length <= 1} onClick={() => onAction('removeSlice')}>Remove clip <kbd>⌫</kbd></button>
      </section>
      <p className="note">Clip {index + 1} of {clips.length} · settings: {JSON.stringify(clipSettings(clip)).length > 0 ? 'speed, volume, cursor' : ''}</p>
    </div>
  )
}
