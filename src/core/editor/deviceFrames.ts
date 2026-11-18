/**
 * Device mockups (specs 185–187, Background board): frames drawn from
 * geometry rather than PNGs, so every colour and orientation is a few
 * numbers. The recording sits in the frame's screen rectangle.
 */

export type DeviceFamily = 'MacBook Air' | 'MacBook Pro' | 'iMac' | 'Studio Display' | 'Pro Display XDR' | 'iPad' | 'iPhone'

export interface DeviceFrame {
  key: string
  name: string
  family: DeviceFamily
  colour: string
  /** Bezel colour and (optionally) a second tone for chins and stands. */
  tone: string
  tone2: string
  /** The device's screen in pixels, used by the Perfect filter. */
  screen: { width: number; height: number }
  /** Bezel thickness as a fraction of the screen's shorter side. */
  bezel: { top: number; right: number; bottom: number; left: number }
  /** Corner radius of the frame and of the screen, as fractions of the shorter side. */
  radius: number
  screenRadius: number
  /** Decorations drawn on top of the bezel. */
  notch: 'none' | 'notch' | 'island' | 'camera'
  /** Extra body below the screen: a MacBook lip, an iMac chin, a display stand. */
  chin: 'none' | 'lip' | 'chin' | 'stand'
  orientation: 'landscape' | 'portrait'
}

