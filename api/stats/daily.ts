import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from '../_lib/auth'
import { handleOptions, json } from '../_lib/http'
import { getDailySnapshot } from '../_lib/snapshot-builder'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { userId } = await validateApiKey(req)
    const date = (req.query.date as string) || undefined
    const report = await getDailySnapshot(userId, date)
    return json(res, 200, report ?? { empty: true })
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to get daily report'
    return json(res, 500, { error: message })
  }
}
