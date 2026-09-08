import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createUserWithKey } from '../_lib/auth'
import { handleOptions, json } from '../_lib/http'
import { isSupabaseConfigured } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  if (!isSupabaseConfigured()) {
    return json(res, 500, { error: 'Server misconfigured: Supabase service role not set' })
  }

  try {
    const result = await createUserWithKey()
    return json(res, 201, result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user'
    return json(res, 500, { error: message })
  }
}
