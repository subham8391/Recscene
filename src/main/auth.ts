import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { BROWSER_DONE_PAGE, BROWSER_FAILED_PAGE, CALLBACK_PATH, DEACTIVATE_CONFIRM, DEEP_LINK_CALLBACK, deviceFromRow, deviceName, DEVICE_DEACTIVATED, DEACTIVATE_FAILED, friendlyError, LOOPBACK_CALLBACK, LOOPBACK_PORT, parseCallback, SIGN_IN_DONE, sortDevices, userFromSession, type AccountDevice, type AccountState, type AccountUser, type SignInPhase } from '@core/auth'
import type { Preferences } from './preferences'

export interface AuthConfig {
  url: string
  anonKey: string
}

/**
 * The Supabase project comes from the build (`.env`, `MAIN_VITE_SUPABASE_*`);
 * a development run may point elsewhere with `RECSCENE_SUPABASE_URL` / `_ANON_KEY`.
 */
export function authConfig(): AuthConfig | null {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  const url = (!app.isPackaged && process.env['RECSCENE_SUPABASE_URL']) || env['MAIN_VITE_SUPABASE_URL']
  const anonKey = (!app.isPackaged && process.env['RECSCENE_SUPABASE_ANON_KEY']) || env['MAIN_VITE_SUPABASE_ANON_KEY']
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** supabase-js session storage: one JSON file in the app data folder, encrypted when the keychain allows it. */
class SessionStore {
  private data: Record<string, string> = {}

  constructor(private readonly file: string) {
    try {
      const raw = readFileSync(file)
      const text = raw.subarray(0, 3).toString() === 'v10' && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8')
      const parsed: unknown = JSON.parse(text)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) this.data = parsed as Record<string, string>
    } catch {
      this.data = {}
    }
  }

  getItem(key: string): string | null {
    return this.data[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.data[key] = value
    this.flush()
  }

  removeItem(key: string): void {
    delete this.data[key]
    this.flush()
  }

  private flush(): void {
    mkdirSync(dirname(this.file), { recursive: true })
    if (Object.keys(this.data).length === 0) {
      try {
        unlinkSync(this.file)
      } catch {
        /* nothing stored */
      }
      return
    }
    const text = JSON.stringify(this.data)
    writeFileSync(this.file, safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text) : text)
  }
}

export interface AuthHooks {
  notify: (message: string) => void
  /** The app menu's Sign In…/Account… item follows the state (spec 282). */
  changed: () => void
}

/**
 * Specs 275–278 (Account board): Google sign-in through the browser, the
 * session for this Mac, and the seats a user has activated.
 */
export class AuthService {
  private readonly client: SupabaseClient | null
  private phase: SignInPhase = 'idle'
  private error: string | null = null
  private user: AccountUser | null = null
  private devices: AccountDevice[] = []
  private loopback: Server | null = null
  private readonly deviceId: string
  private model: string | null = null
  private computerName: string | null = null

