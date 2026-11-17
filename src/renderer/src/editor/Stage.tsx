import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { fitBox, outputRatio, recordingBox, type Box } from '@core/editor/aspect'
import type { Project } from '@core/project'

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
  onDuration?: (ms: number) => void
  /** Reports where the recording sits on screen, for overlays such as the crop tool. */
  onBox?: (box: Box) => void
  children?: React.ReactNode
}

/**
 * The preview canvas (spec 48): the output box in the project's aspect ratio
 * with the (cropped) recording contained inside. Effects arrive with their specs.
 */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ project, screenUrl, micUrl, sourceMs, playing, rate, micVolume, previewMaxHeight, onDuration, onBox, children }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

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

  const crop = project.config.recordingCrop
  const rec = project.recording.screen
  const cropped = crop ? { width: rec.width * crop.width, height: rec.height * crop.height } : rec
  const ratio = outputRatio(project.config.defaultOutputAspectRatio, cropped)
  const maxHeight = Math.min(size.height, previewMaxHeight)
  const output: Box = fitBox(size.width, maxHeight, ratio)
  output.y += (size.height - maxHeight) / 2
  const inner = recordingBox(output, cropped)
  // The video is scaled so the crop region fills the inner box.
  const videoWidth = crop ? inner.width / crop.width : inner.width
  const videoHeight = crop ? inner.height / crop.height : inner.height
  const videoLeft = inner.x - output.x - (crop ? crop.x * videoWidth : 0)
  const videoTop = inner.y - output.y - (crop ? crop.y * videoHeight : 0)

  useEffect(() => {
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
      const box = recordingBox({ x: 0, y: 0, width: canvas.width, height: canvas.height }, cropped)
      const sx = crop ? crop.x * v.videoWidth : 0
      const sy = crop ? crop.y * v.videoHeight : 0
      const sw = crop ? crop.width * v.videoWidth : v.videoWidth
      const sh = crop ? crop.height * v.videoHeight : v.videoHeight
      ctx.drawImage(v, sx, sy, sw, sh, box.x, box.y, box.width, box.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not encode the frame')
      return blob.arrayBuffer()
    }
  }))

  return (
    <div ref={host} className="stage__canvas">
      <div className="stage__output" style={{ left: output.x, top: output.y, width: output.width, height: output.height }}>
        <div className="stage__inner" style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height }}>
          <video ref={video} className="stage__video" src={screenUrl} playsInline preload="auto" style={{ left: videoLeft - (inner.x - output.x), top: videoTop - (inner.y - output.y), width: videoWidth, height: videoHeight }} onLoadedMetadata={(e) => onDuration?.(Math.round(e.currentTarget.duration * 1000))} />
        </div>
        {micUrl && <audio ref={audio} src={micUrl} preload="auto" />}
      </div>
      {children}
    </div>
  )
})
