import { useEffect, useRef, useState } from 'react'
import { outputRatio } from '@core/editor/aspect'
import { defaultExportSettings, estimateExport, exportSettingsFrom, formatBytes, formatSeconds, FRAME_RATES, QUALITY_OPTIONS, remainingSeconds, RESOLUTIONS, type ExportProgress, type ExportSettings, type ExportTarget } from '@core/editor/exportSettings'
import type { Project } from '@core/project'
import { runExport, type ExportInput } from './exportEngine'

interface Props {
  input: ExportInput
  durationMs: number
  onClose: () => void
  onNotice: (message: string) => void
}

/** The Export & share dialog from the Export board (specs 233–237, 240–241, 245, 247–248). */
export function ExportDialog({ input, durationMs, onClose, onNotice }: Props): React.JSX.Element {
  const [settings, setSettings] = useState<ExportSettings | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [now, setNow] = useState(() => 0)
  const [renderFps, setRenderFps] = useState(20)
  const abort = useRef<AbortController | null>(null)
  const project: Project = input.project
  const crop = project.config.recordingCrop
  const rec = project.recording.screen
  const ratio = outputRatio(project.config.defaultOutputAspectRatio, crop ? { width: rec.width * crop.width, height: rec.height * crop.height } : rec)
  const busy = progress !== null && progress.phase !== 'done' && progress.phase !== 'cancelled' && progress.phase !== 'failed'

  useEffect(() => {
    void window.recscene.export.settings().then((s) => setSettings(exportSettingsFrom(s.last ?? s.defaults ?? undefined)))
  }, [])

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [busy])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [busy, onClose])

  const update = (patch: Partial<ExportSettings>): void => {
    setSettings((prev) => {
      const next = { ...(prev ?? defaultExportSettings), ...patch }
      void window.recscene.export.saveSettings(next, false)
      return next
    })
  }

  const start = async (target: ExportTarget): Promise<void> => {
    if (!settings) return
    const controller = new AbortController()
    abort.current = controller
    const startedAt = Date.now()
    try {
      const result = await runExport(input, settings, target, (p) => {
        setProgress(p)
        if (p.phase === 'rendering' && p.frame > 0) setRenderFps(Math.max(1, (p.frame / Math.max(1, Date.now() - p.startedAt)) * 1000))
      }, controller.signal)
      if (result) onNotice(target === 'clipboard' ? 'Copied to clipboard' : `Export completed · ${result.path}`)
      else if (!controller.signal.aborted) setProgress(null)
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e))
    } finally {
      abort.current = null
      void startedAt
    }
  }

  const remaining = progress ? remainingSeconds(progress, now) : null

  // The stored settings arrive asynchronously; the controls wait for them so a click never gets overwritten.
  if (!settings) {
    return (
      <div className="cmd__backdrop" onMouseDown={onClose}>
        <div role="dialog" aria-label="Export" className="export" onMouseDown={(e) => e.stopPropagation()}><p className="muted">Loading export settings…</p></div>
      </div>
    )
  }
  const estimate = estimateExport(settings, durationMs, ratio, renderFps)

  return (
    <div className="cmd__backdrop" onMouseDown={() => !busy && onClose()}>
      <div role="dialog" aria-label="Export" className="export" onMouseDown={(e) => e.stopPropagation()}>
        <div className="export__head"><h2>Export</h2><span className="muted">{project.name}</span><span className="tl__spacer" /><button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>Close <kbd>⎋</kbd></button></div>

        {progress && progress.phase !== 'cancelled' ? (
          <div className="export__progress" aria-live="polite">
            <div className="hd"><b>{progress.phase === 'preparing' ? 'Preparing export…' : progress.phase === 'rendering' ? 'Exporting video' : progress.phase === 'audio' ? 'Mixing audio…' : progress.phase === 'finishing' ? 'Finishing…' : progress.phase === 'done' ? 'Export completed' : 'Export failed'}</b><span className="muted">{progress.phase === 'rendering' ? `${progress.frame} / ${progress.frames} frames${remaining !== null ? ` · about ${formatSeconds(remaining)} left` : ''}` : ''}</span></div>
            <div className="export__bar"><span style={{ width: `${Math.round((progress.frame / progress.frames) * 100)}%` }} /></div>
            {progress.phase === 'done' && progress.message && (
              <div className="grid2">
                <button type="button" className="btn btn--ghost" onClick={() => void window.recscene.export.reveal(progress.message!)}>Show in Finder</button>
                <button type="button" className="btn btn--ghost" onClick={() => setProgress(null)}>Back to export options</button>
              </div>
            )}
            {progress.phase === 'failed' && <p className="panel__error">{progress.message}</p>}
            {busy && <button type="button" className="btn btn--danger" onClick={() => abort.current?.abort()}>Stop</button>}
          </div>
        ) : (
          <>
            <section className="sec">
              <h3>Format</h3>
              <div className="seg" role="group" aria-label="Export format">
                <button type="button" aria-pressed={settings.format === 'mp4'} onClick={() => update({ format: 'mp4' })}>MP4</button>
                <button type="button" aria-pressed={settings.format === 'gif'} onClick={() => update({ format: 'gif' })}>GIF</button>
              </div>
              {settings.format === 'gif' && (
                <>
                  <p className="note">Output size and export time are significantly bigger for GIFs. Consider using MP4 if possible.</p>
                  <label className="toggle"><span><b>Disable loop</b><small>Exported GIF will only play once and then stop</small></span><input type="checkbox" checked={settings.gifDisableLoop} onChange={(e) => update({ gifDisableLoop: e.target.checked })} /></label>
                </>
              )}
            </section>
            <section className="sec">
              <h3>Resolution</h3>
              <div className="seg" role="group" aria-label="Resolution">
                {RESOLUTIONS.map((h) => <button key={h} type="button" aria-pressed={settings.height === h} onClick={() => update({ height: h })}>{h === 2160 ? '4K' : `${h}p`}</button>)}
              </div>
            </section>
            <section className="sec">
              <h3>Frame rate</h3>
              <div className="seg" role="group" aria-label="Frame rate">
                {FRAME_RATES.map((f) => <button key={f} type="button" aria-pressed={settings.fps === f} onClick={() => update({ fps: f })}>{f}</button>)}
              </div>
            </section>
            <section className="sec">
              <h3>Quality</h3>
              <div className="seg" role="group" aria-label="Quality">
                {QUALITY_OPTIONS.map((q) => <button key={q.id} type="button" aria-pressed={settings.quality === q.id} title={q.description} onClick={() => update({ quality: q.id })}>{q.label}</button>)}
              </div>
              <p className="note">{QUALITY_OPTIONS.find((q) => q.id === settings.quality)?.description}</p>
            </section>
            <p className="note export__estimate">About {formatBytes(estimate.bytes)} · {estimate.frames} frames · roughly {formatSeconds(estimate.seconds)} to export{settings.format === 'gif' ? ' · GIFs skip audio' : ''}</p>
            <div className="export__targets">
              <button type="button" className="btn btn--accent" onClick={() => void start('file')}>Save</button>
              <button type="button" className="btn btn--ghost" onClick={() => void start('clipboard')}>Copy</button>
              <button type="button" className="btn btn--ghost" disabled title="Shareable links arrive with specs 242–244">Share</button>
              <span className="tl__spacer" />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { void window.recscene.export.saveSettings(settings, true); onNotice('These settings will be used when using quick export or exporting from the widget') }}>Use as default settings</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
