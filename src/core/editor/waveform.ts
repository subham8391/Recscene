/** Waveform bars from decoded audio (spec 61): peak per bar, optionally smoothed. */
export function waveformBars(samples: ArrayLike<number>, bars: number, smooth = true): number[] {
  const n = samples.length
  if (n === 0 || bars <= 0) return new Array(Math.max(0, bars)).fill(0)
  const out: number[] = []
  for (let b = 0; b < bars; b += 1) {
    const start = Math.floor((b / bars) * n)
    const end = Math.max(start + 1, Math.floor(((b + 1) / bars) * n))
    let peak = 0
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(samples[i] ?? 0)
      if (v > peak) peak = v
    }
    out.push(Math.min(1, peak))
  }
  if (!smooth) return out
  return out.map((v, i) => {
    const prev = out[i - 1] ?? v
    const next = out[i + 1] ?? v
    return (prev + 2 * v + next) / 4
  })
}
