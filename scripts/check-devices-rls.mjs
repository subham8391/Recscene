// Checks the `devices` policies against a running Supabase stack (local by default):
// two users each register a seat; neither can read, touch or free the other's.
// Usage: node scripts/check-devices-rls.mjs [api url] [anon key] [service role key]
// Keys for the local stack come from `npx supabase@2 status`.
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [url = 'http://127.0.0.1:55321', anon, service] = process.argv.slice(2)
if (!anon || !service) {
  console.error('Pass the anon and service role keys (npx supabase@2 status).')
  process.exit(2)
}
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
const fails = []
const check = (name, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`)
  if (!ok) fails.push(name)
}

const stamp = Date.now()
const users = []
for (const who of ['a', 'b']) {
  const email = `rls-${who}-${stamp}@example.com`
  const password = `pw-${stamp}-${who}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error
  users.push({ who, id: data.user.id, client, deviceId: randomUUID() })
}
const [a, b] = users

try {
  for (const u of users) {
    const { error } = await u.client.from('devices').upsert({ id: u.deviceId, user_id: u.id, name: `Mac ${u.who}`, model: 'Mac Studio', app_version: '0.1.0', last_seen_at: new Date().toISOString() }, { onConflict: 'id' })
    check(`${u.who} registers a seat`, !error)
  }
  const touched = await a.client.from('devices').upsert({ id: a.deviceId, user_id: a.id, name: 'Mac a again', last_seen_at: new Date().toISOString() }, { onConflict: 'id' })
  check('a touches its own seat again (upsert)', !touched.error)

  const seenByA = await a.client.from('devices').select('id, name')
  check('a sees only its own seat', !seenByA.error && seenByA.data.length === 1 && seenByA.data[0].id === a.deviceId && seenByA.data[0].name === 'Mac a again')

  const forged = await a.client.from('devices').insert({ id: randomUUID(), user_id: b.id, name: 'forged' })
  check('a cannot register a seat for b', !!forged.error)

  const renamed = await a.client.from('devices').update({ name: 'hijacked' }).eq('id', b.deviceId).select()
  check('a cannot touch b\'s seat', !renamed.error && renamed.data.length === 0)

  const freed = await a.client.from('devices').delete().eq('id', b.deviceId).select()
  check('a cannot free b\'s seat', !freed.error && freed.data.length === 0)
  const stillThere = await b.client.from('devices').select('id').eq('id', b.deviceId)
  check('b\'s seat is still there', stillThere.data?.length === 1)

  const own = await b.client.from('devices').delete().eq('id', b.deviceId).select()
  check('b frees its own seat', !own.error && own.data.length === 1)

  const anonClient = createClient(url, anon, { auth: { persistSession: false } })
  const anonRead = await anonClient.from('devices').select('id')
  check('signed-out clients see nothing', !!anonRead.error || anonRead.data.length === 0)

  const all = await admin.from('devices').select('user_id').in('user_id', [a.id, b.id])
  check('only a\'s seat remains', all.data?.length === 1 && all.data[0].user_id === a.id)
} finally {
  for (const u of users) await admin.auth.admin.deleteUser(u.id)
  console.log('cleaned up test users')
}
if (fails.length) {
  console.error(`${fails.length} check(s) failed`)
  process.exit(1)
}
