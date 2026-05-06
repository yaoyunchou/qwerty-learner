import { supabase } from '@/lib/supabase'
import type { Word } from '@/typings'
import { extractDictIdFromUrl, getCustomDictWords, isCustomDictUrl } from '@/utils/db/custom-dict'

const SUPABASE_PROTOCOL = 'supabase://'

export async function wordListFetcher(url: string): Promise<Word[]> {
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