  constructor(
    private readonly prefs: Preferences,
    config: AuthConfig | null,
    private readonly hooks: AuthHooks
  ) {
    const stored = prefs.get('deviceId')
    this.deviceId = typeof stored === 'string' && stored ? stored : randomUUID()
    if (stored !== this.deviceId) prefs.set({ deviceId: this.deviceId })
    this.client = config
      ? createClient(config.url, config.anonKey, {
          auth: { storage: new SessionStore(join(app.getPath('userData'), 'auth.json')), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' }
        })
      : null
    ipcMain.handle('account:state', () => this.state())
    ipcMain.handle('account:signInWithGoogle', () => this.signInWithGoogle())
    ipcMain.handle('account:cancelSignIn', () => this.cancelSignIn())
    ipcMain.handle('account:signOut', () => this.signOut())
    ipcMain.handle('account:deactivate', (_e, deviceId?: string) => this.deactivate(deviceId))
    ipcMain.handle('account:refresh', () => this.refresh())
  }

  get configured(): boolean {
    return this.client !== null
  }

  get signedIn(): boolean {
    return this.user !== null
  }

  state(): AccountState {
    return { configured: this.configured, phase: this.phase, user: this.user, deviceId: this.deviceId, devices: sortDevices(this.devices, this.deviceId), error: this.error }
  }

  /** On launch: pick up the stored session and touch this Mac's seat. */
  async start(): Promise<void> {
    if (!this.client) return
    void this.describeMac()
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user = null
        this.devices = []
        this.broadcast()
      } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        this.user = userFromSession(session.user)
        this.broadcast()
      }
    })
    try {
      const { data } = await this.client.auth.getSession()
      if (data.session) {
        this.user = userFromSession(data.session.user)
        await this.registerDevice()
        await this.loadDevices()
      }
    } catch (error) {
      this.error = friendlyError(error instanceof Error ? error.message : String(error))
    }
    this.broadcast()
  }

  /** Spec 275: the authorisation page opens in the default browser; the consent returns through the callback. */
  async signInWithGoogle(): Promise<AccountState> {
    if (!this.client) return this.state()
    this.error = null
    try {
      if (!app.isPackaged) await this.listenLoopback()
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: app.isPackaged ? DEEP_LINK_CALLBACK : LOOPBACK_CALLBACK, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } }
      })
      if (error) throw error
      if (!data.url) throw new Error('No sign-in url')
      this.phase = 'waiting'
      this.broadcast()
      await shell.openExternal(data.url)
    } catch (error) {
      this.phase = 'idle'
      this.error = friendlyError(error instanceof Error ? error.message : String(error))
      this.closeLoopback()
    }
    this.broadcast()
    return this.state()
  }

  cancelSignIn(): AccountState {
    if (this.phase === 'waiting') {
      this.phase = 'idle'
      this.closeLoopback()
      this.broadcast()
    }
    return this.state()
  }

  /** A `recscene://auth/callback` deep link or loopback hit; true when it was one. */
  handleUrl(url: string): boolean {
    const result = parseCallback(url)
    if (!result) return false
    void this.finish(result)
    return true
  }

  private async finish(result: ReturnType<typeof parseCallback>): Promise<boolean> {
    if (!this.client || !result) return false
    this.closeLoopback()
    if (result.kind === 'error') {
      this.phase = 'idle'
      this.error = result.message
      this.broadcast()
      return false
    }
    this.phase = 'exchanging'
    this.broadcast()
    try {
      const { data, error } = await this.client.auth.exchangeCodeForSession(result.code)
      if (error) throw error
      this.user = userFromSession((data.session as Session).user)
      await this.registerDevice()
      await this.loadDevices()
      this.error = null
      this.hooks.notify(SIGN_IN_DONE)
      this.phase = 'idle'
      this.broadcast()
      this.focus()
      return true
    } catch (error) {
      this.phase = 'idle'
      this.error = friendlyError(error instanceof Error ? error.message : String(error))
      this.broadcast()
      return false
    }
  }

  /** Spec 278: sign out and use another account; this Mac's seat is freed too. */
  async signOut(): Promise<AccountState> {
    if (!this.client) return this.state()
    this.error = null
    try {
      if (this.user) await this.client.from('devices').delete().eq('id', this.deviceId)
    } catch {
      /* the seat stays until the next sign-in refreshes it */
    }
    const { error } = await this.client.auth.signOut()
    if (error) this.error = friendlyError(error.message)
    this.user = null
    this.devices = []
    this.broadcast()
    return this.state()
  }

  /** Spec 277: frees a seat. This Mac asks first and then signs out; another device is just removed. */
  async deactivate(deviceId: string = this.deviceId): Promise<AccountState> {
    if (!this.client || !this.user) return this.state()
    const self = deviceId === this.deviceId
    if (self) {
      const { response } = await dialog.showMessageBox({ type: 'warning', message: DEACTIVATE_CONFIRM.title, detail: DEACTIVATE_CONFIRM.detail, buttons: ['Deactivate', 'Cancel'], defaultId: 0, cancelId: 1 })
      if (response !== 0) return this.state()
    }
    try {
      const { error } = await this.client.from('devices').delete().eq('id', deviceId)
      if (error) throw error
      this.hooks.notify(DEVICE_DEACTIVATED)
      if (self) {
        await this.client.auth.signOut()
        this.user = null
        this.devices = []
      } else {
        this.devices = this.devices.filter((d) => d.id !== deviceId)
      }
      this.error = null
    } catch (error) {
      this.error = error instanceof Error && /fetch|ENOTFOUND|ECONNREFUSED/i.test(error.message) ? friendlyError(error.message) : DEACTIVATE_FAILED
    }
    this.broadcast()
    return this.state()
  }

  async refresh(): Promise<AccountState> {
    if (this.client && this.user) {
      try {
        await this.loadDevices()
        this.error = null
      } catch (error) {
        this.error = friendlyError(error instanceof Error ? error.message : String(error))
      }
    }
    this.broadcast()
    return this.state()
  }

  private async registerDevice(): Promise<void> {
    if (!this.client || !this.user) return
    await this.describeMac()
    const { error } = await this.client.from('devices').upsert(
      { id: this.deviceId, user_id: this.user.id, name: deviceName(this.computerName, hostname()), model: this.model, app_version: app.getVersion(), last_seen_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) throw new Error(error.message)
  }

  private async loadDevices(): Promise<void> {
    if (!this.client || !this.user) return
    const { data, error } = await this.client.from('devices').select('*').order('last_seen_at', { ascending: false })
    if (error) throw new Error(error.message)
    this.devices = (data as Record<string, unknown>[]).map(deviceFromRow)
  }

  private describeMac(): Promise<void> {
    if (this.model !== null) return Promise.resolve()
    const run = (cmd: string, args: string[]): Promise<string | null> => new Promise((resolve) => execFile(cmd, args, (_e, out) => resolve((out || '').trim() || null)))
    return Promise.all([run('sysctl', ['-n', 'hw.model']), run('scutil', ['--get', 'ComputerName'])]).then(([model, name]) => {
      this.model = prettyModel(model)
      this.computerName = name
    })
  }

  /** Development builds take the callback on the loopback (macOS only routes `recscene://` to signed bundles). */
  private listenLoopback(): Promise<void> {
    if (this.loopback) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        const url = `http://127.0.0.1:${LOOPBACK_PORT}${req.url ?? '/'}`
        const result = parseCallback(url)
        if (!result || !req.url?.startsWith(CALLBACK_PATH)) {
          res.writeHead(404).end()
          return
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(result.kind === 'code' ? BROWSER_DONE_PAGE : BROWSER_FAILED_PAGE)
        void this.finish(result)
      })
      server.once('error', (error) => {
        this.loopback = null
        reject(error)
      })
      server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
        this.loopback = server
        resolve()
      })
    })
  }

  private closeLoopback(): void {
    this.loopback?.close()
    this.loopback = null
  }

  private focus(): void {
    app.focus({ steal: true })
    const settings = BrowserWindow.getAllWindows().find((w) => w.getTitle() === 'Settings')
    settings?.show()
  }

  private broadcast(): void {
    const state = this.state()
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('account:changed', state)
    this.hooks.changed()
  }

  dispose(): void {
    this.closeLoopback()
  }
}

/** `Mac16,6` is what sysctl says; the marketing name needs a lookup table, so it stays the identifier plus the arch. */
function prettyModel(model: string | null): string | null {
  if (!model) return null
  const family = model.replace(/\d+,\d+$/, '')
  const names: Record<string, string> = { MacBookPro: 'MacBook Pro', MacBookAir: 'MacBook Air', Macmini: 'Mac mini', MacStudio: 'Mac Studio', MacPro: 'Mac Pro', iMac: 'iMac', Mac: 'Mac' }
  return `${names[family] ?? family} (${process.arch === 'arm64' ? 'Apple silicon' : 'Intel'})`
}
