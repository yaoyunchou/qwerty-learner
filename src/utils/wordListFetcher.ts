import type { Word } from '@/typings'
import { extractDictIdFromUrl, getCustomDictWords, isCustomDictUrl } from '@/utils/db/custom-dict'

export async function wordListFetcher(url: string): Promise<Word[]> {
  if (isCustomDictUrl(url)) {
    const dictId = extractDictIdFromUrl(url)
    return getCustomDictWords(dictId)
  }

  const URL_PREFIX: string = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''

  const response = await fetch(URL_PREFIX + url)
  const words: Word[] = await response.json()
  return words
}
