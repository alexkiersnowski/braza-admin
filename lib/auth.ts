const PAYLOAD = 'braza-auth-v1'
export const COOKIE_NAME = 'braza-auth'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

async function computeHmac(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(PAYLOAD))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function signToken(secret: string): Promise<string> {
  return computeHmac(secret)
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const expected = await computeHmac(secret)
    if (token.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}
