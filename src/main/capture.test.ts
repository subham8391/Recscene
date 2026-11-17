import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { CaptureClient, CaptureError, type HelperProcess } from './capture'

class FakeHelper extends EventEmitter implements HelperProcess {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  written: string[] = []
  stdin = { write: (chunk: string): boolean => (this.written.push(chunk), true) }
  killed = false
  kill(): void {
    this.killed = true
  }
  reply(json: unknown): void {
    this.stdout.emit('data', Buffer.from(JSON.stringify(json) + '\n'))
  }
}

function makeClient(): { client: CaptureClient; helper: FakeHelper } {
  const helper = new FakeHelper()
  const client = new CaptureClient({ helperPath: '/fake/recscene-capture', spawn: () => helper })
  return { client, helper }
}

describe('CaptureClient', () => {
  it('sends a command and resolves with the matching event', async () => {
    const { client, helper } = makeClient()
    const promise = client.ping()
    expect(helper.written).toEqual(['{"cmd":"ping"}\n'])
    helper.reply({ event: 'pong', version: '0.1.0' })
    await expect(promise).resolves.toEqual({ event: 'pong', version: '0.1.0' })
  })

  it('answers commands in order and handles split chunks', async () => {
    const { client, helper } = makeClient()
    const a = client.permissions()
    const b = client.listTargets()
    const first = '{"event":"permissions","screen":true,"inputMonitoring":false,"accessibility":false,"microphone":"granted"}\n{"event":"targ'
    const second = 'ets","displays":[],"windows":[]}\n'
    helper.stdout.emit('data', Buffer.from(first))
    helper.stdout.emit('data', Buffer.from(second))
    await expect(a).resolves.toEqual({ screen: true, inputMonitoring: false, accessibility: false, microphone: 'granted', camera: 'notDetermined' })
    await expect(b).resolves.toMatchObject({ event: 'targets', displays: [], windows: [] })
  })

  it('rejects with the helper error code', async () => {
    const { client, helper } = makeClient()
    const promise = client.stop()
    helper.reply({ event: 'error', code: 'not-recording', message: 'Nothing is being recorded' })
    await expect(promise).rejects.toMatchObject({ name: 'CaptureError', code: 'not-recording' })
  })

  it('re-emits warnings without consuming a pending command', async () => {
    const { client, helper } = makeClient()
    const warnings: string[] = []
    client.on('warning', (m: string) => warnings.push(m))
    const promise = client.start({ target: { kind: 'display', id: 1 }, outputDir: '/tmp/x' })
    helper.reply({ event: 'warning', message: 'Accessibility permission is missing' })
    helper.reply({ event: 'started', outputDir: '/tmp/x', width: 10, height: 10 })
    await expect(promise).resolves.toMatchObject({ event: 'started' })
    expect(warnings).toEqual(['Accessibility permission is missing'])
    expect(helper.written[0]).toBe('{"cmd":"start","target":{"kind":"display","id":1},"outputDir":"/tmp/x"}\n')
  })

  it('rejects everything pending when the helper exits', async () => {
    const { client, helper } = makeClient()
    const promise = client.listTargets()
    helper.emit('exit', 1)
    await expect(promise).rejects.toBeInstanceOf(CaptureError)
    expect(client.running).toBe(false)
  })

  it('kills the helper on dispose', () => {
    const { client, helper } = makeClient()
    void client.ping().catch(() => undefined)
    client.dispose()
    expect(helper.killed).toBe(true)
  })
})
