import TypingPage from '@/pages/Typing'
import { completePlanDay, fetchPlanToday, getStoredApiKey } from '@/lib/apiClient'
import { idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom, currentDictIdAtom } from '@/store'
import { planPracticeAtom } from '@/store/planPracticeAtom'
import { useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Loading from '@/components/Loading'

export default function PracticePlanPage() {
  const { planId } = useParams<{ planId: string }>()
  const [searchParams] = useSearchParams()
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const setPlanPractice = useSetAtom(planPracticeAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!planId) return
    if (!getStoredApiKey()) {
      setError('请先使用 API Key 登录')
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const planRes = await fetch(`/api/plans/${planId}`, {
          headers: { Authorization: `Bearer ${getStoredApiKey()}` },
        })
        const planData = await planRes.json()
        const dictId = planData?.plan?.source_dict_id ?? 'cet4'
        setCurrentDictId(dictId in idDictionaryMap ? dictId : 'cet4')

        const data = await fetchPlanToday(planId, date)
        if (cancelled) return

        const words = data.words.map((w) => ({
          name: w.name,
          trans: w.trans ?? [],
          usphone: w.usphone ?? '',
          ukphone: w.ukphone ?? '',
        }))
        setPlanPractice({ planId, dictId, date: data.date, words })
        setCurrentChapter(0)
        setReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载计划失败')
      }
    }

    load()
    return () => {
      cancelled = true
      setPlanPractice(null)
    }
  }, [planId, date, setPlanPractice, setCurrentChapter, setCurrentDictId])

  useEffect(() => {
    const onFinish = async () => {
      if (!planId) return
      try {
        await completePlanDay(planId, date)
      } catch (e) {
        console.error('[plan] complete failed', e)
      }
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.planId === planId) onFinish()
    }
    window.addEventListener('ql-plan-complete', handler)
    return () => window.removeEventListener('ql-plan-complete', handler)
  }, [planId, date])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-500">{error}</p>
        <Link to="/login" className="text-indigo-600 hover:underline">去登录</Link>
        <Link to="/" className="text-gray-500 hover:underline">返回首页</Link>
      </div>
    )
  }

  if (!ready) return <Loading />

  return (
    <div className="relative">
      <div className="absolute left-4 top-4 z-50 rounded-lg bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
        学习计划 · {date}
      </div>
      <TypingPage />
    </div>
  )
}
