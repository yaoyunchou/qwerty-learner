import Loading from '@/components/Loading'
import { useAuth } from '@/hooks/useAuth'
import { completePlanDay, fetchPlanToday, getStoredApiKey, setActivePlan } from '@/lib/apiClient'
import TypingPage from '@/pages/Typing'
import { idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom, currentDictIdAtom } from '@/store'
import { planPracticeAtom } from '@/store/planPracticeAtom'
import { useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function PracticePlanPage() {
  const { planId } = useParams<{ planId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signInWithKey } = useAuth()
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const keyFromUrl = searchParams.get('key')
  const setPlanPractice = useSetAtom(planPracticeAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // 从 MCP 链接自动登录（URL 带 key 参数）
  useEffect(() => {
    if (!planId) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        if (keyFromUrl?.startsWith('ql_')) {
          await signInWithKey(keyFromUrl)
          const clean = `/practice/plan/${planId}?date=${date}`
          navigate(clean, { replace: true })
        } else if (!getStoredApiKey()) {
          if (!cancelled) setError('请通过 AI 工具（MCP）生成的学习链接打开此页面')
          return
        }
        if (!cancelled) setAuthReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '自动登录失败')
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [planId, date, keyFromUrl, navigate, signInWithKey])

  useEffect(() => {
    if (!planId || !authReady) return

    let cancelled = false
    setActivePlan(planId, date)

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
  }, [planId, date, authReady, setPlanPractice, setCurrentChapter, setCurrentDictId])

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
        <p className="text-center text-red-500">{error}</p>
        <Link to="/" className="text-gray-500 hover:underline">
          返回首页
        </Link>
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
