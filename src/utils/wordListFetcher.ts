import { fetchPlanToday, getStoredApiKey } from '@/lib/apiClient'
import { supabase } from '@/lib/supabase'
import type { Word } from '@/typings'
import { extractDictIdFromUrl, getCustomDictWords, isCustomDictUrl } from '@/utils/db/custom-dict'

const SUPABASE_PROTOCOL = 'supabase://'
const PLAN_PROTOCOL = 'plan://'

export function parsePlanUrl(url: string): { planId: string; date?: string } | null {
  if (!url.startsWith(PLAN_PROTOCOL)) return null
  const rest = url.slice(PLAN_PROTOCOL.length)
  const [planId, query] = rest.split('?')
  const date = query ? new URLSearchParams(query).get('date') ?? undefined : undefined
  return { planId, date }
}

export async function wordListFetcher(url: string): Promise<Word[]> {
  if (url.startsWith(PLAN_PROTOCOL)) {
    const parsed = parsePlanUrl(url)
    if (!parsed) throw new Error('Invalid plan URL')
    if (!getStoredApiKey()) throw new Error('请先使用 API Key 登录')
    const data = await fetchPlanToday(parsed.planId, parsed.date)
    return data.words.map((w) => ({
      name: w.name,
      trans: w.trans ?? [],
      usphone: w.usphone ?? '',
      ukphone: w.ukphone ?? '',
    }))
  }
  if (url.startsWith(SUPABASE_PROTOCOL)) {
    const wordbookId = url.slice(SUPABASE_PROTOCOL.length)
    const { data, error } = await supabase
      .from('wordbook_items')
      .select('name, trans, usphone, ukphone, notation')
      .eq('wordbook_id', wordbookId)
      .order('sort_order')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      name: row.name,
      trans: row.trans ?? [],
      usphone: row.usphone ?? '',
      ukphone: row.ukphone ?? '',
      notation: row.notation ?? undefined,
    }))
  }

  if (isCustomDictUrl(url)) {
    const dictId = extractDictIdFromUrl(url)
    return getCustomDictWords(dictId)
  }

  const URL_PREFIX: string = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''

  const response = await fetch(URL_PREFIX + url)
  const words: Word[] = await response.json()
  return words
}
