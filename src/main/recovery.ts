import { rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { dialog } from 'electron'
import type { RecordingResult } from '@core/captureProtocol'
import { RECOVER_BUTTONS, RECOVER_QUESTION, RECOVER_TITLE, RECOVERED_MESSAGE, UNRECOVERABLE_MESSAGE } from '@core/recovery'
import type { RecordingService } from './recording'

/**
 * Spec 40: on launch and from the File menu, offer to turn leftover footage
 * into projects or delete it. Returns the recovered projects' results.
 */
export async function offerRecovery(recording: RecordingService, options: { manual: boolean }): Promise<{ results: RecordingResult[]; notice: string | null }> {
  const bundles = await recording.unfinishedBundles()
  if (bundles.length === 0) return { results: [], notice: options.manual ? 'No unfinished recordings found' : null }
  const results: RecordingResult[] = []
  let notice: string | null = null
  for (const dir of bundles) {
    const choice = await dialog.showMessageBox({
      type: 'question',
      title: RECOVER_TITLE,
      message: RECOVER_TITLE,
      detail: `${RECOVER_QUESTION} (${basename(dir, '.recscene')})`,
      buttons: [...RECOVER_BUTTONS],
      defaultId: 0,
      cancelId: 1
    })
    if (choice.response !== 0) {
      await rm(dir, { recursive: true, force: true })
      continue
    }
    try {
      results.push(await recording.recover(dir))
      notice = RECOVERED_MESSAGE
    } catch {
      notice = `${UNRECOVERABLE_MESSAGE} (${basename(dir, '.recscene')})`
    }
  }
  return { results, notice }
}
