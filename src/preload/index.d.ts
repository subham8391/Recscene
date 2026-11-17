import type { RecsceneApi } from './index'

declare global {
  interface Window {
    recscene: RecsceneApi
  }
}

export {}
