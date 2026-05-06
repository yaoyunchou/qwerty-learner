import { supabase } from './hooks'
import { BarChart3, BookOpen, FileText, FolderOpen, Heart, Inbox } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Stats {
  wordbooks: number
  wordbookItems: number
  favorites: number
  phrases: number
  pendingSubmissions: number
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mb-2 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

function StatCard({ title, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
        <BarChart3 className="h-5 w-5 text-gray-300 transition-colors group-hover:text-gray-400 dark:text-gray-600 dark:group-hover:text-gray-500" />
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{title}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wb, wi, fav, ph, sub] = await Promise.all([
        supabase.from('user_wordbooks').select('*', { count: 'exact', head: true }),
        supabase.from('wordbook_items').select('*', { count: 'exact', head: true }),
        supabase.from('user_favorites').select('*', { count: 'exact', head: true }),
        supabase.from('user_phrases').select('*', { count: 'exact', head: true }),
        supabase.from('word_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({
        wordbooks: wb.count ?? 0,
        wordbookItems: wi.count ?? 0,
        favorites: fav.count ?? 0,
        phrases: ph.count ?? 0,
        pendingSubmissions: sub.count ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={fetchStats}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          重新加载
        </button>
      </div>
    )
  }

  const cards: StatCardProps[] = stats
    ? [
        {
          title: '词本数',
          value: stats.wordbooks,
          icon: <BookOpen className="h-6 w-6" />,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
        },
        {
          title: '词条数',
          value: stats.wordbookItems,
          icon: <FileText className="h-6 w-6" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        },
        {
          title: '收藏数',
          value: stats.favorites,
          icon: <Heart className="h-6 w-6" />,
          color: 'text-pink-600 dark:text-pink-400',
          bgColor: 'bg-pink-100 dark:bg-pink-900/50',
        },
        {
          title: '短句数',
          value: stats.phrases,
          icon: <FolderOpen className="h-6 w-6" />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
        },
        {
          title: '待审核投稿',
          value: stats.pendingSubmissions,
          icon: <Inbox className="h-6 w-6" />,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/50',
        },
      ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">仪表盘</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Qwerty Learner 数据概览</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>
    </div>
  )
}
