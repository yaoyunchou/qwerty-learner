import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from './_lib/auth'
import { handleOptions, json } from './_lib/http'
import { getDailySnapshot } from './_lib/snapshot-builder'
import { getStudySummary } from './_lib/stats-queries'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const report = String(req.query.report ?? 'summary')
  try {
    const { userId } = await validateApiKey(req)
    if (report === 'daily') {
      const date = (req.query.date as string) || undefined
      const data = await getDailySnapshot(userId, date)
      return json(res, 200, data ?? { empty: true })
    }
    const summary = await getStudySummary(userId)
    return json(res, 200, summary)
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to get stats'
    return json(res, 500, { error: message })
  }
}
