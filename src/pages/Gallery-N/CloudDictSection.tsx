import { supabase } from '@/lib/supabase'
import { currentChapterAtom, currentDictIdAtom, customDictionariesAtom } from '@/store'
import { isLoggedInAtom } from '@/store/authAtom'
import type { Dictionary, LanguageCategoryType, LanguageType } from '@/typings'
import { calcChapterCount } from '@/utils'
import { useAtomValue, useSetAtom } from 'jotai'
import { Cloud } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface CloudWordbook {
  id: string
  name: string
  description: string
  language: string
  language_category: string
}

export default function CloudDictSection() {
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const [cloudBooks, setCloudBooks] = useState<CloudWordbook[]>([])
  const [loading, setLoading] = useState(false)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const setCustomDictionaries = useSetAtom(customDictionariesAtom)
  const navigate = useNavigate()
  const currentDictId = useAtomValue(currentDictIdAtom)

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('user_wordbooks')
      .select('id, name, description, language, language_category')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setCloudBooks(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const selectCloudDict = useCallback(
    async (wb: CloudWordbook) => {
      const { count } = await supabase.from('wordbook_items').select('*', { count: 'exact', head: true }).eq('wordbook_id', wb.id)

      const length = count ?? 0
      const dict: Dictionary = {
        id: `cloud-${wb.id}`,
        name: wb.name,
        description: wb.description || '云端词本',
        category: '我的云端词库',
        tags: [],
        url: `supabase://${wb.id}`,
        length,
        language: (wb.language || 'en') as LanguageType,
        languageCategory: (wb.language_category || 'en') as LanguageCategoryType,
        chapterCount: calcChapterCount(length),
      }

      setCustomDictionaries((prev) => {
        const filtered = prev.filter((d) => d.id !== dict.id)
        return [dict, ...filtered]
      })
      setCurrentDictId(dict.id)
      setCurrentChapter(0)
      navigate('/')
    },
    [setCustomDictionaries, setCurrentDictId, setCurrentChapter, navigate],
  )

  if (!isLoggedIn) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">我的云端词库</h2>
      </div>

      {loading ? (
        <div className="grid gap-x-5 gap-y-5 px-1 pb-4 sm:grid-cols-1 md:grid-cols-2 dic3:grid-cols-3 dic4:grid-cols-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-36 w-80 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : cloudBooks.length > 0 ? (
        <div className="grid gap-x-5 gap-y-5 px-1 pb-4 sm:grid-cols-1 md:grid-cols-2 dic3:grid-cols-3 dic4:grid-cols-4">
          {cloudBooks.map((wb) => {
            const isSelected = currentDictId === `cloud-${wb.id}`
            return (
              <div
                key={wb.id}
                onClick={() => selectCloudDict(wb)}
                className={`group flex h-36 w-80 cursor-pointer items-center justify-center overflow-hidden rounded-lg p-4 text-left shadow-lg focus:outline-none ${
                  isSelected ? 'bg-indigo-400' : 'bg-zinc-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
                role="button"
              >
                <div className="relative ml-1 mt-2 flex h-full w-full flex-col items-start justify-start">
                  <div className="flex items-center gap-2">
                    <Cloud className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                    <h1
                      className={`text-xl font-normal ${
                        isSelected ? 'text-white' : 'text-gray-800 group-hover:text-indigo-400 dark:text-gray-200'
                      }`}
                    >
                      {wb.name}
                    </h1>
                  </div>
                  <p
                    className={`mb-1 mt-1 max-w-full truncate whitespace-nowrap ${
                      isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-200'
                    }`}
                  >
                    {wb.description || '云端词本'}
                  </p>
                  <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                    {wb.language === 'ja' ? '日语' : wb.language === 'de' ? '德语' : wb.language === 'code' ? '编程' : '英语'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          还没有云端词本，在后台管理中创建
        </div>
      )}
    </div>
  )
}
