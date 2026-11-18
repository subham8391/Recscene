import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { fitBox, outputRatio, type Box } from '@core/editor/aspect'
import { gradientCss, screenLayout, shadowCss, withAlpha } from '@core/editor/background'
import { cameraAtRest, cameraStep, cameraViewport, cursorAt, targetViewport, viewportTransform, type CameraState, type CursorSample } from '@core/editor/camera'
import { zoomAt } from '@core/editor/zooms'
import { cameraMotionAtRest, cameraMotionStep, cameraTimeMs, effectiveLayout, motionBox, placeCamera, type CameraMotion } from '@core/editor/cameraLayout'
import { activeMask, type MaskRegion } from '@core/editor/masks'
import type { Project } from '@core/project'
import { CursorLayer } from './CursorLayer'
import { MaskLayer } from './MaskLayer'
import { buildMicChain, peakOf } from './micGraph'
import { ShortcutLayer } from './ShortcutLayer'
import { CaptionLayer } from './CaptionLayer'
import { DeviceFrameLayer } from './DeviceFrame'
import { frameByKey, layoutFrame } from '@core/editor/deviceFrames'
import { screenBlurPx } from '@core/editor/camera'
import type { CursorTypeChange } from '@core/editor/cursor'
import { buildCues, CUE_DEFAULTS, ONE_LINE } from '@core/editor/captions'
import { shortcutEvents } from '@core/editor/shortcuts'
import { drawMask } from './maskDraw'

export interface StageHandle {
  /** Renders the current frame at `height` px into a PNG (specs 77–78). */
  frameAsPng: (height: number) => Promise<ArrayBuffer>
}

interface Props {
  project: Project
  screenUrl: string
  micUrl?: string
  /** Spec 8: the webcam track, drawn per the camera layouts (148–164). */
  cameraUrl?: string
  /** Source time of the frame to show. */
  sourceMs: number
  playing: boolean
  /** Transport speed × clip speed. */
  rate: number
  /** Gains for the current moment (specs 213–220): microphone, system audio, background music, master. */
  audio: { mic: number; system: number; music: number; master: number }
  /** Spec 217's mode for the microphone chain. */
  micMode: 'off' | 'standard' | 'loud' | 'noise-reduction'
  /** Background music url (specs 218–219), looping from project start in output time. */
  musicUrl: string | null
  /** Output time, for the music loop. */
  outputMs: number
  previewMaxHeight: number
  /** Cursor samples for zooms that follow the mouse (spec 106) and the drawn cursor (125–147). */
  cursor: CursorSample[]
  /** Specs 134–136. */
  cursorTypes: CursorTypeChange[]
  /** Spec 70: performance mode turns the screen's motion blur off in the preview. */
  previewQuality: 'high-quality' | 'high-speed'
  /** Spec 71: a social app mock over the preview, never exported. */
  reelMode: 'instagram' | 'tiktok' | null
  /** Source range of the recording the cursor rules apply to. */
  sourceDurationMs: number
  clipState: { hidden: boolean; smooth: boolean }
  clickSoundUrl: (kind: 'down' | 'up') => string | null
  /** Media url of the project's own background image, when the type is image. */
  backgroundImageUrl: string | null
  assetsUrl: string
  /** Masks (specs 189–198): the selected one shows its drag rectangle. */
  selectedMaskId: string | null
  onMaskRegionPreview: (id: string, region: MaskRegion) => void
  onMaskRegionCommit: (id: string, region: MaskRegion) => void
  onSelectMask: (id: string | null) => void
  onDuration?: (ms: number) => void
  /** Reports where the recording sits on screen, for overlays such as the crop tool. */
  onBox?: (box: Box) => void
  children?: React.ReactNode
}

