/**
 * Export (specs 233–237, 240–241): renders every output frame to a canvas with
 * the same layout the stage uses, encodes H.264 with WebCodecs into an MP4
 * (or frames into a GIF), mixes the audio offline, and streams the result to
 * the main process. Camera and cursor springs are stepped deterministically
 * at the output frame rate, so the export matches the preview.
 */
import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import { Muxer, StreamTarget } from 'mp4-muxer'
import { outputRatio } from '@core/editor/aspect'
import { screenLayout, withAlpha } from '@core/editor/background'
import { cameraAtRest, cameraStep, cameraViewport, cursorAt, targetViewport, type CursorSample } from '@core/editor/camera'
import { clipAtOutput, isAudioMuted, outputDurationMs, outputToSource, sourceToOutput, type Clip } from '@core/editor/clips'
import { activeClickEffects, cursorAtRest, cursorBlurPx, cursorRotation, cursorStep, cursorTarget, isPressed, removeShakes } from '@core/editor/cursor'
import { outputSize, videoBitrate, type ExportProgress, type ExportSettings, type ExportTarget } from '@core/editor/exportSettings'
import { zoomAt } from '@core/editor/zooms'
import { cameraMotionAtRest, cameraMotionStep, cameraTimeMs, effectiveLayout, motionBox, placeCamera, type CameraMotion } from '@core/editor/cameraLayout'
import { activeMask } from '@core/editor/masks'
import type { Project } from '@core/project'
import { drawMask } from './maskDraw'

export interface ExportInput {
  project: Project
  clips: Clip[]
  sourceDurationMs: number
  screenUrl: string
  micUrl?: string
  /** Spec 8: the webcam track, composited per the camera layouts (148–164). */
  cameraUrl?: string
  backgroundImageUrl: string | null
  assetsUrl: string
  cursor: CursorSample[]
  projectName: string
}

export interface ExportResult {
  path: string
}

const CURSOR_PATHS: Record<string, string> = {
  macos: 'M3.5 2l5.5 16 2.3-5.3 6.2-2.2z',
  'macos-tahoe': 'M4 2.5l5.3 15.8 2.4-5.6 5.9-1.9z',
  halloween: 'M3 2l6 18 2.6-6.2 6.3-2.4z'
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => resolve(i)
    i.onerror = () => resolve(null)
    i.src = url
  })
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - seconds) < 0.0005 && video.readyState >= 2) return resolve()
    const done = (): void => {
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done)
    video.currentTime = seconds
  })
}

/** 16-bit stereo WAV from an AudioBuffer. */
function toWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = Math.min(2, buffer.numberOfChannels)
  const frames = buffer.length
  const bytes = 44 + frames * channels * 2
  const out = new ArrayBuffer(bytes)
  const v = new DataView(out)
  const str = (o: number, s: string): void => { for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true)
  v.setUint32(24, buffer.sampleRate, true); v.setUint32(28, buffer.sampleRate * channels * 2, true); v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, frames * channels * 2, true)
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c))
  let o = 44
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const s = Math.max(-1, Math.min(1, data[c]![i] ?? 0))
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      o += 2
    }
  }
  return out
}

