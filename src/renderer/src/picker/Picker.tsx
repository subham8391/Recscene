import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WindowTarget } from '@core/captureProtocol'
import {
  addSavedDimensions,
  applyAspect,
  applySavedDimensions,
  ASPECT_PRESETS,
  CAMERA_MISSING,
  cameraLabel,
  clampArea,
  COUNTDOWN_OPTIONS,
  countdownLabel,
  formatBytes,
  rectFromDrag,
  removeSavedDimensions,
  selectedCamera,
  WEBCAM_HEIGHTS,
  type DisplayInfo,
  type PickerPrefs,
  type PickerState,
  type Rect,
  type SourceKind
} from '@core/recordingPicker'
import { useCameraStream } from './useCameraStream'

type Phase = { kind: 'pick' } | { kind: 'countdown'; remainingMs: number } | { kind: 'starting' } | { kind: 'cover' } | { kind: 'error'; message: string }

const SOURCES: { id: SourceKind; name: string; d: string; hint: string }[] = [
  { id: 'display', name: 'Display', d: 'M3 5h18v12H3zM8 21h8M12 17v4', hint: 'Records this whole display, full-screen apps included. Open the picker on another display to record that one.' },
  { id: 'window', name: 'Window', d: 'M3 5h18v14H3zM3 9h18', hint: 'Pick a window from the list. It keeps being recorded if it moves. Full-screen apps: use Display.' },
  { id: 'area', name: 'Area', d: 'M4 4h4M16 4h4M4 20h4M16 20h4M4 4v4M4 16v4M20 4v4M20 16v4', hint: 'Drag on the desktop to draw the area, or type a size. Minimum 150 × 150 px.' },
  { id: 'device', name: 'Device', d: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2', hint: 'iPhone and iPad recording over USB arrives with spec 6 in M2.' }
]

type Corner = 'nw' | 'ne' | 'sw' | 'se'

/**
 * The recording picker from the Picker board: a transparent window over the
 * display under the mouse. Specs 1–5 (sources, area, saved sizes), 13 and 17
 * (mic and system audio), 21 (countdown), 31 (cover), 33 (⇧⌘R), 39 (free space).
 */
export function Picker(): React.JSX.Element {
  const [state, setState] = useState<PickerState | null>(null)
  const [prefs, setPrefs] = useState<PickerPrefs | null>(null)
  const [source, setSource] = useState<SourceKind>('display')
  const [windowId, setWindowId] = useState<number | null>(null)
  const [windowFilter, setWindowFilter] = useState('')
  const [area, setArea] = useState<Rect | null>(null)
  const [aspect, setAspect] = useState<number | null>(null)
  const [sizesOpen, setSizesOpen] = useState(false)
  const [micOpen, setMicOpen] = useState(false)
  const [camOpen, setCamOpen] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const drag = useRef<{ start: { x: number; y: number }; corner?: Corner; origin?: Rect } | null>(null)

  const display = useMemo<DisplayInfo | undefined>(() => state?.displays.find((d) => d.id === state.displayId), [state])
  const bounds = display?.bounds
  const cameraChoice = useMemo(() => (prefs && state ? selectedCamera(prefs, state.cameras) : { camera: null, missing: false }), [prefs, state])
  // Spec 8: the camera row shows a live thumbnail while the camera is on; the helper records the real file.
  const camThumb = useCameraStream(cameraChoice.camera?.name ?? null, !!prefs?.recordCamera && cameraChoice.camera !== null && phase.kind === 'pick', (m) => setCamError(m))

  // Local (window) coordinates are display-relative; the area is kept in global points like the helper wants.
  const toGlobal = useCallback((p: { x: number; y: number }) => ({ x: p.x + (bounds?.x ?? 0), y: p.y + (bounds?.y ?? 0) }), [bounds])
  const toLocal = (r: Rect): Rect => ({ ...r, x: r.x - (bounds?.x ?? 0), y: r.y - (bounds?.y ?? 0) })

  useEffect(() => {
    void window.recscene.picker.state().then((s) => {
      setState(s)
      setPrefs(s.prefs)
      setSource(s.prefs.source)
      const d = s.displays.find((x) => x.id === s.displayId)
      if (d) {
        const fallback: Rect = { x: d.bounds.x + Math.round(d.bounds.width * 0.15), y: d.bounds.y + Math.round(d.bounds.height * 0.15), width: Math.round(d.bounds.width * 0.7), height: Math.round(d.bounds.height * 0.7) }
        setArea(clampArea(s.prefs.lastArea ?? fallback, d.bounds))
      }
    })
    return window.recscene.picker.onCover(() => setPhase({ kind: 'cover' }))
  }, [])

  const savePrefs = (values: Partial<PickerPrefs>): void => {
    setPrefs((p) => (p ? { ...p, ...values } : p))
    void window.recscene.picker.savePrefs(values)
  }

  /** Spec 8: turning the camera on asks macOS for access first (the helper inherits the answer). */
  const toggleCamera = async (): Promise<void> => {
    if (!prefs) return
    if (prefs.recordCamera) return savePrefs({ recordCamera: false })
    setCamError(null)
    const ok = await window.recscene.picker.askCamera()
    if (!ok) return setCamError('Recscene does not have permission to use your webcam. Allow it in System Settings › Privacy & Security › Camera.')
    savePrefs({ recordCamera: true })
    void window.recscene.picker.state().then((s) => setState(s))
  }

  const pickSource = (id: SourceKind): void => {
    if (id === 'device') return
    setSource(id)
    savePrefs({ source: id })
  }

  const cancel = async (): Promise<void> => {
    if (phase.kind === 'cover') return
    await window.recscene.picker.cancel()
  }

  const record = async (): Promise<void> => {
    if (!prefs || phase.kind !== 'pick') return
    if (source === 'window' && windowId === null) {
      setPhase({ kind: 'error', message: 'Pick a window first.' })
      return
    }
    const ms = prefs.recordingCountdownDuration
    if (ms) setPhase({ kind: 'countdown', remainingMs: ms })
    else await start()
  }

  const start = async (): Promise<void> => {
    if (!state || !prefs) return
    setPhase({ kind: 'starting' })
    try {
      await window.recscene.picker.record({
        source: source === 'device' ? 'display' : source,
        displayId: state.displayId,
        ...(source === 'window' && windowId !== null ? { windowId } : {}),
        ...(source === 'area' && area ? { area } : {}),
        mic: prefs.recordMicrophone,
        systemAudio: prefs.systemAudio === 'all',
        micAutoGain: prefs.enableAutoGainControl,
        micEnhance: prefs.enableVoiceRecordingEnhancements,
        camera: prefs.recordCamera ? (cameraChoice.camera?.id ?? null) : null,
        cameraMaxHeight: prefs.maximumWebcamHeight
      })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e) })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') void cancel()
      if (e.key === 'Enter' && phase.kind === 'pick' && !(e.target instanceof HTMLInputElement)) void record()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (phase.kind !== 'countdown') return
    if (phase.remainingMs <= 0) {
      void start()
      return
    }
    const id = window.setTimeout(() => setPhase({ kind: 'countdown', remainingMs: phase.remainingMs - 1000 }), 1000)
    return () => window.clearTimeout(id)
  })

  // Area drawing: a drag on the empty desktop draws a new rectangle, a drag on a corner resizes.
  const onOverlayDown = (e: React.MouseEvent): void => {
    if (source !== 'area' || phase.kind !== 'pick' || !bounds) return
    drag.current = { start: toGlobal({ x: e.clientX, y: e.clientY }) }
  }
  const onCornerDown = (e: React.MouseEvent<HTMLSpanElement>): void => {
    if (!area) return
    e.stopPropagation()
    const corner = e.currentTarget.dataset['corner'] as Corner
    drag.current = { start: toGlobal({ x: e.clientX, y: e.clientY }), corner, origin: area }
  }
  const onMove = (e: React.MouseEvent): void => {
    const d = drag.current
    if (!d || !bounds) return
    const p = toGlobal({ x: e.clientX, y: e.clientY })
    if (d.corner && d.origin) {
      const o = d.origin
      const fixed = { x: d.corner.includes('e') ? o.x : o.x + o.width, y: d.corner.includes('s') ? o.y : o.y + o.height }
      setArea(clampArea(rectFromDrag(fixed, p), bounds))
    } else {
      setArea(clampArea(rectFromDrag(d.start, p), bounds))
    }
  }
  const onUp = (): void => {
    drag.current = null
    setAspect(null)
  }

  const setAreaSize = (key: 'width' | 'height', value: number): void => {
    if (!area || !bounds || !Number.isFinite(value)) return
    setArea(clampArea({ ...area, [key]: value }, bounds))
  }

  const nudge = (e: React.KeyboardEvent): void => {
    if (!area || !bounds) return
    const step = e.shiftKey ? 10 : 1
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const d = delta[e.key]
    if (!d) return
    e.preventDefault()
    setArea(clampArea({ ...area, x: area.x + d[0], y: area.y + d[1] }, bounds))
  }

  if (!state || !prefs) return <div className="picker-root" />

  const localArea = area ? toLocal(area) : null
  const permissions = state.permissions
  const windows = state.windows.filter((w) => `${w.app} ${w.title}`.toLowerCase().includes(windowFilter.toLowerCase()))
  const showArea = source === 'area' && localArea
  const cover = phase.kind === 'cover'

  return (
    <div className={`picker-root${cover ? ' picker-root--cover' : ''}`} onMouseDown={onOverlayDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      {showArea && (
        <div className="area" style={{ left: localArea.x, top: localArea.y, width: localArea.width, height: localArea.height }} tabIndex={cover ? -1 : 0} onKeyDown={nudge} aria-label="Recording area">
          {!cover && (
            <>
              <span className="area__handle area__handle--nw" data-corner="nw" onMouseDown={onCornerDown} /><span className="area__handle area__handle--ne" data-corner="ne" onMouseDown={onCornerDown} />
              <span className="area__handle area__handle--sw" data-corner="sw" onMouseDown={onCornerDown} /><span className="area__handle area__handle--se" data-corner="se" onMouseDown={onCornerDown} />
              <span className="area__size">{localArea.width} × {localArea.height} · minimum 150 × 150</span>
            </>
          )}
        </div>
      )}

      {phase.kind === 'countdown' && (
        <div className="countdown" role="status" aria-live="polite">
          <div className="countdown__ring">{Math.ceil(phase.remainingMs / 1000)}</div>
          <p>Get ready. Recording will start soon.</p>
          <small>Esc cancels</small>
        </div>
      )}

      {(phase.kind === 'pick' || phase.kind === 'error' || phase.kind === 'starting') && (
        <div role="dialog" aria-label="New recording" className="panel" onMouseDown={(e) => e.stopPropagation()}>
          <div className="panel__head">
            <span className="panel__title">New recording</span>
            <span className="muted">⇧⌘R opens this anywhere</span>
            <span className="panel__spacer" />
            <button type="button" className="icon-btn" aria-label="Recording settings (coming with spec 252)" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5 5.8l-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z" /></svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => void cancel()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div role="tablist" aria-label="Recording source" className="sources">
            {SOURCES.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={source === s.id} className="source" disabled={s.id === 'device'} onClick={() => pickSource(s.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={s.d} /></svg>
                {s.name}
              </button>
            ))}
          </div>
          <p className="hint">{SOURCES.find((s) => s.id === source)?.hint}</p>

          {source === 'display' && (
            <div className="displays">
              {state.displays.map((d) => (
                <span key={d.id} className={`chip${d.id === state.displayId ? ' chip--on' : ''}`}>
                  {d.isMain ? 'Main display' : `Display ${d.id}`} · {d.bounds.width}×{d.bounds.height} @{d.scale}x{d.id === state.displayId ? ' · this one' : ''}
                </span>
              ))}
            </div>
          )}

          {source === 'window' && (
            <div className="windows">
              <input className="input" placeholder="Filter windows…" value={windowFilter} onChange={(e) => setWindowFilter(e.target.value)} />
              <ul className="windows__list" role="listbox" aria-label="Windows">
                {windows.length === 0 && <li className="muted windows__empty">No windows to select</li>}
                {windows.map((w: WindowTarget) => (
                  <li key={w.id}>
                    <button type="button" role="option" aria-selected={windowId === w.id} className={`window${windowId === w.id ? ' window--on' : ''}`} onClick={() => setWindowId(w.id)}>
                      <span className="window__app">{w.app}</span>
                      <span className="window__title">{w.title || 'Untitled'}</span>
                      <span className="muted">{Math.round(w.width)}×{Math.round(w.height)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {source === 'area' && area && bounds && (
            <div className="area-fields">
              <label>Width<input className="input input--num" type="number" min={150} value={area.width} onChange={(e) => setAreaSize('width', Number(e.target.value))} /></label>
              <label>Height<input className="input input--num" type="number" min={150} value={area.height} onChange={(e) => setAreaSize('height', Number(e.target.value))} /></label>
              <select className="input" aria-label="Aspect ratio" value={aspect === null ? 'free' : String(aspect)} onChange={(e) => { const r = e.target.value === 'free' ? null : Number(e.target.value); setAspect(r); setArea(applyAspect(area, r, bounds)) }}>
                {ASPECT_PRESETS.map((a) => <option key={a.label} value={a.ratio === null ? 'free' : String(a.ratio)}>{a.label}</option>)}
              </select>
              <button type="button" className="btn btn--ghost" disabled={!prefs.lastArea} onClick={() => prefs.lastArea && setArea(clampArea(prefs.lastArea, bounds))}>Last area</button>
              <div className="menu-anchor">
                <button type="button" className="btn btn--ghost" aria-haspopup="menu" aria-expanded={sizesOpen} onClick={() => setSizesOpen((o) => !o)}>Saved sizes ▾</button>
                {sizesOpen && (
                  <div role="menu" className="menu">
                    <button type="button" role="menuitem" onClick={() => { savePrefs({ recordingAreaCropPresets: addSavedDimensions(prefs.recordingAreaCropPresets, area) }); setSizesOpen(false) }}>Save current dimensions ({area.width} × {area.height})</button>
                    {prefs.recordingAreaCropPresets.length === 0 && <span className="muted menu__empty">No saved dimensions</span>}
                    {prefs.recordingAreaCropPresets.map((s) => (
                      <div key={`${s.width}x${s.height}`} className="menu__row">
                        <button type="button" role="menuitem" onClick={() => { setArea(applySavedDimensions(area, s, bounds)); setSizesOpen(false) }}>{s.width} × {s.height}</button>
                        <button type="button" className="icon-btn icon-btn--sm" aria-label={`Delete ${s.width} × ${s.height}`} onClick={() => savePrefs({ recordingAreaCropPresets: removeSavedDimensions(prefs.recordingAreaCropPresets, s) })}>×</button>
                      </div>
                    ))}
                    {prefs.recordingAreaCropPresets.length > 0 && <button type="button" role="menuitem" className="menu__danger" onClick={() => savePrefs({ recordingAreaCropPresets: [] })}>Delete saved dimensions</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="devices">
            <div className="menu-anchor">
              <button type="button" className={`device${prefs.recordCamera ? ' device--on' : ''}`} aria-pressed={prefs.recordCamera} title={prefs.recordCamera ? "Don't record camera" : 'Record webcam'} onClick={() => void toggleCamera()} onContextMenu={(e) => { e.preventDefault(); setCamOpen((o) => !o) }}>
                <span className={`device__thumb device__thumb--cam${prefs.webcamPreviewType === 'square' ? '' : ' device__thumb--wide'}`}>
                  {prefs.recordCamera && cameraChoice.camera ? <video ref={camThumb} className="device__cam" muted playsInline /> : null}
                </span>
                <span className="device__text"><span className="device__label">Camera</span><span className="device__value">{cameraLabel(prefs, state.cameras)}</span></span>
              </button>
                <button type="button" className="device__more" aria-label="Camera options" aria-haspopup="menu" aria-expanded={camOpen} onClick={(e) => { e.stopPropagation(); setCamOpen((o) => !o) }}>▾</button>
              {camOpen && (
                <div role="menu" className="menu menu--mic menu--cam">
                  {state.cameras.length === 0 && <span className="muted menu__empty">No camera is connected</span>}
                  {state.cameras.map((c) => (
                    <label key={c.id} className="menu__check">
                      <input type="radio" name="camera" checked={prefs.recordCamera && cameraChoice.camera?.id === c.id} onChange={() => { savePrefs({ cameraDeviceId: c.id }); if (!prefs.recordCamera) void toggleCamera() }} />
                      {c.name} <span className="muted">· up to {Math.min(c.maxHeight, 1080)}p</span>
                    </label>
                  ))}
                  <label className="menu__check"><input type="radio" name="camera" checked={!prefs.recordCamera} onChange={() => savePrefs({ recordCamera: false })} />Don't record camera</label>
                  <label className="menu__check"><input type="checkbox" checked={prefs.hideCameraPreview} onChange={(e) => savePrefs({ hideCameraPreview: e.target.checked })} />Hide camera preview</label>
                  <label className="menu__check"><input type="checkbox" checked={prefs.webcamPreviewType === 'full-frame'} onChange={(e) => savePrefs({ webcamPreviewType: e.target.checked ? 'full-frame' : 'square' })} />Full-frame webcam preview</label>
                  <div className="menu__row menu__row--res"><span className="muted">Maximum camera resolution</span><span className="seg seg--sm" role="group" aria-label="Maximum camera resolution">{WEBCAM_HEIGHTS.map((h) => <button key={h} type="button" aria-pressed={prefs.maximumWebcamHeight === h} onClick={() => savePrefs({ maximumWebcamHeight: h })}>{h}p</button>)}</span></div>
                  <span className="muted menu__empty">The preview is on screen only and is never recorded. Mirroring, shape and position are set in the editor.</span>
                </div>
              )}
            </div>
            <div className="menu-anchor">
              <button type="button" className={`device${prefs.recordMicrophone ? ' device--on' : ''}`} aria-pressed={prefs.recordMicrophone} onClick={() => savePrefs({ recordMicrophone: !prefs.recordMicrophone })} onContextMenu={(e) => { e.preventDefault(); setMicOpen((o) => !o) }}>
                <span className="device__thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></span>
                <span className="device__text"><span className="device__label">Microphone</span><span className="device__value">{prefs.recordMicrophone ? 'Default mic' : 'Not recorded'}</span></span>
              </button>
                <button type="button" className="device__more" aria-label="Microphone options" aria-haspopup="menu" aria-expanded={micOpen} onClick={(e) => { e.stopPropagation(); setMicOpen((o) => !o) }}>▾</button>
              {micOpen && (
                <div role="menu" className="menu menu--mic">
                  <label className="menu__check"><input type="checkbox" checked={!prefs.enableAutoGainControl} onChange={(e) => savePrefs({ enableAutoGainControl: !e.target.checked })} />Disable auto gain control</label>
                  <label className="menu__check"><input type="checkbox" checked={prefs.enableVoiceRecordingEnhancements} onChange={(e) => savePrefs({ enableVoiceRecordingEnhancements: e.target.checked })} />Reduce noise while recording</label>
                  <span className="muted menu__empty">Takes effect on the next recording.</span>
                </div>
              )}
            </div>
            <button type="button" className={`device${prefs.systemAudio === 'all' ? ' device--on' : ''}`} aria-pressed={prefs.systemAudio === 'all'} onClick={() => savePrefs({ systemAudio: prefs.systemAudio === 'all' ? 'none' : 'all' })}>
              <span className="device__thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg></span>
              <span className="device__text"><span className="device__label">System audio</span><span className="device__value">{prefs.systemAudio === 'all' ? 'All apps' : "Don't record"}</span></span>
            </button>
          </div>

          <div className="options">
            <select className="pill" aria-label="Recording countdown" value={prefs.recordingCountdownDuration === null ? 'none' : String(prefs.recordingCountdownDuration)} onChange={(e) => savePrefs({ recordingCountdownDuration: e.target.value === 'none' ? null : Number(e.target.value) })}>
              {COUNTDOWN_OPTIONS.map((ms) => <option key={String(ms)} value={ms === null ? 'none' : String(ms)}>Countdown · {countdownLabel(ms)}</option>)}
            </select>
            <button type="button" className={`pill${prefs.recordingAreaCover ? ' pill--on' : ''}`} aria-pressed={prefs.recordingAreaCover} onClick={() => savePrefs({ recordingAreaCover: !prefs.recordingAreaCover })} title="Dim the part of the screen that is not recorded">Highlight recorded area</button>
            <button type="button" className={`pill${prefs.showSpeakerNotes ? ' pill--on' : ''}`} aria-pressed={prefs.showSpeakerNotes} onClick={() => savePrefs({ showSpeakerNotes: !prefs.showSpeakerNotes })} title="A floating notes window that is never recorded. ⌘⌥. starts the teleprompter">Speaker notes ⌥⌘.</button>
            <button type="button" className={`pill${prefs.hideDesktopContentWhileRecording ? ' pill--on' : ''}`} aria-pressed={prefs.hideDesktopContentWhileRecording} onClick={() => savePrefs({ hideDesktopContentWhileRecording: !prefs.hideDesktopContentWhileRecording })} title="Hide Finder desktop icons while recording; they come back when it ends">Hide desktop icons</button>
            <button type="button" className={`pill${prefs.showQuickExportWidget ? ' pill--on' : ''}`} aria-pressed={prefs.showQuickExportWidget} onClick={() => savePrefs({ showQuickExportWidget: !prefs.showQuickExportWidget })} title="After the recording is done, a widget will appear that allows you to quickly export the recording. If disabled - full editor will be opened instead.">Quick export widget</button>
            <button type="button" className="pill" disabled title="Spec 20, M2">Engine · auto</button>
          </div>

          <div className="panel__foot">
            <span className="muted panel__status">
              Permissions: Screen {permissions.screen ? '✓' : '✗'} · Camera {permissions.camera === 'granted' ? '✓' : '○'} · Keystrokes {permissions.inputMonitoring ? '✓' : '✗'} · Mic {permissions.microphone === 'granted' ? '✓' : '○'}
              <br />Free space {formatBytes(state.freeSpaceBytes)} · {prefs.recordMicrophone ? 'mic on' : 'mic off'} · {prefs.systemAudio === 'all' ? 'system audio on' : 'system audio off'}
            </span>
            <span className="panel__spacer" />
            <button type="button" className="record" onClick={() => void record()} disabled={phase.kind === 'starting' || !permissions.screen}>
              <span className="record__dot" aria-hidden="true" />
              {phase.kind === 'starting' ? 'Starting…' : 'Record'} <kbd>↩</kbd>
            </button>
          </div>
          {phase.kind === 'error' && <p className="panel__error" role="alert">{phase.message}</p>}
          {camError && <p className="panel__error" role="alert">{camError}</p>}
          {prefs.recordCamera && cameraChoice.missing && <p className="panel__error" role="alert">{CAMERA_MISSING}. Recording with {cameraChoice.camera?.name} instead.</p>}
          {!permissions.screen && <p className="panel__error" role="alert">Recscene does not have permission to record your screen. Allow it in System Settings › Privacy &amp; Security › Screen Recording.</p>}
        </div>
      )}
    </div>
  )
}
