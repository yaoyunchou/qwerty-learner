import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from '../../server/auth'
import { handleOptions, json } from '../../server/http'
import { completePlanDay, getDailyPlan, getPlanForUser, getPlanProgress } from '../../server/plan-engine'
import { finalizeChapterSession, recordPracticeEvent } from '../../server/snapshot-builder'
import { updateMemoryState } from '../../server/memory-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  const planId = req.query.id as string
  const action = (req.query.action as string) || 'today'
  if (!planId) return json(res, 400, { error: 'Plan id required' })

  try {
    const { userId } = await validateApiKey(req)

    if (req.method === 'GET' && action === 'today') {
      const date = (req.query.date as string) || undefined
      const result = await getDailyPlan(planId, userId, date)
      return json(res, 200, result)
    }

    if (req.method === 'GET') {
      const plan = await getPlanForUser(planId, userId)
      const progress = await getPlanProgress(planId, userId)
      return json(res, 200, { plan, progress })
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

    const body = req.body ?? {}
    const postAction = body.action as string

    if (postAction === 'complete') {
      const date = body.date || new Date().toISOString().slice(0, 10)
      const result = await completePlanDay(planId, userId, date, body.stats ?? {})
      return json(res, 200, result)
    }

    if (postAction === 'word') {
      const memory = await updateMemoryState(userId, {
        word: body.word,
        dictId: body.dictId,
        wrongCount: body.wrongCount ?? 0,
        responseMs: body.responseMs ?? 0,
        planId,
      })
      await recordPracticeEvent({
        userId,
        word: body.word,
        dictId: body.dictId,
        planId,
        planDayId: body.planDayId,
        wrongCount: body.wrongCount ?? 0,
        timingMs: body.timingMs,
        mistakes: body.mistakes,
        responseMs: body.responseMs ?? 0,
        wpm: body.wpm,
        sessionId: body.sessionId,
        role: body.role,
        memoryStatusBefore: memory.before,
        memoryStatusAfter: memory.after,
        isRemembered: memory.isRemembered,
      })
      return json(res, 200, memory)
    }

    if (postAction === 'chapter') {
      await finalizeChapterSession(userId, body.session)
      return json(res, 200, { ok: true })
    }

    return json(res, 400, { error: 'Unknown action. Use complete, word, or chapter.' })
  } catch (err) {
    if (err instanceof AuthError) return json(res, err.status, { error: err.message })
    const message = err instanceof Error ? err.message : 'Failed to process request'
    return json(res, 500, { error: message })
  }
}
