import { useEffect, useRef, useState } from 'react'
import { outputRatio } from '@core/editor/aspect'
import { defaultExportSettings, estimateExport, exportSettingsFrom, formatBytes, formatSeconds, FRAME_RATES, QUALITY_OPTIONS, remainingSeconds, RESOLUTIONS, type ExportProgress, type ExportSettings, type ExportTarget } from '@core/editor/exportSettings'
import type { Project } from '@core/project'
import { formatClock } from '@core/recordingPicker'
import { runExport, type ExportInput } from './exportEngine'
import { Icon } from './railIcons'

interface Props {
  input: ExportInput
  durationMs: number
  /** "Auto (16:9)", for the summary line. */
  aspect: string
  counts: { zooms: number; masks: number; layouts: number }
  /** The current frame as PNG bytes, for the preview thumbnail. */
  thumbnail: () => Promise<ArrayBuffer>
  onClose: () => void
  onNotice: (message: string) => void
}

/** Short quality copy from the Export board; the long descriptions stay in the settings model. */
const QUALITY_COPY: Record<string, { name: string; sub: string }> = {
  web: { name: 'Web', sub: 'Plays directly on websites. Compression slightly visible.' },
  medium: { name: 'Medium', sub: 'Good for sharing on social media.' },
  high: { name: 'High', sub: 'Highest quality, best for further editing.' }
}

const FORMATS: { id: ExportSettings['format']; name: string; sub: string }[] = [
  { id: 'mp4', name: 'MP4', sub: 'H.264 · plays everywhere' },
  { id: 'gif', name: 'GIF', sub: 'Plays once · large' }
]

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