/** Mixes microphone (per clip volume and speed, muted above 2×) and click sounds into one stereo buffer of the output length. */
async function mixAudio(input: ExportInput, totalMs: number): Promise<AudioBuffer | null> {
  const rate = 48_000
  const length = Math.max(1, Math.ceil((totalMs / 1000) * rate))
  const ctx = new OfflineAudioContext(2, length, rate)
  let any = false
  const decode = async (url: string): Promise<AudioBuffer | null> => {
    try {
      const data = await (await fetch(url)).arrayBuffer()
      return await ctx.decodeAudioData(data)
    } catch {
      return null
    }
  }
  const mic = input.micUrl ? await decode(input.micUrl) : null
  if (mic) {
    let at = 0
    for (const clip of input.clips) {
      const length = (clip.sourceEndMs - clip.sourceStartMs) / 1000
      if (!isAudioMuted(clip) && clip.volume > 0) {
        const src = ctx.createBufferSource()
        src.buffer = mic
        src.playbackRate.value = clip.speed
        const gain = ctx.createGain()
        gain.gain.value = clip.volume
        src.connect(gain).connect(ctx.destination)
        src.start(at / 1000, clip.sourceStartMs / 1000, length)
        any = true
      }
      at += (length * 1000) / clip.speed
    }
  }
  const sound = input.project.config.clickSoundEffect
  if (sound && !input.project.config.hideCursor) {
    const down = await decode(`${input.assetsUrl}/sounds/clicks/${sound}/down.wav`)
    if (down) {
      for (const click of input.project.recording.clicks) {
        const outMs = sourceToOutput(input.clips, click.timeMs)
        const clip = clipAtOutput(input.clips, outMs ?? -1)?.clip
        if (outMs === null || !clip || isAudioMuted(clip) || clip.hideCursor) continue
        const src = ctx.createBufferSource()
        src.buffer = down
        const gain = ctx.createGain()
        gain.gain.value = input.project.config.clickSoundEffectVolume
        src.connect(gain).connect(ctx.destination)
        src.start(outMs / 1000)
        any = true
      }
    }
  }
  if (!any) return null
  return ctx.startRendering()
}

