/**
 * Background and screen (specs 165–188): what surrounds the recording in the
 * output frame and how the recording sits inside it.
 */
export type BackgroundType = 'gradient' | 'color' | 'image' | 'system'

export interface GradientStop {
  color: string
  at: number
}

export interface Gradient {
  start: { x: number; y: number }
  end: { x: number; y: number }
  stops: GradientStop[]
}

export interface InsetPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface BackgroundConfig {
  backgroundType: BackgroundType
  backgroundGradient: Gradient
  backgroundColor: string
  /** File name inside the project bundle, or null. */
  backgroundImage: string | null
  /** "<Collection>/<file>" of a bundled wallpaper. */
  backgroundSystemName: string
  /** 0–100, image and wallpaper types only. */
  backgroundBlur: number
  /** 0–35, percent of the frame on each side. */
  backgroundPaddingRatio: number
  /** 0–200 px at output scale. */
  windowBorderRadius: number
  shadowIntensity: number
  shadowAngle: number
  shadowDistance: number
  shadowBlur: number
  shadowIsDirectional: boolean
  insetPadding: InsetPadding
  insetColor: string
  insetAlpha: number
  enableDeviceMockup: boolean
  deviceFrameKey: string | null
  adjustDeviceFrameToRecordingSize: boolean
}

export const DEFAULT_GRADIENT: Gradient = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, stops: [{ color: '#03045e', at: 0 }, { color: '#caf0f8', at: 1 }] }
export const DEFAULT_WALLPAPER = 'macOS/tahoe-light'
export const PADDING_DEFAULT = 10
/** Spec 174 in Screen Studio 4.1: the slider runs 0–25 in whole steps. */
export const PADDING_MAX = 25
export const SHADOW_INTENSITY_DEFAULT = 0.75
export const SHADOW_INTENSITY_DIRECTIONAL = 0.4

export const defaultBackgroundConfig: BackgroundConfig = {
  backgroundType: 'gradient',
  backgroundGradient: DEFAULT_GRADIENT,
  backgroundColor: '#3F37C9',
  backgroundImage: null,
  backgroundSystemName: DEFAULT_WALLPAPER,
  backgroundBlur: 0,
  backgroundPaddingRatio: PADDING_DEFAULT,
  windowBorderRadius: 10,
  shadowIntensity: SHADOW_INTENSITY_DEFAULT,
  shadowAngle: 90,
  shadowDistance: 25,
  shadowBlur: 20,
  shadowIsDirectional: false,
  insetPadding: { top: 0, right: 0, bottom: 0, left: 0 },
  insetColor: '#000000',
  insetAlpha: 0.5,
  enableDeviceMockup: true,
  deviceFrameKey: null,
  adjustDeviceFrameToRecordingSize: true
}

/** Spec 171: 35 two-colour presets. Directions alternate so the grid reads as a palette. */
const PRESET_COLOURS: [string, string][] = [
  ['#03045e', '#caf0f8'], ['#0f0c29', '#24243e'], ['#1a2a6c', '#fdbb2d'], ['#0f2027', '#2c5364'], ['#000428', '#004e92'],
  ['#2b5876', '#4e4376'], ['#141e30', '#243b55'], ['#373b44', '#4286f4'], ['#1f4037', '#99f2c8'], ['#134e5e', '#71b280'],
  ['#5f45f0', '#8f79ff'], ['#4b1248', '#f0c27b'], ['#41295a', '#2f0743'], ['#8e2de2', '#4a00e0'], ['#da22ff', '#9733ee'],
  ['#ff416c', '#ff4b2b'], ['#f12711', '#f5af19'], ['#f7971e', '#ffd200'], ['#ee9ca7', '#ffdde1'], ['#fc5c7d', '#6a82fb'],
  ['#00c6ff', '#0072ff'], ['#36d1dc', '#5b86e5'], ['#11998e', '#38ef7d'], ['#00b09b', '#96c93d'], ['#a8ff78', '#78ffd6'],
  ['#c33764', '#1d2671'], ['#e65c00', '#f9d423'], ['#ff9966', '#ff5e62'], ['#654ea3', '#eaafc8'], ['#d53369', '#daae51'],
  ['#2c3e50', '#fd746c'], ['#7f00ff', '#e100ff'], ['#f953c6', '#b91d73'], ['#232526', '#414345'], ['#e0eafc', '#cfdef3']
]
const DIRECTIONS: [{ x: number; y: number }, { x: number; y: number }][] = [
  [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }],
  [{ x: 1, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }]
]
export const GRADIENT_PRESETS: Gradient[] = PRESET_COLOURS.map(([a, b], i) => {
  const [start, end] = DIRECTIONS[i % DIRECTIONS.length]!
  return { start, end, stops: [{ color: a, at: 0 }, { color: b, at: 1 }] }
})

