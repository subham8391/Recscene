import { Icon } from './railIcons'
import { useEffect, useState } from 'react'
import { presetSummary, REMOVE_CONFIRM, type Preset } from '@core/editor/presets'
import type { ProjectConfig } from '@core/project'
import type { ProjectSummary } from '@core/projectsHome'

interface Props {
  config: ProjectConfig
  currentProjectDir: string
  onApply: (preset: Preset) => void
  onNotice: (message: string) => void
  onClose: () => void
}

/** The Presets popover (specs 224–231, Presets board): the list, create, options per preset. */
export function PresetsPopover({ config, currentProjectDir, onApply, onNotice, onClose }: Props): React.JSX.Element {
  const [presets, setPresets] = useState<Preset[]>([])
  const [defaultId, setDefaultId] = useState<string | null>(null)
  const [newName, setNewName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [optionsFor, setOptionsFor] = useState<string | null>(null)
  const [multi, setMulti] = useState<{ id: string; projects: ProjectSummary[]; chosen: Set<string> } | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [folder, setFolder] = useState('')

  const reload = (): void => {
    void window.recscene.presets.list().then(setPresets)
    void window.recscene.presets.defaultId().then(setDefaultId)
    void window.recscene.presets.folder().then(setFolder)
  }
  useEffect(reload, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const fail = (err: unknown): void => onNotice(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']*': (Error: )?/, '') : String(err))

  const create = (): void => {
    if (newName === null) return
    void window.recscene.presets.create(newName, config).then(() => { onNotice('Preset created'); setNewName(null); reload() }).catch(fail)
  }
  const rename = (): void => {
    if (!renaming) return
    void window.recscene.presets.rename(renaming.id, renaming.name).then(() => { setRenaming(null); reload() }).catch(fail)
  }
  const options = (p: Preset): React.JSX.Element => (
    <div className="preset__options" role="menu">
      <button type="button" role="menuitem" className="menu__item" onClick={() => { onApply(p); setOptionsFor(null) }}>Apply to this project</button>
      <button type="button" role="menuitem" className="menu__item" onClick={() => { setOptionsFor(null); void window.recscene.library.list().then((list) => setMulti({ id: p.id, projects: list.filter((x) => x.projectDir !== currentProjectDir), chosen: new Set() })) }}>Apply preset to multiple projects…</button>
      <button type="button" role="menuitem" className="menu__item" onClick={() => { setOptionsFor(null); void window.recscene.presets.setDefault(defaultId === p.id ? null : p.id).then(reload) }}>{defaultId === p.id ? 'Stop using as default for new projects' : 'Use as default for new projects'}</button>
      <button type="button" role="menuitem" className="menu__item" onClick={() => void window.recscene.presets.update(p.id, config).then(() => { onNotice('Preset updated to match'); setOptionsFor(null); reload() }).catch(fail)}>Update to match currently edited project</button>
      <button type="button" role="menuitem" className="menu__item" onClick={() => { setRenaming({ id: p.id, name: p.name }); setOptionsFor(null) }}>Rename…</button>
      <button type="button" role="menuitem" className="menu__item" onClick={() => { setOptionsFor(null); void window.recscene.presets.showInFinder(p.id) }}>Show in Finder</button>
      <button type="button" role="menuitem" className="menu__item home__menu-danger" onClick={() => { setRemoving(p.id); setOptionsFor(null) }}>Remove preset</button>
    </div>
  )

  return (
    <div className="cmd__backdrop" onMouseDown={onClose}>
      <div className="presets" role="dialog" aria-label="Presets" onMouseDown={(e) => e.stopPropagation()}>
        <div className="export__head"><h2>Presets</h2><span className="muted">{presets.length}</span><span className="tl__spacer" /><button type="button" className="export__close" aria-label="Close" title="Close ⎋" onClick={onClose}><Icon name="close" size={14} /></button></div>
        <p className="note">A preset stores everything in the inspector panels: zoom, cursor, camera layout, background, padding, shadow, captions style and audio. It never stores clips, masks or the recording itself.</p>
        {multi ? (
          <div className="sec">
            <h3>Apply to projects</h3>
            {multi.projects.length === 0 && <p className="note">No other projects in the projects folder.</p>}
            <div className="keylist">
              {multi.projects.map((p) => (
                <label key={p.projectDir} className="menu__check"><input type="checkbox" checked={multi.chosen.has(p.projectDir)} onChange={(e) => { const next = new Set(multi.chosen); if (e.target.checked) next.add(p.projectDir); else next.delete(p.projectDir); setMulti({ ...multi, chosen: next }) }} />{p.name}</label>
              ))}
            </div>
            <div className="grid2">
              <button type="button" className="btn btn--ghost" onClick={() => setMulti(null)}>Cancel</button>
              <button type="button" className="btn btn--accent" disabled={multi.chosen.size === 0} onClick={() => void window.recscene.presets.applyToProjects(multi.id, [...multi.chosen]).then((r) => { onNotice(r.failed.length ? `Failed to apply preset to ${r.failed.length} project${r.failed.length === 1 ? '' : 's'}` : `Preset applied to ${r.applied.length} project${r.applied.length === 1 ? '' : 's'}`); setMulti(null) }).catch(fail)}>Apply to {multi.chosen.size}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="presets__list">
              {presets.length === 0 && <p className="note">No presets yet. Create one from this project's settings.</p>}
              {presets.map((p) => (
                <div key={p.id} className={`preset${defaultId === p.id ? ' preset--default' : ''}`}>
                  {renaming?.id === p.id ? (
                    <input className="input" autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setRenaming(null) }} onBlur={rename} />
                  ) : (
                    <button type="button" className="preset__apply" title="Apply this preset" onClick={() => onApply(p)}>
                      <span className="preset__name">{p.name}{defaultId === p.id ? <span className="chip">Default</span> : null}</span>
                      <span className="muted">{presetSummary(p) || 'settings'}</span>
                    </button>
                  )}
                  <div className="menu-anchor">
                    <button type="button" className="btn btn--ghost btn--sm" aria-haspopup="menu" aria-expanded={optionsFor === p.id} onClick={() => setOptionsFor(optionsFor === p.id ? null : p.id)}>Preset options…</button>
                    {optionsFor === p.id && <div className="menu">{options(p)}</div>}
                  </div>
                  {removing === p.id && (
                    <div className="preset__confirm">
                      <span>{REMOVE_CONFIRM}</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRemoving(null)}>Keep</button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => void window.recscene.presets.remove(p.id).then(() => { setRemoving(null); reload() }).catch(fail)}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {newName === null ? (
              <div className="grid2">
                <button type="button" className="btn btn--accent" onClick={() => setNewName('')}>Create new preset</button>
                <button type="button" className="btn btn--ghost" onClick={() => void window.recscene.presets.importFile().then((p) => { if (p) { onNotice('Preset imported'); reload() } }).catch(fail)}>Import preset…</button>
              </div>
            ) : (
              <div className="preset__new">
                <input className="input" autoFocus placeholder="New preset name..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setNewName(null) }} />
                <button type="button" className="btn btn--accent btn--sm" onClick={create}>Create</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setNewName(null)}>Cancel</button>
              </div>
            )}
            <p className="note">Presets are files in <span className="home__folder" title={folder}>{folder.replace(/^\/Users\/[^/]+/, '~')}</span> · <button type="button" className="home__link" onClick={() => void window.recscene.presets.chooseFolder().then(reload)}>Change folder…</button></p>
          </>
        )}
      </div>
    </div>
  )
}
