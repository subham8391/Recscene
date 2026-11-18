/** 16-bit mono WAV from PCM samples (spec 221: voice-overs are stored mono). */
export function monoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const frames = samples.length
  const bytes = 44 + frames * 2
  const out = new ArrayBuffer(bytes)
  const v = new DataView(out)
  const str = (o: number, s: string): void => { for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, frames * 2, true)
  let o = 44
  for (let i = 0; i < frames; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    o += 2
  }
  return out
}

/** Joins recorded chunks into one buffer. */
export function joinChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Float32Array(total)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}
