import { useEffect, useRef } from 'react'

/**
 * Opens the webcam named like the helper names it (device labels match
 * AVCaptureDevice names) and plays it into the video element. The stream is
 * preview only; the helper writes the recorded file.
 */
export function useCameraStream(cameraName: string | null, enabled: boolean, onError?: (message: string) => void): React.RefObject<HTMLVideoElement | null> {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!enabled) return
    const el = video.current
    let stream: MediaStream | null = null
    let cancelled = false
    void (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const match = cameraName ? devices.find((d) => d.kind === 'videoinput' && d.label === cameraName) : undefined
        stream = await navigator.mediaDevices.getUserMedia({ video: match ? { deviceId: { exact: match.deviceId } } : true, audio: false })
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        if (el) {
          el.srcObject = stream
          await el.play().catch(() => undefined)
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : String(error))
      }
    })()
    return () => {
      cancelled = true
      for (const t of stream?.getTracks() ?? []) t.stop()
      if (el) el.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraName, enabled])
  return video
}
