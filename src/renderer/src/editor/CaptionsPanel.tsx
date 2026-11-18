import { useEffect, useState } from 'react'
import { CAPTION_SIZE_MAX, CAPTION_SIZE_MIN, CAPTION_SIZE_PRESETS, EDIT_EMPTY, EDIT_HINT, ENGINE_NOTE, fillerRanges, languageName, longPauses, NO_MIC, REGENERATE_WARNING, transcriptSummary, wordIsCut, type CaptionConfig, type Transcript, type TranscriptWord } from '@core/editor/captions'
import type { Clip } from '@core/editor/clips'
import { formatTimecode } from '@core/time'

interface PanelProps {
  config: CaptionConfig
  transcript: Transcript | null
  cueCount: number
  hasMic: boolean
  generating: boolean
  onConfig: (patch: Partial<CaptionConfig>) => void
  onAction: (id: string) => void
}

/** The Captions inspector from the Captions board (specs 205–212). */
export function CaptionsPanel({ config, transcript, cueCount, hasMic, generating, onConfig, onAction }: PanelProps): React.JSX.Element {
  const [locales, setLocales] = useState<string[]>([])
  useEffect(() => {
    void window.recscene.captions.locales().then(setLocales)
  }, [])
  const wordCount = transcript ? transcript.words.filter((w) => !w.hidden).length : 0
  return (
    <div className="panel-body">
      <p className="note">{transcriptSummary(transcript, cueCount)}</p>
      <section className="sec">
        <h3>Transcript</h3>
        <div className="seg" role="group" aria-label="Engine">
          <button type="button" aria-pressed disabled>Apple Speech</button>
          <button type="button" aria-pressed={false} disabled title="Whisper models are not bundled">Local Whisper</button>
        </div>
        <p className="note">{ENGINE_NOTE}</p>
        <label className="field--inline"><span>Spoken language</span>
          <select className="input" value={config.transcriptLanguage} onChange={(e) => onConfig({ transcriptLanguage: e.target.value })}>
            <option value="auto">Auto (system language)</option>
            {locales.map((l) => <option key={l} value={l}>{languageName(l)} ({l.replace('_', '-')})</option>)}
          </select>
        </label>
        {!hasMic && <p className="note">{NO_MIC}. Captions need a microphone track.</p>}
        {generating ? (
          <div className="card"><b>Transcribing on device…</b><small>Nothing leaves this Mac. You can keep editing meanwhile.</small></div>
        ) : transcript ? (
          <>
            <div className="grid2">
              <button type="button" className="btn btn--ghost" onClick={() => onAction('regenerateTranscript')}>Re-generate</button>
              <button type="button" className="btn btn--ghost" onClick={() => onAction('editTranscript')}>Edit transcript…</button>
            </div>
            <p className="note">Generated {new Date(transcript.generatedAt).toLocaleTimeString()} · {wordCount} words · {languageName(transcript.language)}. {REGENERATE_WARNING}</p>
          </>
        ) : (
          <button type="button" className="btn btn--accent" disabled={!hasMic} onClick={() => onAction('generateTranscript')}>Generate transcript</button>
        )}
      </section>
      {transcript && (
        <>
          <section className="card">
            <label className="toggle"><span><b>Show captions in the video</b><small>Burned into the export. Off keeps the transcript for editing only.</small></span><input type="checkbox" checked={config.showTranscript} onChange={(e) => onConfig({ showTranscript: e.target.checked })} /></label>
          </section>
          {config.showTranscript && (
            <section className="sec">
              <div className="hd"><h3>Caption size</h3><span>{Math.round(config.transcriptSizeRatio * 100)}%</span></div>
              <input type="range" min={CAPTION_SIZE_MIN} max={CAPTION_SIZE_MAX} step={0.05} value={config.transcriptSizeRatio} aria-label="Transcript size" onChange={(e) => onConfig({ transcriptSizeRatio: Number(e.target.value) })} />
              <div className="seg" role="group" aria-label="Size presets">
                {CAPTION_SIZE_PRESETS.map((p) => <button key={p.label} type="button" aria-pressed={Math.abs(config.transcriptSizeRatio - p.ratio) < 0.01} onClick={() => onConfig({ transcriptSizeRatio: p.ratio })}>{p.label}</button>)}
              </div>
            </section>
          )}
          <section className="sec">
            <h3>Style</h3>
            <div className="seg" role="group" aria-label="Position">
              {([['top', 'Top'], ['bottom', 'Bottom'], ['under-screen', 'Under screen']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={config.captionPosition === v} onClick={() => onConfig({ captionPosition: v })}>{l}</button>)}
            </div>
            <div className="card">
              <label className="toggle"><span><b>Highlight the spoken word</b><small>Karaoke-style emphasis in the accent colour.</small></span><input type="checkbox" checked={config.captionHighlightWord} onChange={(e) => onConfig({ captionHighlightWord: e.target.checked })} /></label>
              <label className="toggle"><span><b>Background box</b><small>Dark panel behind the text for contrast.</small></span><input type="checkbox" checked={config.captionBackground} onChange={(e) => onConfig({ captionBackground: e.target.checked })} /></label>
              <label className="toggle"><span><b>One line at a time</b><small>Shorter lines, more cue changes.</small></span><input type="checkbox" checked={config.captionOneLine} onChange={(e) => onConfig({ captionOneLine: e.target.checked })} /></label>
            </div>
          </section>
          <section className="sec">
            <h3>Export transcript</h3>
            <div className="seg" role="group" aria-label="Subtitle format">
              {(['srt', 'vtt', 'txt'] as const).map((f) => <button key={f} type="button" onClick={() => onAction(`exportTranscript:${f}`)}>.{f}</button>)}
            </div>
            <p className="note">Timed to the edited video, so cuts and speed changes are already applied.</p>
          </section>
        </>
      )}
    </div>
  )
}

interface EditorProps {
  transcript: Transcript
  clips: Clip[]
  showDeleted: boolean
  selection: [number, number] | null
  onSelect: (range: [number, number] | null) => void
  onCutVideo: () => void
  onCutTranscript: () => void
  onRestore: () => void
  onPlay: () => void
  onEditWord: (index: number, text: string) => void
  onToggleDeleted: () => void
  onRemoveFillers: () => void
  onTightenPauses: () => void
  onClose: () => void
}

/** Edit by transcript (specs 289–290): words are tokens; cutting them cuts the video. */
export function TranscriptEditor({ transcript, clips, showDeleted, selection, onSelect, onCutVideo, onCutTranscript, onRestore, onPlay, onEditWord, onToggleDeleted, onRemoveFillers, onTightenPauses, onClose }: EditorProps): React.JSX.Element {
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const words = transcript.words
  const fillers = fillerRanges(words, clips).length
  const pauses = longPauses(words, clips).length
  const inSelection = (i: number): boolean => selection !== null && i >= Math.min(...selection) && i <= Math.max(...selection)
  const click = (i: number, shift: boolean): void => {
    if (shift && selection) onSelect([selection[0], i])
    else onSelect([i, i])
  }
  if (words.length === 0) return <div className="panel-body"><p className="note">{EDIT_EMPTY}</p><button type="button" className="btn btn--ghost" onClick={onClose}>Close Transcript editor</button></div>
  return (
    <div className="panel-body">
      <p className="note">{EDIT_HINT}</p>
      <div className="grid2">
        <button type="button" className="btn btn--ghost" disabled={fillers === 0} title='Cut every detected filled pause ("um", "uh"...) out of the video' onClick={onRemoveFillers}>Remove {fillers} filler word{fillers === 1 ? '' : 's'}</button>
        <button type="button" className="btn btn--ghost" disabled={pauses === 0} title="Shorten every long pause, keeping a natural breath on each side" onClick={onTightenPauses}>Tighten {pauses} pause{pauses === 1 ? '' : 's'}</button>
      </div>
      <div className="transcript" role="listbox" aria-label="Transcript words" aria-multiselectable>
        {words.map((w: TranscriptWord, i) => {
          const cut = wordIsCut(w, clips)
          if ((cut || w.hidden) && !showDeleted) return null
          const cls = ['token', inSelection(i) ? 'token--sel' : '', cut ? 'token--cut' : '', w.hidden ? 'token--hidden' : '', w.filler === 1 ? 'token--filler' : w.filler === 2 ? 'token--filler2' : ''].filter(Boolean).join(' ')
          if (editing?.index === i) {
            return <input key={i} className="token__edit" autoFocus value={editing.text} onChange={(e) => setEditing({ index: i, text: e.target.value })} onBlur={() => { onEditWord(i, editing.text); setEditing(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { onEditWord(i, editing.text); setEditing(null) } if (e.key === 'Escape') setEditing(null) }} />
          }
          return (
            <button key={i} type="button" role="option" aria-selected={inSelection(i)} className={cls} title={`${formatTimecode(w.startMs)}${w.filler === 1 ? ' · filled pause' : w.filler === 2 ? ' · filler' : ''}${cut ? ' · cut from the video' : ''}${w.hidden ? ' · hidden from captions' : ''}`} onClick={(e) => click(i, e.shiftKey)} onDoubleClick={() => setEditing({ index: i, text: w.text })}>
              {w.text}
            </button>
          )
        })}
      </div>
      <div className="grid2">
        <button type="button" className="btn btn--ghost" disabled={!selection} title="Cut these words out of the video" onClick={onCutVideo}>Cut video <kbd>⌫</kbd></button>
        <button type="button" className="btn btn--ghost" disabled={!selection} title="Cut this part from the transcript and captions only — the video is unchanged, and Restore brings it back" onClick={onCutTranscript}>Cut transcript <kbd>⌘⌫</kbd></button>
        <button type="button" className="btn btn--ghost" disabled={!selection} title="Bring this part back into the video and captions" onClick={onRestore}>Restore</button>
        <button type="button" className="btn btn--ghost" disabled={!selection} title="Play this part once" onClick={onPlay}>Play</button>
      </div>
      <label className="toggle"><span><b>Show deleted text</b><small>Keep cut words visible as strikethrough so they can be restored.</small></span><input type="checkbox" checked={showDeleted} onChange={onToggleDeleted} /></label>
      <button type="button" className="btn btn--ghost" onClick={onClose}>Close Transcript editor</button>
      <p className="note">Double-click a word to correct it. Transcript edits are ordinary cuts: undo with ⌘Z.</p>
    </div>
  )
}
