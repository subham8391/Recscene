import { useEffect, useState } from 'react'
import { useCameraStream } from './useCameraStream'

/** The live camera bubble while recording (specs 8, 11): draggable, square or full-frame, never recorded. */
export function CameraPreview(): React.JSX.Element {
  const [state, setState] = useState<{ cameraName: string; previewType: 'square' | 'full-frame' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void window.recscene.cameraPreview.state().then(setState)
  }, [])
  const video = useCameraStream(state?.cameraName ?? null, state !== null, setError)
  return (
    <div className={`campreview campreview--${state?.previewType ?? 'square'}`} role="img" aria-label={state ? `Camera preview · ${state.cameraName}` : 'Camera preview'}>
      <video ref={video} className="campreview__video" muted playsInline />
      {error && <span className="campreview__error">Camera preview unavailable</span>}
    </div>
  )
}
