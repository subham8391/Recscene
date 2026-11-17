import { useEffect, useRef } from 'react'
import { springStep } from '@core/editor/camera'
import type { CursorSample } from '@core/editor/camera'
import { activeClickEffects, cursorAtRest, cursorBlurPx, cursorRotation, cursorStep, cursorTarget, isPressed, removeShakes, type CursorConfig, type CursorMotion, type CursorSetId } from '@core/editor/cursor'
import type { ClickEvent } from '@core/project'

interface Props {
  samples: CursorSample[]
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

/** Cursor sprites (spec 125): pointer only until cursor types are recorded. */
function CursorSprite({ set }: { set: CursorSetId }): React.JSX.Element {
  if (set === 'touch') return <circle cx="12" cy="12" r="9" fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.45)" strokeWidth="2" />
  if (set === 'halloween') return <path d="M3 2l6 18 2.6-6.2 6.3-2.4z" fill="#ff8a1f" stroke="#2b0a00" strokeWidth="1.6" strokeLinejoin="round" />
  if (set === 'macos-tahoe') return <path d="M4 2.5l5.3 15.8 2.4-5.6 5.9-1.9z" fill="#111" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
  return <path d="M3.5 2l5.5 16 2.3-5.3 6.2-2.2z" fill="#000" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
}

/**
 * The cursor drawn over the recording (specs 126–147), inside the camera layer
 * so it zooms with the screen. Animated per frame outside React state.
 */
export function CursorLayer({ samples, clicks, config, recording, startMs, endMs, sourceMs, clipState, playing, boxWidth, soundUrl }: Props): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const sprite = useRef<HTMLDivElement>(null)
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
        el.style.transform = `translate(${(m.x.value * w).toFixed(1)}px, ${(m.y.value * h).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${m.press.value.toFixed(3)})`
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
        <svg viewBox="0 0 24 24" width="100%" height="100%"><CursorSprite set={config.cursorSet.id} /></svg>
      </div>
    </div>
  )
}
