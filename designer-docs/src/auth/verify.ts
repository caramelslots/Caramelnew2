import {
  AUTH_PASSWORD_HASH_HEX,
  AUTH_PBKDF2_ITERATIONS,
  AUTH_SALT,
  AUTH_USER_HASH_HEX,
} from './credentials'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function pbkdf2Sha256(password: string, salt: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: AUTH_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
}

export async function verifyLogin(username: string, password: string): Promise<boolean> {
  const trimmedUser = username.trim()
  if (!trimmedUser || !password) return false

  try {
    const [userDigest, passDigest] = await Promise.all([
      pbkdf2Sha256(trimmedUser, `${AUTH_SALT}:user`),
      pbkdf2Sha256(password, AUTH_SALT),
    ])
    const expectedUser = hexToBytes(AUTH_USER_HASH_HEX)
    const expectedPass = hexToBytes(AUTH_PASSWORD_HASH_HEX)
    return timingSafeEqual(userDigest, expectedUser) && timingSafeEqual(passDigest, expectedPass)
  } catch {
    return false
  }
}
