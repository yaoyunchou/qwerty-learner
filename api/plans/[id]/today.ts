import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from '../../_lib/auth'
import { handleOptions, json } from '../../_lib/http'
import { getDailyPlan } from '../../_lib/plan-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const planId = req.query.id as string
  const date = (req.query.date as string) || undefined
  if (!planId) return json(res, 400, { error: 'Plan id required' })

  try {
    const { userId } = await validateApiKey(req)
    const result = await getDailyPlan(planId, userId, date)
    return json(res, 200, result)
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to get daily plan'
    return json(res, 500, { error: message })
  }
}
