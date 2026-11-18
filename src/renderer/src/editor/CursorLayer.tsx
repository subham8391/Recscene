import { useEffect, useRef } from 'react'
import { springStep } from '@core/editor/camera'
import type { CursorSample } from '@core/editor/camera'
import { activeClickEffects, cursorAtRest, cursorBlurPx, cursorHotspot, cursorRotation, cursorStep, cursorTarget, cursorTypeAt, isPressed, removeShakes, type CursorConfig, type CursorMotion, type CursorType, type CursorTypeChange } from '@core/editor/cursor'
import { spriteSvg } from './cursorSprites'
import type { ClickEvent } from '@core/project'

interface Props {
  samples: CursorSample[]
  /** Specs 134–136: recorded cursor type changes. */
  cursorTypes: CursorTypeChange[]
  clicks: ClickEvent[]
  config: CursorConfig
  recording: { width: number; height: number }
  /** Source range of the recording. */
  startMs: number
  endMs: number
  /** A function so the layer reads the latest time each frame without re-rendering. */
  sourceMs: () => number
  clipState: () => { hidden: boolean; smooth: boolean }
  playing: () => boolean
  /** Size of the layer on screen, so blur and size scale with it. */
  boxWidth: () => number
  soundUrl: (kind: 'down' | 'up') => string | null
}


/**
 * The cursor drawn over the recording (specs 126–147), inside the camera layer
 * so it zooms with the screen. Animated per frame outside React state.
 */
export function CursorLayer({ samples, clicks, config, recording, startMs, endMs, sourceMs, clipState, playing, boxWidth, soundUrl, cursorTypes }: Props): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const sprite = useRef<HTMLDivElement>(null)
  const svgHost = useRef<SVGSVGElement>(null)
  const drawn = useRef<{ set: string; type: CursorType } | null>(null)
  const effects = useRef<HTMLDivElement>(null)
  const motion = useRef<CursorMotion>(cursorAtRest({ x: 0.5, y: 0.5 }))
  const opacity = useRef({ value: 1, velocity: 0 })
  const lastClickPlayed = useRef<number>(-1)
  const latest = useRef({ samples, clicks, config, recording, startMs, endMs })
  useEffect(() => {
    latest.current = { samples, clicks, config, recording, startMs, endMs }
  })
  const cleaned = useRef<CursorSample[]>([])
  const cleanedFor = useRef<{ samples: CursorSample[]; threshold: number } | null>(null)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number): void => {
      const dt = Math.min(64, now - last)
      last = now
      const { samples: raw, clicks: cl, config: c, recording: rec, startMs: s0, endMs: s1 } = latest.current
      if (!cleanedFor.current || cleanedFor.current.samples !== raw || cleanedFor.current.threshold !== c.removeCurshorShakeTreshold) {
        cleaned.current = removeShakes(raw, c.removeCurshorShakeTreshold, rec)
        cleanedFor.current = { samples: raw, threshold: c.removeCurshorShakeTreshold }
      }
      const t = sourceMs()
      const clip = clipState()
      const target = cursorTarget(cleaned.current, t, { startMs: s0, endMs: s1, config: c, clipHidden: clip.hidden })
      const smooth = !c.disableMouseMovementSpring && clip.smooth
      const pressed = isPressed(cl, t)
      motion.current = cursorStep(motion.current, target.position, dt, c.mouseMovementSpring, smooth, pressed, c.mouseClickSpring)
      opacity.current = springStep(opacity.current, target.visible ? 1 : 0, dt, { stiffness: 300, damping: 30, mass: 1 })
      const el = sprite.current
      const hostEl = host.current
      if (el && hostEl) {
        const w = hostEl.clientWidth
        const h = hostEl.clientHeight
        const m = motion.current
        const size = Math.max(8, h * 0.028 * c.cursorSize)
        const rot = cursorRotation(m, c.cursorRotateOnXMovementRatio, c.cursorBaseRotation)
        const blur = cursorBlurPx(m, boxWidth(), c.motionBlurAmount, c.motionBlurCursorAmount)
        // Specs 125, 134–136: the sprite for the recorded cursor type, anchored at its hotspot.
        const type = cursorTypeAt(cursorTypes, t, c)
        if (!drawn.current || drawn.current.set !== c.cursorSet.id || drawn.current.type !== type) {
          drawn.current = { set: c.cursorSet.id, type }
          if (svgHost.current) svgHost.current.innerHTML = spriteSvg(c.cursorSet.id, type)
        }
        const hot = cursorHotspot(type)
        const rotateHot = type === 'pointer' ? rot : 0
        el.style.transformOrigin = `${((hot.x / 24) * 100).toFixed(1)}% ${((hot.y / 24) * 100).toFixed(1)}%`
        el.style.transform = `translate(${(m.x.value * w - (hot.x / 24) * size).toFixed(1)}px, ${(m.y.value * h - (hot.y / 24) * size).toFixed(1)}px) rotate(${rotateHot.toFixed(1)}deg) scale(${m.press.value.toFixed(3)})`
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        el.style.opacity = String(Math.max(0, Math.min(1, opacity.current.value)))
        el.style.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : ''
      }
      // Click effects (spec 141): one ring per active click, timed by progress.
      const fx = effects.current
      if (fx && hostEl) {
        const active = c.clickEffect && target.visible ? activeClickEffects(cl, t) : []
        while (fx.children.length > active.length) fx.lastElementChild?.remove()
        while (fx.children.length < active.length) {
          const ring = document.createElement('span')
          ring.className = 'cursor__ring'
          fx.appendChild(ring)
        }
        active.forEach((a, i) => {
          const ring = fx.children[i] as HTMLElement
          const base = Math.max(10, hostEl.clientHeight * 0.028 * c.cursorSize) * 1.6
          const grow = c.clickEffect === 'ripple' ? 1 + a.progress * 2.2 : 1
          ring.style.transform = `translate(${(a.click.position.x * hostEl.clientWidth).toFixed(1)}px, ${(a.click.position.y * hostEl.clientHeight).toFixed(1)}px) translate(-50%, -50%) scale(${grow.toFixed(3)})`
          ring.style.width = `${base}px`
          ring.style.height = `${base}px`
          ring.style.opacity = String(1 - a.progress)
        })
      }
      // Click sounds (spec 142) in preview, only while playing at ≤ 2× (handled by the caller's rate).
      if (c.clickSoundEffect && playing()) {
        const due = cl.find((k) => k.timeMs > lastClickPlayed.current && k.timeMs <= t && t - k.timeMs < 200)
        if (due) {
          lastClickPlayed.current = due.timeMs
          const url = soundUrl('down')
          if (url) {
            const a = new Audio(url)
            a.volume = Math.max(0, Math.min(1, c.clickSoundEffectVolume))
            void a.play().catch(() => undefined)
          }
        }
      } else if (!playing()) lastClickPlayed.current = t
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={host} className="cursor" aria-hidden="true">
      <div ref={effects} className="cursor__fx" />
      <div ref={sprite} className="cursor__sprite">
        <svg ref={svgHost} viewBox="0 0 24 24" width="100%" height="100%" />
      </div>
    </div>
  )
}
