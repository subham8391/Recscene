import { SPRING_FOCUSED, SPRING_SMOOTH } from '@core/editor/camera'
import type { Project } from '@core/project'

interface Props {
  config: Project['config']
  /** Spec 70: the experimental preference that switches the preview's motion blur. */
  motionBlur: boolean
  onConfig: (patch: Partial<Project['config']>) => void
  onMotionBlur: (on: boolean) => void
}

/** The Animation rail section (Main board): how the camera moves between zooms, shared by every zoom. */
export function AnimationPanel({ config, motionBlur, onConfig, onMotionBlur }: Props): React.JSX.Element {
  const s = config.screenMovementSpring
  const preset = s.stiffness === SPRING_SMOOTH.stiffness ? 'smooth' : s.stiffness === SPRING_FOCUSED.stiffness ? 'focused' : null
  return (
    <div className="panel-body">
      <section className="sec">
        <h3>Movement style</h3>
        <div className="modes" role="radiogroup" aria-label="Movement style">
          <button type="button" role="radio" aria-checked={preset === 'focused'} className={`mode${preset === 'focused' ? ' mode--on' : ''}`} onClick={() => onConfig({ screenMovementSpring: { ...SPRING_FOCUSED } })}>
            <b>Focused</b><small>Settles quickly so the content is easy to read.</small>
          </button>
          <button type="button" role="radio" aria-checked={preset === 'smooth'} className={`mode${preset === 'smooth' ? ' mode--on' : ''}`} onClick={() => onConfig({ screenMovementSpring: { ...SPRING_SMOOTH } })}>
            <b>Smooth</b><small>More fluid. For creative content that is not about reading.</small>
          </button>
        </div>
        <p className="note">Applies to every zoom and to the camera following the cursor. Per-zoom options (instant, start early) are on each zoom.</p>
      </section>
      <section className="sec">
        <label className="toggle"><span><b>Screen motion blur</b><small>Blurs the screen while it moves, in the preview and the export. Off makes the preview faster.</small></span><input type="checkbox" checked={motionBlur} onChange={(e) => onMotionBlur(e.target.checked)} /></label>
      </section>
    </div>
  )
}
