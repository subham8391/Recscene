import { useEffect, useState } from 'react'
import { ASPECT_OPTIONS } from '@core/editor/aspect'
import { applyInset, GRADIENT_PRESETS, gradientCss, insetValue, isHexColor, randomWallpaper, setDirectional, toggleFavourite } from '@core/editor/background'
import { SPRING_FOCUSED, SPRING_SMOOTH } from '@core/editor/camera'
import { WALLPAPER_COLLECTIONS, WALLPAPERS } from '@core/editor/wallpapers'
import type { Project } from '@core/project'
import { frameLabel, framesFor, NO_MOCKUPS, type FrameFilter } from '@core/editor/deviceFrames'

interface Props {
  project: Project
  assetsUrl: string
  backgroundImageUrl: string | null
  onConfig: (patch: Partial<Project['config']>) => void
  onPickImage: () => void
  onDropImage: (file: File) => void
  onPasteImage: (bytes: ArrayBuffer) => void
}

const Slider = ({ id, label, value, min, max, step, format, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }): React.JSX.Element => (
  <div className="sec">
    <div className="hd"><label htmlFor={id}>{label}</label><span>{format(value)}</span></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
)

/** The Background & Screen panel from the Background board (specs 165–188). */
export function BackgroundPanel({ project, assetsUrl, backgroundImageUrl, onConfig, onPickImage, onDropImage, onPasteImage }: Props): React.JSX.Element {
  const [frameFilter, setFrameFilter] = useState<FrameFilter>('flexible')
  const frames = framesFor(project.recording.screen, frameFilter)
  const c = project.config
  const [collection, setCollection] = useState<string>(c.backgroundSystemName.split('/')[0] ?? 'macOS')
  const [favourites, setFavourites] = useState<string[]>([])
  const [hex, setHex] = useState(c.backgroundColor)
  const [shadowOpen, setShadowOpen] = useState(false)
  const wallpaperUrl = (file: string): string => `${assetsUrl}/backgrounds/${file}.svg`
  const inset = insetValue(c)
  const screenPreset = c.screenMovementSpring.stiffness === SPRING_SMOOTH.stiffness ? 'smooth' : c.screenMovementSpring.stiffness === SPRING_FOCUSED.stiffness ? 'focused' : null

  useEffect(() => {
    void window.recscene.prefs.get().then((raw) => setFavourites(Array.isArray(raw['favouriteBackgrounds']) ? (raw['favouriteBackgrounds'] as string[]) : []))
  }, [])
  const favourite = (name: string): void => {
    const next = toggleFavourite(favourites, name)
    setFavourites(next)
    void window.recscene.prefs.set({ favouriteBackgrounds: next })
  }
  const tiles = collection === 'Favourites' ? WALLPAPERS.filter((w) => favourites.includes(w.file)) : WALLPAPERS.filter((w) => w.collection === collection)

  return (
    <div className="panel-body" onPaste={(e) => { const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/')); const file = item?.getAsFile(); if (file) void file.arrayBuffer().then(onPasteImage) }}>
      <section className="sec">
        <h3>Background</h3>
        <div className="seg" role="group" aria-label="Background type">
          {(['system', 'gradient', 'color', 'image'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={c.backgroundType === t} onClick={() => onConfig({ backgroundType: t })}>{t === 'system' ? 'Wallpaper' : t === 'gradient' ? 'Gradient' : t === 'color' ? 'Colour' : 'Image'}</button>
          ))}
        </div>
      </section>

      {c.backgroundType === 'system' && (
        <section className="sec">
          <div className="tabs" role="tablist" aria-label="Wallpaper collections">
            {[...WALLPAPER_COLLECTIONS, 'Favourites'].map((name) => <button key={name} type="button" role="tab" aria-selected={collection === name} onClick={() => setCollection(name)}>{name}</button>)}
          </div>
          {tiles.length === 0 && <p className="note">You have no favourite backgrounds yet. To add a background to your favourites, right-click it.</p>}
          <div className="tiles" role="listbox" aria-label={`${collection} wallpapers`}>
            {tiles.map((w) => (
              <button key={w.file} type="button" role="option" aria-selected={c.backgroundSystemName === w.file} className={`tile${c.backgroundSystemName === w.file ? ' tile--on' : ''}`} title={w.name} style={{ backgroundImage: `url("${wallpaperUrl(w.file)}")` }} onClick={() => onConfig({ backgroundType: 'system', backgroundSystemName: w.file })} onContextMenu={(e) => { e.preventDefault(); favourite(w.file) }}>
                {favourites.includes(w.file) && <span className="tile__fav">★</span>}
                {(w.collection === 'Raycast' || w.collection === 'macOS') && <span className="tile__name">{w.name}</span>}
              </button>
            ))}
          </div>
          <div className="grid2">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onConfig({ backgroundType: 'system', backgroundSystemName: randomWallpaper(WALLPAPERS.map((w) => w.file)) })}>Pick random wallpaper</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onConfig({ backgroundType: 'system', backgroundSystemName: 'macOS/tahoe-light' })}>Use macOS wallpaper</button>
          </div>
          <p className="note">Right-click a tile to add it to Favourites.</p>
        </section>
      )}

      {c.backgroundType === 'gradient' && (
        <section className="sec">
          <div className="tiles tiles--small" role="listbox" aria-label="Gradient presets">
            {GRADIENT_PRESETS.map((g, i) => (
              <button key={i} type="button" role="option" aria-selected={gradientCss(g) === gradientCss(c.backgroundGradient)} className={`tile${gradientCss(g) === gradientCss(c.backgroundGradient) ? ' tile--on' : ''}`} style={{ backgroundImage: gradientCss(g) }} onClick={() => onConfig({ backgroundGradient: g })} />
            ))}
          </div>
          <div className="grid2">
            {[0, 1].map((i) => (
              <label key={i} className="field--inline">{i === 0 ? 'Start' : 'End'}<input type="color" value={c.backgroundGradient.stops[i]?.color ?? '#000000'} onChange={(e) => onConfig({ backgroundGradient: { ...c.backgroundGradient, stops: c.backgroundGradient.stops.map((s, j) => (j === i ? { ...s, color: e.target.value } : s)) } })} /></label>
            ))}
          </div>
        </section>
      )}

      {c.backgroundType === 'color' && (
        <section className="sec">
          <div className="grid2">
            <input className="input" value={hex} onChange={(e) => { setHex(e.target.value); if (isHexColor(e.target.value)) onConfig({ backgroundColor: e.target.value }) }} aria-label="Background colour hex" />
            <input type="color" value={isHexColor(c.backgroundColor) ? c.backgroundColor : '#000000'} onChange={(e) => { setHex(e.target.value); onConfig({ backgroundColor: e.target.value }) }} aria-label="Background colour" />
          </div>
          {!isHexColor(hex) && <p className="note">Unable to parse color from string: {hex}</p>}
        </section>
      )}

      {c.backgroundType === 'image' && (
        <section className="sec">
          <button type="button" className="drop" style={backgroundImageUrl ? { backgroundImage: `url("${backgroundImageUrl}")` } : undefined} onClick={onPickImage} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onDropImage(f) }}>
            {backgroundImageUrl ? '' : 'Drop an image or click to choose…'}
          </button>
          <p className="note">png or jpg, at least 150 × 150 px. Paste an image from the clipboard while this panel is focused.</p>
        </section>
      )}

      {(c.backgroundType === 'image' || c.backgroundType === 'system') && <Slider id="bblur" label="Background blur" value={c.backgroundBlur} min={0} max={100} step={1} format={String} onChange={(v) => onConfig({ backgroundBlur: v })} />}

      <Slider id="bpad" label="Padding" value={c.backgroundPaddingRatio} min={0} max={35} step={0.5} format={(v) => `${v}%`} onChange={(v) => onConfig({ backgroundPaddingRatio: v })} />
      <Slider id="brad" label="Rounded corners" value={c.windowBorderRadius} min={0} max={200} step={1} format={(v) => `${v} px`} onChange={(v) => onConfig({ windowBorderRadius: v })} />
      <Slider id="bins" label="Inset" value={inset} min={0} max={60} step={1} format={(v) => `${v} px`} onChange={(v) => onConfig(applyInset(c, v))} />
      {inset > 0 && (
        <div className="grid2">
          <label className="field--inline">Colour<input type="color" value={c.insetColor} onChange={(e) => onConfig({ insetColor: e.target.value })} /></label>
          <label className="field--inline">Opacity<input type="range" min={0} max={1} step={0.01} value={c.insetAlpha} onChange={(e) => onConfig({ insetAlpha: Number(e.target.value) })} /></label>
        </div>
      )}

      <section className="sec">
        <Slider id="bsi" label="Shadow" value={c.shadowIntensity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onConfig({ shadowIntensity: v })} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShadowOpen((o) => !o)}>{shadowOpen ? 'Hide' : 'Advanced shadow settings'}</button>
        {shadowOpen && (
          <>
            <Slider id="bsa" label="Angle" value={c.shadowAngle} min={0} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => onConfig({ shadowAngle: v })} />
            <Slider id="bsd" label="Distance" value={c.shadowDistance} min={0} max={100} step={1} format={(v) => `${v} px`} onChange={(v) => onConfig({ shadowDistance: v })} />
            <Slider id="bsb" label="Blur" value={c.shadowBlur} min={0} max={100} step={1} format={(v) => `${v} px`} onChange={(v) => onConfig({ shadowBlur: v })} />
            <label className="toggle"><span><b>Directional shadow</b><small>Casts along the angle and distance as a hard offset.</small></span><input type="checkbox" checked={c.shadowIsDirectional} onChange={(e) => onConfig(setDirectional(c, e.target.checked))} /></label>
          </>
        )}
      </section>

      <section className="sec">
        <h3>Output aspect ratio</h3>
        <select className="input" aria-label="Output aspect ratio" value={c.defaultOutputAspectRatio ?? 'auto'} onChange={(e) => onConfig({ defaultOutputAspectRatio: e.target.value === 'auto' ? null : e.target.value })}>
          {ASPECT_OPTIONS.map((o) => <option key={o.label} value={o.value ?? 'auto'}>{o.label}</option>)}
          <option value="3:4">Tall 3:4</option>
        </select>
        <label className="toggle"><span><b>Always keep zoomed in</b><small>Crops to the aspect ratio and follows the cursor.</small></span><input type="checkbox" checked={c.alwaysKeepZoomedIn} disabled={c.defaultOutputAspectRatio === null} onChange={(e) => onConfig({ alwaysKeepZoomedIn: e.target.checked })} /></label>
      </section>

      <section className="card">
        <label className="toggle"><span><b>Wrap in device mockup</b><small>Wrap recording in device mockup.</small></span><input type="checkbox" checked={c.enableDeviceMockup} onChange={(e) => onConfig({ enableDeviceMockup: e.target.checked })} /></label>
        {c.enableDeviceMockup && (
          <>
            <div className="seg" role="group" aria-label="Device frames filter">
              <button type="button" aria-pressed={frameFilter === 'perfect'} title="Show only device frames that precisely match your recording size." onClick={() => setFrameFilter('perfect')}>Perfect</button>
              <button type="button" aria-pressed={frameFilter === 'flexible'} title="Show all device frames, even those that don't precisely match your recording size." onClick={() => setFrameFilter('flexible')}>Flexible</button>
            </div>
            {frames.length === 0 ? (
              <small className="note">{NO_MOCKUPS}</small>
            ) : (
              <select className="input" aria-label="Device frames" value={c.deviceFrameKey ?? ''} onChange={(e) => onConfig({ deviceFrameKey: e.target.value || null })}>
                <option value="">No frame</option>
                {frames.map((f) => <option key={f.key} value={f.key}>{frameLabel(f)}</option>)}
              </select>
            )}
            <label className="toggle"><span><b>Adjust device size</b><small>Stretch or shrink the device mockup to match the recording size.</small></span><input type="checkbox" checked={c.adjustDeviceFrameToRecordingSize} onChange={(e) => onConfig({ adjustDeviceFrameToRecordingSize: e.target.checked })} /></label>
          </>
        )}
      </section>

      <section className="sec">
        <h3>Screen animation style</h3>
        <div className="seg" role="group" aria-label="Screen animation style">
          <button type="button" aria-pressed={screenPreset === 'focused'} title="Animation stabilizes quickly making it easier to follow and read the content" onClick={() => onConfig({ screenMovementSpring: { ...SPRING_FOCUSED } })}>Focused</button>
          <button type="button" aria-pressed={screenPreset === 'smooth'} title="Animation is more fluid. Great for more creative content not focused on reading" onClick={() => onConfig({ screenMovementSpring: { ...SPRING_SMOOTH } })}>Smooth</button>
        </div>
      </section>
    </div>
  )
}
