import { blurPxFor, FEATHER_PX, regionInCrop, type Mask, type MaskRegion } from '@core/editor/masks'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Draws one mask onto a canvas whose current transform maps the (cropped)
 * recording to `box` at the origin (specs 189–190). The export and the
 * stage's frame export share it so both match the preview.
 */
export function drawMask(ctx: Ctx, mask: Mask, video: HTMLVideoElement, crop: MaskRegion | null, box: { width: number; height: number }, outputWidth: number): void {
  const r = regionInCrop(mask.region, crop)
  if (!r) return
  const x = r.x * box.width
  const y = r.y * box.height
  const w = r.width * box.width
  const h = r.height * box.height
  if (w <= 0 || h <= 0) return
  if (mask.type === 'highlight') {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, box.width, box.height)
    ctx.rect(x, y, w, h)
    ctx.clip('evenodd')
    ctx.fillStyle = `rgba(0,0,0,${mask.highlightMaskOpacity})`
    ctx.fillRect(0, 0, box.width, box.height)
    ctx.restore()
    return
  }
  const blur = blurPxFor(mask.blurStrength, outputWidth) * (box.width / outputWidth)
  const feather = mask.featherEdge ? FEATHER_PX * (box.width / outputWidth) : 0
  // Source pixels of the region inside the video, padded by the blur radius so the edges do not fade to transparent.
  const cw = crop?.width ?? 1
  const ch = crop?.height ?? 1
  const cx = crop?.x ?? 0
  const cy = crop?.y ?? 0
  const pxPerBox = (video.videoWidth * cw) / box.width
  const pad = blur * 2
  const sx = (cx + (r.x - (pad / box.width) * cw) * cw) * video.videoWidth
  const sy = (cy + (r.y - (pad / box.height) * ch) * ch) * video.videoHeight
  const sw = (w + pad * 2) * pxPerBox
  const sh = (h + pad * 2) * ((video.videoHeight * ch) / box.height)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, feather)
  ctx.clip()
  ctx.filter = `blur(${blur.toFixed(1)}px)`
  ctx.drawImage(video, sx, sy, sw, sh, x - pad, y - pad, w + pad * 2, h + pad * 2)
  ctx.restore()
}
