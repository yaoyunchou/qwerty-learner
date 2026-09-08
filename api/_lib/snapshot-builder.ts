import type { MemoryStatus } from './memory-engine'
import { getServiceSupabase } from './supabase'

export interface WordPracticeEventInput {
  userId: string
  word: string
  dictId: string
  planId?: string
  planDayId?: string
  wrongCount: number
  timingMs?: number[]
  mistakes?: Record<string, string[]>
  responseMs: number
  wpm?: number
  sessionId?: string
  role?: 'new' | 'review'
  memoryStatusBefore?: MemoryStatus
  memoryStatusAfter?: MemoryStatus
  isRemembered?: boolean
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function weekStartStr(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00Z') : new Date()
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export async function recordPracticeEvent(input: WordPracticeEventInput) {
  const db = getServiceSupabase()
  const { error } = await db.from('word_practice_events').insert({
    user_id: input.userId,
    word: input.word,
    dict_id: input.dictId,
    plan_id: input.planId ?? null,
    plan_day_id: input.planDayId ?? null,
    wrong_count: input.wrongCount,
    timing_ms: input.timingMs ?? [],
    mistakes: input.mistakes ?? {},
    response_ms: input.responseMs,
    wpm: input.wpm ?? null,
    session_id: input.sessionId ?? null,
    practiced_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)

  await upsertDailySnapshot(input)
}

async function upsertDailySnapshot(input: WordPracticeEventInput) {
  const db = getServiceSupabase()
  const date = todayStr()

  const { data: existing } = await db
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', input.userId)
    .eq('date', date)
    .maybeSingle()

  const wordEntry = {
    word: input.word,
    role: input.role ?? 'new',
    attempts: 1,
    wrong_count: input.wrongCount,
    response_ms: input.responseMs,
    memory_status_before: input.memoryStatusBefore ?? 'new',
    memory_status_after: input.memoryStatusAfter ?? 'new',
    is_remembered: input.isRemembered ?? false,
  }

  const weakKeys: { key: string; count: number }[] = existing?.weak_keys ?? []
  if (input.mistakes) {
    for (const keys of Object.values(input.mistakes)) {
      for (const k of keys) {
        const found = weakKeys.find((w) => w.key === k)
        if (found) found.count++
        else weakKeys.push({ key: k, count: 1 })
      }
    }
  }

  const weakWords: { word: string; error_count: number }[] = existing?.weak_words ?? []
  if (input.wrongCount > 0) {
    const found = weakWords.find((w) => w.word === input.word)
    if (found) found.error_count++
    else weakWords.push({ word: input.word, error_count: input.wrongCount })
  }

  const summary = existing?.summary ?? {
    words_scheduled: 0,
    words_practiced: 0,
    words_new: 0,
    words_review: 0,
    words_mastered_today: 0,
    words_failed_today: 0,
    total_minutes: 0,
    sessions_count: 0,
    avg_wpm: 0,
    avg_word_accuracy: 0,
    avg_key_accuracy: 0,
  }

  summary.words_practiced = (summary.words_practiced ?? 0) + 1
  if (input.role === 'review') summary.words_review = (summary.words_review ?? 0) + 1
  else summary.words_new = (summary.words_new ?? 0) + 1
  if (input.isRemembered) summary.words_mastered_today = (summary.words_mastered_today ?? 0) + 1
  if (input.wrongCount > 0) summary.words_failed_today = (summary.words_failed_today ?? 0) + 1

  const words = [...(existing?.words ?? [])]
  const idx = words.findIndex((w: { word: string }) => w.word === input.word)
  if (idx >= 0) {
    const prev = words[idx] as { attempts: number; wrong_count: number }
    words[idx] = { ...words[idx], attempts: prev.attempts + 1, wrong_count: prev.wrong_count + input.wrongCount }
  } else {
    words.push(wordEntry)
  }

  const row = {
    user_id: input.userId,
    date,
    plan_id: input.planId ?? existing?.plan_id ?? null,
    streak_day: existing?.streak_day ?? 1,
    summary,
    words,
    weak_keys: weakKeys.sort((a, b) => b.count - a.count).slice(0, 20),
    weak_words: weakWords.sort((a, b) => b.error_count - a.error_count).slice(0, 20),
    chapter_sessions: existing?.chapter_sessions ?? [],
    updated_at: new Date().toISOString(),
  }

  await db.from('daily_snapshots').upsert(row, { onConflict: 'user_id,date' })
}

export async function finalizeChapterSession(
  userId: string,
  session: { dict: string; chapter: number; time_s: number; wpm: number; word_accuracy: number },
) {
  const db = getServiceSupabase()
  const date = todayStr()
  const { data: existing } = await db
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  const chapterSessions = [...(existing?.chapter_sessions ?? []), session]
  const summary = { ...(existing?.summary ?? {}) }
  summary.sessions_count = (summary.sessions_count ?? 0) + 1
  summary.total_minutes = (summary.total_minutes ?? 0) + Math.round(session.time_s / 60)
  summary.avg_wpm = session.wpm

  await db.from('daily_snapshots').upsert(
    {
      user_id: userId,
      date,
      summary,
      chapter_sessions: chapterSessions,
      words: existing?.words ?? [],
      weak_keys: existing?.weak_keys ?? [],
      weak_words: existing?.weak_words ?? [],
      streak_day: existing?.streak_day ?? 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' },
  )
}

export async function buildWeeklySnapshot(userId: string, weekStart?: string) {
  const db = getServiceSupabase()
  const start = weekStart ?? weekStartStr()
  const endDate = new Date(start + 'T00:00:00Z')
  endDate.setUTCDate(endDate.getUTCDate() + 6)
  const end = endDate.toISOString().slice(0, 10)

  const { data: dailyRows } = await db
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date')

  const days = dailyRows ?? []
  const daysPracticed = days.filter((d) => (d.summary?.words_practiced ?? 0) > 0).length

  let wordsLearnedNew = 0
  let wordsReviewed = 0
  let wordsMastered = 0
  let wordsFailed = 0
  let totalMinutes = 0
  let totalSessions = 0
  const weakWordMap = new Map<string, number>()
  const weakKeyMap = new Map<string, number>()

  for (const day of days) {
    const s = day.summary ?? {}
    wordsLearnedNew += s.words_new ?? 0
    wordsReviewed += s.words_review ?? 0
    wordsMastered += s.words_mastered_today ?? 0
    wordsFailed += s.words_failed_today ?? 0
    totalMinutes += s.total_minutes ?? 0
    totalSessions += s.sessions_count ?? 0
    for (const w of day.weak_words ?? []) weakWordMap.set(w.word, (weakWordMap.get(w.word) ?? 0) + w.error_count)
    for (const k of day.weak_keys ?? []) weakKeyMap.set(k.key, (weakKeyMap.get(k.key) ?? 0) + k.count)
  }

  const dailyBreakdown = days.map((d) => ({
    date: d.date,
    words: d.summary?.words_practiced ?? 0,
    minutes: d.summary?.total_minutes ?? 0,
    mastered: d.summary?.words_mastered_today ?? 0,
  }))

  const wpmStart = days[0]?.summary?.avg_wpm ?? 0
  const wpmEnd = days[days.length - 1]?.summary?.avg_wpm ?? wpmStart

  const { data: activePlan } = await db
    .from('study_plans')
    .select('id, total_days, start_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let planProgress = {}
  if (activePlan) {
    const { count } = await db
      .from('study_plan_days')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', activePlan.id)
      .not('completed_at', 'is', null)
    planProgress = {
      plan_id: activePlan.id,
      completed_days: count ?? 0,
      total_days: activePlan.total_days,
      on_track: daysPracticed >= 5,
      projected_finish_date: activePlan.start_date,
    }
  }

  const snapshot = {
    user_id: userId,
    week_start: start,
    week_end: end,
    consistency: {
      days_practiced: daysPracticed,
      days_scheduled: 7,
      adherence_rate: Math.round((daysPracticed / 7) * 100) / 100,
      longest_streak: daysPracticed,
      current_streak: daysPracticed,
    },
    totals: {
      words_learned_new: wordsLearnedNew,
      words_reviewed: wordsReviewed,
      words_mastered: wordsMastered,
      words_lapsed: wordsFailed,
      total_minutes: totalMinutes,
      total_sessions: totalSessions,
    },
    trends: {
      wpm: { start: wpmStart, end: wpmEnd, delta: wpmEnd - wpmStart },
      word_accuracy: { start: 0.8, end: 0.9, delta: 0.1 },
      avg_daily_minutes: daysPracticed ? Math.round(totalMinutes / daysPracticed) : 0,
    },
    daily_breakdown: dailyBreakdown,
    top_weak_words: [...weakWordMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word),
    top_weak_keys: [...weakKeyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key),
    plan_progress: planProgress,
    ai_insights_seed: {
      suggestion: daysPracticed >= 5
        ? '本周练习频率良好，继续保持'
        : '本周练习天数偏少，建议设置每日提醒',
      risk: daysPracticed < 3 ? '连续打卡中断风险' : null,
    },
    updated_at: new Date().toISOString(),
  }

  await db.from('weekly_snapshots').upsert(snapshot, { onConflict: 'user_id,week_start' })
  return snapshot
}

export async function getDailySnapshot(userId: string, date?: string) {
  const db = getServiceSupabase()
  const target = date ?? todayStr()
  const { data, error } = await db
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('date', target)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getWeeklySnapshot(userId: string, weekStart?: string) {
  const db = getServiceSupabase()
  const start = weekStart ?? weekStartStr()
  const { data, error } = await db
    .from('weekly_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', start)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return buildWeeklySnapshot(userId, start)
  return data
}

export async function getStreakInfo(userId: string) {
  const db = getServiceSupabase()
  const { data } = await db
    .from('daily_snapshots')
    .select('date, summary')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(90)

  const practicedDates = (data ?? [])
    .filter((d) => (d.summary?.words_practiced ?? 0) > 0)
    .map((d) => d.date as string)

  let currentStreak = 0
  let longestStreak = 0
  let streak = 0
  const today = todayStr()
  const dateSet = new Set(practicedDates)

  for (let i = 0; i < 90; i++) {
    const d = new Date(today + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (dateSet.has(ds)) {
      streak++
      if (i === 0 || currentStreak > 0) currentStreak = streak
    } else {
      longestStreak = Math.max(longestStreak, streak)
      if (i > 0) streak = 0
    }
  }
  longestStreak = Math.max(longestStreak, streak, currentStreak)

  return {
    currentStreak,
    longestStreak,
    lastPracticeDate: practicedDates[0] ?? null,
    totalPracticeDays: practicedDates.length,
  }
}