export async function runExport(
  input: ExportInput,
  settings: ExportSettings,
  target: ExportTarget,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal
): Promise<ExportResult | null> {
  const { project } = input
  const cfg = project.config
  const crop = cfg.recordingCrop
  const rec = project.recording.screen
  const cropped = crop ? { width: rec.width * crop.width, height: rec.height * crop.height } : rec
  const ratio = outputRatio(cfg.defaultOutputAspectRatio, cropped)
  const size = outputSize(settings.height, ratio)
  const totalMs = outputDurationMs(input.clips)
  const frames = Math.max(1, Math.ceil((totalMs / 1000) * settings.fps))
  const startedAt = Date.now()
  const progress = (phase: ExportProgress['phase'], frame: number, message?: string): void => onProgress({ phase, frame, frames, startedAt, ...(message ? { message } : {}) })

  progress('preparing', 0)
  const job = await window.recscene.export.begin({ target, projectName: input.projectName, settings, size })
  if (!job) return null

  const video = document.createElement('video')
  // The media scheme answers with CORS headers; a plain load would taint the canvas and block VideoFrame.
  video.crossOrigin = 'anonymous'
  video.src = input.screenUrl
  video.muted = true
  video.preload = 'auto'
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error('Could not load the recording'))
  })
  const bgImage = cfg.backgroundType === 'image' && input.backgroundImageUrl ? await loadImage(input.backgroundImageUrl) : cfg.backgroundType === 'system' ? await loadImage(`${input.assetsUrl}/backgrounds/${cfg.backgroundSystemName}.svg`) : null
  const camRec = project.recording.camera
  let camVideo: HTMLVideoElement | null = null
  if (input.cameraUrl && camRec) {
    camVideo = document.createElement('video')
    camVideo.crossOrigin = 'anonymous'
    camVideo.src = input.cameraUrl
    camVideo.muted = true
    camVideo.preload = 'auto'
    const ok = await new Promise<boolean>((resolve) => {
      camVideo!.onloadeddata = () => resolve(true)
      camVideo!.onerror = () => resolve(false)
    })
    if (!ok) camVideo = null
  }
  let camMotion: CameraMotion | null = null

  const canvas = new OffscreenCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('No canvas context')
  const exportScale = size.width / 1920
  const laidWhole = screenLayout(size, cropped, cfg.backgroundPaddingRatio, cfg.insetPadding, exportScale)
  const radius = cfg.windowBorderRadius * exportScale
  const samples = removeShakes(input.cursor, cfg.removeCurshorShakeTreshold, rec)
  const spring = cfg.screenMovementSpring
  let camera = cameraAtRest({ center: { x: 0.5, y: 0.5 }, scale: 1 })
  let cursorMotion = cursorAtRest(cursorAt(samples, 0))
  let cursorOpacity = 1
  const dt = 1000 / settings.fps
  const cursorPath = new Path2D(CURSOR_PATHS[cfg.cursorSet.id] ?? CURSOR_PATHS['macos']!)

  const drawFrame = (outputMs: number): void => {
    const sourceMs = outputToSource(input.clips, outputMs)
    const clip = clipAtOutput(input.clips, outputMs)?.clip
    // Camera layout at this moment (148–164): a split layout leaves the screen only part of the frame.
    const eff = effectiveLayout(cfg, project.layouts, sourceMs)
    const activeZoom = zoomAt(project.zooms, sourceMs)
    const placed = camVideo && camRec ? placeCamera({ frame: size, cameraFrame: camRec, type: eff.type, cameraSize: eff.cameraSize, position: eff.cameraPositionPoint, config: cfg, zoomed: !!activeZoom && !activeZoom.isDisabled, paddingRatio: cfg.backgroundPaddingRatio / 100 }) : null
    let laid = laidWhole
    if (placed && eff.type === 'split') {
      const r = placed.screen
      const l = screenLayout({ width: r.width, height: r.height }, cropped, cfg.backgroundPaddingRatio, cfg.insetPadding, exportScale)
      laid = { screen: { ...l.screen, x: l.screen.x + r.x, y: l.screen.y + r.y }, outer: { ...l.outer, x: l.outer.x + r.x, y: l.outer.y + r.y } }
    }
    const screen = laid.screen
    // Background (165–173)
    if (cfg.backgroundType === 'color') {
      ctx.fillStyle = cfg.backgroundColor
      ctx.fillRect(0, 0, size.width, size.height)
    } else if (cfg.backgroundType === 'gradient' || !bgImage) {
      const g = cfg.backgroundGradient
      const grad = ctx.createLinearGradient(g.start.x * size.width, g.start.y * size.height, g.end.x * size.width, g.end.y * size.height)
      for (const stop of g.stops) grad.addColorStop(Math.max(0, Math.min(1, stop.at)), stop.color)
      ctx.fillStyle = cfg.backgroundType === 'gradient' ? grad : '#111'
      ctx.fillRect(0, 0, size.width, size.height)
    } else {
      const s = Math.max(size.width / bgImage.width, size.height / bgImage.height)
      ctx.save()
      if (cfg.backgroundBlur > 0) ctx.filter = `blur(${((cfg.backgroundBlur / 100) * size.width * 0.08).toFixed(1)}px)`
      ctx.drawImage(bgImage, (size.width - bgImage.width * s) / 2, (size.height - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s)
      ctx.restore()
    }
    // Inset band (181–183) and shadow (176–180)
    if (laid.outer.width > screen.width || laid.outer.height > screen.height) {
      ctx.fillStyle = withAlpha(cfg.insetColor, cfg.insetAlpha)
      ctx.beginPath()
      ctx.roundRect(laid.outer.x, laid.outer.y, laid.outer.width, laid.outer.height, radius + (screen.x - laid.outer.x))
      ctx.fill()
    }
    if (cfg.shadowIntensity > 0 && cfg.backgroundPaddingRatio > 0) {
      const rad = (cfg.shadowAngle * Math.PI) / 180
      ctx.save()
      ctx.shadowColor = `rgba(0,0,0,${cfg.shadowIntensity})`
      ctx.shadowBlur = cfg.shadowBlur * exportScale * (cfg.shadowIsDirectional ? 0.5 : 1)
      ctx.shadowOffsetX = Math.cos(rad) * cfg.shadowDistance * exportScale * (cfg.shadowIsDirectional ? 1 : 0.5)
      ctx.shadowOffsetY = Math.sin(rad) * cfg.shadowDistance * exportScale * (cfg.shadowIsDirectional ? 1 : 0.5)
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.roundRect(screen.x, screen.y, screen.width, screen.height, radius)
      ctx.fill()
      ctx.restore()
    }
    // Screen with camera (102–124)
    const cursorPos = cursorAt(samples, sourceMs)
    const targetView = targetViewport(sourceMs, project.zooms, () => cursorPos)
    camera = cameraStep(camera, targetView, dt, spring, !!zoomAt(project.zooms, sourceMs)?.hasInstantAnimation)
    const view = cameraViewport(camera)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(screen.x, screen.y, screen.width, screen.height, radius)
    ctx.clip()
    ctx.translate(screen.x + screen.width / 2 - view.center.x * screen.width * view.scale, screen.y + screen.height / 2 - view.center.y * screen.height * view.scale)
    ctx.scale(view.scale, view.scale)
    const sx = crop ? crop.x * video.videoWidth : 0
    const sy = crop ? crop.y * video.videoHeight : 0
    const sw = crop ? crop.width * video.videoWidth : video.videoWidth
    const sh = crop ? crop.height * video.videoHeight : video.videoHeight
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, screen.width, screen.height)
    // Masks (189–198) over the recording, before the cursor
    const am = activeMask(project.masks, sourceMs)
    if (am) drawMask(ctx, am, video, crop, { width: screen.width, height: screen.height }, size.width)
    // Cursor (125–147) in screen space
    const tgt = cursorTarget(samples, sourceMs, { startMs: 0, endMs: input.sourceDurationMs, config: cfg, clipHidden: !!clip?.hideCursor })
    const smooth = !cfg.disableMouseMovementSpring && !clip?.disableSmoothMouseMovement
    cursorMotion = cursorStep(cursorMotion, tgt.position, dt, cfg.mouseMovementSpring, smooth, isPressed(project.recording.clicks, sourceMs), cfg.mouseClickSpring)
    cursorOpacity += ((tgt.visible ? 1 : 0) - cursorOpacity) * Math.min(1, dt / 120)
    if (cursorOpacity > 0.01 && samples.length > 0) {
      const cs = Math.max(6, screen.height * 0.028 * cfg.cursorSize)
      if (cfg.clickEffect) {
        for (const fx of activeClickEffects(project.recording.clicks, sourceMs)) {
          const base = cs * 1.6 * (cfg.clickEffect === 'ripple' ? 1 + fx.progress * 2.2 : 1)
          ctx.beginPath()
          ctx.arc(fx.click.position.x * screen.width, fx.click.position.y * screen.height, base / 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(143,121,255,${(0.18 * (1 - fx.progress)).toFixed(3)})`
          ctx.fill()
          ctx.lineWidth = 2
          ctx.strokeStyle = `rgba(143,121,255,${(0.95 * (1 - fx.progress)).toFixed(3)})`
          ctx.stroke()
        }
      }
      ctx.save()
      ctx.globalAlpha = Math.min(1, cursorOpacity)
      const blur = cursorBlurPx(cursorMotion, screen.width, cfg.motionBlurAmount, cfg.motionBlurCursorAmount)
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`
      ctx.translate(cursorMotion.x.value * screen.width, cursorMotion.y.value * screen.height)
      ctx.rotate((cursorRotation(cursorMotion, cfg.cursorRotateOnXMovementRatio, cfg.cursorBaseRotation) * Math.PI) / 180)
      const press = cursorMotion.press.value
      ctx.scale((cs / 24) * press, (cs / 24) * press)
      ctx.translate(-3.6, -1.9)
      if (cfg.cursorSet.id === 'touch') {
        ctx.beginPath()
        ctx.arc(12, 12, 9, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'
        ctx.stroke()
      } else {
        ctx.lineJoin = 'round'
        ctx.lineWidth = 1.6
        ctx.strokeStyle = cfg.cursorSet.id === 'halloween' ? '#2b0a00' : '#fff'
        ctx.stroke(cursorPath)
        ctx.fillStyle = cfg.cursorSet.id === 'halloween' ? '#ff8a1f' : cfg.cursorSet.id === 'macos-tahoe' ? '#111' : '#000'
        ctx.fill(cursorPath)
      }
      ctx.restore()
    }
    ctx.restore()
    // Webcam box (148–164), stepped with the same spring the stage uses.
    if (camVideo && camRec && placed) {
      camMotion = camMotion ? cameraMotionStep(camMotion, placed.camera, dt) : cameraMotionAtRest(placed.camera, size)
      const b = motionBox(camMotion)
      if (b.width > 1 && b.height > 1 && camMotion.alpha.value > 0.01 && camVideo.videoWidth > 0) {
        const cr = placed.crop
        const sxc = cr.x * camVideo.videoWidth
        const syc = cr.y * camVideo.videoHeight
        const swc = cr.width * camVideo.videoWidth
        const shc = cr.height * camVideo.videoHeight
        const scale = Math.max(b.width / swc, b.height / shc)
        const dw = swc * scale
        const dh = shc * scale
        ctx.save()
        ctx.globalAlpha = Math.min(1, camMotion.alpha.value)
        ctx.beginPath()
        ctx.roundRect(b.x, b.y, b.width, b.height, cfg.cameraRoundness * Math.min(b.width, b.height))
        ctx.clip()
        if (cfg.mirrorCamera) {
          ctx.translate(b.x + b.width, 0)
          ctx.scale(-1, 1)
          ctx.translate(-b.x, 0)
        }
        ctx.drawImage(camVideo, sxc, syc, swc, shc, b.x + (b.width - dw) / 2, b.y + (b.height - dh) / 2, dw, dh)
        ctx.restore()
      }
    }
  }

  const abort = (): never => {
    throw new DOMException('Export cancelled', 'AbortError')
  }

  try {
    if (settings.format === 'mp4') {
      const muxer = new Muxer({
        target: new StreamTarget({ onData: (chunk, position) => void window.recscene.export.chunk(job.id, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer, position) }),
        video: { codec: 'avc', width: size.width, height: size.height, frameRate: settings.fps },
        fastStart: false
      })
      const codec = size.height > 1080 ? 'avc1.640033' : 'avc1.640028'
      const bitrate = videoBitrate(settings.quality, size.width, size.height, settings.fps)
      let encodeError: Error | null = null
      const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encodeError = e } })
      const support = await VideoEncoder.isConfigSupported({ codec, width: size.width, height: size.height, bitrate, framerate: settings.fps })
      if (!support.supported) throw new Error('No supported video encoder found')
      encoder.configure({ codec, width: size.width, height: size.height, bitrate, framerate: settings.fps, latencyMode: 'quality' })
      for (let i = 0; i < frames; i += 1) {
        if (signal.aborted) abort()
        const outputMs = (i * 1000) / settings.fps
        await seekTo(video, outputToSource(input.clips, outputMs) / 1000)
        if (camVideo) await seekTo(camVideo, cameraTimeMs(outputToSource(input.clips, outputMs), cfg) / 1000)
        drawFrame(outputMs)
        const frame = new VideoFrame(canvas, { timestamp: Math.round(outputMs * 1000), duration: Math.round(dt * 1000) })
        encoder.encode(frame, { keyFrame: i % (settings.fps * 2) === 0 })
        frame.close()
        if (encodeError) throw encodeError
        if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 10))
        progress('rendering', i + 1)
      }
      await encoder.flush()
      encoder.close()
      muxer.finalize()
      progress('audio', frames)
      const mixed = await mixAudio(input, totalMs)
      if (mixed) await window.recscene.export.audio(job.id, toWav(mixed))
    } else {
      const gif = GIFEncoder()
      const delay = Math.round(1000 / settings.fps)
      for (let i = 0; i < frames; i += 1) {
        if (signal.aborted) abort()
        const outputMs = (i * 1000) / settings.fps
        await seekTo(video, outputToSource(input.clips, outputMs) / 1000)
        if (camVideo) await seekTo(camVideo, cameraTimeMs(outputToSource(input.clips, outputMs), cfg) / 1000)
        drawFrame(outputMs)
        const rgba = ctx.getImageData(0, 0, size.width, size.height).data
        const palette = quantize(rgba, settings.quality === 'high' ? 256 : settings.quality === 'medium' ? 128 : 64)
        const index = applyPalette(rgba, palette)
        gif.writeFrame(index, size.width, size.height, { palette, delay, repeat: settings.gifDisableLoop ? -1 : 0 })
        progress('rendering', i + 1)
      }
      gif.finish()
      const bytes = gif.bytes()
      await window.recscene.export.chunk(job.id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, 0)
    }
    if (signal.aborted) abort()
    progress('finishing', frames)
    const done = await window.recscene.export.finish(job.id)
    progress('done', frames, done.path)
    return { path: done.path }
  } catch (error) {
    await window.recscene.export.cancel(job.id)
    if (error instanceof DOMException && error.name === 'AbortError') {
      progress('cancelled', 0)
      return null
    }
    progress('failed', 0, error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}
