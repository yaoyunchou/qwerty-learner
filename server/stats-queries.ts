import { getMemoryOverview } from './memory-engine'
import { getPlanProgress } from './plan-engine'
import { getDailySnapshot, getStreakInfo, getWeeklySnapshot } from './snapshot-builder'
import { getServiceSupabase } from './supabase'
import { analyzeWeakness } from './weakness-analyzer'

export async function getStudySummary(userId: string) {
  const [memory, streak, daily] = await Promise.all([
    getMemoryOverview(userId),
    getStreakInfo(userId),
    getDailySnapshot(userId),
  ])

  const db = getServiceSupabase()
  const { data: activePlan } = await db
    .from('study_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let planProgress = null
  if (activePlan) {
    planProgress = await getPlanProgress(activePlan.id, userId)
  }

  return {
    memory,
    streak,
    today: daily?.summary ?? null,
    planProgress,
  }
}

export async function getWordDetail(userId: string, word: string, dictId?: string) {
  const db = getServiceSupabase()
  let memoryQuery = db.from('word_memory_states').select('*').eq('user_id', userId).eq('word', word)
  if (dictId) memoryQuery = memoryQuery.eq('dict_id', dictId)

  const { data: memory } = await memoryQuery.maybeSingle()
  const { data: events } = await db
    .from('word_practice_events')
    .select('*')
    .eq('user_id', userId)
    .eq('word', word)
    .order('practiced_at', { ascending: false })
    .limit(20)

  return {
    word,
    dictId: memory?.dict_id ?? dictId ?? null,
    memory: memory ?? { memory_status: 'new' },
    recentEvents: events ?? [],
  }
}

export { getDailySnapshot, getWeeklySnapshot, getStreakInfo, getMemoryOverview, getPlanProgress, analyzeWeakness }
