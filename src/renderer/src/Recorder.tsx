import { useCallback, useEffect, useState } from 'react'
import type { DisplayTarget, Permissions, RecordingResult, WindowTarget } from '@core/captureProtocol'
import { formatTimecode } from '@core/time'

type Phase = { kind: 'idle' } | { kind: 'recording'; startedAt: number } | { kind: 'stopping' } | { kind: 'done'; result: RecordingResult }

/**
 * The first slice of the recording picker (specs 1–47): choose a display or
 * window, toggle audio, start and stop. It lives in the stage until the
 * picker overlay from the design is built.
 */
export function Recorder(): React.JSX.Element {
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [displays, setDisplays] = useState<DisplayTarget[]>([])
  const [windows, setWindows] = useState<WindowTarget[]>([])
  const [target, setTarget] = useState<string>('')
  const [mic, setMic] = useState(false)
  const [systemAudio, setSystemAudio] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [elapsed, setElapsed] = useState(0)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    () =>
      loadCaptureState().then(
        ({ permissions, targets }) => {
          setPermissions(permissions)
          setDisplays(targets.displays)
          setWindows(targets.windows)
          const main = targets.displays.find((d) => d.isMain)
          setTarget((current) => current || (main ? `display:${main.id}` : ''))
          setError(null)
        },
        (e: unknown) => setError(e instanceof Error ? e.message : String(e))
      ),
    []
  )

  useEffect(() => {
    void refresh()
    return window.recscene.capture.onWarning((message) => setWarnings((w) => [...w, message]))
  }, [refresh])

  useEffect(() => {
    if (phase.kind !== 'recording') return
    const id = window.setInterval(() => setElapsed(Date.now() - phase.startedAt), 100)
    return () => window.clearInterval(id)
  }, [phase])

  const start = async (): Promise<void> => {
    const [kind, idText] = target.split(':')
    const id = Number(idText)
    if ((kind !== 'display' && kind !== 'window') || !Number.isFinite(id)) return
    setWarnings([])
    setError(null)
    try {
      await window.recscene.capture.start({ target: { kind, id }, mic, systemAudio })
      setElapsed(0)
      setPhase({ kind: 'recording', startedAt: Date.now() })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const stop = async (): Promise<void> => {
    setPhase({ kind: 'stopping' })
    try {
      const result = await window.recscene.capture.stop()
      setPhase({ kind: 'done', result })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase({ kind: 'idle' })
    }
  }

  return (
    <div className="recorder">
      <h2 className="recorder__title">New recording</h2>

      {permissions && (
        <ul className="recorder__perms" aria-label="Permissions">
          <Perm ok={permissions.screen} label="Screen Recording" />
          <Perm ok={permissions.inputMonitoring} label="Input Monitoring (keystrokes)" />
          <Perm ok={permissions.microphone === 'granted'} label="Microphone" />
          {!(permissions.screen && permissions.inputMonitoring) && (
            <li>
              <button type="button" className="btn btn--ghost" onClick={() => void window.recscene.capture.permissions(true).then(setPermissions)}>
                Request permissions
              </button>
            </li>
          )}
        </ul>
      )}

      <label className="field">
        <span>Record</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={phase.kind !== 'idle' && phase.kind !== 'done'}>
          <optgroup label="Displays">
            {displays.map((d) => (
              <option key={d.id} value={`display:${d.id}`}>
                {d.isMain ? 'Main display' : `Display ${d.id}`} · {d.width}×{d.height} @{d.scale}x
              </option>
            ))}
          </optgroup>
          <optgroup label="Windows">
            {windows.map((w) => (
              <option key={w.id} value={`window:${w.id}`}>
                {w.app}: {w.title || 'Untitled'}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="recorder__toggles">
        <label>
          <input type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} /> Microphone
        </label>
        <label>
          <input type="checkbox" checked={systemAudio} onChange={(e) => setSystemAudio(e.target.checked)} /> System audio
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {phase.kind === 'recording' ? (
        <button type="button" className="btn btn--danger" onClick={() => void stop()}>
          Stop · {formatTimecode(elapsed)}
        </button>
      ) : (
        <button type="button" className="btn btn--accent" disabled={!target || phase.kind === 'stopping'} onClick={() => void start()}>
          {phase.kind === 'stopping' ? 'Finishing…' : 'Start recording'}
        </button>
      )}

      {phase.kind === 'done' && (
        <dl className="recorder__result">
          <dt>Saved to</dt>
          <dd>{phase.result.projectDir}</dd>
          <dt>Length</dt>
          <dd>
            {formatTimecode(phase.result.durationMs)} · {phase.result.frames} frames · {phase.result.width}×{phase.result.height}
          </dd>
          <dt>Captured</dt>
          <dd>
            {phase.result.clicks} clicks · {phase.result.keys} keystrokes · {phase.result.cursorSamples} cursor samples
          </dd>
        </dl>
      )}

      {warnings.map((w, i) => (
        <p key={i} className="recorder__warning">
          {w}
        </p>
      ))}
      {error && <p className="recorder__error">{error}</p>}
    </div>
  )
}

async function loadCaptureState(): Promise<{ permissions: Permissions; targets: { displays: DisplayTarget[]; windows: WindowTarget[] } }> {
  const [permissions, targets] = await Promise.all([window.recscene.capture.permissions(false), window.recscene.capture.listTargets()])
  return { permissions, targets }
}

function Perm({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return (
    <li className={ok ? 'perm perm--ok' : 'perm'}>
      <span aria-hidden="true">{ok ? '●' : '○'}</span> {label}
    </li>
  )
}
