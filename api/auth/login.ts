import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, loginWithKey } from '../_lib/auth'
import { handleOptions, json } from '../_lib/http'
import { isSupabaseConfigured } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  if (!isSupabaseConfigured()) {
    return json(res, 500, { error: 'Server misconfigured: Supabase service role not set' })
  }

  try {
    const apiKey = req.body?.apiKey
    if (!apiKey || typeof apiKey !== 'string') {
      return json(res, 400, { error: 'apiKey is required' })
    }
    const result = await loginWithKey(apiKey)
    return json(res, 200, result)
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Login failed'
    return json(res, 500, { error: message })
  }
}
