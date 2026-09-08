import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, bindRecoveryEmail, createUserWithKey, loginWithKey, validateApiKey } from '../server/auth'
import { handleOptions, json } from '../server/http'
import { isSupabaseConfigured } from '../server/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  const action = String(req.query.action ?? '')
  if (!action) return json(res, 400, { error: 'Missing action query. Use create-key | login | bind-email' })

  if (!isSupabaseConfigured()) {
    return json(res, 500, { error: 'Server misconfigured: Supabase service role not set' })
  }

  try {
    if (action === 'create-key') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
      const result = await createUserWithKey()
      return json(res, 201, result)
    }

    if (action === 'login') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
      const apiKey = req.body?.apiKey
      if (!apiKey || typeof apiKey !== 'string') return json(res, 400, { error: 'apiKey is required' })
      const result = await loginWithKey(apiKey)
      return json(res, 200, result)
    }

    if (action === 'bind-email') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
      const { userId } = await validateApiKey(req)
      const email = req.body?.email
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return json(res, 400, { error: 'Valid email is required' })
      }
      await bindRecoveryEmail(userId, email.trim().toLowerCase())
      return json(res, 200, { ok: true })
    }

    return json(res, 404, { error: 'Unknown action' })
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Request failed'
    return json(res, 500, { error: message })
  }
}
