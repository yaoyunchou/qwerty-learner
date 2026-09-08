import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AuthError, validateApiKey } from '../../_lib/auth'
import { handleOptions, json } from '../../_lib/http'
import { completePlanDay } from '../../_lib/plan-engine'
import { finalizeChapterSession, recordPracticeEvent } from '../../_lib/snapshot-builder'
import { updateMemoryState } from '../../_lib/memory-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const planId = req.query.id as string
  if (!planId) return json(res, 400, { error: 'Plan id required' })

  try {
    const { userId } = await validateApiKey(req)
    const body = req.body ?? {}
    const action = body.action as string

    if (action === 'complete') {
      const date = body.date || new Date().toISOString().slice(0, 10)
      const result = await completePlanDay(planId, userId, date, body.stats ?? {})
      return json(res, 200, result)
    }

    if (action === 'word') {
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

    if (action === 'chapter') {
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