/** CSS for a gradient across a box (spec 165). */
export function gradientCss(g: Gradient): string {
  const dx = g.end.x - g.start.x
  const dy = g.end.y - g.start.y
  const angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
  const stops = [...g.stops].sort((a, b) => a.at - b.at).map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(', ')
  return `linear-gradient(${angle}deg, ${stops})`
}

export function isHexColor(s: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)
}

/** Spec 183: a hex colour with alpha as rgba(). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** The padding share clamped to the slider's range. */
export const paddingShare = (paddingPercent: number): number => Math.max(0, Math.min(PADDING_MAX, paddingPercent)) / 100

/**
 * Spec 174 and 181, measured on Screen Studio frame by frame: the gap is the
 * same number of pixels on all four sides and it is a share of the
 * recording's displayed shorter side (25% → a gap a quarter of the
 * recording's height). The recording plus its gap is fitted into the frame
 * and centred, so a frame of another ratio letterboxes equally on two sides.
 * The inset band sits between the gap and the recording. Boxes in frame pixels.
 */
export function screenLayout(frame: { width: number; height: number }, recording: { width: number; height: number }, paddingPercent: number, inset: InsetPadding, scale = 1): { outer: Box; screen: Box } {
  const p = paddingShare(paddingPercent)
  const band = { top: inset.top * scale, right: inset.right * scale, bottom: inset.bottom * scale, left: inset.left * scale }
  const recW = Math.max(1, recording.width)
  const recH = Math.max(1, recording.height)
  const short = Math.min(recW, recH)
  // Scale s so that the recording, its inset band and a gap of p·short·s on every side fit the frame.
  const sW = (frame.width - band.left - band.right) / (recW + 2 * p * short)
  const sH = (frame.height - band.top - band.bottom) / (recH + 2 * p * short)
  const s = Math.max(0, Math.min(sW, sH))
  const screenW = Math.max(1, recW * s)
  const screenH = Math.max(1, recH * s)
  const outerW = screenW + band.left + band.right
  const outerH = screenH + band.top + band.bottom
  const outer = { x: (frame.width - outerW) / 2, y: (frame.height - outerH) / 2, width: outerW, height: outerH }
  const screen = { x: outer.x + band.left, y: outer.y + band.top, width: screenW, height: screenH }
  return { outer, screen }
}

/** Spec 176–180: CSS box-shadow for the recording box. */
export function shadowCss(c: Pick<BackgroundConfig, 'shadowIntensity' | 'shadowAngle' | 'shadowDistance' | 'shadowBlur' | 'shadowIsDirectional'>, scale = 1): string {
  if (c.shadowIntensity <= 0) return 'none'
  const rad = (c.shadowAngle * Math.PI) / 180
  const dx = Math.cos(rad) * c.shadowDistance * scale
  const dy = Math.sin(rad) * c.shadowDistance * scale
  const blur = c.shadowBlur * scale
  const color = `rgba(0, 0, 0, ${c.shadowIntensity.toFixed(2)})`
  if (c.shadowIsDirectional) return `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${(blur * 0.5).toFixed(1)}px ${color}`
  return `${(dx * 0.5).toFixed(1)}px ${(dy * 0.5).toFixed(1)}px ${blur.toFixed(1)}px ${color}, 0 0 ${(blur * 2).toFixed(1)}px ${withAlpha('#000000', c.shadowIntensity * 0.35)}`
}

/** Spec 181: one slider writes all four sides and keeps the corner radius consistent. */
export function applyInset(c: BackgroundConfig, inset: number, baseRadius = 10): BackgroundConfig {
  const v = Math.max(0, Math.min(60, Math.round(inset)))
  return { ...c, insetPadding: { top: v, right: v, bottom: v, left: v }, windowBorderRadius: Math.round(v + baseRadius) }
}

export const insetValue = (c: BackgroundConfig): number => Math.max(c.insetPadding.top, c.insetPadding.right, c.insetPadding.bottom, c.insetPadding.left)

/** Spec 180: switching directional on sets 0.4, off restores 0.75. */
export function setDirectional(c: BackgroundConfig, on: boolean): BackgroundConfig {
  return { ...c, shadowIsDirectional: on, shadowIntensity: on ? SHADOW_INTENSITY_DIRECTIONAL : SHADOW_INTENSITY_DEFAULT }
}

/** Spec 170: any wallpaper, possibly the current one. */
export function randomWallpaper(names: readonly string[], random = Math.random): string {
  return names[Math.floor(random() * names.length)] ?? DEFAULT_WALLPAPER
}

/** Spec 168: favourites live in app preferences. */
export function toggleFavourite(list: readonly string[], name: string): string[] {
  return list.includes(name) ? list.filter((n) => n !== name) : [...list, name]
}
