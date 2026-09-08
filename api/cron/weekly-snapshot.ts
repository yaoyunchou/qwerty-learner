import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceSupabase } from '../_lib/supabase'
import { buildWeeklySnapshot } from '../_lib/snapshot-builder'
import { json } from '../_lib/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  try {
    const db = getServiceSupabase()
    const { data: users } = await db.from('users').select('id').limit(500)
    const results = []
    for (const user of users ?? []) {
      const snapshot = await buildWeeklySnapshot(user.id)
      results.push({ userId: user.id, weekStart: snapshot.week_start })
    }
    return json(res, 200, { processed: results.length, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed'
    return json(res, 500, { error: message })
  }
}
