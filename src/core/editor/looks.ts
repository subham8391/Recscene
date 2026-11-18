/**
 * Camera looks and sharpen (spec 287), as colour filters rather than 3D LUTs:
 * each look is a set of filter amounts, mixed towards the original by the
 * intensity, and sharpen is a convolution kernel.
 */

export type LookId = 'original' | 'studio' | 'cinema' | 'film' | 'golden' | 'cream' | 'terra' | 'moody' | 'arctic' | 'neon' | 'punch' | 'fade' | 'mono'

export interface LookParams {
  brightness: number
  contrast: number
  saturate: number
  sepia: number
  hueRotate: number
  grayscale: number
}

export interface Look {
  id: LookId
  name: string
  description: string
  params: LookParams
}

const IDENTITY: LookParams = { brightness: 1, contrast: 1, saturate: 1, sepia: 0, hueRotate: 0, grayscale: 0 }

const look = (id: LookId, name: string, description: string, p: Partial<LookParams>): Look => ({ id, name, description, params: { ...IDENTITY, ...p } })

export const CAMERA_LOOKS: readonly Look[] = [
  look('original', 'Original', 'The camera as recorded.', {}),
  look('studio', 'Studio', 'Make it look finished.', { brightness: 1.04, contrast: 1.08, saturate: 1.08 }),
  look('cinema', 'Cinema', 'Teal-shadow blockbuster grade.', { contrast: 1.12, saturate: 0.9, hueRotate: -8, brightness: 0.98 }),
  look('film', 'Film', '35 mm print emulation.', { contrast: 1.06, saturate: 0.85, sepia: 0.18, brightness: 1.02 }),
  look('golden', 'Golden', 'Golden-hour glow.', { sepia: 0.3, saturate: 1.15, brightness: 1.06, contrast: 1.02 }),
  look('cream', 'Cream', 'Soft pastel portrait film.', { contrast: 0.92, saturate: 0.85, brightness: 1.08, sepia: 0.12 }),
  look('terra', 'Terra', 'Earthy editorial.', { sepia: 0.22, saturate: 0.95, contrast: 1.08, hueRotate: 6 }),
  look('moody', 'Moody', 'Dark, desaturated, warm skin.', { brightness: 0.9, contrast: 1.15, saturate: 0.75, sepia: 0.1 }),
  look('arctic', 'Arctic', 'Bright winter daylight.', { brightness: 1.08, saturate: 0.9, hueRotate: 12, contrast: 1.04 }),
  look('neon', 'Neon', 'For RGB-lit rooms.', { saturate: 1.4, contrast: 1.1, hueRotate: -12 }),
  look('punch', 'Punch', 'Vivid commercial pop.', { saturate: 1.35, contrast: 1.15, brightness: 1.03 }),
  look('fade', 'Fade', 'Sun-bleached nostalgia.', { contrast: 0.82, saturate: 0.8, brightness: 1.1, sepia: 0.15 }),
  look('mono', 'Mono', 'Warm black and white.', { grayscale: 1, sepia: 0.25, contrast: 1.08 })
]

export const DEFAULT_LOOK: LookId = 'original'

export function lookById(id: string): Look {
  return CAMERA_LOOKS.find((l) => l.id === id) ?? CAMERA_LOOKS[0]!
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const fmt = (v: number): string => (Math.round(v * 1000) / 1000).toString()

/** The look's parameters mixed towards the original by `intensity` (0–1). */
export function mixedLook(id: string, intensity: number): LookParams {
  const t = Math.min(1, Math.max(0, intensity))
  const p = lookById(id).params
  return {
    brightness: mix(1, p.brightness, t),
    contrast: mix(1, p.contrast, t),
    saturate: mix(1, p.saturate, t),
    sepia: mix(0, p.sepia, t),
    hueRotate: mix(0, p.hueRotate, t),
    grayscale: mix(0, p.grayscale, t)
  }
}

/** CSS/canvas filter functions for a look at an intensity; empty when it changes nothing. */
export function lookFilter(id: string, intensity: number): string {
  const p = mixedLook(id, intensity)
  const parts: string[] = []
  if (Math.abs(p.brightness - 1) > 0.001) parts.push(`brightness(${fmt(p.brightness)})`)
  if (Math.abs(p.contrast - 1) > 0.001) parts.push(`contrast(${fmt(p.contrast)})`)
  if (Math.abs(p.saturate - 1) > 0.001) parts.push(`saturate(${fmt(p.saturate)})`)
  if (p.sepia > 0.001) parts.push(`sepia(${fmt(p.sepia)})`)
  if (Math.abs(p.hueRotate) > 0.01) parts.push(`hue-rotate(${fmt(p.hueRotate)}deg)`)
  if (p.grayscale > 0.001) parts.push(`grayscale(${fmt(p.grayscale)})`)
  return parts.join(' ')
}

/** Spec 287's sharpen (0–1) as a 3 × 3 unsharp kernel for an SVG feConvolveMatrix. */
export function sharpenKernel(amount: number): string {
  const a = Math.min(1, Math.max(0, amount)) * 1.2
  const k = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0]
  return k.map(fmt).join(' ')
}

/** Id of the shared SVG filter element that holds the sharpen kernel. */
export const SHARPEN_FILTER_ID = 'recscene-camera-sharpen'

export interface LookConfig {
  lut: LookId
  lutIntensity: number
  sharpen01: number
}

/** The whole camera filter: look first, then sharpen through the shared SVG filter. */
export function cameraFilter(c: LookConfig): string {
  const parts = [lookFilter(c.lut, c.lutIntensity)]
  if (c.sharpen01 > 0.001) parts.push(`url(#${SHARPEN_FILTER_ID})`)
  return parts.filter(Boolean).join(' ')
}

export const sharpenLabel = (v: number): string => (v <= 0.001 ? 'Off' : `${Math.round(v * 100)}%`)
