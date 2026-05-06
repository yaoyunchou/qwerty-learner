import { useAdminFetch } from './hooks'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface WordItem {
  name: string
  trans?: string[]
  usphone?: string
  ukphone?: string
}

interface DictDetailData {
  name: string
  totalWords: number
  words: WordItem[]
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-3">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-6 py-3">
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-6 py-3">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-6 py-3">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
    </tr>
  )
}

const PAGE_SIZE = 20

export default function DictDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const url = id ? `/api/admin/dictionaries/${encodeURIComponent(id)}?page=${page}&pageSize=${PAGE_SIZE}` : null
  const { data, loading, error, refetch } = useAdminFetch<DictDetailData>(url)

  const totalPages = data ? Math.max(1, Math.ceil(data.totalWords / PAGE_SIZE)) : 1

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <BookOpen className="h-8 w-8 text-red-500" />
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

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/dictionaries')}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          返回词典列表
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '加载中...' : (data?.name ?? id)}</h1>
        {data && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 {data.totalWords.toLocaleString()} 个单词
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  单词
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  释义
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  美式音标
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  英式音标
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                : data?.words.map((word, idx) => (
                    <tr key={`${word.name}-${idx}`} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{word.name}</td>
                      <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">
                        {word.trans?.join('；') || '-'}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {word.usphone ? `/${word.usphone}/` : '-'}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {word.ukphone ? `/${word.ukphone}/` : '-'}
                      </td>
                    </tr>
                  ))}
              {!loading && data?.words.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    暂无单词数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              第 {page}/{totalPages} 页，共 {data?.totalWords.toLocaleString()} 个单词
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
