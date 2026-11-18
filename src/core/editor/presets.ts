/**
 * Presets (specs 224–232, Presets board): a snapshot of the inspector
 * settings saved as a file, applied to a project by copying its keys.
 * Clips, zooms, masks, layouts and the recording never travel with one.
 */
import type { ProjectConfig } from '../project'

export const PRESET_EXTENSION = 'recscenepreset'

export interface Preset {
  /** The file name without extension; unique in the folder. */
  id: string
  name: string
  createdAt: string
  updatedAt: string
  config: Partial<ProjectConfig>
}

/** Keys that belong to one recording and never travel with a preset. */
export const PROJECT_ONLY_KEYS = ['recordingRange', 'recordingCrop', 'resolvedTypingSuggestions', 'hiddenShortcuts', 'backgroundImage', 'backgroundAudioFileName'] as const

/** Spec 224: what a preset keeps from a project's config. */
export function presetConfigFrom(config: ProjectConfig): Partial<ProjectConfig> {
  const copy: Partial<ProjectConfig> = { ...config }
  for (const key of PROJECT_ONLY_KEYS) delete copy[key]
  // An image background points at a file inside one bundle; the preset falls back to the gradient.
  if (copy.backgroundType === 'image') copy.backgroundType = 'gradient'
  return copy
}

/** Spec 225: the preset's keys over the project's, with the project-only keys kept. */
export function applyPreset(config: ProjectConfig, preset: Partial<ProjectConfig>): ProjectConfig {
  const kept = Object.fromEntries(PROJECT_ONLY_KEYS.map((key) => [key, config[key]]))
  return { ...config, ...preset, ...kept } as ProjectConfig
}

export const NAME_MAX = 80

export type PresetNameCheck = { ok: true; name: string; id: string } | { ok: false; reason: string }

/** A preset name doubles as its file name (spec 230 renames the file). */
export function checkPresetName(input: string, existingIds: readonly string[], currentId?: string): PresetNameCheck {
  const name = input.trim()
  if (!name) return { ok: false, reason: 'Preset name cannot be empty' }
  if (name.length > NAME_MAX) return { ok: false, reason: `Preset name is too long (max ${NAME_MAX} characters)` }
  const id = name.replace(/[/:\\]/g, '-')
  if (existingIds.some((e) => e.toLowerCase() === id.toLowerCase() && e !== currentId)) return { ok: false, reason: 'A preset with this name already exists' }
  return { ok: true, name, id }
}

export function presetFileName(id: string): string {
  return `${id}.${PRESET_EXTENSION}`
}

export function isPresetFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(`.${PRESET_EXTENSION}`)
}

export function presetIdFromFile(fileName: string): string {
  return fileName.replace(new RegExp(`\\.${PRESET_EXTENSION}$`, 'i'), '')
}

/** Reads a preset file's JSON; anything malformed is rejected. */
export function parsePreset(raw: unknown, id: string): Preset | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<Preset> & { version?: number }
  if (typeof r.config !== 'object' || r.config === null) return null
  return { id, name: typeof r.name === 'string' && r.name ? r.name : id, createdAt: typeof r.createdAt === 'string' ? r.createdAt : '', updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '', config: r.config }
}

export function serialisePreset(p: Preset): string {
  return JSON.stringify({ version: 1, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, config: p.config }, null, 2)
}

/**
 * Spec 227 and 232: what seeds a new project's config. The default preset
 * wins over the last project's settings, which win over the built-in defaults.
 */
export function seedConfig(defaults: ProjectConfig, defaultPreset: Partial<ProjectConfig> | null, lastProject: Partial<ProjectConfig> | null, useLast: boolean): ProjectConfig {
  if (defaultPreset) return applyPreset(defaults, defaultPreset)
  if (useLast && lastProject) return applyPreset(defaults, lastProject)
  return defaults
}

/** A short description of what a preset carries, for the popover. */
export function presetSummary(p: Preset): string {
  const c = p.config
  const bits: string[] = []
  if (c.backgroundType) bits.push(c.backgroundType === 'system' ? 'wallpaper' : c.backgroundType)
  if (typeof c.backgroundPaddingRatio === 'number') bits.push(`${Math.round(c.backgroundPaddingRatio)}% padding`)
  if (c.defaultOutputAspectRatio) bits.push(c.defaultOutputAspectRatio)
  if (c.cursorSize) bits.push(`cursor ${c.cursorSize}×`)
  return bits.join(' · ')
}

export const REMOVE_CONFIRM = 'Are you sure you want to remove this preset?'
