import { getServiceSupabase } from './supabase'

export async function analyzeWeakness(userId: string, days = 7) {
  const db = getServiceSupabase()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const { data: events, error } = await db
    .from('word_practice_events')
    .select('word, wrong_count, mistakes, response_ms')
    .eq('user_id', userId)
    .gte('practiced_at', since.toISOString())

  if (error) throw new Error(error.message)

  const weakWords = new Map<string, { error_count: number; avg_response_ms: number; total: number }>()
  const weakKeys = new Map<string, number>()
  const letterPairs = new Map<string, number>()

  for (const ev of events ?? []) {
    if (ev.wrong_count > 0) {
      const prev = weakWords.get(ev.word) ?? { error_count: 0, avg_response_ms: 0, total: 0 }
      prev.error_count += ev.wrong_count
      prev.avg_response_ms = Math.round((prev.avg_response_ms * prev.total + ev.response_ms) / (prev.total + 1))
      prev.total++
      weakWords.set(ev.word, prev)
    }

    const mistakes = ev.mistakes as Record<string, string[]> | null
    if (mistakes) {
      for (const [pos, keys] of Object.entries(mistakes)) {
        for (const k of keys) {
          weakKeys.set(k, (weakKeys.get(k) ?? 0) + 1)
          letterPairs.set(`${pos}:${k}`, (letterPairs.get(`${pos}:${k}`) ?? 0) + 1)
        }
      }
    }
  }

  return {
    days,
    weakWords: [...weakWords.entries()]
      .sort((a, b) => b[1].error_count - a[1].error_count)
      .slice(0, 20)
      .map(([word, stats]) => ({ word, ...stats })),
    weakKeys: [...weakKeys.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([key, count]) => ({ key, count })),
    confusedLetterPairs: [...letterPairs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([pair, count]) => ({ pair, count })),
  }
}
