import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import type { VercelRequest } from '@vercel/node'
import { getServiceSupabase } from './supabase'

const KEY_PREFIX = 'ql_'
const SAVE_WARNING =
  '请立即保存此 API Key。它是您唯一的登录凭证，丢失后无法找回（除非已绑定找回邮箱）。请勿分享给他人。'

export class AuthError extends Error {
  status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export function getSaveKeyWarning() {
  return SAVE_WARNING
}

export function generateApiKey(): { plain: string; prefix: string; hash: string } {
  const body = randomBytes(32).toString('hex')
  const plain = `${KEY_PREFIX}${body}`
  const prefix = plain.slice(0, 12)
  const hash = bcrypt.hashSync(plain, 10)
  return { plain, prefix, hash }
}

export function extractBearer(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token.startsWith(KEY_PREFIX) ? token : null
}

export async function validateApiKey(req: VercelRequest): Promise<{ userId: string; keyPrefix: string }> {
  const plain = extractBearer(req)
  if (!plain) throw new AuthError('Missing or invalid API key')

  const prefix = plain.slice(0, 12)
  const db = getServiceSupabase()
  const { data, error } = await db.from('api_keys').select('id, user_id, key_hash').eq('key_prefix', prefix).maybeSingle()
  if (error || !data) throw new AuthError('Invalid API key')

  const ok = bcrypt.compareSync(plain, data.key_hash)
  if (!ok) throw new AuthError('Invalid API key')

  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return { userId: data.user_id, keyPrefix: prefix }
}

export async function createUserWithKey(): Promise<{ userId: string; apiKey: string; warning: string }> {
  const db = getServiceSupabase()
  const { data: user, error: userErr } = await db.from('users').insert({}).select('id').single()
  if (userErr || !user) throw new Error(userErr?.message || 'Failed to create user')

  const { plain, prefix, hash } = generateApiKey()
  const { error: keyErr } = await db.from('api_keys').insert({
    user_id: user.id,
    key_prefix: prefix,
    key_hash: hash,
  })
  if (keyErr) throw new Error(keyErr.message)

  return { userId: user.id, apiKey: plain, warning: SAVE_WARNING }
}

export async function loginWithKey(plain: string): Promise<{ userId: string; keyPrefix: string }> {
  if (!plain.startsWith(KEY_PREFIX)) throw new AuthError('Invalid API key format')
  const prefix = plain.slice(0, 12)
  const db = getServiceSupabase()
  const { data, error } = await db.from('api_keys').select('id, user_id, key_hash').eq('key_prefix', prefix).maybeSingle()
  if (error || !data) throw new AuthError('Invalid API key')
  if (!bcrypt.compareSync(plain, data.key_hash)) throw new AuthError('Invalid API key')
  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { userId: data.user_id, keyPrefix: prefix }
}

export async function bindRecoveryEmail(userId: string, email: string) {
  const db = getServiceSupabase()
  const { error } = await db.from('recovery_emails').upsert(
    { user_id: userId, email, verified_at: null },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}
