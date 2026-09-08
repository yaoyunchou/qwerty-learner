import { getServiceSupabase } from './supabase'

export type MemoryStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'lapsed'

export interface PracticeResult {
  word: string
  dictId: string
  wrongCount: number
  responseMs: number
  planId?: string
}

const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30]

export function computeMemoryStrength(
  repetitions: number,
  easeFactor: number,
  daysSinceLast: number,
  errorRate: number,
): number {
  const repScore = Math.min(repetitions / 5, 1)
  const easeScore = Math.min((easeFactor - 1.3) / 1.2, 1)
  const decay = Math.exp(-daysSinceLast / Math.max(1, repetitions * 3))
  const errorPenalty = 1 - Math.min(errorRate, 1)
  return Math.round(Math.max(0, Math.min(1, repScore * 0.4 + easeScore * 0.2 + decay * 0.25 + errorPenalty * 0.15)) * 100) / 100
}

function deriveStatus(
  repetitions: number,
  wrongCount: number,
  intervalDays: number,
  avgResponseMs: number,
  wordLength: number,
  prevStatus: MemoryStatus,
  overdue: boolean,
): MemoryStatus {
  if (wrongCount > 0) return prevStatus === 'mastered' || prevStatus === 'reviewing' ? 'lapsed' : 'learning'
  if (repetitions < 2) return 'learning'
  if (repetitions >= 3 && wrongCount === 0 && avgResponseMs < wordLength * 200 && intervalDays >= 7) return 'mastered'
  if (overdue && (prevStatus === 'mastered' || prevStatus === 'reviewing')) return 'lapsed'
  return 'reviewing'
}

export function applySm2(
  repetitions: number,
  easeFactor: number,
  intervalDays: number,
  wrongCount: number,
): { repetitions: number; easeFactor: number; intervalDays: number } {
  if (wrongCount > 0) {
    return {
      repetitions: 0,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      intervalDays: 1,
    }
  }
  const newRep = repetitions + 1
  let newInterval = intervalDays
  if (newRep === 1) newInterval = 1
  else if (newRep === 2) newInterval = 3
  else if (newRep === 3) newInterval = 7
  else newInterval = Math.round(intervalDays * easeFactor)
  return {
    repetitions: newRep,
    easeFactor: Math.min(2.5, easeFactor + 0.1),
    intervalDays: newInterval,
  }
}

export function applyEbbinghaus(repetitions: number, wrongCount: number): number {
  if (wrongCount > 0) return 1
  const idx = Math.min(repetitions, EBBINGHAUS_INTERVALS.length - 1)
  return EBBINGHAUS_INTERVALS[idx]
}

export async function updateMemoryState(userId: string, result: PracticeResult, algorithm: 'sm2' | 'ebbinghaus' = 'sm2') {
  const db = getServiceSupabase()
  const now = new Date()
  const { data: existing } = await db
    .from('word_memory_states')
    .select('*')
    .eq('user_id', userId)
    .eq('dict_id', result.dictId)
    .eq('word', result.word)
    .maybeSingle()

  const prev = existing ?? {
    repetitions: 0,
    ease_factor: 2.5,
    interval_days: 0,
    total_attempts: 0,
    total_errors: 0,
    avg_response_ms: 0,
    memory_status: 'new' as MemoryStatus,
    memory_strength: 0,
  }

  let repetitions = prev.repetitions
  let easeFactor = prev.ease_factor
  let intervalDays = prev.interval_days

  if (algorithm === 'ebbinghaus') {
    if (result.wrongCount > 0) repetitions = 0
    else repetitions += 1
    intervalDays = applyEbbinghaus(repetitions, result.wrongCount)
  } else {
    const sm2 = applySm2(repetitions, easeFactor, intervalDays, result.wrongCount)
    repetitions = sm2.repetitions
    easeFactor = sm2.easeFactor
    intervalDays = sm2.intervalDays
  }

  const totalAttempts = prev.total_attempts + 1
  const totalErrors = prev.total_errors + (result.wrongCount > 0 ? 1 : 0)
  const avgResponseMs = Math.round((prev.avg_response_ms * prev.total_attempts + result.responseMs) / totalAttempts)
  const nextReview = new Date(now)
  nextReview.setUTCDate(nextReview.getUTCDate() + intervalDays)

  const daysSinceLast = existing?.last_practiced_at
    ? (now.getTime() - new Date(existing.last_practiced_at).getTime()) / 86400000
    : 0
  const errorRate = totalErrors / totalAttempts
  const memoryStrength = computeMemoryStrength(repetitions, easeFactor, daysSinceLast, errorRate)
  const overdue = existing?.next_review_at ? new Date(existing.next_review_at) < now : false
  const memoryStatus = deriveStatus(
    repetitions,
    result.wrongCount,
    intervalDays,
    avgResponseMs,
    result.word.length,
    (prev.memory_status as MemoryStatus) || 'new',
    overdue,
  )

  const row = {
    user_id: userId,
    dict_id: result.dictId,
    word: result.word,
    memory_status: memoryStatus,
    first_seen_at: existing?.first_seen_at ?? now.toISOString(),
    last_practiced_at: now.toISOString(),
    next_review_at: nextReview.toISOString(),
    repetitions,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    total_attempts: totalAttempts,
    total_errors: totalErrors,
    avg_response_ms: avgResponseMs,
    last_wrong_count: result.wrongCount,
    memory_strength: memoryStrength,
    source_plan_id: result.planId ?? existing?.source_plan_id ?? null,
    updated_at: now.toISOString(),
  }

  const { data, error } = await db
    .from('word_memory_states')
    .upsert(row, { onConflict: 'user_id,dict_id,word' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return {
    before: existing?.memory_status ?? 'new',
    after: memoryStatus,
    memoryStrength,
    nextReviewAt: nextReview.toISOString(),
    isRemembered: result.wrongCount === 0 && (memoryStatus === 'reviewing' || memoryStatus === 'mastered'),
    state: data,
  }
}

export async function getDueReviewWords(userId: string, dictId: string, limit: number) {
  const db = getServiceSupabase()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('word_memory_states')
    .select('word, memory_status, next_review_at, memory_strength')
    .eq('user_id', userId)
    .eq('dict_id', dictId)
    .lte('next_review_at', now)
    .in('memory_status', ['learning', 'reviewing', 'lapsed'])
    .order('next_review_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getMemoryOverview(userId: string) {
  const db = getServiceSupabase()
  const now = new Date().toISOString()
  const { data, error } = await db.from('word_memory_states').select('memory_status, next_review_at').eq('user_id', userId)

  if (error) throw new Error(error.message)

  const counts: Record<MemoryStatus, number> = {
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
    lapsed: 0,
  }

  let dueToday = 0
  for (const row of data ?? []) {
    counts[row.memory_status as MemoryStatus] = (counts[row.memory_status as MemoryStatus] ?? 0) + 1
    if (row.next_review_at && row.next_review_at <= now) dueToday++
  }

  return { counts, dueToday, total: (data ?? []).length }
}
