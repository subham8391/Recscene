import { useEffect, useRef, useState } from 'react'
import { outputDurationMs } from '@core/editor/clips'
import { outputRatio } from '@core/editor/aspect'
import { exportSettingsFrom, formatSeconds, outputSize, remainingSeconds, type ExportProgress, type ExportSettings, type ExportTarget } from '@core/editor/exportSettings'
import { formatClock } from '@core/recordingPicker'
import { runExport } from '../editor/exportEngine'

type State = Awaited<ReturnType<typeof window.recscene.quickExport.state>>

/** The Quick Export widget (specs 42–47): preview the fresh recording, then Save, Copy or Edit. */
export function QuickExport(): React.JSX.Element {
  const [state, setState] = useState<State>(null)
  const [settings, setSettings] = useState<ExportSettings | null>(null)
  const [progress, setProgress] = useState<(ExportProgress & { eta: number | null }) | null>(null)
  const report = (p: ExportProgress): void => setProgress({ ...p, eta: p.phase === 'rendering' ? remainingSeconds(p, Date.now()) : null })
  const [done, setDone] = useState<{ path: string; target: ExportTarget } | null>(null)
  const [ask, setAsk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    void window.recscene.quickExport.state().then(setState)
    void window.recscene.export.settings().then((s) => setSettings(exportSettingsFrom(s.last ?? s.defaults ?? {})))
  }, [])

  if (!state || !settings) return <div className="qx" />
  const { opened, prefs } = state
  const project = opened.project
  const durationMs = outputDurationMs(project.clips)
  const ratio = outputRatio(project.config.defaultOutputAspectRatio, project.recording.screen)
  const size = outputSize(settings.height, ratio)

  const start = (target: ExportTarget): void => {
    if (progress) return
    setError(null)
    const controller = new AbortController()
    abort.current = controller
    const input = { project, clips: project.clips, sourceDurationMs: project.recording.durationMs, screenUrl: opened.media.screen, micUrl: opened.media.mic, cameraUrl: opened.media.camera, musicUrl: null, backgroundImageUrl: null, assetsUrl: opened.media.assets, cursor: opened.cursor, cursorTypes: opened.cursorTypes, silenceGaps: [], voiceUrl: (file: string) => opened.media.screen.replace(/[^/]+$/, encodeURIComponent(file)), projectName: project.name }
    report({ phase: 'preparing', frame: 0, frames: 1, startedAt: Date.now() })
    void runExport(input, settings, target, report, controller.signal)
      .then((r) => {
        setProgress(null)
        if (!r) return
        setDone({ path: r.path, target })
        if (prefs.alwaysSaveProjectWhenUsingQuickExportWidget) void window.recscene.quickExport.done('keep')
        else setAsk(true)
      })
      .catch((e: unknown) => {
        setProgress(null)
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : String(e))
      })
  }

  const eta = progress?.eta ?? null

  return (
    <div className="qx" role="dialog" aria-label="Quick export">
      <div className="qx__preview">
        <video src={opened.media.screen} className="qx__video" autoPlay loop muted={prefs.muteQuickExportWidgetPreview} playsInline controls={false} />
        <span className="qx__dur">{formatClock(durationMs)} · {project.recording.screen.width}×{project.recording.screen.height}</span>
        <button type="button" className="qx__mute" aria-pressed={prefs.muteQuickExportWidgetPreview} title={prefs.muteQuickExportWidgetPreview ? 'Unmute widget preview' : 'Mute widget preview'} onClick={() => { const next = !prefs.muteQuickExportWidgetPreview; void window.recscene.quickExport.setPrefs({ muteQuickExportWidgetPreview: next }).then(() => setState({ ...state, prefs: { ...prefs, muteQuickExportWidgetPreview: next } })) }}>{prefs.muteQuickExportWidgetPreview ? '🔇' : '🔊'}</button>
      </div>
      {error && <p className="panel__error" role="alert">{error}</p>}
      {progress ? (
        <div className="qx__progress">
          <div className="export__bar"><span style={{ width: `${progress.frames ? (progress.frame / progress.frames) * 100 : 0}%` }} /></div>
          <span className="muted">{progress.phase === 'rendering' ? `Rendering ${progress.frame} of ${progress.frames}${eta !== null ? ` · ${formatSeconds(eta)} left` : ''}` : progress.phase === 'audio' ? 'Mixing audio…' : progress.phase === 'finishing' ? 'Finishing…' : 'Preparing…'}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => abort.current?.abort()}>Stop</button>
        </div>
      ) : ask ? (
        <div className="qx__ask">
          <p>{done?.target === 'clipboard' ? 'Copied to clipboard.' : `Saved to ${done?.path.replace(/^\/Users\/[^/]+/, '~')}.`} Do you want to save your project before closing or delete it?</p>
          <div className="qx__row">
            <label className="menu__check"><input type="checkbox" checked={prefs.alwaysSaveProjectWhenUsingQuickExportWidget} onChange={(e) => { void window.recscene.quickExport.setPrefs({ alwaysSaveProjectWhenUsingQuickExportWidget: e.target.checked }); setState({ ...state, prefs: { ...prefs, alwaysSaveProjectWhenUsingQuickExportWidget: e.target.checked } }) }} />Always save project</label>
            <span className="tl__spacer" />
            <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => void window.recscene.quickExport.done('delete')}>Delete project</button>
            <button type="button" className="btn btn--accent btn--sm" onClick={() => void window.recscene.quickExport.done('keep')}>Keep project</button>
          </div>
        </div>
      ) : (
        <div className="qx__actions">
          <button type="button" className="btn btn--accent" title="Quick export to file (~/Movies/Recscene)" onClick={() => start('quick')}>Save</button>
          <button type="button" className="btn" title="Quick export to clipboard" onClick={() => start('clipboard')}>Copy</button>
          <button type="button" className="btn" disabled title="Shareable links arrive in M3">Share</button>
          <button type="button" className="btn" title="Continue editing in full editor" onClick={() => void window.recscene.quickExport.edit()}>Edit</button>
          <span className="tl__spacer" />
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={showSettings} onClick={() => setShowSettings((v) => !v)}>Quick export settings…</button>
        </div>
      )}
      {showSettings && !progress && (
        <div className="qx__settings">
          <label className="field--inline"><span>Format</span><select className="input" value={settings.format} onChange={(e) => setSettings({ ...settings, format: e.target.value as 'mp4' })}><option value="mp4">MP4</option><option value="gif">GIF</option></select></label>
          <label className="field--inline"><span>Resolution</span><select className="input" value={settings.height} onChange={(e) => setSettings({ ...settings, height: Number(e.target.value) as 1080 })}>{[720, 1080, 1440, 2160].map((h) => <option key={h} value={h}>{h}p</option>)}</select></label>
          <label className="field--inline"><span>Frame rate</span><select className="input" value={settings.fps} onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) as 30 })}>{[24, 30, 60].map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
          <label className="field--inline"><span>Quality</span><select className="input" value={settings.quality} onChange={(e) => setSettings({ ...settings, quality: e.target.value as 'high' })}><option value="web">Web</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <p className="note">These settings will be used when using quick export or exporting from the widget. Output {size.width}×{size.height}.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void window.recscene.export.saveSettings(settings, false).then(() => setShowSettings(false))}>Use these</button>
        </div>
      )}
      <p className="qx__hint muted">Double-click the preview to open the editor · the project is already saved in the projects folder</p>
    </div>
  )
}
