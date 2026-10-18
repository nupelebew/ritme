/**
 * Kunci aplikasi pakai sidik jari / wajah / PIN layar HP (WebAuthn "platform authenticator").
 * Ini tirai privasi lokal — melindungi dari orang yang meminjam HP, bukan enkripsi data.
 * Kredensial dibuat & disimpan di perangkat ini; tidak ada server.
 */

const LOCK_FLAG = 'ritme-lock'
const UNLOCKED = 'ritme-unlocked-at'
/** Terkunci lagi setelah aplikasi disembunyikan selama ini */
export const RELOCK_MS = 2 * 60_000

const b64u = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export async function lockSupported() {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

/** Buat kredensial baru; kembalikan ID-nya (disimpan di pengaturan) */
export async function createLock(displayName: string): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: 'Ritme' },
      user: { id: rand(16), name: 'ritme', displayName: displayName || 'Ritme' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Dibatalkan')
  return b64u(cred.rawId)
}

/** Minta verifikasi sidik jari/wajah/PIN untuk kredensial ini */
export async function verifyLock(id: string) {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: 'public-key', id: unb64u(id), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60_000,
    },
  })
  return !!cred
}

/* Status sesi: disimpan sinkron di storage supaya layar kunci muncul tanpa kedipan */
export const lockFlag = {
  get: () => {
    try {
      return localStorage.getItem(LOCK_FLAG) === '1'
    } catch {
      return false
    }
  },
  set: (on: boolean) => {
    try {
      if (on) localStorage.setItem(LOCK_FLAG, '1')
      else localStorage.removeItem(LOCK_FLAG)
    } catch {
      /* abaikan */
    }
  },
}

export const unlockedRecently = (now = Date.now()) => {
  try {
    return now - Number(sessionStorage.getItem(UNLOCKED) ?? 0) < RELOCK_MS
  } catch {
    return false
  }
}
export const markUnlocked = (at = Date.now()) => {
  try {
    sessionStorage.setItem(UNLOCKED, String(at))
  } catch {
    /* abaikan */
  }
}
