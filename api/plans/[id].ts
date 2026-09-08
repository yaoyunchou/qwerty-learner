import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from '../_lib/auth'
import { handleOptions, json } from '../_lib/http'
import { getPlanForUser, getPlanProgress } from '../_lib/plan-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const planId = req.query.id as string
  if (!planId) return json(res, 400, { error: 'Plan id required' })

  try {
    const { userId } = await validateApiKey(req)
    const plan = await getPlanForUser(planId, userId)
    const progress = await getPlanProgress(planId, userId)
    return json(res, 200, { plan, progress })
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to get plan'
    return json(res, 500, { error: message })
  }
}
