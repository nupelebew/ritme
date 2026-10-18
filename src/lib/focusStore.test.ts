import { describe, expect, it } from 'vitest'
import { createFocusStore, type SessionLog } from './focusStore'

const CFG = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakEvery: 2 }
const MIN = 60_000

function setup() {
  let t = 1_000_000
  const logs: SessionLog[] = []
  const ends: string[] = []
  const mem = new Map<string, string>()
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
  const make = () =>
    createFocusStore(CFG, { onLog: (l) => logs.push(l), onPhaseEnd: (p, n, f) => ends.push(`${p}>${n}${f ? '' : ' (susul)'}`) }, { now: () => t, storage })
  const store = make()
  return { store, logs, ends, advance: (ms: number) => (t += ms), make, now: () => t }
}

describe('timer fokus', () => {
  it('fokus selesai → tercatat, istirahat pendek otomatis, lalu kembali ke fokus siap', () => {
    const { store, logs, ends, advance } = setup()
    store.setTarget({ taskId: 't1', categoryId: 'skripsi' })
    store.start()
    advance(10 * MIN)
    expect(store.remaining()).toBe(15 * MIN)
    advance(15 * MIN)
    store.tick()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ durationMs: 25 * MIN, taskId: 't1', categoryId: 'skripsi', completed: true })
    expect(store.get()).toMatchObject({ phase: 'short', status: 'running', cycle: 1 })
    advance(5 * MIN)
    store.tick()
    expect(store.get()).toMatchObject({ phase: 'focus', status: 'idle' })
    expect(ends).toEqual(['focus>short', 'short>focus'])
  })

  it('jeda tidak menghitung waktu', () => {
    const { store, advance } = setup()
    store.start()
    advance(5 * MIN)
    store.pause()
    advance(60 * MIN)
    expect(store.remaining()).toBe(20 * MIN)
    store.start()
    advance(20 * MIN - 1)
    store.tick()
    expect(store.get().phase).toBe('focus')
  })

  it('istirahat panjang setiap N sesi', () => {
    const { store, advance } = setup()
    store.start()
    advance(25 * MIN)
    store.tick() // → short
    advance(5 * MIN)
    store.tick() // → focus idle
    store.start()
    advance(25 * MIN)
    store.tick()
    expect(store.get()).toMatchObject({ phase: 'long', cycle: 0 })
  })

  it('berhenti lebih awal: dicatat bila ≥ 1 menit, sebagai belum selesai', () => {
    const { store, logs, advance } = setup()
    store.start()
    advance(30_000)
    store.stop()
    expect(logs).toHaveLength(0)
    store.start()
    advance(12 * MIN)
    store.stop()
    expect(logs[0]).toMatchObject({ durationMs: 12 * MIN, completed: false })
    expect(store.get().status).toBe('idle')
  })

  it('"5 menit dulu": sesi bebas tanpa istirahat otomatis & tanpa menambah siklus', () => {
    const { store, logs, advance } = setup()
    store.startCustom(5, { taskId: 'malas', categoryId: 'skripsi' })
    expect(store.remaining()).toBe(5 * MIN)
    advance(5 * MIN)
    store.tick()
    expect(logs[0]).toMatchObject({ durationMs: 5 * MIN, taskId: 'malas', completed: true })
    expect(store.get()).toMatchObject({ phase: 'focus', status: 'idle', cycle: 0, durationMs: 25 * MIN })
    expect(store.get().custom).toBeUndefined()
  })

  it('bertahan setelah aplikasi ditutup dan menyusul fase yang terlewat', () => {
    const { store, logs, ends, advance, make } = setup()
    store.start()
    advance(2 * 60 * MIN) // aplikasi ditutup 2 jam
    const reopened = make()
    reopened.tick()
    expect(logs).toHaveLength(1)
    expect(logs[0].durationMs).toBe(25 * MIN)
    expect(reopened.get()).toMatchObject({ phase: 'focus', status: 'idle' })
    expect(ends).toEqual(['focus>short (susul)', 'short>focus (susul)'])
  })
})
