import { useEffect, useState } from 'react'
import { ACTIONS, formatShortcut } from '@core/editor/actions'
import { acceleratorFromEvent, EDITOR_SHORTCUT_IDS, effectiveGlobalShortcut, GLOBAL_SHORTCUTS, isValidEmail, RESET_CONFIRM, SETTINGS_TABS, shortcutConflict, TAB_LABELS, withOverrides, type AppSettings, type SettingsTab } from '@core/settings'
import { AccountTab } from './AccountTab'
/** Section colours from the Settings board. */
const TAB_COLORS: Record<SettingsTab, string> = { general: 'var(--text3)', recording: 'var(--danger)', editing: 'var(--accent)', shortcuts: 'var(--clip)', advanced: 'var(--text3)', experimental: 'var(--caption)', account: 'var(--zoom)' }
type Snap = Awaited<ReturnType<typeof window.recscene.settings.get>>

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="srow">
      <div className="srow__lbl"><b>{label}</b>{sub && <small>{sub}</small>}</div>
      <div className="srow__ctl">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }): React.JSX.Element {
  return <input type="checkbox" className="tog" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
}

function Seg<T extends string | number | null>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }): React.JSX.Element {
  return (
    <div className="seg" role="group">
      {options.map((o) => <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  )
}

/** The Settings window (Settings board; specs 252–254, 256–272, 66, 68–70, 79, 197, 231–232, 29–30, 34–35, 41). */
export function Settings(): React.JSX.Element {
  const [snap, setSnap] = useState<Snap | null>(null)
  const [tab, setTab] = useState<SettingsTab>('general')
  const [capturing, setCapturing] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [presets, setPresets] = useState<{ id: string; name: string }[]>([])

  const reload = (): void => {
    void window.recscene.settings.get().then(setSnap)
  }
  useEffect(() => {
    reload()
    void window.recscene.settings.tab().then(setTab)
    void window.recscene.presets.list().then((l) => setPresets(l.map((p) => ({ id: p.id, name: p.name }))))
    const off = window.recscene.settings.onShowTab(setTab)
    const offPrefs = window.recscene.prefs.onChanged(() => reload())
    const refresh = (): void => reload()
    window.addEventListener('focus', refresh)
    return () => {
      off()
      offPrefs()
      window.removeEventListener('focus', refresh)
    }
  }, [])

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 3000)
    return () => window.clearTimeout(t)
  }, [note])

  // Spec 66: the next key press becomes the shortcut; Escape cancels, Backspace restores the default.
  useEffect(() => {
    if (!capturing || !snap) return
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      if (e.key === 'Escape') return setCapturing(null)
      const overrides = { ...snap.shortcutOverrides }
      if (e.key === 'Backspace' && !e.metaKey && !e.shiftKey) {
        delete overrides[capturing]
        void window.recscene.settings.set({ shortcutOverrides: overrides }).then(reload)
        setCapturing(null)
        return
      }
      const acc = acceleratorFromEvent(e)
      if (!acc) return
      const clash = shortcutConflict(capturing, acc, overrides)
      if (clash) return setNote(`${formatShortcut(acc)} is already used by "${clash}". Make sure it is not conflicting with other global shortcuts.`)
      overrides[capturing] = acc
      void window.recscene.settings.set({ shortcutOverrides: overrides }).then(reload)
      setCapturing(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, snap])

  if (!snap) return <div className="settings" />
  const set = (values: Partial<AppSettings>): void => {
    setSnap({ ...snap, ...values })
    void window.recscene.settings.set(values).then(reload)
  }
  const s = snap
  const perm = (k: string): string => {
    const v = s.permissions[k]
    return v === true || v === 'granted' ? '✓ granted' : v === false || v === 'denied' ? '✗ missing' : '○ not asked yet'
  }
  const editorActions = withOverrides(ACTIONS, s.shortcutOverrides).filter((a) => (EDITOR_SHORTCUT_IDS as readonly string[]).includes(a.id))
  const shortcutButton = (id: string, current: string): React.JSX.Element => (
    <button type="button" className={`sel${capturing === id ? ' sel--rec' : ''}`} onClick={() => setCapturing(capturing === id ? null : id)} title="Click, then press the new keys. ⌫ restores the default, ⎋ cancels.">
      {capturing === id ? 'Press keys…' : <kbd>{formatShortcut(current)}</kbd>}
      {s.shortcutOverrides[id] && capturing !== id ? <span className="muted"> · custom</span> : null}
    </button>
  )

  return (
    <div className="settings">
      <nav className="settings__tabs" aria-label="Settings sections">
        <div className="settings__drag" aria-hidden="true" />
        {SETTINGS_TABS.map((t) => <button key={t} type="button" className={`settings__tab${tab === t ? ' settings__tab--on' : ''}`} aria-current={tab === t} onClick={() => setTab(t)}><span className="settings__dot" style={{ background: TAB_COLORS[t] }} />{TAB_LABELS[t]}</button>)}
        <span className="settings__foot">Recscene v{s.appVersion}</span>
      </nav>
      <main className="settings__main">
        <h2>{TAB_LABELS[tab]}</h2>
        {note && <p className="notice" role="status">{note}</p>}

        {tab === 'general' && (
          <>
            <Row label="Start at login" sub="Opens quietly in the menu bar."><Toggle value={s.startAtStartup} onChange={(v) => set({ startAtStartup: v })} /></Row>
            <Row label="Hide Dock icon" sub="Hidden when no project is open and nothing is recording."><Toggle value={s.hideDockIcon} onChange={(v) => set({ hideDockIcon: v })} /></Row>
            <Row label="Projects folder" sub={s.projectsFolder.replace(/^\/Users\/[^/]+/, '~')}><button type="button" className="sel" onClick={() => void window.recscene.library.chooseFolder().then(reload)}>Change…</button></Row>
            <Row label="Presets folder" sub={`${s.presetsFolder.replace(/^\/Users\/[^/]+/, '~')} · needs the Documents permission`}><button type="button" className="sel" onClick={() => void window.recscene.presets.chooseFolder().then(reload)}>Change…</button></Row>
            <Row label="Autosave project" sub="Every 30 seconds while editing."><Toggle value={s.autoSaveProject} onChange={(v) => set({ autoSaveProject: v })} /></Row>
            <Row label="Appearance" sub="Follows macOS, or force one mode."><Seg value={s.appearance} options={[{ v: 'system', l: 'System' }, { v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }]} onChange={(v) => set({ appearance: v })} /></Row>
            <Row label="Seasonal snow" sub="Jingle all the way: 20 December to 5 January."><Toggle value={s.enableSnow} onChange={(v) => set({ enableSnow: v })} /></Row>
            <Row label="Analytics" sub="Usage data only. Never the content of recordings. Nothing is sent in this build."><Toggle value={s.analyticsEnabled} onChange={(v) => set({ analyticsEnabled: v })} /></Row>
            <h3>Permissions</h3>
            <p className="note">Before you can start recording, we need a few permissions. Allow opens the macOS pane; the status refreshes when this window comes back to the front.</p>
            {([['screen', 'Screen Recording', 'Everything.'], ['camera', 'Camera', 'Webcam track.'], ['microphone', 'Microphone', 'Voice track.'], ['inputMonitoring', 'Input Monitoring', 'Keystroke labels; clicks work without it.'], ['accessibility', 'Accessibility', 'Hiding desktop icons.']] as const).map(([k, l, sub]) => (
              <Row key={k} label={`${l} · ${perm(k)}`} sub={sub}><button type="button" className="sel" onClick={() => void window.recscene.settings.openPane(k)}>Open System Settings</button></Row>
            ))}
          </>
        )}

        {tab === 'recording' && (
          <>
            <Row label="Countdown" sub="Delay before capture starts."><Seg value={s.recordingCountdownDuration} options={[{ v: null, l: 'None' }, { v: 3000, l: '3 s' }, { v: 5000, l: '5 s' }, { v: 10000, l: '10 s' }]} onChange={(v) => set({ recordingCountdownDuration: v })} /></Row>
            <Row label="Create zooms automatically" sub="Groups clicks within 2.5 s into one zoom."><Toggle value={s.createAutomaticZooms} onChange={(v) => set({ createAutomaticZooms: v })} /></Row>
            <Row label="Maximum camera resolution" sub="If your webcam supports it. Higher costs performance while recording."><Seg value={s.maximumWebcamHeight} options={[{ v: 720, l: '720p' }, { v: 1080, l: '1080p' }]} onChange={(v) => set({ maximumWebcamHeight: v })} /></Row>
            <Row label="Improve microphone audio" sub="Voice processing and noise reduction while recording."><Toggle value={s.enableVoiceRecordingEnhancements} onChange={(v) => set({ enableVoiceRecordingEnhancements: v })} /></Row>
            <Row label="Automatic gain control" sub="Keeps the microphone at an even level."><Toggle value={s.enableAutoGainControl} onChange={(v) => set({ enableAutoGainControl: v })} /></Row>
            <Row label="Show recording widget" sub="Elapsed time, pause, flag, restart, delete. Not captured in the output."><Toggle value={s.showRecordingWidget} onChange={(v) => set({ showRecordingWidget: v })} /></Row>
            <Row label="Show quick export widget after recording" sub="Share, Save, Copy or Edit without opening the editor."><Toggle value={s.showQuickExportWidget} onChange={(v) => set({ showQuickExportWidget: v })} /></Row>
            <Row label="Hide desktop icons in recorded video" sub="Finder desktop items are hidden while recording."><Toggle value={s.hideDesktopContentWhileRecording} onChange={(v) => set({ hideDesktopContentWhileRecording: v })} /></Row>
            <Row label="Hide Recscene Dock icon while recording"><Toggle value={s.hideAppDockIconWhileRecording} onChange={(v) => set({ hideAppDockIconWhileRecording: v })} /></Row>
            <Row label="No keyboard shortcuts during recording" sub="Flag and prompter shortcuts pause; ⇧⌘R still stops."><Toggle value={s.blockShortcutsWhileRecording} onChange={(v) => set({ blockShortcutsWhileRecording: v })} /></Row>
            <Row label="Start and stop sounds"><Toggle value={s.playRecordingSounds} onChange={(v) => set({ playRecordingSounds: v })} /></Row>
            <Row label="Use last project settings for new recordings" sub="Otherwise the default preset applies."><Toggle value={s.useLastProjectConfigForNewProjects} onChange={(v) => set({ useLastProjectConfigForNewProjects: v })} /></Row>
            <Row label="Low disk space warning" sub="The recording stops below 2 GB free on the projects volume."><Toggle value={s.lowDiskSpaceWarning} onChange={(v) => set({ lowDiskSpaceWarning: v })} /></Row>
          </>
        )}

        {tab === 'editing' && (
          <>
            <Row label="Show audio waveform"><Toggle value={!s.hideAudioWaveform} onChange={(v) => set({ hideAudioWaveform: !v })} /></Row>
            <Row label="Smooth waveform" sub="An averaged envelope instead of raw peaks."><Toggle value={s.enableSmoothWaveform} onChange={(v) => set({ enableSmoothWaveform: v })} /></Row>
            <Row label="Always show timeline scrollbar"><Toggle value={s.alwaysShowTimelineScrollbar} onChange={(v) => set({ alwaysShowTimelineScrollbar: v })} /></Row>
            <Row label="Audio scrubber" sub="Experimental: hear audio while dragging the playhead."><Toggle value={s.playbackAudioScrubber} onChange={(v) => set({ playbackAudioScrubber: v })} /></Row>
            <Row label="Preview size" sub="Largest preview height the stage renders."><Seg value={s.playbackPreviewMaxHeight} options={[480, 720, 1080, 1440, 2160].map((h) => ({ v: h as 480, l: `${h}p` }))} onChange={(v) => set({ playbackPreviewMaxHeight: v })} /></Row>
            <Row label="Default preset for new projects" sub={presets.find((p) => p.id === s.defaultPresetId)?.name ?? 'None'}>
              <select className="input" value={s.defaultPresetId ?? ''} onChange={(e) => { void window.recscene.presets.setDefault(e.target.value || null).then(reload) }}>
                <option value="">None</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Row>
            <Row label="Default export settings" sub="Your latest export settings are used as default."><button type="button" className="sel" onClick={() => { void window.recscene.prefs.set({ exportDefaults: null, exportLast: null }).then(() => setNote('Export settings reset')) }}>Reset</button></Row>
            <Row label="Masked content shift detection" sub="Experimental in the competitor; stored, not built."><Toggle value={s.detectMaskedContentShift} onChange={(v) => set({ detectMaskedContentShift: v })} /></Row>
          </>
        )}

        {tab === 'shortcuts' && (
          <>
            <p className="note">Click a shortcut to reassign it, then press the new keys. ⌫ restores the default. Global shortcuts work from any app.</p>
            <h3>Recording</h3>
            {GLOBAL_SHORTCUTS.map((g) => <Row key={g.id} label={g.label} sub={g.sub}>{shortcutButton(g.id, effectiveGlobalShortcut(g.id, s.shortcutOverrides))}</Row>)}
            <h3>Editing</h3>
            {editorActions.map((a) => <Row key={a.id} label={a.label} sub="Editor">{shortcutButton(a.id, a.shortcut ?? '')}</Row>)}
          </>
        )}

        {tab === 'advanced' && (
          <>
            <Row label="Diagnostic email" sub="For contact purposes with the support team.">
              <input className={`input${isValidEmail(s.diagnosticEmail) ? '' : ' input--bad'}`} type="email" placeholder="you@example.com" value={s.diagnosticEmail} onChange={(e) => setSnap({ ...snap, diagnosticEmail: e.target.value })} onBlur={(e) => { if (isValidEmail(e.target.value)) set({ diagnosticEmail: e.target.value }); else setNote('Invalid email address') }} />
            </Row>
            <Row label="Share diagnostics info" sub="App version, macOS, Mac model, camera and mic names, permissions. Copied to the clipboard."><button type="button" className="sel" onClick={() => void window.recscene.settings.copyDiagnostics().then(() => setNote('Diagnostics information copied to the clipboard'))}>Copy report</button></Row>
            <Row label="Log level" sub="What the app writes to its log files."><Seg value={s.logLevel} options={[{ v: 0, l: 'Errors' }, { v: 1, l: 'Warnings' }, { v: 2, l: 'Info' }, { v: 3, l: 'Debug' }]} onChange={(v) => set({ logLevel: v })} /></Row>
            <Row label="Skip network certificate validation" sub="Only if the account check fails behind a corporate proxy. No network calls exist in this build."><Toggle value={s.bypassNetworkCertificateValidation} onChange={(v) => set({ bypassNetworkCertificateValidation: v })} /></Row>
            <Row label="Audio composer" sub="One engine: Web Audio mixes, the helper writes AAC."><button type="button" className="sel" disabled>Web Audio</button></Row>
            <Row label="Open app data folder" sub={s.appData.replace(/^\/Users\/[^/]+/, '~')}><button type="button" className="sel" onClick={() => void window.recscene.settings.openAppData()}>Open</button></Row>
            <Row label="Open audio library folder" sub="Tracks dropped there appear in the Audio panel."><button type="button" className="sel" onClick={() => void window.recscene.music.openLibraryFolder()}>Open</button></Row>
            <Row label="Changelog" sub="See what changed in the latest version."><button type="button" className="sel" onClick={() => void window.recscene.settings.openChangelog()}>Open changelog</button></Row>
            <Row label="Reset onboarding" sub="Shows the permissions welcome again on the next launch."><button type="button" className="sel" onClick={() => set({ onboardingDone: false })}>Reset onboarding flags</button></Row>
            <Row label="Reset preferences" sub="Back to the defaults, recording preferences included."><button type="button" className="sel sel--danger" onClick={() => { if (window.confirm(RESET_CONFIRM)) void window.recscene.settings.reset().then(() => { reload(); setNote('Preferences reset') }) }}>Reset preferences</button></Row>
          </>
        )}

        {tab === 'experimental' && (
          <>
            <Row label="Optimize preview rendering" sub="Pauses rendering when nothing has changed in the project. If the preview seems not to react to edits, try disabling this option."><Toggle value={s.optimizePreviewRendering} onChange={(v) => set({ optimizePreviewRendering: v })} /></Row>
            <Row label="Power saving mode" sub="Lower CPU/GPU and power usage. Might decrease the frame rate of the preview."><Toggle value={s.playbackEnergyMode === 'low-power'} onChange={(v) => set({ playbackEnergyMode: v ? 'low-power' : 'high-performance' })} /></Row>
            <Row label="Preview mode" sub="Quality: the preview looks exactly like the export. Performance: motion blur off, lower-quality scaling, higher FPS."><Seg value={s.playbackQualityMode} options={[{ v: 'high-quality', l: 'Quality' }, { v: 'high-speed', l: 'Performance' }]} onChange={(v) => set({ playbackQualityMode: v })} /></Row>
          </>
        )}

        {tab === 'account' && (
          <>
            <AccountTab />
            <h3>Updates</h3>
            <Row label="Updates" sub="Automatic updates arrive with signed builds."><button type="button" className="sel" onClick={() => void window.recscene.settings.checkForUpdates()}>Check for updates…</button></Row>
            <Row label="Beta updates" sub="Include beta builds when update checks exist."><Toggle value={s.betaUpdates} onChange={(v) => set({ betaUpdates: v })} /></Row>
          </>
        )}
      </main>
    </div>
  )
}
