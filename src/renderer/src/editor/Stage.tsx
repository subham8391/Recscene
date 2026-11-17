import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { fitBox, outputRatio, type Box } from '@core/editor/aspect'
import { gradientCss, screenLayout, shadowCss, withAlpha } from '@core/editor/background'
import { cameraAtRest, cameraStep, cameraViewport, cursorAt, targetViewport, viewportTransform, type CameraState, type CursorSample } from '@core/editor/camera'
import { zoomAt } from '@core/editor/zooms'
import type { Project } from '@core/project'
import { CursorLayer } from './CursorLayer'

export interface StageHandle {
  /** Renders the current frame at `height` px into a PNG (specs 77–78). */
  frameAsPng: (height: number) => Promise<ArrayBuffer>
}

interface Props {
  project: Project
  screenUrl: string
  micUrl?: string
  /** Source time of the frame to show. */
  sourceMs: number
  playing: boolean
  /** Transport speed × clip speed. */
  rate: number
  /** Microphone gain for the current clip; 0 mutes (spec 91, 93). */
  micVolume: number
  previewMaxHeight: number
  /** Cursor samples for zooms that follow the mouse (spec 106) and the drawn cursor (125–147). */
  cursor: CursorSample[]
  /** Source range of the recording the cursor rules apply to. */
  sourceDurationMs: number
  clipState: { hidden: boolean; smooth: boolean }
  clickSoundUrl: (kind: 'down' | 'up') => string | null
  /** Media url of the project's own background image, when the type is image. */
  backgroundImageUrl: string | null
  assetsUrl: string
  onDuration?: (ms: number) => void
  /** Reports where the recording sits on screen, for overlays such as the crop tool. */
  onBox?: (box: Box) => void
  children?: React.ReactNode
}

/**
 * The preview canvas (spec 48): the output box in the project's aspect ratio
 * with the (cropped) recording contained inside. Effects arrive with their specs.
 */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ project, screenUrl, micUrl, sourceMs, playing, rate, micVolume, previewMaxHeight, cursor, sourceDurationMs, clipState, clickSoundUrl, backgroundImageUrl, assetsUrl, onDuration, onBox, children }, ref) {
  const live = useRef({ sourceMs, playing, rate, clipState, innerWidth: 0 })
  useEffect(() => {
    live.current = { ...live.current, sourceMs, playing, rate, clipState }
  })
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const cameraLayer = useRef<HTMLDivElement>(null)
  const camera = useRef<CameraState>(cameraAtRest({ center: { x: 0.5, y: 0.5 }, scale: 1 }))
  const latest = useRef({ sourceMs, zooms: project.zooms, spring: project.config.screenMovementSpring, cursor })
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    latest.current = { sourceMs, zooms: project.zooms, spring: project.config.screenMovementSpring, cursor }
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
    if (!v) return
    const target = sourceMs / 1000
    const forward = playing && rate > 0
    for (const el of [v, a]) {
      if (!el) continue
      if (forward) {
        el.playbackRate = Math.min(16, Math.max(0.0625, rate))
        if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target
        if (el.paused) void el.play().catch(() => undefined)
      } else {
        if (!el.paused) el.pause()
        if (Math.abs(el.currentTime - target) > 0.001) el.currentTime = target
      }
    }
    if (a) a.volume = Math.max(0, Math.min(1, micVolume))
    v.muted = micVolume <= 0
  }, [sourceMs, playing, rate, micVolume])

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
  // Shadow, inset and corner values are given at output scale (specs 174–183); the nominal output is 1920 px wide.
  const outScale = output.width / 1920
  const laid = screenLayout(output, cropped, project.config.backgroundPaddingRatio, project.config.insetPadding, outScale)
  const inner: Box = { x: output.x + laid.screen.x, y: output.y + laid.screen.y, width: laid.screen.width, height: laid.screen.height }
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
      ctx.restore()
      ctx.restore()
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
        <div className="stage__shadow" style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height, borderRadius: radius, boxShadow: shadowCss(bg, outScale) }} />
        <div className="stage__inner" style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height, borderRadius: radius }}>
          <div ref={cameraLayer} className="stage__camera">
            <video ref={video} className="stage__video" src={screenUrl} crossOrigin="anonymous" playsInline preload="auto" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }} onLoadedMetadata={(e) => onDuration?.(Math.round(e.currentTarget.duration * 1000))} />
            <div className="stage__cursorhost" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }}>
              <CursorLayer
                samples={cursor}
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
        </div>
        {micUrl && <audio ref={audio} src={micUrl} preload="auto" />}
      </div>
      {children}
    </div>
  )
})
