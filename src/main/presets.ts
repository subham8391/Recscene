import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog, ipcMain, shell } from 'electron'
import { applyPreset, checkPresetName, isPresetFile, parsePreset, PRESET_EXTENSION, presetConfigFrom, presetFileName, presetIdFromFile, seedConfig, serialisePreset, type Preset } from '@core/editor/presets'
import { defaultProjectConfig, normaliseProject, type ProjectConfig } from '@core/project'
import type { Preferences } from './preferences'

/**
 * Presets as files in the presets folder (specs 224–232): list, create,
 * update, rename, remove, import, reveal, the default for new projects and
 * applying one to other projects on disk.
 */
export class PresetsService {
  constructor(private readonly prefs: Preferences) {
    ipcMain.handle('presets:list', () => this.list())
    ipcMain.handle('presets:create', (_e, name: string, config: ProjectConfig) => this.create(name, config))
    ipcMain.handle('presets:update', (_e, id: string, config: ProjectConfig) => this.update(id, config))
    ipcMain.handle('presets:rename', (_e, id: string, name: string) => this.rename(id, name))
    ipcMain.handle('presets:remove', (_e, id: string) => this.remove(id))
    ipcMain.handle('presets:import', () => this.importFile())
    ipcMain.handle('presets:showInFinder', (_e, id: string) => shell.showItemInFolder(join(this.folder(), presetFileName(id))))
    ipcMain.handle('presets:default', () => this.defaultId())
    ipcMain.handle('presets:setDefault', (_e, id: string | null) => this.prefs.set({ defaultPresetId: id }))
    ipcMain.handle('presets:applyToProjects', (_e, id: string, projectDirs: string[]) => this.applyToProjects(id, projectDirs))
    ipcMain.handle('presets:folder', () => this.folder())
    ipcMain.handle('presets:chooseFolder', () => this.chooseFolder())
  }

  /** Spec 231: `presetsFolderPath`, default ~/Documents/Recscene Presets. */
  folder(): string {
    const pref = this.prefs.get('presetsFolderPath')
    return typeof pref === 'string' && pref.trim() ? pref : join(app.getPath('documents'), 'Recscene Presets')
  }

  defaultId(): string | null {
    const id = this.prefs.get('defaultPresetId')
    return typeof id === 'string' && id ? id : null
  }

  async list(): Promise<Preset[]> {
    const dir = this.folder()
    await mkdir(dir, { recursive: true }).catch(() => undefined)
    const names = (await readdir(dir).catch(() => [] as string[])).filter(isPresetFile).sort((a, b) => a.localeCompare(b))
    const out: Preset[] = []
    for (const f of names) {
      try {
        const p = parsePreset(JSON.parse(await readFile(join(dir, f), 'utf8')), presetIdFromFile(f))
        if (p) out.push(p)
      } catch {
        // an unreadable file is skipped, as the competitor does
      }
    }
    return out
  }

  private async ids(): Promise<string[]> {
    return (await this.list()).map((p) => p.id)
  }

  private async write(p: Preset): Promise<void> {
    await mkdir(this.folder(), { recursive: true })
    await writeFile(join(this.folder(), presetFileName(p.id)), serialisePreset(p), 'utf8')
  }

  async create(name: string, config: ProjectConfig): Promise<Preset> {
    const check = checkPresetName(name, await this.ids())
    if (!check.ok) throw new Error(check.reason)
    const now = new Date().toISOString()
    const preset: Preset = { id: check.id, name: check.name, createdAt: now, updatedAt: now, config: presetConfigFrom(config) }
    await this.write(preset).catch(() => {
      throw new Error('Failed to create preset')
    })
    return preset
  }

  /** Spec 228. */
  async update(id: string, config: ProjectConfig): Promise<Preset> {
    const existing = (await this.list()).find((p) => p.id === id)
    if (!existing) throw new Error('Preset not found')
    const preset: Preset = { ...existing, updatedAt: new Date().toISOString(), config: presetConfigFrom(config) }
    await this.write(preset)
    return preset
  }

