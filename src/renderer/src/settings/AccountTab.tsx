import { useEffect, useState } from 'react'
import { devicesLabel, deviceSub, initials, LICENCE_NOTE, NOT_CONFIGURED, SEAT_NOTE, SIGN_IN_WAITING, SIGN_OUT_NOTE, type AccountState } from '@core/auth'

/** Settings › Account (Account board; specs 275, 277, 278): Google sign-in, the signed-in account and its devices. */
export function AccountTab(): React.JSX.Element {
  const [acc, setAcc] = useState<AccountState | null>(null)
  // The "seen" labels are relative to when the state arrived, not to each render.
  const [now, setNow] = useState(0)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const take = (state: AccountState): void => {
    setNow(Date.now())
    setAcc(state)
  }

  useEffect(() => {
    void window.recscene.account.state().then(take)
    const off = window.recscene.account.onChanged(take)
    const refresh = (): void => void window.recscene.account.refresh().then(take)
    window.addEventListener('focus', refresh)
    return () => {
      off()
      window.removeEventListener('focus', refresh)
    }
  }, [])

  if (!acc) return <></>
  if (!acc.configured) return <p className="note">{NOT_CONFIGURED}</p>
  const busy = acc.phase !== 'idle'

  if (!acc.user) {
    return (
      <>
        <h3>Activate Recscene</h3>
        <div className="srow">
          <div className="srow__lbl"><b>Continue with Google</b><small>Signs in through your browser. No password to remember.</small></div>
          <div className="srow__ctl">
            {acc.phase === 'waiting' ? (
              <button type="button" className="sel" onClick={() => void window.recscene.account.cancelSignIn().then(take)}>Cancel</button>
            ) : (
              <button type="button" className="sel sel--primary" disabled={busy} onClick={() => void window.recscene.account.signInWithGoogle().then(take)}>{acc.phase === 'exchanging' ? 'Signing in…' : 'Continue with Google'}</button>
            )}
          </div>
        </div>
        {acc.phase === 'waiting' && <p className="note" role="status">{SIGN_IN_WAITING}</p>}
        {acc.error && <p className="note note--bad" role="alert">{acc.error}</p>}
        <p className="note">Licence keys, email codes, Microsoft and company SSO are not built yet.</p>
      </>
    )
  }

  const u = acc.user
  return (
    <>
      <h3>Account</h3>
      <div className="srow">
        <div className="acct">
          {u.avatarUrl && !avatarBroken ? <img className="acct__avatar" src={u.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarBroken(true)} /> : <span className="acct__avatar acct__avatar--text" aria-hidden="true">{initials(u)}</span>}
          <div className="srow__lbl"><b>{u.name ?? u.email}</b><small>Signed in as {u.email} · {u.provider === 'google' ? 'Google' : u.provider}</small></div>
        </div>
        <div className="srow__ctl"><button type="button" className="sel" onClick={() => void window.recscene.account.signOut().then(take)}>Sign out and use another account</button></div>
      </div>
      <p className="note">{SIGN_OUT_NOTE}</p>

      <h3>Licence</h3>
      <p className="note">{LICENCE_NOTE}</p>

      <h3>Devices <span className="muted">· {devicesLabel(acc.devices.length)}</span></h3>
      <ul className="devs" aria-label="Devices">
        {acc.devices.map((d) => (
          <li key={d.id} className="srow">
            <div className="srow__lbl"><b>{d.name}{d.id === acc.deviceId && <span className="chip">This Mac</span>}</b><small>{deviceSub(d, acc.deviceId, now)}</small></div>
            <div className="srow__ctl">
              <button type="button" className="sel sel--danger" onClick={() => void window.recscene.account.deactivate(d.id).then(take)}>{d.id === acc.deviceId ? 'Deactivate this device' : 'Deactivate'}</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="note">{SEAT_NOTE}</p>
      {acc.error && <p className="note note--bad" role="alert">{acc.error}</p>}
    </>
  )
}
