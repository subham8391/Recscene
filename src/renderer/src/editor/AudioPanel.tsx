import { useEffect, useRef, useState } from 'react'
import { backgroundLabel, backgroundSource, bundledName, libraryName, MIC_MODES, MUSIC_CATEGORIES, MUTED_MIC, MUTED_SYSTEM, type AudioConfig, type MusicTrack } from '@core/editor/audio'
import type { CursorConfig } from '@core/editor/cursor'

interface Props {
  config: AudioConfig & CursorConfig
  hasMic: boolean
  /** Specs 221, 292: how many voice-overs the project has. */
  voiceOverCount: number
  assetsUrl: string
  libraryUrl: string
  /** Media url for a file inside the project bundle. */
  projectUrl: (file: string) => Promise<string | null>
  onConfig: (patch: Partial<AudioConfig & CursorConfig>) => void
  onAction: (id: string) => void
}

/** The Audio inspector from the Audio board (specs 213–220, 14). */
export function AudioPanel({ config, hasMic, voiceOverCount, assetsUrl, libraryUrl, projectUrl, onConfig, onAction }: Props): React.JSX.Element {
  const [catalogue, setCatalogue] = useState<MusicTrack[]>([])
  const [library, setLibrary] = useState<string[]>([])
  const [genre, setGenre] = useState<string>('All')
  const [previewing, setPreviewing] = useState<string | null>(null)
  const preview = useRef<HTMLAudioElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    void window.recscene.music.catalogue().then(setCatalogue)
    void window.recscene.music.library().then(setLibrary)
    return () => {
      preview.current?.pause()
    }
  }, [])

  const urlFor = async (name: string): Promise<string | null> => {
    const src = backgroundSource(name)
    if (!src) return null
    if (src.kind === 'bundled') return `${assetsUrl}/music/${src.id}.m4a`
    if (src.kind === 'library') return `${libraryUrl}/${encodeURIComponent(src.file)}`
    return projectUrl(src.file)
  }

  const togglePreview = async (name: string): Promise<void> => {
    if (previewing === name) {
      preview.current?.pause()
      setPreviewing(null)
      return
    }
    const url = await urlFor(name)
    if (!url) return
    preview.current?.pause()
    const a = new Audio(url)
    a.volume = 0.5
    a.onended = () => setPreviewing(null)
    preview.current = a
    setPreviewing(name)
    void a.play().catch(() => setPreviewing(null))
  }

  const inUse = config.backgroundAudioFileName
  const tracks = catalogue.filter((t) => genre === 'All' || t.category === genre)
  const dropFile = (file: File): void => {
    void window.recscene.music.importFile(file).then((r) => onConfig({ backgroundAudioFileName: r.file }))
  }

  return (
    <div className="panel-body" onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) dropFile(f) }}>
      <section className="sec">
        <div className="hd"><h3>Microphone</h3><label className="toggle toggle--inline"><span>Mute</span><input type="checkbox" checked={config.muteMicrophone} onChange={(e) => onConfig({ muteMicrophone: e.target.checked })} /></label></div>
        {!hasMic && <p className="note">No microphone was recorded for this project.</p>}
        {config.muteMicrophone && <p className="note">{MUTED_MIC}</p>}
        <div className="modes" role="radiogroup" aria-label="Microphone audio mode">
          {MIC_MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={config.microphoneMode === m.id} className={`mode${config.microphoneMode === m.id ? ' mode--on' : ''}`} disabled={!hasMic} onClick={() => onConfig({ microphoneMode: m.id })}>
              <b>{m.name}</b><small>{m.sub}</small>
            </button>
          ))}
        </div>
        <label className="toggle"><span><b>Stereo mode</b><small>When enabled, the microphone is in stereo, if disabled it will be mono.</small></span><input type="checkbox" checked={config.microphoneInStereoMode} onChange={(e) => onConfig({ microphoneInStereoMode: e.target.checked })} /></label>
      </section>

      <section className="sec">
        <div className="hd"><h3>System audio</h3><span>{config.muteSystemAudio ? 'Muted' : `${Math.round(config.systemAudioVolume * 100)}%`}</span></div>
        <input type="range" min={0} max={1} step={0.01} value={config.systemAudioVolume} aria-label="System audio volume" disabled={config.muteSystemAudio} onChange={(e) => onConfig({ systemAudioVolume: Number(e.target.value) })} />
        <label className="toggle"><span><b>Mute system audio</b><small>{config.muteSystemAudio ? MUTED_SYSTEM : 'Recorded with the screen when system audio was on.'}</small></span><input type="checkbox" checked={config.muteSystemAudio} onChange={(e) => onConfig({ muteSystemAudio: e.target.checked })} /></label>
        <div className="hd"><span className="muted">External device audio</span><span className="muted">Muted</span></div>
        <p className="note">iPhone or iPad audio when recording a device. Device recording is not built yet.</p>
      </section>

      <section className="sec">
        <div className="hd"><h3>Voiceovers</h3><span className="muted">{voiceOverCount === 0 ? 'None yet' : `${voiceOverCount} recorded`}</span></div>
        <p className="note">Narrate after recording: a voiceover starts at the playhead, plays the video along and lands on the Voiceovers track.</p>
        <div className="grid2">
          <button type="button" className="btn btn--ghost" onClick={() => onAction('recordVoiceover')}>Record voiceover…</button>
          <button type="button" className="btn btn--ghost" disabled={voiceOverCount === 0} onClick={() => onAction('removeAllVoiceovers')}>Remove all voiceovers</button>
        </div>
      </section>

      <section className={`sec${dragOver ? ' sec--drop' : ''}`}>
        <div className="hd"><h3>Background music</h3><label className="toggle toggle--inline"><span>Mute</span><input type="checkbox" checked={config.muteBackgroundAudio} disabled={!inUse} onChange={(e) => onConfig({ muteBackgroundAudio: e.target.checked })} /></label></div>
        <div className="seg seg--wrap" role="group" aria-label="Music genre">
          {['All', ...MUSIC_CATEGORIES].map((g) => <button key={g} type="button" aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</button>)}
        </div>
        <div className="tracks">
          {tracks.map((t) => {
            const name = bundledName(t.id)
            return (
              <div key={t.id} className={`track${inUse === name ? ' track--on' : ''}`}>
                <button type="button" className="track__play" aria-label={`${previewing === name ? 'Stop' : 'Play'} ${t.name}`} onClick={() => void togglePreview(name)}>{previewing === name ? '❚❚' : '▶'}</button>
                <button type="button" className="track__text" onClick={() => onConfig({ backgroundAudioFileName: name, muteBackgroundAudio: false })}>
                  <span className="track__name">{t.name}</span><span className="muted">{t.category} · {Math.round(t.durationMs / 1000)} s</span>
                </button>
                {inUse === name && <span className="chip">In use</span>}
              </div>
            )
          })}
          {library.map((f) => {
            const name = libraryName(f)
            return (
              <div key={f} className={`track${inUse === name ? ' track--on' : ''}`}>
                <button type="button" className="track__play" aria-label={`${previewing === name ? 'Stop' : 'Play'} ${f}`} onClick={() => void togglePreview(name)}>{previewing === name ? '❚❚' : '▶'}</button>
                <button type="button" className="track__text" onClick={() => onConfig({ backgroundAudioFileName: name, muteBackgroundAudio: false })}>
                  <span className="track__name">{f.replace(/\.[^.]+$/, '')}</span><span className="muted">Library</span>
                </button>
                {inUse === name && <span className="chip">In use</span>}
              </div>
            )
          })}
          {inUse && backgroundSource(inUse)?.kind === 'project' && (
            <div className="track track--on">
              <button type="button" className="track__play" aria-label="Play own file" onClick={() => void togglePreview(inUse)}>{previewing === inUse ? '❚❚' : '▶'}</button>
              <span className="track__text"><span className="track__name">{backgroundLabel(inUse, catalogue)}</span><span className="muted">Own file in the project</span></span>
              <span className="chip">In use</span>
            </div>
          )}
        </div>
        {inUse && !config.muteBackgroundAudio && (
          <>
            <div className="hd"><span>Music volume</span><span>{Math.round(config.backgroundAudioVolume * 100)}%</span></div>
            <input type="range" min={0} max={1} step={0.01} value={config.backgroundAudioVolume} aria-label="Background audio volume" onChange={(e) => onConfig({ backgroundAudioVolume: Number(e.target.value) })} />
          </>
        )}
        <div className="grid2">
          <button type="button" className="btn btn--ghost" onClick={() => void window.recscene.music.pickFile().then((r) => r && onConfig({ backgroundAudioFileName: r.file, muteBackgroundAudio: false }))}>Add audio file…</button>
          <button type="button" className="btn btn--ghost" onClick={() => { onAction('openAudioLibraryFolder'); void window.recscene.music.library().then(setLibrary) }}>Open library folder</button>
          {inUse && <button type="button" className="btn btn--ghost btn--danger" onClick={() => onConfig({ backgroundAudioFileName: null })}>Remove background audio</button>}
        </div>
        <p className="note">{catalogue.length} royalty-free tracks built in. Drop an mp3 or m4a on the panel to use your own. {library.length === 0 ? 'Add background audio tracks to your library folder to access them here.' : ''}</p>
      </section>

      <section className="card">
        <label className="toggle"><span><b>Click sound</b><small>{config.clickSoundEffect ? `${config.clickSoundEffect === 'apple-magic-mouse' ? 'Apple Magic Mouse' : 'Logitech MX Master'} · ${Math.round(config.clickSoundEffectVolume * 100)}%` : 'Off · pick a set in the Cursor panel'}</small></span><input type="checkbox" checked={!!config.clickSoundEffect} onChange={(e) => onConfig({ clickSoundEffect: e.target.checked ? 'apple-magic-mouse' : null })} /></label>
        <label className="toggle"><span><b>Keep audio above 2× speed</b><small>Off: sped-up parts are silent.</small></span><input type="checkbox" checked={config.keepAudioAboveSpeed} onChange={(e) => onConfig({ keepAudioAboveSpeed: e.target.checked })} /></label>
        <div className="hd"><span>Master volume</span><span>{Math.round(config.audioVolume * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={config.audioVolume} aria-label="Master volume" onChange={(e) => onConfig({ audioVolume: Number(e.target.value) })} />
      </section>
    </div>
  )
}