  /** Spec 230. */
  async rename(id: string, name: string): Promise<Preset> {
    const existing = (await this.list()).find((p) => p.id === id)
    if (!existing) throw new Error('Preset not found')
    const check = checkPresetName(name, await this.ids(), id)
    if (!check.ok) throw new Error(check.reason)
    const renamed: Preset = { ...existing, id: check.id, name: check.name, updatedAt: new Date().toISOString() }
    try {
      if (check.id !== id) await rename(join(this.folder(), presetFileName(id)), join(this.folder(), presetFileName(check.id)))
      await this.write(renamed)
    } catch {
      throw new Error('Failed to rename preset')
    }
    if (this.defaultId() === id) this.prefs.set({ defaultPresetId: check.id })
    return renamed
  }

  async remove(id: string): Promise<void> {
    await rm(join(this.folder(), presetFileName(id)), { force: true }).catch(() => {
      throw new Error('Failed to remove preset')
    })
    if (this.defaultId() === id) this.prefs.set({ defaultPresetId: null })
  }

  /** Spec 229: copies a preset file into the folder. */
  async importFile(): Promise<Preset | null> {
    const result = await dialog.showOpenDialog({ title: 'Import preset', properties: ['openFile'], filters: [{ name: 'Recscene preset', extensions: [PRESET_EXTENSION] }] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const raw = parsePreset(JSON.parse(await readFile(path, 'utf8')), presetIdFromFile(basename(path)))
    if (!raw) throw new Error('Not a Recscene preset file')
    const check = checkPresetName(raw.name, await this.ids())
    const id = check.ok ? check.id : `${raw.id} ${Date.now().toString(36)}`
    await mkdir(this.folder(), { recursive: true })
    await cp(path, join(this.folder(), presetFileName(id)))
    return { ...raw, id }
  }

  /** Spec 226: rewrites each project's config on disk; failures are reported per project. */
  async applyToProjects(id: string, projectDirs: string[]): Promise<{ applied: string[]; failed: string[] }> {
    const preset = (await this.list()).find((p) => p.id === id)
    if (!preset) throw new Error('Preset not found')
    const applied: string[] = []
    const failed: string[] = []
    for (const dir of projectDirs) {
      try {
        const file = join(dir, 'project.json')
        const project = normaliseProject(JSON.parse(await readFile(file, 'utf8')))
        await writeFile(file, JSON.stringify({ ...project, config: applyPreset(project.config, preset.config), updatedAt: new Date().toISOString() }, null, 2))
        applied.push(dir)
      } catch {
        failed.push(dir)
      }
    }
    return { applied, failed }
  }

  async chooseFolder(): Promise<string> {
    const result = await dialog.showOpenDialog({ title: 'Select a folder to save your presets', buttonLabel: 'Select folder', defaultPath: this.folder(), properties: ['openDirectory', 'createDirectory'] })
    const dir = result.filePaths[0]
    if (!result.canceled && dir) this.prefs.set({ presetsFolderPath: dir })
    return this.folder()
  }

  /** Specs 227 and 232: the config a new recording starts with. */
  async seed(): Promise<ProjectConfig> {
    const id = this.defaultId()
    const preset = id ? (await this.list()).find((p) => p.id === id) ?? null : null
    const last = this.prefs.get('lastProjectConfig')
    const lastConfig = typeof last === 'object' && last ? (last as Partial<ProjectConfig>) : null
    return seedConfig(defaultProjectConfig, preset?.config ?? null, lastConfig, this.prefs.get('useLastProjectConfigForNewProjects') === true)
  }

  /** Spec 232: remembered on every save. */
  rememberLast(config: ProjectConfig): void {
    this.prefs.set({ lastProjectConfig: presetConfigFrom(config) })
  }
}
