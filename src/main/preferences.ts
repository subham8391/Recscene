import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** A small JSON file of app preferences, read once and written on every change. */
export class Preferences {
  private data: Record<string, unknown> = {}

  constructor(private readonly file: string) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) this.data = parsed as Record<string, unknown>
    } catch {
      this.data = {}
    }
  }

  get(key: string): unknown {
    return this.data[key]
  }

  all(): Record<string, unknown> {
    return { ...this.data }
  }

  set(values: Record<string, unknown>): void {
    this.data = { ...this.data, ...values }
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(this.data, null, 2))
  }
}
