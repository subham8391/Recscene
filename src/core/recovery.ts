/** Crash recovery (spec 40) and projects created from existing videos (spec 7). */

export interface BundleListing {
  name: string
  files: string[]
}

/** A `.recscene` folder that has footage but never got its project.json is an unfinished recording. */
export function isUnfinishedBundle(listing: BundleListing): boolean {
  return listing.name.endsWith('.recscene') && listing.files.includes('screen.mov') && !listing.files.includes('project.json')
}

export const IMPORTABLE_EXTENSIONS = ['mp4', 'mov', 'm4v', 'gif'] as const

export function isImportable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return (IMPORTABLE_EXTENSIONS as readonly string[]).includes(ext)
}

/** "demo.mp4" → "demo.recscene"; a clash gets " 2", " 3", … */
export function importedBundleName(fileName: string, existing: readonly string[]): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'Imported video'
  let candidate = `${base}.recscene`
  for (let n = 2; existing.includes(candidate); n += 1) candidate = `${base} ${n}.recscene`
  return candidate
}

export const RECOVER_TITLE = 'Recscene found an unfinished recording'
export const RECOVER_QUESTION = 'Do you want to recover recording?'
export const RECOVER_BUTTONS = ['Recover recording', "Delete and don't recover"] as const
export const RECOVERED_MESSAGE = 'Recording was recovered from an error and will be opened now.'
export const UNRECOVERABLE_MESSAGE = "Recording can't be recovered"
