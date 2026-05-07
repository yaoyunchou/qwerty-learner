import { supabase } from '@/lib/supabase'
import { currentUserAtom } from '@/store/authAtom'
import { db } from '@/utils/db'
import type { IWordRecord } from '@/utils/db/record'
import type { User } from '@supabase/supabase-js'
import dayjs from 'dayjs'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import type { Activity } from 'react-activity-calendar'

interface IWordStats {
  isEmpty?: boolean
  isCloud?: boolean
  exerciseRecord: Activity[]
  wordRecord: Activity[]
  wpmRecord: [string, number][]
  accuracyRecord: [string, number][]
  wrongTimeRecord: { name: string; value: number }[]
}

function getDatesBetween(start: number, end: number) {
  const dates = []
  let curr = dayjs(start).startOf('day')
  const last = dayjs(end).endOf('day')

  while (curr.diff(last) < 0) {
    dates.push(curr.clone().format('YYYY-MM-DD'))
    curr = curr.add(1, 'day')
  }

  return dates
}

function getLevel(value: number) {
  if (value === 0) return 0
  else if (value < 4) return 1
  else if (value < 8) return 2
  else if (value < 12) return 3
  else return 4
}

interface RawRecord {
  word: string
  timing: number[]
  wrongCount: number
  mistakes: Record<number, string[]>
  timeStamp: number
}

function buildStats(records: RawRecord[], startMs: number, endMs: number): IWordStats {
  if (records.length === 0) {
    return { isEmpty: true, exerciseRecord: [], wordRecord: [], wpmRecord: [], accuracyRecord: [], wrongTimeRecord: [] }
  }

  const dates = getDatesBetween(startMs, endMs)
  const data: Record<string, { exerciseTime: number; words: string[]; totalTime: number; wrongCount: number; wrongKeys: string[] }> = {}
  for (const d of dates) data[d] = { exerciseTime: 0, words: [], totalTime: 0, wrongCount: 0, wrongKeys: [] }

  for (const r of records) {
    const date = dayjs(r.timeStamp).format('YYYY-MM-DD')
    if (!data[date]) continue
    data[date].exerciseTime++
    data[date].words.push(r.word)
    data[date].totalTime += r.timing.reduce((a, b) => a + b, 0)
    data[date].wrongCount += r.wrongCount
    data[date].wrongKeys.push(...Object.values(r.mistakes ?? {}).flat())
  }

  const arr = Object.entries(data)
  const exerciseRecord: Activity[] = arr.map(([date, { exerciseTime }]) => ({ date, count: exerciseTime, level: getLevel(exerciseTime) }))
  const wordRecord: Activity[] = arr.map(([date, { words }]) => ({
    date,
    count: new Set(words).size,
    level: getLevel(new Set(words).size),
  }))
  const wpmRecord: [string, number][] = arr
    .map<[string, number]>(([date, { words, totalTime }]) => [date, Math.round(words.length / (totalTime / 1000 / 60))])
    .filter((d) => d[1])
  const accuracyRecord: [string, number][] = arr
    .map<[string, number]>(([date, { words, wrongCount }]) => {
      const total = words.join('').length
      return [date, Math.round((total / (total + wrongCount)) * 100)]
    })
    .filter((d) => d[1])
  const wrongTimeRecord: { name: string; value: number }[] = []
  arr
    .flatMap(([, { wrongKeys }]) => wrongKeys)
    .map((k) => k.toUpperCase())
    .forEach((key) => {
      const idx = wrongTimeRecord.findIndex((i) => i.name === key)
      if (idx === -1) wrongTimeRecord.push({ name: key, value: 1 })
      else wrongTimeRecord[idx].value++
    })

  return { exerciseRecord, wordRecord, wpmRecord, accuracyRecord, wrongTimeRecord }
}

async function fetchCloudRecords(user: User, startTs: number, endTs: number): Promise<RawRecord[]> {
  const startISO = new Date(startTs * 1000).toISOString()
  const endISO = new Date(endTs * 1000).toISOString()
  const { data, error } = await supabase
    .from('cloud_word_records')
    .select('word, timing, wrong_count, mistakes, created_at')
    .eq('user_id', user.id)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at')
  if (error || !data) return []
  return data.map((r) => ({
    word: r.word,
    timing: r.timing ?? [],
    wrongCount: r.wrong_count,
    mistakes: (r.mistakes as Record<number, string[]>) ?? {},
    timeStamp: new Date(r.created_at).getTime(),
  }))
}

async function fetchLocalRecords(startTs: number, endTs: number): Promise<RawRecord[]> {
  const records: IWordRecord[] = await db.wordRecords.where('timeStamp').between(startTs, endTs).toArray()
  return records.map((r) => ({
    word: r.word,
    timing: r.timing,
    wrongCount: r.wrongCount,
    mistakes: r.mistakes,
    timeStamp: r.timeStamp * 1000,
  }))
}

export function useWordStats(startTimeStamp: number, endTimeStamp: number) {
  const user = useAtomValue(currentUserAtom)
  const [wordStats, setWordStats] = useState<IWordStats>({
    exerciseRecord: [],
    wordRecord: [],
    wpmRecord: [],
    accuracyRecord: [],
    wrongTimeRecord: [],
  })

  useEffect(() => {
    const fetch = async () => {
      if (user) {
        const records = await fetchCloudRecords(user, startTimeStamp, endTimeStamp)
        const stats = buildStats(records, startTimeStamp * 1000, endTimeStamp * 1000)
        setWordStats({ ...stats, isCloud: true })
      } else {
        const records = await fetchLocalRecords(startTimeStamp, endTimeStamp)
        const stats = buildStats(records, startTimeStamp * 1000, endTimeStamp * 1000)
        setWordStats(stats)
      }
    }
    fetch()
  }, [startTimeStamp, endTimeStamp, user])

  return wordStats
}
