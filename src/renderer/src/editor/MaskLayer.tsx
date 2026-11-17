import { useRef } from 'react'
import { blurPxFor, dragRegion, FEATHER_PX, maskLabel, type Mask, type MaskHandle, type MaskRegion } from '@core/editor/masks'
import { formatTimecode } from '@core/time'

interface Props {
  masks: Mask[]
  /** The mask that renders at the current time, or null. */
  active: Mask | null
  selectedId: string | null
  /** Pixel size of the video box the layer sits over (full recording, crop included). */
  frame: { width: number; height: number }
  /** Width of the output frame the preview stands for, for the blur radius. */
  outputWidth: number
  /** Live region while dragging; `commit` writes to history. */
  onRegionPreview: (id: string, region: MaskRegion) => void
  onRegionCommit: (id: string, region: MaskRegion) => void
  onSelect: (id: string | null) => void
}

const HANDLES: MaskHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** A full-frame polygon with the region cut out (even-odd), so the dim never depends on huge shadows. */
function holePath(r: MaskRegion): string {
  const p = (v: number): string => `${(v * 100).toFixed(3)}%`
  const x0 = p(r.x)
  const y0 = p(r.y)
  const x1 = p(r.x + r.width)
  const y1 = p(r.y + r.height)
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x0} ${y0}, ${x0} ${y1}, ${x1} ${y1}, ${x1} ${y0}, ${x0} ${y0})`
}

/**
 * Masks over the recording (specs 189–196): the active mask blurs its region
 * or dims everything else, and the selected mask shows a draggable rectangle
 * with handles (spec 192), in the same transformed space as the video.
 */
export function MaskLayer({ masks, active, selectedId, frame, outputWidth, onRegionPreview, onRegionCommit, onSelect }: Props): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; handle: MaskHandle; startX: number; startY: number; origin: MaskRegion; last: MaskRegion | null } | null>(null)
  const selected = masks.find((m) => m.id === selectedId) ?? null

  const startDrag = (mask: Mask, handle: MaskHandle, e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    drag.current = { id: mask.id, handle, startX: e.clientX, startY: e.clientY, origin: mask.region, last: null }
    onSelect(mask.id)
    const move = (ev: MouseEvent): void => {
      const d = drag.current
      const rect = host.current?.getBoundingClientRect()
      if (!d || !rect || rect.width <= 0) return
      const next = dragRegion(d.origin, d.handle, (ev.clientX - d.startX) / rect.width, (ev.clientY - d.startY) / rect.height)
      d.last = next
      onRegionPreview(d.id, next)
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      const d = drag.current
      drag.current = null
      if (d?.last) onRegionCommit(d.id, d.last)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const pct = (v: number): string => `${v * 100}%`
  const box = (r: MaskRegion): React.CSSProperties => ({ left: pct(r.x), top: pct(r.y), width: pct(r.width), height: pct(r.height) })
  const scale = frame.width > 0 ? frame.width / outputWidth : 1

  return (
    <div ref={host} className="masks" aria-hidden={masks.length === 0}>
      {active && active.type === 'highlight' && <div className="masks__dim" style={{ background: `rgba(0,0,0,${active.highlightMaskOpacity})`, clipPath: holePath(active.region) }} />}
      {active && active.type === 'sensitive-data' && (
        <div className={`masks__blur${active.featherEdge ? ' masks__blur--feather' : ''}`} style={{ ...box(active.region), backdropFilter: `blur(${(blurPxFor(active.blurStrength, outputWidth) * scale).toFixed(1)}px)`, borderRadius: active.featherEdge ? FEATHER_PX * scale : 0 }} />
      )}
      {selected && (
        <div className={`masks__sel${selected.isDisabled ? ' masks__sel--off' : ''}`} style={box(selected.region)} onMouseDown={(e) => startDrag(selected, 'move', e)} role="group" aria-label="Selected mask">
          <span className="masks__tag">{maskLabel(selected)} · {formatTimecode(selected.sourceStartMs)} – {formatTimecode(selected.sourceEndMs)}</span>
          {HANDLES.map((h) => <span key={h} className={`masks__h masks__h--${h}`} onMouseDown={(e) => startDrag(selected, h, e)} />)}
        </div>
      )}
      {masks.filter((m) => m.id !== selectedId && (!active || m.id !== active.id)).map((m) => (
        <div key={m.id} className="masks__ghost" style={box(m.region)} title={`${maskLabel(m)} · ${formatTimecode(m.sourceStartMs)} – ${formatTimecode(m.sourceEndMs)}`} onMouseDown={(e) => { e.stopPropagation(); onSelect(m.id) }} />
      ))}
    </div>
  )
}
