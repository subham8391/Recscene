import { captionMetrics, cueAt, spokenIndex, type CaptionConfig, type Cue } from '@core/editor/captions'

interface Props {
  cues: Cue[]
  config: CaptionConfig
  sourceMs: number
  /** The screen box inside the output, and the output box, in stage pixels. */
  screen: { x: number; y: number; width: number; height: number }
  output: { width: number; height: number }
}

/** The caption line (specs 208–209, Captions board): one cue at a time, the spoken word emphasised. */
export function CaptionLayer({ cues, config, sourceMs, screen, output }: Props): React.JSX.Element | null {
  if (!config.showTranscript || screen.height <= 0) return null
  const cue = cueAt(cues, sourceMs)
  if (!cue) return null
  const m = captionMetrics(screen.height, config.transcriptSizeRatio)
  const spoken = config.captionHighlightWord ? spokenIndex(cue, sourceMs) : -1
  const style: React.CSSProperties = { fontSize: m.font, padding: `${m.pad * 0.6}px ${m.pad}px`, borderRadius: m.radius, maxWidth: screen.width * m.maxWidth, left: screen.x + screen.width / 2 }
  if (config.captionPosition === 'top') style.top = screen.y + m.margin
  else if (config.captionPosition === 'under-screen') style.top = Math.min(output.height - m.font * 2, screen.y + screen.height + m.margin * 0.3)
  else style.bottom = output.height - (screen.y + screen.height) + m.margin
  return (
    <div className={`caption${config.captionBackground ? ' caption--box' : ' caption--plain'}`} aria-label="Caption" style={style}>
      {cue.words.map((w, i) => (
        <span key={i} className={i === spoken ? 'caption__word caption__word--on' : 'caption__word'}>{w.text}{i < cue.words.length - 1 ? ' ' : ''}</span>
      ))}
    </div>
  )
}
