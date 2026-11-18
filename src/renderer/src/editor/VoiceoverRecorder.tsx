import { useEffect, useRef, useState } from 'react'
import { VOICEOVER_FINISHING, VOICEOVER_MIC_DENIED, type VoiceOver } from '@core/editor/voiceovers'
import { formatTimecode } from '@core/time'
import { joinChunks, monoWav } from './wav'

interface Props {
  /** Where the recording starts (spec 221: the playhead), in source and output time. */
  startSourceMs: number
  startOutputMs: number
  /** Source time the recording must stop at (the next voice-over or the clip's end). */
  limitSourceMs: number
  /** Live playhead, so the recorder can stop at the limit and show the time. */
  sourceMs: number
  outputMs: number
  playing: boolean
  preferredMicId: string | null
  onPreferredMic: (id: string) => void
  onPlay: () => void
  onPause: () => void
  onSaved: (v: Omit<VoiceOver, 'id'>) => void
  onNotice: (message: string) => void
  onClose: () => void
}

interface Mic {
  id: string
  label: string
}

/** The Voiceover editor (spec 221): pick a microphone, record from the playhead while the video plays, stop by hand or at the limit. */
export function VoiceoverRecorder({ startSourceMs, startOutputMs, limitSourceMs, sourceMs, outputMs, playing, preferredMicId, onPreferredMic, onPlay, onPause, onSaved, onNotice, onClose }: Props): React.JSX.Element {
  const [mics, setMics] = useState<Mic[]>([])
  const [state, setState] = useState<'idle' | 'recording' | 'saving'>('idle')
  const rec = useRef<{ stream: MediaStream; ctx: AudioContext; node: ScriptProcessorNode; chunks: Float32Array[]; startedAt: number } | null>(null)
  const latest = useRef({ sourceMs, outputMs, playing, onPause, onSaved, onNotice })
  useEffect(() => {
    latest.current = { sourceMs, outputMs, playing, onPause, onSaved, onNotice }
  })

  useEffect(() => {
    let cancelled = false
    void navigator.mediaDevices.enumerateDevices().then((list) => {
      if (cancelled) return
      setMics(list.filter((d) => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })))
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const finish = async (reason: string | null): Promise<void> => {
    const r = rec.current
    if (!r) return
    rec.current = null
    r.node.disconnect()
    r.stream.getTracks().forEach((t) => t.stop())
    latest.current.onPause()
    setState('saving')
    if (reason) latest.current.onNotice(reason)
    const rate = r.ctx.sampleRate
    const all = joinChunks(r.chunks)
    void r.ctx.close()
    // The span in source time is where the playhead got to; the file holds real time, so it may be shorter than the span.
    const spanMs = Math.max(0, Math.min(limitSourceMs, latest.current.sourceMs) - startSourceMs)
    // The file is in source time (the editor played the clip at real source speed), trimmed to the span reached.
    const samples = all.subarray(0, Math.min(all.length, Math.round((spanMs / 1000) * rate)))
    if (samples.length < rate * 0.2 || spanMs < 200) {
      setState('idle')
      latest.current.onNotice('Recording was too short')
      return
    }
    try {
      const saved = await window.recscene.project.saveVoiceOver(monoWav(samples, rate))
      latest.current.onSaved({ file: saved.file, sourceStartMs: Math.round(startSourceMs), voiceoverDurationMs: Math.round(spanMs), volume: 1, attachMode: 'all-frames', hideRecording: false, isDisabled: false })
    } catch (e) {
      latest.current.onNotice(e instanceof Error ? e.message : 'Could not save the voice-over')
      setState('idle')
    }
  }

  const start = async (): Promise<void> => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: preferredMicId ? { deviceId: { ideal: preferredMicId } } : true })
    } catch {
      onNotice(VOICEOVER_MIC_DENIED)
      return
    }
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const node = ctx.createScriptProcessor(4096, Math.max(1, source.channelCount), 1)
    const chunks: Float32Array[] = []
    node.onaudioprocess = (e) => {
      const n = e.inputBuffer.numberOfChannels
      const mono = new Float32Array(e.inputBuffer.length)
      for (let c = 0; c < n; c += 1) {
        const d = e.inputBuffer.getChannelData(c)
        for (let i = 0; i < d.length; i += 1) mono[i] = (mono[i] ?? 0) + (d[i] ?? 0) / n
      }
      chunks.push(mono)
    }
    source.connect(node)
    node.connect(ctx.destination)
    rec.current = { stream, ctx, node, chunks, startedAt: performance.now() }
    setState('recording')
    onPlay()
  }

  // Stop when the playhead reaches the limit (another voice-over or the clip's end) or playback stops.
  useEffect(() => {
    if (state !== 'recording') return
    const reason = sourceMs >= limitSourceMs - 10 ? VOICEOVER_FINISHING : !playing && performance.now() - (rec.current?.startedAt ?? 0) > 500 ? '' : null
    if (reason === null) return
    // Deferred so the stop (and its state updates) runs outside the effect itself.
    const t = window.setTimeout(() => void finish(reason || null), 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMs, playing, state, limitSourceMs])

  useEffect(() => {
    const r = rec
    return () => {
      const cur = r.current
      if (cur) {
        cur.node.disconnect()
        cur.stream.getTracks().forEach((t) => t.stop())
        void cur.ctx.close()
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && state === 'idle') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onClose])

  const elapsed = state === 'recording' ? Math.max(0, outputMs - startOutputMs) : 0
  return (
    <div className="cmd__backdrop" onMouseDown={() => state === 'idle' && onClose()}>
      <div role="dialog" aria-label="Voiceover editor" className="export vorec" onMouseDown={(e) => e.stopPropagation()}>
        <div className="export__head"><h2>Voiceover editor</h2><span className="muted">from {formatTimecode(startOutputMs)}</span><span className="tl__spacer" /><button type="button" className="btn btn--ghost btn--sm" disabled={state !== 'idle'} onClick={onClose}>Close Voiceover editor <kbd>⎋</kbd></button></div>
        <p className="note">Recording starts at the playhead and plays the video along; it stops when you press Stop, when playback reaches the end of the clip, or when another voiceover is reached.</p>
        <label className="field">
          <span>Microphone</span>
          <select className="sel" value={preferredMicId ?? ''} disabled={state !== 'idle'} onChange={(e) => onPreferredMic(e.target.value)}>
            <option value="">System default</option>
            {mics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <div className="vorec__time" aria-live="polite">
          <span className={`vorec__dot${state === 'recording' ? ' vorec__dot--on' : ''}`} />
          <b>{formatTimecode(elapsed)}</b>
          <span className="muted">{state === 'recording' ? 'Recording…' : state === 'saving' ? 'Saving voiceover recording file to project…' : 'Ready'}</span>
        </div>
        <div className="export__targets">
          {state === 'idle' && <button type="button" className="btn btn--accent" onClick={() => void start()}>Start recording</button>}
          {state === 'recording' && <button type="button" className="btn btn--danger" onClick={() => void finish(null)}>Stop recording</button>}
        </div>
      </div>
    </div>
  )
}
