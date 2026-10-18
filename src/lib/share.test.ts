import { describe, expect, it } from 'vitest'
import { readShared, sharedLines } from './share'

describe('bagikan ke Ritme', () => {
  it('pakai teks; judul hanya bila teks kosong; link digabung', () => {
    expect(readShared('?title=Chat%20Klien&text=Revisi%20logo%20besok&url=https%3A%2F%2Fx.com')).toBe('Revisi logo besok https://x.com')
    expect(readShared('?title=Artikel%20Bagus&url=https%3A%2F%2Fx.com')).toBe('Artikel Bagus https://x.com')
    expect(readShared('?text=lihat%20https%3A%2F%2Fx.com&url=https%3A%2F%2Fx.com')).toBe('lihat https://x.com')
    expect(readShared('?text=')).toBeNull()
    expect(readShared('')).toBeNull()
  })
  it('memecah daftar menjadi baris tugas', () => {
    expect(sharedLines('Belanja:\n- beli galon\n• sabun\n2) bayar listrik\n\n')).toEqual(['Belanja:', 'beli galon', 'sabun', 'bayar listrik'])
  })
})