const def = (p: Omit<DeviceFrame, 'key'>): DeviceFrame => ({ ...p, key: `${p.family}-${p.name}-${p.colour}-${p.orientation}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') })

const macColours: [string, string, string][] = [['Midnight', '#1d2230', '#161a25'], ['Silver', '#d6d7d9', '#bfc0c3'], ['Space Gray', '#7c7d80', '#636466'], ['Starlight', '#e9e2d6', '#d2cabc']]
const imacColours: [string, string, string][] = [['Blue', '#3d6fa8', '#5f8fc4'], ['Green', '#3f8f6c', '#6bb093'], ['Orange', '#d8742d', '#eb9c5a'], ['Pink', '#d16c87', '#e59bb0'], ['Purple', '#6c5aa8', '#9486c6'], ['Silver', '#c9cacc', '#e1e2e4'], ['Yellow', '#d9b63b', '#ecd270']]
const ipadColours: [string, string, string][] = [['Space Gray', '#3a3b40', '#2a2b2f'], ['Silver', '#d9dadc', '#c2c3c6'], ['Blue', '#8aa7c9', '#6f8fb3'], ['Pink', '#e9b6c3', '#d49aa9'], ['Purple', '#b9b1d9', '#9f96c4']]
const iphoneColours: [string, string, string][] = [['Natural Titanium', '#9a9389', '#7f7970'], ['Blue Titanium', '#45515e', '#36414c'], ['White Titanium', '#e6e3dd', '#cfccc5'], ['Black Titanium', '#2a2b2d', '#1c1d1f']]

function laptop(family: DeviceFamily, name: string, screen: { width: number; height: number }, colours: [string, string, string][], notch: DeviceFrame['notch']): DeviceFrame[] {
  return colours.map(([colour, tone, tone2]) => def({ name, family, colour, tone, tone2, screen, bezel: { top: 0.045, right: 0.04, bottom: 0.045, left: 0.04 }, radius: 0.04, screenRadius: 0.012, notch, chin: 'lip', orientation: 'landscape' }))
}

function tablet(name: string, screen: { width: number; height: number }, colours: [string, string, string][]): DeviceFrame[] {
  return colours.flatMap(([colour, tone, tone2]) => (['landscape', 'portrait'] as const).map((orientation) => def({ name, family: 'iPad', colour, tone, tone2, screen: orientation === 'landscape' ? screen : { width: screen.height, height: screen.width }, bezel: { top: 0.07, right: 0.07, bottom: 0.07, left: 0.07 }, radius: 0.09, screenRadius: 0.03, notch: 'camera', chin: 'none', orientation })))
}

function phone(name: string, screen: { width: number; height: number }, colours: [string, string, string][]): DeviceFrame[] {
  return colours.flatMap(([colour, tone, tone2]) => (['portrait', 'landscape'] as const).map((orientation) => def({ name, family: 'iPhone', colour, tone, tone2, screen: orientation === 'portrait' ? screen : { width: screen.height, height: screen.width }, bezel: { top: 0.045, right: 0.045, bottom: 0.045, left: 0.045 }, radius: 0.16, screenRadius: 0.12, notch: 'island', chin: 'none', orientation })))
}

export const DEVICE_FRAMES: readonly DeviceFrame[] = [
  ...laptop('MacBook Air', 'MacBook Air M2', { width: 2560, height: 1664 }, macColours, 'notch'),
  ...laptop('MacBook Pro', 'MacBook Pro 14-inch', { width: 3024, height: 1964 }, macColours.slice(1, 3), 'notch'),
  ...laptop('MacBook Pro', 'MacBook Pro 16-inch', { width: 3456, height: 2234 }, macColours.slice(1, 3), 'notch'),
  ...imacColours.map(([colour, tone, tone2]) => def({ name: 'iMac 24-inch', family: 'iMac', colour, tone, tone2, screen: { width: 4480, height: 2520 }, bezel: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }, radius: 0.02, screenRadius: 0.004, notch: 'camera', chin: 'chin', orientation: 'landscape' })),
  def({ name: 'Studio Display', family: 'Studio Display', colour: 'Silver', tone: '#cfd0d3', tone2: '#b7b8bb', screen: { width: 5120, height: 2880 }, bezel: { top: 0.04, right: 0.04, bottom: 0.04, left: 0.04 }, radius: 0.015, screenRadius: 0.003, notch: 'camera', chin: 'stand', orientation: 'landscape' }),
  def({ name: 'Pro Display XDR', family: 'Pro Display XDR', colour: 'Silver', tone: '#bfc0c3', tone2: '#a8a9ac', screen: { width: 6016, height: 3384 }, bezel: { top: 0.03, right: 0.03, bottom: 0.03, left: 0.03 }, radius: 0.01, screenRadius: 0.002, notch: 'none', chin: 'stand', orientation: 'landscape' }),
  ...tablet('iPad Pro 13-inch', { width: 2752, height: 2064 }, ipadColours.slice(0, 2)),
  ...tablet('iPad Pro 11-inch', { width: 2420, height: 1668 }, ipadColours.slice(0, 2)),
  ...tablet('iPad Air', { width: 2360, height: 1640 }, ipadColours),
  ...tablet('iPad mini', { width: 2266, height: 1488 }, ipadColours.slice(0, 4)),
  ...phone('iPhone 15 Pro', { width: 1179, height: 2556 }, iphoneColours),
  ...phone('iPhone 15 Pro Max', { width: 1290, height: 2796 }, iphoneColours)
]

export type FrameFilter = 'perfect' | 'flexible'

/** Spec 186: Perfect shows only frames whose screen equals the recording size; Flexible shows all. */
export function framesFor(recording: { width: number; height: number }, filter: FrameFilter): DeviceFrame[] {
  if (filter === 'flexible') return [...DEVICE_FRAMES]
  return DEVICE_FRAMES.filter((f) => f.screen.width === recording.width && f.screen.height === recording.height)
}

export function frameByKey(key: string | null): DeviceFrame | null {
  return key ? DEVICE_FRAMES.find((f) => f.key === key) ?? null : null
}

export interface FrameLayout {
  /** The whole device box inside the given area. */
  frame: { x: number; y: number; width: number; height: number }
  /** Where the recording goes. */
  screen: { x: number; y: number; width: number; height: number }
  radius: number
  screenRadius: number
  /** Height of the chin, lip or stand below the screen, in px. */
  chinHeight: number
}

/**
 * Specs 185 and 187: fits the device into `area`. With `adjust` the frame's
 * screen takes the recording's aspect ratio (the bezel stretches); without
 * it the frame keeps the device's own screen ratio and the recording is
 * letterboxed inside.
 */
export function layoutFrame(frame: DeviceFrame, area: { width: number; height: number }, recording: { width: number; height: number }, adjust: boolean): FrameLayout {
  const screenRatio = adjust && recording.height > 0 ? recording.width / recording.height : frame.screen.width / frame.screen.height
  const chinRatio = frame.chin === 'lip' ? 0.06 : frame.chin === 'chin' ? 0.22 : frame.chin === 'stand' ? 0.2 : 0
  const b = frame.bezel
  // Bezels and the chin are fractions of the screen's shorter side; solve for the screen height h that fits the area.
  const k = screenRatio >= 1 ? 1 : screenRatio // shorter side as a multiple of h
  const frameWPerH = screenRatio + (b.left + b.right) * k
  const frameHPerH = 1 + (b.top + b.bottom + chinRatio) * k
  const h = Math.max(1, Math.min(area.width / frameWPerH, area.height / frameHPerH))
  const w = h * screenRatio
  const shorter = h * k
  const bezelL = b.left * shorter
  const bezelR = b.right * shorter
  const bezelT = b.top * shorter
  const bezelB = b.bottom * shorter
  const chinHeight = chinRatio * shorter
  const frameW = w + bezelL + bezelR
  const frameH = h + bezelT + bezelB + chinHeight
  const fx = (area.width - frameW) / 2
  const fy = (area.height - frameH) / 2
  return {
    frame: { x: fx, y: fy, width: frameW, height: frameH },
    screen: { x: fx + bezelL, y: fy + bezelT, width: w, height: h },
    radius: frame.radius * shorter,
    screenRadius: frame.screenRadius * shorter,
    chinHeight
  }
}

export const NO_MOCKUPS = 'No mockups available for that device'

export function frameLabel(f: DeviceFrame): string {
  return `${f.name} · ${f.colour}${f.family === 'iPad' || f.family === 'iPhone' ? ` · ${f.orientation}` : ''}`
}
