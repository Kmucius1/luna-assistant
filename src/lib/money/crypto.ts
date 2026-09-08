import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// AES-256-GCM for the Plaid access token — the one real bank credential
// this app stores. Same class of protection already used elsewhere for
// other sensitive personal data (SSN/DOB/EIN), applied here since the
// token was previously written to plaid_items in plain text.
const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY is not set — cannot encrypt/decrypt the Plaid access token')
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be a 32-byte value, hex-encoded (64 hex characters)')
  return key
}

/** Returns `iv:authTag:ciphertext`, each hex-encoded — a single string safe for a text column. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(':')
  if (!ivHex || !authTagHex || !dataHex) throw new Error('Malformed encrypted secret')
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}
