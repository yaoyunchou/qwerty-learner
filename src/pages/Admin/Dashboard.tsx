import { useAdminFetch } from './hooks'
import { BarChart3, BookOpen, FileText, FolderOpen } from 'lucide-react'

interface Stats {
  totalDictionaries: number
  totalWords: number
  categories: number
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
  const { data, loading, error, refetch } = useAdminFetch<Stats>('/api/admin/stats')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={refetch}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          重新加载
        </button>
      </div>
    )
  }

  const cards: StatCardProps[] = data
    ? [
        {
          title: '词典总数',
          value: data.totalDictionaries,
          icon: <BookOpen className="h-6 w-6" />,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
        },
        {
          title: '单词总数',
          value: data.totalWords,
          icon: <FileText className="h-6 w-6" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        },
        {
          title: '分类数量',
          value: data.categories,
          icon: <FolderOpen className="h-6 w-6" />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
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
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>
    </div>
  )
}
