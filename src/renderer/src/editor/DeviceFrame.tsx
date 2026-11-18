import type { DeviceFrame as Frame, FrameLayout } from '@core/editor/deviceFrames'

interface Props {
  frame: Frame
  layout: FrameLayout
  /** Offset of the layout's area inside the output box. */
  offset: { x: number; y: number }
  shadow: string
}

/** The device bezel, chin and camera drawn around the recording (specs 185–187); the screen itself is the stage's inner box. */
export function DeviceFrameLayer({ frame, layout: l, offset, shadow }: Props): React.JSX.Element {
  const f = l.frame
  const s = l.screen
  const shorter = Math.min(s.width, s.height)
  const style: React.CSSProperties = { left: offset.x + f.x, top: offset.y + f.y, width: f.width, height: f.height, borderRadius: l.radius, background: frame.tone, boxShadow: shadow }
  return (
    <div className="devframe" style={style} aria-hidden="true">
      {frame.notch === 'notch' && <span className="devframe__notch" style={{ left: '50%', top: 0, width: shorter * 0.2, height: Math.max(4, (s.y - f.y) * 0.9) }} />}
      {frame.notch === 'island' && <span className="devframe__island" style={{ left: '50%', top: (s.y - f.y) + shorter * 0.03, width: shorter * 0.28, height: shorter * 0.08 }} />}
      {frame.notch === 'camera' && <span className="devframe__camera" style={{ left: '50%', top: (s.y - f.y) / 2 }} />}
      {frame.chin === 'lip' && <span className="devframe__lip" style={{ height: l.chinHeight, background: frame.tone2 }} />}
      {frame.chin === 'chin' && <span className="devframe__chin" style={{ height: l.chinHeight, background: frame.tone2 }} />}
      {frame.chin === 'stand' && <span className="devframe__stand" style={{ height: l.chinHeight, width: s.width * 0.22, background: frame.tone2 }} />}
    </div>
  )
}
