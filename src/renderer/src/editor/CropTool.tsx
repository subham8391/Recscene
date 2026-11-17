import { useEffect, useRef, useState } from 'react'
import { applyCropAspect, clampCrop, CROP_ASPECTS, cropFromFractions, cropToFractions, fullCrop, isCropTooSmall, moveCrop, nudgeStep, resizeCropHandle, type CropHandle, type CropRect } from '@core/editor/crop'

interface Props {
  recording: { width: number; height: number }
  initial: CropRect | null
  /** The recording's box on screen, so the overlay matches the frame. */
  box: { x: number; y: number; width: number; height: number }
  onConfirm: (fractions: CropRect | null) => void
  onCancel: () => void
}

/** The crop tool (specs 100–101) drawn over the paused frame. */
export function CropTool({ recording, initial, box, onConfirm, onCancel }: Props): React.JSX.Element {
  const [crop, setCrop] = useState<CropRect>(() => cropFromFractions(initial, recording))
  const [ratio, setRatio] = useState<number | null>(null)
  const drag = useRef<{ x: number; y: number; origin: CropRect; handle: CropHandle | 'move' } | null>(null)
  const scale = box.width > 0 ? recording.width / box.width : 1
  const tooSmall = isCropTooSmall(crop)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'Enter' && !tooSmall) onConfirm(cropToFractions(crop, recording))
      else if (e.key.startsWith('Arrow')) {
        const s = nudgeStep(e)
        const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key] ?? [0, 0]
        setCrop((c) => moveCrop(c, d[0] ?? 0, d[1] ?? 0, recording))
      } else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [crop, tooSmall, recording, onCancel, onConfirm])

  const down = (e: React.MouseEvent<HTMLElement>): void => {
    e.stopPropagation()
    const handle = (e.currentTarget.dataset['handle'] ?? 'move') as CropHandle | 'move'
    drag.current = { x: e.clientX, y: e.clientY, origin: crop, handle }
  }
  const move = (e: React.MouseEvent): void => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) * scale
    const dy = (e.clientY - d.y) * scale
    setCrop(d.handle === 'move' ? moveCrop(d.origin, dx, dy, recording) : resizeCropHandle(d.origin, d.handle, dx, dy, ratio, recording))
  }
  const up = (): void => {
    drag.current = null
  }
  const field = (key: keyof CropRect, value: number): void => setCrop((c) => clampCrop({ ...c, [key]: value }, recording))
  const px = (v: number): number => v / scale

  return (
    <div className="crop" onMouseMove={move} onMouseUp={up} onMouseLeave={up} onDoubleClick={() => setCrop(fullCrop(recording))}>
      <div className="crop__dim" style={{ left: box.x, top: box.y, width: box.width, height: box.height }}>
        <div className="crop__sel" style={{ left: px(crop.x), top: px(crop.y), width: px(crop.width), height: px(crop.height) }} onMouseDown={down} data-handle="move" tabIndex={0} aria-label="Use the arrow keys to move the crop selection area">
          {(['nw', 'ne', 'sw', 'se'] as CropHandle[]).map((h) => (
            <span key={h} className={`crop__h crop__h--${h}`} data-handle={h} onMouseDown={down} aria-label={`Use the arrow keys to move the ${h} drag handle to change the crop selection area`} />
          ))}
          <span className="crop__size">{crop.width} × {crop.height}{tooSmall ? ' · Minimal size is 200x200' : ''}</span>
        </div>
      </div>
      <div className="crop__bar" role="toolbar" aria-label="Crop" onMouseDown={(e) => e.stopPropagation()}>
        {(['x', 'y', 'width', 'height'] as (keyof CropRect)[]).map((k) => (
          <label key={k} className="field--inline">{k === 'x' ? 'X' : k === 'y' ? 'Y' : k === 'width' ? 'W' : 'H'}<input className="input input--num" type="number" value={crop[k]} onChange={(e) => field(k, Number(e.target.value))} /></label>
        ))}
        <select className="input" aria-label="Set crop aspect ratio" value={ratio === null ? 'any' : String(ratio)} onChange={(e) => { const r = e.target.value === 'any' ? null : Number(e.target.value); setRatio(r); setCrop((c) => applyCropAspect(c, r, recording)) }}>
          {CROP_ASPECTS.map((a) => <option key={a.label} value={a.ratio === null ? 'any' : String(a.ratio)}>{a.label}</option>)}
        </select>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCrop(fullCrop(recording))}>Reset</button>
        <span className="tl__spacer" />
        {tooSmall && <span className="crop__warn">Minimal size is 200x200</span>}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Discard changes <kbd>⎋</kbd></button>
        <button type="button" className="btn btn--accent btn--sm" disabled={tooSmall} onClick={() => onConfirm(cropToFractions(crop, recording))}>Confirm changes <kbd>↩</kbd></button>
      </div>
    </div>
  )
}