/** The Export & share dialog from the Export board (specs 233–237, 240–241, 245, 247–248). */
export function ExportDialog({ input, durationMs, aspect, counts, thumbnail, onClose, onNotice }: Props): React.JSX.Element {
  const [settings, setSettings] = useState<ExportSettings | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [now, setNow] = useState(() => 0)
  const [renderFps, setRenderFps] = useState(20)
  const [thumb, setThumb] = useState<string | null>(null)
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
    let url: string | null = null
    thumbnail()
      .then((png) => {
        url = URL.createObjectURL(new Blob([png], { type: 'image/png' }))
        setThumb(url)
      })
      .catch(() => setThumb(null))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [thumbnail])

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
    }
  }

  const remaining = progress ? remainingSeconds(progress, now) : null

  // The stored settings arrive asynchronously; the controls wait for them so a click never gets overwritten.
  if (!settings) {
    return (
      <div className="cmd__backdrop" onMouseDown={onClose}>
        <div role="dialog" aria-label="Export" className="export" onMouseDown={(e) => e.stopPropagation()}><p className="muted" style={{ padding: 20 }}>Loading export settings…</p></div>
      </div>
    )
  }
  const estimate = estimateExport(settings, durationMs, ratio, renderFps)
  const isGif = settings.format === 'gif'
  const outputLine = isGif ? `GIF · ${settings.height === 2160 ? '4K' : `${settings.height}p`} · ${settings.fps} fps` : `MP4 · ${settings.height === 2160 ? '4K' : `${settings.height}p`} · ${settings.fps} fps · ${QUALITY_COPY[settings.quality]?.name ?? settings.quality}`
  const showing = progress && progress.phase !== 'cancelled' ? progress : null
  const pct = showing ? Math.round((showing.frame / Math.max(1, showing.frames)) * 100) : 0
  const phaseLabel = showing ? (showing.phase === 'preparing' ? 'Preparing' : showing.phase === 'rendering' ? `Exporting · ${pct}%` : showing.phase === 'audio' ? 'Mixing audio' : showing.phase === 'finishing' ? 'Finishing' : showing.phase === 'done' ? 'Export completed' : 'Export failed') : ''

  return (
    <div className="cmd__backdrop" onMouseDown={() => !busy && onClose()}>
      <div role="dialog" aria-label="Export" className="export" onMouseDown={(e) => e.stopPropagation()}>
        <aside className="export__side">
          <div className="export__thumb">{thumb && <img src={thumb} alt="" />}</div>
          <div className="export__meta">
            <b>{project.name}</b>
            <span className="muted">Duration {formatClock(durationMs)} · {aspect} · {plural(counts.zooms, 'zoom')}, {plural(counts.masks, 'mask')}{counts.layouts ? `, ${plural(counts.layouts, 'layout')}` : ''}</span>
          </div>
          <dl className="export__card">
            <dt>Output</dt><dd>{outputLine}</dd>
            <dt>Estimate</dt><dd>~{formatBytes(estimate.bytes)} · about {formatSeconds(estimate.seconds)}</dd>
            <dt>Saves to</dt><dd title="Export to file asks where; the quick export widget saves here.">~/Movies/Recscene</dd>
          </dl>
          {isGif && <p className="export__gifnote">GIFs play once and stop, without audio. Output size and export time are much bigger; keep it under a minute.</p>}
          <span className="tl__spacer" />
          <p className="note">Quality does not change export time. 4K takes about 4× as long as HD. Only one export runs at a time.</p>
        </aside>

        <div className="export__main">
          <div className="export__head">
            <h2>Export</h2>
            <span className="tl__spacer" />
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => { void window.recscene.export.saveSettings(settings, true); onNotice('These settings will be used when using quick export or exporting from the widget') }}>Use as default settings</button>
            <button type="button" className="export__close" aria-label="Close" title="Close ⎋" disabled={busy} onClick={onClose}><Icon name="close" size={14} /></button>
          </div>

          <section>
            <h3>Format</h3>
            <div className="cards cards--3" role="radiogroup" aria-label="Export format">
              {FORMATS.map((f) => (
                <button key={f.id} type="button" role="radio" className="card-opt" aria-checked={settings.format === f.id} disabled={busy} onClick={() => update({ format: f.id })}><b>{f.name}</b><small>{f.sub}</small></button>
              ))}
            </div>
            {isGif && <label className="toggle" style={{ marginTop: 8 }}><span><b>Disable loop</b><small>Exported GIF will only play once and then stop</small></span><input type="checkbox" checked={settings.gifDisableLoop} disabled={busy} onChange={(e) => update({ gifDisableLoop: e.target.checked })} /></label>}
          </section>

          <div className="grid2">
            <section>
              <h3>Resolution</h3>
              <div className="seg" role="group" aria-label="Resolution">
                {RESOLUTIONS.map((h) => <button key={h} type="button" aria-pressed={settings.height === h} disabled={busy} onClick={() => update({ height: h })}>{h === 2160 ? '4K' : `${h}p`}</button>)}
              </div>
            </section>
            <section>
              <h3>Frame rate</h3>
              <div className="seg" role="group" aria-label="Frame rate">
                {FRAME_RATES.map((f) => <button key={f} type="button" aria-pressed={settings.fps === f} disabled={busy} onClick={() => update({ fps: f })}>{f}</button>)}
              </div>
            </section>
          </div>

          <section>
            <h3>Quality</h3>
            <div className="cards cards--3" role="radiogroup" aria-label="Quality">
              {QUALITY_OPTIONS.map((q) => (
                <button key={q.id} type="button" role="radio" className="card-opt" aria-checked={settings.quality === q.id} disabled={busy || isGif} title={q.description} onClick={() => update({ quality: q.id })}><b>{QUALITY_COPY[q.id]?.name ?? q.label}</b><small>{QUALITY_COPY[q.id]?.sub ?? q.description}</small></button>
              ))}
            </div>
          </section>

          <section className="export__dest">
            <button type="button" className="btn btn--accent" disabled={busy} onClick={() => void start('file')}><Icon name="download" size={16} />Export to file</button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void start('clipboard')}><Icon name="copy" size={16} />Copy to clipboard</button>
            <button type="button" className="btn btn--ghost" disabled title="Shareable links come later, for premium accounts"><Icon name="link" size={16} />Shareable link</button>
          </section>
          <p className="note" style={{ margin: '-6px 0 0' }}>Shareable links come later, for premium accounts: the video is uploaded and everyone with the link can watch and comment.</p>

          {showing && (
            <div className="export__status" role="status" aria-live="polite">
              <b>{phaseLabel}</b>
              <span className="export__bar"><span style={{ width: `${pct}%` }} /></span>
              {showing.phase === 'rendering' && remaining !== null && <span className="muted">about {formatSeconds(remaining)} left</span>}
              {busy && <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => abort.current?.abort()}>Stop</button>}
              {showing.phase === 'done' && showing.message && <button type="button" className="btn btn--ghost btn--sm" onClick={() => void window.recscene.export.reveal(showing.message!)}>Show in Finder</button>}
              {showing.phase === 'failed' && <span className="panel__error">{showing.message}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
