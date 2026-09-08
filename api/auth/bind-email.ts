import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, bindRecoveryEmail, validateApiKey } from '../_lib/auth'
import { handleOptions, json } from '../_lib/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { userId } = await validateApiKey(req)
    const email = req.body?.email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return json(res, 400, { error: 'Valid email is required' })
    }
    await bindRecoveryEmail(userId, email.trim().toLowerCase())
    return json(res, 200, { ok: true })
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to bind email'
    return json(res, 500, { error: message })
  }
}
