import { clipOutputMs, outputOffsets, sourceToOutput, type Clip } from '@core/editor/clips'
import { maskLabel, type Mask } from '@core/editor/masks'
import { speedLabel } from '@core/editor/playback'
import { isAutoType, type ZoomRange } from '@core/editor/zooms'
import { formatClock } from '@core/recordingPicker'
import { Icon } from './railIcons'

export type ItemsKind = 'zooms' | 'clips' | 'masks'

interface Props {
  kind: ItemsKind
  zooms: ZoomRange[]
  clips: Clip[]
  masks: Mask[]
  /** Output time of the playhead, to mark the item under it. */
  timeMs: number
  onSelectZoom: (id: string) => void
  onSelectClip: (id: string) => void
  onSelectMask: (id: string) => void
  onAdd: () => void
}

const COPY: Record<ItemsKind, { title: string; color: string; empty: string; add: string | null; hint: string }> = {
  zooms: { title: 'Zooms', color: 'var(--zoom)', empty: 'No zooms yet.', add: 'Add zoom at playhead', hint: 'Zooms follow clicks automatically; click one on the timeline or in this list to edit it.' },
  clips: { title: 'Clips', color: 'var(--clip)', empty: 'No clips.', add: null, hint: 'C splits the clip at the playhead; drag the yellow handles to trim; ⌫ removes the selected clip.' },
  masks: { title: 'Masks', color: 'var(--mask)', empty: 'No masks yet.', add: 'Add mask at playhead', hint: 'A mask blurs or highlights part of the screen for a stretch of the video.' }
}

/** The Zooms, Clips and Masks rail sections (Main board): the project's items as a list, the one at the playhead marked. */
export function ItemsPanel({ kind, zooms, clips, masks, timeMs, onSelectZoom, onSelectClip, onSelectMask, onAdd }: Props): React.JSX.Element {
  const copy = COPY[kind]
  const offsets = outputOffsets(clips)
  const out = (sourceMs: number): number | null => sourceToOutput(clips, sourceMs)
  const rows: { id: string; label: string; sub: string; at: boolean; off: boolean; pick: () => void }[] =
    kind === 'zooms'
      ? zooms.map((z) => {
          const a = out(z.startMs)
          const b = out(z.endMs)
          return { id: z.id, label: `${isAutoType(z.type) ? 'Auto' : 'Manual'} · ${Math.round(z.zoom * 100)}%`, sub: a === null || b === null ? 'outside the clips' : `${formatClock(a)} – ${formatClock(b)}`, at: a !== null && b !== null && timeMs >= a && timeMs < b, off: !!z.isDisabled, pick: () => onSelectZoom(z.id) }
        })
      : kind === 'clips'
        ? clips.map((c, i) => {
            const a = offsets[i] ?? 0
            const b = a + clipOutputMs(c)
            return { id: c.id, label: `${speedLabel(c.speed)} · ${formatClock(clipOutputMs(c))}${c.hideCursor ? ' · cursor hidden' : ''}`, sub: `${formatClock(a)} – ${formatClock(b)}`, at: timeMs >= a && timeMs < b, off: false, pick: () => onSelectClip(c.id) }
          })
        : masks.map((m) => {
            const a = out(m.sourceStartMs)
            const b = out(m.sourceEndMs)
            return { id: m.id, label: maskLabel(m), sub: a === null || b === null ? 'outside the clips' : `${formatClock(a)} – ${formatClock(b)}`, at: a !== null && b !== null && timeMs >= a && timeMs < b, off: !!m.isDisabled, pick: () => onSelectMask(m.id) }
          })

  return (
    <div className="panel-body">
      <p className="note">{copy.hint}</p>
      {rows.length === 0 ? (
        <p className="muted">{copy.empty}</p>
      ) : (
        <ul className="items" aria-label={copy.title}>
          {rows.map((r, i) => (
            <li key={r.id}>
              <button type="button" className={`items__row${r.at ? ' items__row--at' : ''}${r.off ? ' items__row--off' : ''}`} onClick={r.pick}>
                <span className="tl__dot" style={{ background: copy.color }} />
                <span className="items__text"><b>{i + 1} · {r.label}</b><small>{r.sub}{r.off ? ' · disabled' : ''}{r.at ? ' · at playhead' : ''}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {copy.add && (
        <button type="button" className="btn btn--ghost" onClick={onAdd}><Icon name={kind} size={14} /> {copy.add}</button>
      )}
    </div>
  )
}
