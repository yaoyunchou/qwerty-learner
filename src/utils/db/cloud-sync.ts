import { db } from './index'
import { supabase } from '@/lib/supabase'

const SYNC_DONE_KEY = 'cloud_initial_sync_done'

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export async function syncLocalToCloudIfNeeded(userId: string): Promise<{ wordCount: number; chapterCount: number } | null> {
  const doneFlag = localStorage.getItem(SYNC_DONE_KEY)
  if (doneFlag === userId) return null

  const localWords = await db.wordRecords.toArray()
  const localChapters = await db.chapterRecords.toArray()

  if (localWords.length === 0 && localChapters.length === 0) {
    localStorage.setItem(SYNC_DONE_KEY, userId)
    return null
  }

  let wordSynced = 0
  for (const batch of chunk(localWords, 300)) {
    const rows = batch.map((r) => ({
      user_id: userId,
      word: r.word,
      dict: r.dict,
      chapter: r.chapter,
      timing: r.timing,
      wrong_count: r.wrongCount,
      mistakes: r.mistakes ?? {},
      created_at: new Date(r.timeStamp * 1000).toISOString(),
    }))
    const { error } = await supabase.from('cloud_word_records').insert(rows)
    if (!error) wordSynced += batch.length
  }

  let chapterSynced = 0
  for (const batch of chunk(localChapters, 300)) {
    const rows = batch.map((r) => ({
      user_id: userId,
      dict: r.dict,
      chapter: r.chapter,
      time: r.time,
      correct_count: r.correctCount,
      wrong_count: r.wrongCount,
      word_count: r.wordCount,
      correct_word_indexes: r.correctWordIndexes,
      word_number: r.wordNumber,
      created_at: new Date(r.timeStamp * 1000).toISOString(),
    }))
    const { error } = await supabase.from('cloud_chapter_records').insert(rows)
    if (!error) chapterSynced += batch.length
  }

  localStorage.setItem(SYNC_DONE_KEY, userId)
  return { wordCount: wordSynced, chapterCount: chapterSynced }
}
