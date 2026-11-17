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
  timeMs: number
  playing: boolean
  speed: number
  previewMaxHeight: number
  /** Called when the media reports its real duration, in case project.json is off. */
  onDuration?: (ms: number) => void
}

/**
 * The preview canvas (spec 48): the output box in the project's aspect ratio
 * with the recording contained inside. Rendering effects (background, zooms,
 * cursor) arrive with their own specs; until then it is the plain video.
 */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ project, screenUrl, micUrl, timeMs, playing, speed, previewMaxHeight, onDuration }, ref) {
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

  // Keep the media elements on the playback clock. Forward play uses the element's own clock;
  // backward play and scrubbing seek explicitly.
  useEffect(() => {
    const v = video.current
    const a = audio.current
    if (!v) return
    const target = timeMs / 1000
    const forward = playing && speed > 0
    for (const el of [v, a]) {
      if (!el) continue
      if (forward) {
        el.playbackRate = Math.min(16, speed)
        if (Math.abs(el.currentTime - target) > 0.25) el.currentTime = target
        if (el.paused) void el.play().catch(() => undefined)
      } else {
        if (!el.paused) el.pause()
        if (Math.abs(el.currentTime - target) > 0.001) el.currentTime = target
      }
    }
  }, [timeMs, playing, speed])

  useImperativeHandle(ref, () => ({
    frameAsPng: async (height: number) => {
      const v = video.current
      if (!v || v.videoWidth === 0) throw new Error('No frame to copy')
      const ratio = outputRatio(project.config.defaultOutputAspectRatio, project.recording.screen)
      const canvas = document.createElement('canvas')
      canvas.height = height
      canvas.width = Math.round(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const inner = recordingBox({ x: 0, y: 0, width: canvas.width, height: canvas.height }, project.recording.screen)
      ctx.drawImage(v, inner.x, inner.y, inner.width, inner.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not encode the frame')
      return blob.arrayBuffer()
    }
  }))

  const ratio = outputRatio(project.config.defaultOutputAspectRatio, project.recording.screen)
  const maxHeight = Math.min(size.height, previewMaxHeight)
  const output: Box = fitBox(size.width, maxHeight, ratio)
  output.y += (size.height - maxHeight) / 2
  const inner = recordingBox(output, project.recording.screen)

  return (
    <div ref={host} className="stage__canvas">
      <div className="stage__output" style={{ left: output.x, top: output.y, width: output.width, height: output.height }}>
        <video
          ref={video}
          className="stage__video"
          src={screenUrl}
          muted={!!micUrl && false}
          playsInline
          preload="auto"
          style={{ left: inner.x - output.x, top: inner.y - output.y, width: inner.width, height: inner.height }}
          onLoadedMetadata={(e) => onDuration?.(Math.round(e.currentTarget.duration * 1000))}
        />
        {micUrl && <audio ref={audio} src={micUrl} preload="auto" />}
      </div>
    </div>
  )
})
