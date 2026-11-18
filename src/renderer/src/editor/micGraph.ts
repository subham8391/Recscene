import { micChain, normaliseGain, type MicrophoneMode } from '@core/editor/audio'

type AnyContext = AudioContext | OfflineAudioContext

/**
 * Builds the microphone clean-up chain (spec 217) in any audio context:
 * high-pass → low-pass → compressor → make-up and normalisation gain.
 * Returns the input node to connect the source to and the output node.
 */
export function buildMicChain(ctx: AnyContext, mode: MicrophoneMode, peak: number | null): { input: AudioNode; output: GainNode; chainGain: number } {
  const chain = micChain(mode)
  const output = ctx.createGain()
  let head: AudioNode = output
  if (chain.compressor) {
    const c = ctx.createDynamicsCompressor()
    c.threshold.value = chain.compressor.threshold
    c.ratio.value = chain.compressor.ratio
    c.knee.value = chain.compressor.knee
    c.attack.value = chain.compressor.attack
    c.release.value = chain.compressor.release
    c.connect(head)
    head = c
  }
  if (chain.lowpassHz) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = chain.lowpassHz
    f.connect(head)
    head = f
  }
  if (chain.highpassHz) {
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = chain.highpassHz
    f.connect(head)
    head = f
  }
  const chainGain = chain.makeup * (chain.normalise && peak !== null ? normaliseGain(peak) : 1)
  output.gain.value = chainGain
  return { input: head, output, chainGain }
}

/** Highest sample magnitude of a decoded track, for normalisation. */
export function peakOf(buffer: AudioBuffer): number {
  let peak = 0
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i += 256) {
      const v = Math.abs(data[i] ?? 0)
      if (v > peak) peak = v
    }
  }
  return peak
}

/** Spec 14: a mono copy (channels averaged) of a buffer. */
export function toMono(ctx: AnyContext, buffer: AudioBuffer): AudioBuffer {
  if (buffer.numberOfChannels === 1) return buffer
  const mono = ctx.createBuffer(1, buffer.length, buffer.sampleRate)
  const out = mono.getChannelData(0)
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i += 1) out[i] = (out[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels
  }
  return mono
}
