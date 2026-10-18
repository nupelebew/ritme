import type { NoiseKind } from '@/db/settings'
import { audioContext } from './notify'

let ctx: AudioContext | undefined
let nodes: AudioNode[] = []
let src: AudioBufferSourceNode | undefined
let gain: GainNode | undefined
let current: NoiseKind = 'off'
let lfoTimer: ReturnType<typeof setInterval> | undefined

/** Buffer derau 4 detik yang di-loop: putih, pink (Paul Kellet), atau cokelat (integrasi acak) */
function buffer(kind: Exclude<NoiseKind, 'off'>, ac: AudioContext) {
  const len = ac.sampleRate * 4
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w * 0.5
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    } else {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}

/** Mulai/ganti suara latar. Panggil dari aksi pengguna (mis. tombol Mulai) agar diizinkan browser. */
export function playNoise(kind: NoiseKind, volume = 0.18) {
  if (kind === current && src) return
  stopNoise()
  if (kind === 'off') return
  try {
    ctx ??= audioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5)
    src = ctx.createBufferSource()
    src.buffer = buffer(kind === 'rain' ? 'brown' : kind, ctx)
    src.loop = true
    if (kind === 'rain') {
      // Hujan: derau cokelat lewat band-pass + "rintik" dari derau putih yang berdenyut acak
      const bp = ctx.createBiquadFilter()
      bp.type = 'lowpass'
      bp.frequency.value = 1200
      src.connect(bp).connect(gain)
      const drops = ctx.createBufferSource()
      drops.buffer = buffer('white', ctx)
      drops.loop = true
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3000
      const dg = ctx.createGain()
      dg.gain.value = 0.15
      drops.connect(hp).connect(dg).connect(gain)
      drops.start()
      lfoTimer = setInterval(() => ctx && dg.gain.setTargetAtTime(0.05 + Math.random() * 0.25, ctx.currentTime, 0.08), 180)
      nodes.push(bp, drops, hp, dg)
    } else src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
    current = kind
  } catch {
    current = 'off'
  }
}

export function stopNoise() {
  clearInterval(lfoTimer)
  const g = gain
  const s = src
  const n = nodes
  if (g && ctx) {
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
    setTimeout(() => {
      try {
        s?.stop()
        n.forEach((x) => (x as AudioScheduledSourceNode).stop?.())
      } catch {
        /* sudah berhenti */
      }
      g.disconnect()
    }, 1200)
  }
  src = undefined
  gain = undefined
  nodes = []
  current = 'off'
}
