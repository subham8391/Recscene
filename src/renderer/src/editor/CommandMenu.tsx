import { useState } from 'react'
import { filterActions, formatShortcut, groupActions, type ActionDef } from '@core/editor/actions'

interface Props {
  mode: 'command' | 'guide'
  /** The registry with the user's shortcut overrides applied (spec 66). */
  actions: readonly ActionDef[]
  onRun: (id: string) => void
  onClose: () => void
}

/** ⌘K command menu and ⌘/ shortcuts guide (specs 64–65) over the same action list. */
export function CommandMenu({ mode, actions, onRun, onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const results = filterActions(query, actions)
  const groups = groupActions(results)

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') setIndex((i) => Math.min(results.length - 1, i + 1))
    else if (e.key === 'ArrowUp') setIndex((i) => Math.max(0, i - 1))
    else if (e.key === 'Enter' && mode === 'command') {
      const a = results[index]
      if (a) onRun(a.id)
    } else return
    e.preventDefault()
    e.stopPropagation()
  }

  const row = (a: ActionDef): React.JSX.Element => (
    <button key={a.id} type="button" role="option" aria-selected={results[index]?.id === a.id} className={`cmd__row${results[index]?.id === a.id ? ' cmd__row--on' : ''}`} onClick={() => (mode === 'command' ? onRun(a.id) : undefined)} onMouseEnter={() => setIndex(results.indexOf(a))}>
      <span>{a.label}</span>
      {a.shortcut && <kbd>{formatShortcut(a.shortcut)}</kbd>}
    </button>
  )

  return (
    <div className="cmd__backdrop" onMouseDown={onClose}>
      <div role="dialog" aria-label={mode === 'command' ? 'Command menu' : 'Shortcuts Guide'} className={`cmd${mode === 'guide' ? ' cmd--guide' : ''}`} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmd__head">
          {mode === 'guide' && <span className="cmd__title">⌨ Shortcuts Guide</span>}
          <input autoFocus className="cmd__input" placeholder={mode === 'command' ? 'Type a command…' : 'Filter shortcuts...'} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0) }} />
        </div>
        <div className="cmd__list" role="listbox">
          {results.length === 0 && <p className="muted cmd__empty">{mode === 'command' ? 'No matching commands' : 'No shortcuts found'}</p>}
          {groups.map((g) => (
            <div key={g.group} className="cmd__group">
              <h3>{g.group}</h3>
              {g.actions.map(row)}
            </div>
          ))}
        </div>
        <div className="cmd__foot muted">{mode === 'command' ? '↑↓ to choose · ↩ to run · ⎋ to close' : '⎋ closes · shortcuts can be remapped in Settings › Shortcuts (coming with spec 66)'}</div>
      </div>
    </div>
  )
}
