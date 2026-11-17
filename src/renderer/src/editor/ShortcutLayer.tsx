import { keyWidth, labelAt, labelMetrics, type ShortcutConfig, type ShortcutEvent } from '@core/editor/shortcuts'

interface Props {
  events: ShortcutEvent[]
  config: ShortcutConfig
  sourceMs: number
  /** The screen box the label sits on, in stage pixels. */
  frame: { width: number; height: number }
}

/** The pressed-shortcut label (specs 199–201): key caps at the bottom centre of the screen, fading after the press. */
export function ShortcutLayer({ events, config, sourceMs, frame }: Props): React.JSX.Element | null {
  const shown = labelAt(events, sourceMs, config)
  if (!shown || frame.height <= 0) return null
  const m = labelMetrics(frame.height, config.shortcutsSizeRatio)
  return (
    <div className="keycaps" aria-label="Pressed shortcut" style={{ bottom: m.bottom, gap: m.gap, padding: m.pad, borderRadius: m.radius + m.pad, opacity: shown.opacity }}>
      {shown.event.keys.map((k, i) => (
        <span key={i} className="keycaps__key" style={{ minWidth: keyWidth(k, m.key), height: m.key, fontSize: m.font, borderRadius: m.radius, padding: `0 ${m.key * 0.2}px` }}>{k}</span>
      ))}
    </div>
  )
}
