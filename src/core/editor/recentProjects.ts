/** The File › Open Recent list (spec 75): newest first, no duplicates, at most 10. */
export const RECENT_LIMIT = 10

export function markRecent(list: readonly string[], projectDir: string): string[] {
  return [projectDir, ...list.filter((p) => p !== projectDir)].slice(0, RECENT_LIMIT)
}

export function pruneRecent(list: readonly string[], exists: (p: string) => boolean): string[] {
  return list.filter(exists)
}

export function projectNameFromDir(projectDir: string): string {
  return projectDir.split('/').pop()?.replace(/\.recscene$/, '') ?? projectDir
}
