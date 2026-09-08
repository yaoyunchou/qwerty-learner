import type { WordEntry } from './dictionaries'
import { getDictionaryMeta, loadDictionaryWords, shuffle } from './dictionaries'
import { practicePlanUrl } from './http'
import { getDueReviewWords } from './memory-engine'
import { getServiceSupabase } from './supabase'

export interface PlanWord {
  name: string
  trans: string[]
  usphone?: string
  ukphone?: string
  notation?: string
  role?: 'new' | 'review'
}

export interface CreatePlanInput {
  userId: string
  dictId: string
  totalDays: number
  wordsPerDay: number
  title?: string
  startDate?: string
  reviewRatio?: number
  algorithm?: 'sm2' | 'ebbinghaus'
  focusWords?: string[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function prioritizeWords(words: WordEntry[], focusWords?: string[]): WordEntry[] {
  if (!focusWords?.length) return shuffle(words)
  const focusSet = new Set(focusWords.map((w) => w.toLowerCase()))
  const focused = words.filter((w) => focusSet.has(w.name.toLowerCase()))
  const rest = words.filter((w) => !focusSet.has(w.name.toLowerCase()))
  return [...shuffle(focused), ...shuffle(rest)]
}

export async function createStudyPlan(input: CreatePlanInput) {
  const meta = getDictionaryMeta(input.dictId)
  if (!meta) throw new Error(`Dictionary not found: ${input.dictId}`)

  const allWords = prioritizeWords(loadDictionaryWords(input.dictId), input.focusWords)
  const totalNeeded = input.totalDays * input.wordsPerDay
  if (allWords.length < totalNeeded) {
    throw new Error(`Dictionary ${input.dictId} has only ${allWords.length} words, need ${totalNeeded}`)
  }

  const selected = allWords.slice(0, totalNeeded)
  const startDate = input.startDate ?? todayStr()
  const db = getServiceSupabase()

  const { data: plan, error: planErr } = await db
    .from('study_plans')
    .insert({
      user_id: input.userId,
      title: input.title || `${meta.name} ${input.totalDays}天计划`,
      source_dict_id: input.dictId,
      words_per_day: input.wordsPerDay,
      start_date: startDate,
      total_days: input.totalDays,
      review_ratio: input.reviewRatio ?? 0.3,
      algorithm: input.algorithm ?? 'sm2',
      status: 'active',
    })
    .select('id')
    .single()

  if (planErr || !plan) throw new Error(planErr?.message || 'Failed to create plan')

  const dayRows = []
  for (let i = 0; i < input.totalDays; i++) {
    const chunk = selected.slice(i * input.wordsPerDay, (i + 1) * input.wordsPerDay)
    const words: PlanWord[] = chunk.map((w) => ({ ...w, role: 'new' as const }))
    dayRows.push({
      plan_id: plan.id,
      scheduled_date: addDays(startDate, i),
      day_index: i,
      words,
      word_roles: words.map((w) => ({ word: w.name, role: 'new' })),
    })
  }

  const { error: daysErr } = await db.from('study_plan_days').insert(dayRows)
  if (daysErr) throw new Error(daysErr.message)

  return {
    planId: plan.id,
    title: input.title || `${meta.name} ${input.totalDays}天计划`,
    totalDays: input.totalDays,
    wordsPerDay: input.wordsPerDay,
    startDate,
    days: dayRows.map((d) => ({
      dayIndex: d.day_index,
      scheduledDate: d.scheduled_date,
      wordCount: d.words.length,
    })),
  }
}

export async function getPlanForUser(planId: string, userId: string) {
  const db = getServiceSupabase()
  const { data, error } = await db
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Plan not found')
  return data
}

export async function getDailyPlan(planId: string, userId: string, date?: string) {
  const plan = await getPlanForUser(planId, userId)
  const targetDate = date ?? todayStr()
  const db = getServiceSupabase()

  const { data: dayRow, error } = await db
    .from('study_plan_days')
    .select('*')
    .eq('plan_id', planId)
    .eq('scheduled_date', targetDate)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const reviewQuota = Math.floor(plan.words_per_day * plan.review_ratio)
  const dueReviews = await getDueReviewWords(userId, plan.source_dict_id, reviewQuota)

  let words: PlanWord[] = dayRow ? (dayRow.words as PlanWord[]) : []
  const reviewWords: PlanWord[] = dueReviews.map((r) => ({
    name: r.word,
    trans: [],
    role: 'review' as const,
  }))

  const reviewNames = new Set(reviewWords.map((w) => w.name))
  const newWords = words.filter((w) => !reviewNames.has(w.name)).slice(0, plan.words_per_day - reviewWords.length)
  const combined = [...reviewWords, ...newWords.map((w) => ({ ...w, role: 'new' as const }))]

  const breakdown = {
    new: combined.filter((w) => w.role === 'new').length,
    review: combined.filter((w) => w.role === 'review').length,
  }

  return {
    planId,
    date: targetDate,
    dayIndex: dayRow?.day_index ?? null,
    completed: Boolean(dayRow?.completed_at),
    words: combined,
    breakdown,
    practiceUrl: practicePlanUrl(planId, targetDate),
  }
}

export async function suggestTodayWords(userId: string, planId?: string, wordsPerDay?: number) {
  const db = getServiceSupabase()
  let plan = null

  if (planId) {
    plan = await getPlanForUser(planId, userId)
  } else {
    const { data } = await db
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    plan = data
  }

  if (!plan) throw new Error('No active study plan found')

  const perDay = wordsPerDay ?? plan.words_per_day
  const reviewQuota = Math.floor(perDay * plan.review_ratio)
  const dueReviews = await getDueReviewWords(userId, plan.source_dict_id, reviewQuota)

  const today = todayStr()
  const { data: dayRow } = await db
    .from('study_plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('scheduled_date', today)
    .maybeSingle()

  const scheduledNew = (dayRow?.words as PlanWord[] | undefined) ?? []
  const reviewNames = new Set(dueReviews.map((r) => r.word))
  const newWords = scheduledNew.filter((w) => !reviewNames.has(w.name)).slice(0, perDay - dueReviews.length)

  const words: PlanWord[] = [
    ...dueReviews.map((r) => ({ name: r.word, trans: [], role: 'review' as const })),
    ...newWords.map((w) => ({ ...w, role: 'new' as const })),
  ]

  return {
    planId: plan.id,
    date: today,
    words,
    breakdown: { new: newWords.length, review: dueReviews.length },
    practiceUrl: practicePlanUrl(plan.id, today),
  }
}

export async function completePlanDay(
  planId: string,
  userId: string,
  date: string,
  stats: Record<string, unknown> = {},
) {
  await getPlanForUser(planId, userId)
  const db = getServiceSupabase()
  const { data, error } = await db
    .from('study_plan_days')
    .update({ completed_at: new Date().toISOString(), stats })
    .eq('plan_id', planId)
    .eq('scheduled_date', date)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Plan day not found')
  return { ok: true, planDayId: data.id }
}

export async function getPlanProgress(planId: string, userId: string) {
  const plan = await getPlanForUser(planId, userId)
  const db = getServiceSupabase()
  const { data: days, error } = await db
    .from('study_plan_days')
    .select('scheduled_date, day_index, completed_at')
    .eq('plan_id', planId)
    .order('day_index')

  if (error) throw new Error(error.message)

  const completedDays = (days ?? []).filter((d) => d.completed_at).length
  const today = todayStr()
  const overdue = (days ?? []).filter((d) => !d.completed_at && d.scheduled_date < today).length
  const onTrack = overdue === 0

  const lastCompleted = (days ?? []).filter((d) => d.completed_at).pop()
  const projectedFinishDate = addDays(plan.start_date, plan.total_days - 1)

  return {
    planId,
    title: plan.title,
    status: plan.status,
    totalDays: plan.total_days,
    completedDays,
    wordsPerDay: plan.words_per_day,
    onTrack,
    overdueDays: overdue,
    projectedFinishDate,
    lastCompletedDate: lastCompleted?.scheduled_date ?? null,
  }
}
