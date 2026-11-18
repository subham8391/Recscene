import { CUSTOM_SET_COLOURS, type CursorSetId, type CursorType } from '@core/editor/cursor'

/** A cursor drawing in a 24 × 24 box: SVG markup for the stage and canvas commands for the export (spec 125). */
export interface SpriteStyle {
  fill: string
  stroke: string
  strokeWidth: number
}

export function spriteStyle(set: CursorSetId): SpriteStyle {
  if (set === 'halloween') return { fill: '#ff8a1f', stroke: '#2b0a00', strokeWidth: 1.6 }
  if (set === 'macos-tahoe') return { fill: '#111', stroke: '#fff', strokeWidth: 1.9 }
  if (set.startsWith('custom-')) {
    const n = Number(set.slice('custom-'.length))
    const colour = CUSTOM_SET_COLOURS[(n - 1) % CUSTOM_SET_COLOURS.length] ?? '#000'
    return { fill: colour, stroke: colour === '#ffffff' ? '#111' : '#fff', strokeWidth: 1.6 }
  }
  return { fill: '#000', stroke: '#fff', strokeWidth: 1.6 }
}

/** Path data per type; the pointer differs per set, the rest share one drawing. */
export const SPRITE_PATHS: Record<CursorType, string> = {
  pointer: 'M3.5 2l5.5 16 2.3-5.3 6.2-2.2z',
  ibeam: 'M8 3h3v2h-1v14h1v2H8v-2h1V5H8zM13 3h3v2h-1v14h1v2h-3v-2h1V5h-1z',
  pointinghand: 'M9 2h2v8h1V5h2v5h1V6h2v4h1V8h2v8l-2 5H9l-4-6 1.5-1.5L9 15z',
  crosshair: 'M11 2h2v8h8v2h-8v8h-2v-8H3v-2h8z',
  openhand: 'M7 4h2v7h1V3h2v8h1V4h2v7h1V6h2v9l-3 6H8l-4-6V9h2z',
  closedhand: 'M6 9h2V7h2v2h1V7h2v2h1V7h2v2h2v6l-3 5H8l-3-5z',
  'resize-leftright': 'M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z',
  'resize-updown': 'M12 2l5 5h-3v10h3l-5 5-5-5h3V7H7z',
  notallowed: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-6.3 6.3a7 7 0 0 0 9 9zm3.6-1.6l7 7a7 7 0 0 0-7-7z'
}

const TAHOE_POINTER = 'M4 2.5l5.3 15.8 2.4-5.6 5.9-1.9z'
const HALLOWEEN_POINTER = 'M3 2l6 18 2.6-6.2 6.3-2.4z'

export function spritePath(set: CursorSetId, type: CursorType): string {
  if (type === 'pointer') return set === 'macos-tahoe' ? TAHOE_POINTER : set === 'halloween' ? HALLOWEEN_POINTER : SPRITE_PATHS.pointer
  return SPRITE_PATHS[type]
}

/** The touch set draws a round pointer regardless of type. */
export const isTouch = (set: CursorSetId): boolean => set === 'touch'

export function spriteSvg(set: CursorSetId, type: CursorType): string {
  if (isTouch(set)) return '<circle cx="12" cy="12" r="9" fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.45)" stroke-width="2" />'
  const s = spriteStyle(set)
  return `<path d="${spritePath(set, type)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round" />`
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Draws the sprite into the current 24 × 24 transform of a canvas (the export). */
export function drawSprite(ctx: Ctx, set: CursorSetId, type: CursorType): void {
  if (isTouch(set)) {
    ctx.beginPath()
    ctx.arc(12, 12, 9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.stroke()
    return
  }
  const s = spriteStyle(set)
  const path = new Path2D(spritePath(set, type))
  ctx.lineJoin = 'round'
  ctx.lineWidth = s.strokeWidth
  ctx.strokeStyle = s.stroke
  ctx.stroke(path)
  ctx.fillStyle = s.fill
  ctx.fill(path)
}