/**
 * The preview canvas (spec 48): the output box in the project's aspect ratio
 * with the (cropped) recording contained inside. Effects arrive with their specs.
 */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ project, screenUrl, micUrl, cameraUrl, sourceMs, playing, rate, audio: gains, micMode, musicUrl, outputMs, previewMaxHeight, cursor, cursorTypes, previewQuality, reelMode, sourceDurationMs, clipState, clickSoundUrl, backgroundImageUrl, assetsUrl, selectedMaskId, onMaskRegionPreview, onMaskRegionCommit, onSelectMask, onDuration, onBox, children }, ref) {
  const live = useRef({ sourceMs, playing, rate, clipState, innerWidth: 0 })
  useEffect(() => {
    live.current = { ...live.current, sourceMs, playing, rate, clipState }
  })
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const music = useRef<HTMLAudioElement>(null)
  const graph = useRef<{ ctx: AudioContext; source: MediaElementAudioSourceNode; chainOut: AudioNode | null; volume: GainNode } | null>(null)
  const [micPeak, setMicPeak] = useState<number | null>(null)
  const cameraLayer = useRef<HTMLDivElement>(null)
  const camVideo = useRef<HTMLVideoElement>(null)
  const camLayer = useRef<HTMLDivElement>(null)
  const camMotion = useRef<CameraMotion | null>(null)
  const camera = useRef<CameraState>(cameraAtRest({ center: { x: 0.5, y: 0.5 }, scale: 1 }))
  const latest = useRef({ sourceMs, zooms: project.zooms, spring: project.config.screenMovementSpring, cursor, config: project.config, layouts: project.layouts, frame: { width: 0, height: 0 }, cameraFrame: project.recording.camera ?? null, hasCamera: !!cameraUrl, blurOn: previewQuality === 'high-quality' })
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    latest.current = { ...latest.current, sourceMs, zooms: project.zooms, spring: project.config.screenMovementSpring, cursor, config: project.config, layouts: project.layouts, cameraFrame: project.recording.camera ?? null, hasCamera: !!cameraUrl, blurOn: previewQuality === 'high-quality' }
  })

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const v = video.current
    const a = audio.current
    const c = camVideo.current
    if (!v) return
    const target = sourceMs / 1000
    const camTarget = cameraTimeMs(sourceMs, project.config) / 1000
    const forward = playing && rate > 0
    for (const el of [v, a, c]) {
      if (!el) continue
      const t = el === c ? camTarget : target
      if (forward) {
        el.playbackRate = Math.min(16, Math.max(0.0625, rate))
        if (Math.abs(el.currentTime - t) > 0.3) el.currentTime = t
        if (el.paused) void el.play().catch(() => undefined)
      } else {
        if (!el.paused) el.pause()
        if (Math.abs(el.currentTime - t) > 0.001) el.currentTime = t
      }
    }
    const micLevel = gains.mic * gains.master
    if (a) {
      if (graph.current) graph.current.volume.gain.value = micLevel
      else a.volume = Math.max(0, Math.min(1, micLevel))
      a.muted = micLevel <= 0
    }
    const systemLevel = gains.system * gains.master
    v.volume = Math.max(0, Math.min(1, systemLevel))
    v.muted = systemLevel <= 0
    const m = music.current
    if (m) {
      const musicLevel = gains.music * gains.master
      m.volume = Math.max(0, Math.min(1, musicLevel))
      m.muted = musicLevel <= 0
      const dur = Number.isFinite(m.duration) && m.duration > 0 ? m.duration : null
      const mt = dur ? (outputMs / 1000) % dur : outputMs / 1000
      if (forward) {
        m.playbackRate = Math.min(16, Math.max(0.0625, rate))
        if (Math.abs(m.currentTime - mt) > 0.3) m.currentTime = mt
        if (m.paused) void m.play().catch(() => undefined)
      } else {
        if (!m.paused) m.pause()
        if (Math.abs(m.currentTime - mt) > 0.05) m.currentTime = mt
      }
    }
  }, [sourceMs, playing, rate, gains, project.config, outputMs])

  // Spec 217: the microphone plays through a clean-up chain built from the mode; its peak drives the normalisation.
  useEffect(() => {
    if (!micUrl) return
    let cancelled = false
    void (async () => {
      try {
        const data = await (await fetch(micUrl)).arrayBuffer()
        const ctx = new OfflineAudioContext(1, 1, 48_000)
        const buf = await ctx.decodeAudioData(data)
        if (!cancelled) setMicPeak(peakOf(buf))
      } catch {
        if (!cancelled) setMicPeak(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [micUrl])
  useEffect(() => {
    const a = audio.current
    if (!a) return
    let g = graph.current
    if (!g) {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(a)
      const volume = ctx.createGain()
      volume.connect(ctx.destination)
      g = { ctx, source, chainOut: null, volume }
      graph.current = g
    }
    g.source.disconnect()
    g.chainOut?.disconnect()
    const chain = buildMicChain(g.ctx, micMode, micPeak)
    g.source.connect(chain.input)
    chain.output.connect(g.volume)
    g.chainOut = chain.output
  }, [micMode, micPeak, micUrl])

  // The camera (specs 106, 112, 115, 123–124): every frame, spring towards the zoom target and apply the transform.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number): void => {
      const dt = now - last
      last = now
      const { sourceMs: ms, zooms, spring, cursor: samples } = latest.current
      const target = targetViewport(ms, zooms, (t) => cursorAt(samples, t))
      const active = zoomAt(zooms, ms)
      camera.current = cameraStep(camera.current, target, dt, spring, !!active?.hasInstantAnimation)
      const el = cameraLayer.current
      if (el) {
        const v = cameraViewport(camera.current)
        el.style.transform = viewportTransform(v, el.clientWidth, el.clientHeight)
        // Specs 146–147: the screen blurs with pans and zoom changes (off in performance mode, spec 70).
        const cfg = latest.current.config
        const blur = latest.current.blurOn ? screenBlurPx(camera.current, el.clientWidth, cfg.motionBlurAmount, cfg.motionBlurScreenMoveAmount, cfg.motionBlurScreenZoomAmount) : 0
        el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : ''
      }
      // The webcam box (specs 148–164): spring between layouts, shrink during zooms, fade when hidden.
      const lay = camLayer.current
      const { config, layouts, frame: f, cameraFrame, hasCamera } = latest.current
      if (lay && f.width > 0) {
        const eff = effectiveLayout(config, layouts, ms)
        const placed = hasCamera && cameraFrame ? placeCamera({ frame: f, cameraFrame, type: eff.type, cameraSize: eff.cameraSize, position: eff.cameraPositionPoint, config, zoomed: !!active && !active.isDisabled, paddingRatio: config.backgroundPaddingRatio / 100 }) : null
        const box = placed?.camera ?? null
        camMotion.current = camMotion.current ? cameraMotionStep(camMotion.current, box, dt) : cameraMotionAtRest(box, f)
        const b = motionBox(camMotion.current)
        const radius = placed ? config.cameraRoundness * Math.min(b.width, b.height) : 0
        lay.style.left = `${b.x}px`
        lay.style.top = `${b.y}px`
        lay.style.width = `${b.width}px`
        lay.style.height = `${b.height}px`
        lay.style.opacity = String(Math.max(0, Math.min(1, camMotion.current.alpha.value)))
        lay.style.borderRadius = `${radius}px`
        lay.style.visibility = b.width < 1 ? 'hidden' : 'visible'
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const crop = project.config.recordingCrop
  const rec = project.recording.screen
  const cropped = crop ? { width: rec.width * crop.width, height: rec.height * crop.height } : rec
  const ratio = outputRatio(project.config.defaultOutputAspectRatio, cropped)
  const maxHeight = Math.min(size.height, previewMaxHeight)
  const output: Box = fitBox(size.width, maxHeight, ratio)
  output.y += (size.height - maxHeight) / 2
  latest.current.frame = { width: output.width, height: output.height }
  // Shadow, inset and corner values are given at output scale (specs 174–183); the nominal output is 1920 px wide.
  const outScale = output.width / 1920
  // A split layout (Camera board) gives the screen only part of the frame; the camera box itself is animated per frame.
  const camRec = project.recording.camera
  const eff = effectiveLayout(project.config, project.layouts, sourceMs)
  const region: Box = cameraUrl && camRec && eff.type === 'split'
    ? placeCamera({ frame: output, cameraFrame: camRec, type: 'split', cameraSize: eff.cameraSize, position: eff.cameraPositionPoint, config: project.config, zoomed: false, paddingRatio: project.config.backgroundPaddingRatio / 100 }).screen
    : { x: 0, y: 0, width: output.width, height: output.height }
  const laid0 = screenLayout({ width: region.width, height: region.height }, cropped, project.config.backgroundPaddingRatio, project.config.insetPadding, outScale)
  const laid = { screen: { ...laid0.screen, x: laid0.screen.x + region.x, y: laid0.screen.y + region.y }, outer: { ...laid0.outer, x: laid0.outer.x + region.x, y: laid0.outer.y + region.y } }
  // Specs 185–187: a device frame sits in the padded area and the recording takes its screen rectangle.
  const deviceFrame = project.config.enableDeviceMockup ? frameByKey(project.config.deviceFrameKey) : null
  const frameLayout = deviceFrame ? layoutFrame(deviceFrame, { width: laid.screen.width, height: laid.screen.height }, cropped, project.config.adjustDeviceFrameToRecordingSize) : null
  const inner: Box = frameLayout
    ? { x: output.x + laid.screen.x + frameLayout.screen.x, y: output.y + laid.screen.y + frameLayout.screen.y, width: frameLayout.screen.width, height: frameLayout.screen.height }
    : { x: output.x + laid.screen.x, y: output.y + laid.screen.y, width: laid.screen.width, height: laid.screen.height }
  const outer: Box = { x: output.x + laid.outer.x, y: output.y + laid.outer.y, width: laid.outer.width, height: laid.outer.height }
  const bg = project.config
  const backgroundStyle: React.CSSProperties =
    bg.backgroundType === 'color' ? { background: bg.backgroundColor }
    : bg.backgroundType === 'gradient' ? { backgroundImage: gradientCss(bg.backgroundGradient) }
    : bg.backgroundType === 'image' && backgroundImageUrl ? { backgroundImage: `url("${backgroundImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : bg.backgroundType === 'image' ? { background: '#111' }
    : { backgroundImage: `url("${assetsUrl}/backgrounds/${bg.backgroundSystemName}.svg")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  const blurPx = (bg.backgroundType === 'image' || bg.backgroundType === 'system') && bg.backgroundBlur > 0 ? (bg.backgroundBlur / 100) * output.width * 0.08 : 0
  const radius = bg.windowBorderRadius * outScale
  // The video is scaled so the crop region fills the inner box.
  const videoWidth = crop ? inner.width / crop.width : inner.width
  const videoHeight = crop ? inner.height / crop.height : inner.height
  const videoLeft = inner.x - output.x - (crop ? crop.x * videoWidth : 0)
  const videoTop = inner.y - output.y - (crop ? crop.y * videoHeight : 0)

  useEffect(() => {
    live.current.innerWidth = inner.width
    onBox?.({ x: inner.x, y: inner.y, width: inner.width, height: inner.height })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inner.x, inner.y, inner.width, inner.height])

  useImperativeHandle(ref, () => ({
    frameAsPng: async (height: number) => {
      const v = video.current
      if (!v || v.videoWidth === 0) throw new Error('No frame to copy')
      const canvas = document.createElement('canvas')
      canvas.height = height
      canvas.width = Math.round(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Background (spec 165–173) at export scale.
      const exportScale = canvas.width / 1920
      const lay = screenLayout({ width: canvas.width, height: canvas.height }, cropped, project.config.backgroundPaddingRatio, project.config.insetPadding, exportScale)
      const box = lay.screen
      if (bg.backgroundType === 'color') {
        ctx.fillStyle = bg.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else if (bg.backgroundType === 'gradient') {
        const g = bg.backgroundGradient
        const grad = ctx.createLinearGradient(g.start.x * canvas.width, g.start.y * canvas.height, g.end.x * canvas.width, g.end.y * canvas.height)
        for (const stop of g.stops) grad.addColorStop(Math.max(0, Math.min(1, stop.at)), stop.color)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        const url = bg.backgroundType === 'image' ? backgroundImageUrl : `${assetsUrl}/backgrounds/${bg.backgroundSystemName}.svg`
        if (url) {
          const img = await new Promise<HTMLImageElement | null>((resolve) => {
            const i = new Image()
            i.crossOrigin = 'anonymous'
            i.onload = () => resolve(i)
            i.onerror = () => resolve(null)
            i.src = url
          })
          if (img) {
            const s = Math.max(canvas.width / img.width, canvas.height / img.height)
            ctx.save()
            if (bg.backgroundBlur > 0) ctx.filter = `blur(${((bg.backgroundBlur / 100) * canvas.width * 0.08).toFixed(1)}px)`
            ctx.drawImage(img, (canvas.width - img.width * s) / 2, (canvas.height - img.height * s) / 2, img.width * s, img.height * s)
            ctx.restore()
          }
        }
      }
      const rad = bg.windowBorderRadius * exportScale
      if (lay.outer.width > box.width || lay.outer.height > box.height) {
        ctx.fillStyle = withAlpha(bg.insetColor, bg.insetAlpha)
        ctx.beginPath()
        ctx.roundRect(lay.outer.x, lay.outer.y, lay.outer.width, lay.outer.height, rad + Math.max(0, lay.screen.x - lay.outer.x))
        ctx.fill()
      }
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(box.x, box.y, box.width, box.height, rad)
      ctx.clip()
      const sx = crop ? crop.x * v.videoWidth : 0
      const sy = crop ? crop.y * v.videoHeight : 0
      const sw = crop ? crop.width * v.videoWidth : v.videoWidth
      const sh = crop ? crop.height * v.videoHeight : v.videoHeight
      const cam = cameraViewport(camera.current)
      // Zoom the exported frame the way the stage shows it: scale around the viewport centre.
      ctx.save()
      ctx.translate(box.x + box.width / 2 - cam.center.x * box.width * cam.scale, box.y + box.height / 2 - cam.center.y * box.height * cam.scale)
      ctx.scale(cam.scale, cam.scale)
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, box.width, box.height)
      const am = activeMask(project.masks, sourceMs)
      if (am) drawMask(ctx, am, v, crop, { width: box.width, height: box.height }, canvas.width)
      ctx.restore()
      ctx.restore()
      // Webcam (148–164) at the box the stage shows right now, scaled to the export frame.
      const cv = camVideo.current
      const motion = camMotion.current
      if (cv && cv.videoWidth > 0 && motion && motion.alpha.value > 0.01 && camRec) {
        const k = canvas.width / output.width
        const b = motionBox(motion)
        const cb = { x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k }
        if (cb.width > 1 && cb.height > 1) {
          const placed = placeCamera({ frame: { width: canvas.width, height: canvas.height }, cameraFrame: camRec, type: eff.type, cameraSize: eff.cameraSize, position: eff.cameraPositionPoint, config: project.config, zoomed: false, paddingRatio: project.config.backgroundPaddingRatio / 100 })
          const cr = placed.crop
          const sxc = cr.x * cv.videoWidth
          const syc = cr.y * cv.videoHeight
          const swc = cr.width * cv.videoWidth
          const shc = cr.height * cv.videoHeight
          // object-fit: cover
          const scale = Math.max(cb.width / swc, cb.height / shc)
          const dw = swc * scale
          const dh = shc * scale
          ctx.save()
          ctx.globalAlpha = Math.min(1, motion.alpha.value)
          ctx.beginPath()
          ctx.roundRect(cb.x, cb.y, cb.width, cb.height, project.config.cameraRoundness * Math.min(cb.width, cb.height))
          ctx.clip()
          if (project.config.mirrorCamera) {
            ctx.translate(cb.x + cb.width, 0)
            ctx.scale(-1, 1)
            ctx.translate(-cb.x, 0)
          }
          ctx.drawImage(cv, sxc, syc, swc, shc, cb.x + (cb.width - dw) / 2, cb.y + (cb.height - dh) / 2, dw, dh)
          ctx.restore()
        }
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not encode the frame')
      return blob.arrayBuffer()
    }
  }))

  return (
    <div ref={host} className="stage__canvas">
      <div className="stage__output" style={{ left: output.x, top: output.y, width: output.width, height: output.height }}>
        <div className="stage__bg" style={{ ...backgroundStyle, filter: blurPx > 0 ? `blur(${blurPx.toFixed(1)}px)` : undefined }} />
        {(outer.width > inner.width || outer.height > inner.height) && (
          <div className="stage__inset" style={{ left: outer.x - output.x, top: outer.y - output.y, width: outer.width, height: outer.height, background: withAlpha(bg.insetColor, bg.insetAlpha), borderRadius: radius + (inner.x - outer.x) }} />
        )}
        {deviceFrame && frameLayout ? (
          <DeviceFrameLayer frame={deviceFrame} layout={frameLayout} offset={{ x: laid.screen.x, y: laid.screen.y }} shadow={shadowCss(bg, outScale)} />
        ) : (
          <div className="stage__shadow" style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height, borderRadius: radius, boxShadow: shadowCss(bg, outScale) }} />
        )}
        <div className="stage__inner" style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height, borderRadius: frameLayout ? frameLayout.screenRadius : radius }}>
          <div ref={cameraLayer} className="stage__camera">
            <video ref={video} className="stage__video" src={screenUrl} crossOrigin="anonymous" playsInline preload="auto" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }} onLoadedMetadata={(e) => onDuration?.(Math.round(e.currentTarget.duration * 1000))} />
            <div className="stage__cursorhost stage__maskhost" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }}>
              <MaskLayer
                masks={project.masks}
                active={activeMask(project.masks, sourceMs)}
                selectedId={selectedMaskId}
                frame={{ width: videoWidth, height: videoHeight }}
                outputWidth={output.width}
                onRegionPreview={onMaskRegionPreview}
                onRegionCommit={onMaskRegionCommit}
                onSelect={onSelectMask}
              />
            </div>
            <div className="stage__cursorhost" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }}>
              <CursorLayer
                samples={cursor}
                cursorTypes={cursorTypes}
                clicks={project.recording.clicks}
                config={project.config}
                recording={project.recording.screen}
                startMs={0}
                endMs={sourceDurationMs}
                sourceMs={() => live.current.sourceMs}
                clipState={() => live.current.clipState}
                playing={() => live.current.playing && live.current.rate > 0 && live.current.rate <= 2}
                boxWidth={() => live.current.innerWidth}
                soundUrl={clickSoundUrl}
              />
            </div>
          </div>
          <ShortcutLayer events={shortcutEvents(project.recording.keys, project.config)} config={project.config} sourceMs={sourceMs} frame={{ width: inner.width, height: inner.height }} />
        </div>
        {reelMode && (
          <div className={`reel reel--${reelMode}`} aria-hidden="true">
            <div className="reel__top">{reelMode === 'instagram' ? <><span className="reel__title">Reels</span><span className="reel__icon">◎</span></> : <><span>Following</span><span className="reel__on">For You</span></>}</div>
            <div className="reel__side"><span>♡</span><span>💬</span><span>➤</span><span>⋯</span></div>
            <div className="reel__bottom"><span className="reel__user">@recscene</span><span className="reel__caption">Record the screen. Make it a scene.</span></div>
          </div>
        )}
        {project.transcript && (
          <CaptionLayer cues={buildCues(project.transcript.words, project.config.captionOneLine ? ONE_LINE : CUE_DEFAULTS)} config={project.config} sourceMs={sourceMs} screen={{ x: inner.x - output.x, y: inner.y - output.y, width: inner.width, height: inner.height }} output={{ width: output.width, height: output.height }} />
        )}
        <div style={{ display: 'none' }}>
        </div>
        {cameraUrl && camRec && (
          <div ref={camLayer} className="stage__cam" data-layout={eff.type} style={{ visibility: 'hidden' }}>
            <video ref={camVideo} className={`stage__cam__video${project.config.mirrorCamera ? ' stage__cam__video--mirror' : ''}`} src={cameraUrl} crossOrigin="anonymous" muted playsInline preload="auto" />
          </div>
        )}
        {micUrl && <audio ref={audio} src={micUrl} preload="auto" crossOrigin="anonymous" />}
        {musicUrl && <audio ref={music} src={musicUrl} preload="auto" loop />}
      </div>
      {children}
    </div>
  )
})
