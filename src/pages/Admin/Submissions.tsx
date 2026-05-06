import { supabase } from './hooks'
import { Check, ChevronLeft, ChevronRight, Inbox, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Submission {
  id: string
  name: string
  trans: string[]
  usphone: string
  ukphone: string
  notation: string
  type: string
  category: string
  status: string
  submitted_by: string
  reviewed_at: string | null
  created_at: string
}

const PAGE_SIZE = 20

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [page, setPage] = useState(1)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('word_submissions').select('*').order('created_at', { ascending: false })
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      const { data, error: e } = await query
      if (e) throw e
      setSubmissions(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return submissions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.trans.some((t) => t.toLowerCase().includes(q)) || s.submitted_by.toLowerCase().includes(q),
    )
  }, [submissions, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleApprove = async (id: string) => {
    const { error: e } = await supabase
      .from('word_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (e) alert(e.message)
    else fetchSubmissions()
  }

  const handleReject = async (id: string) => {
    const { error: e } = await supabase
      .from('word_submissions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (e) alert(e.message)
    else fetchSubmissions()
  }

  const handleBatchApprove = async () => {
    const pendingIds = filtered.filter((s) => s.status === 'pending').map((s) => s.id)
    if (pendingIds.length === 0) return
    if (!confirm(`批量通过 ${pendingIds.length} 条投稿？`)) return
    const { error: e } = await supabase
      .from('word_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .in('id', pendingIds)
    if (e) alert(e.message)
    else fetchSubmissions()
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
        {status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已拒绝'}
      </span>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <Inbox className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={fetchSubmissions}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">投稿审核</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">审核外部提交的生词和短句</p>
        </div>
        {statusFilter === 'pending' && filtered.length > 0 && (
          <button
            onClick={handleBatchApprove}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Check className="h-4 w-4" /> 全部通过
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜索投稿..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">内容</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">释义</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">类型</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">提交者</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状态</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-3">
                          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paged.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="max-w-xs truncate px-6 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">{s.trans?.join('；') || '-'}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.type === 'phrase'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {s.type === 'phrase' ? '短句' : '生词'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{s.submitted_by || '-'}</td>
                      <td className="px-6 py-3">{statusBadge(s.status)}</td>
                      <td className="px-6 py-3">
                        {s.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(s.id)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="通过"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(s.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="拒绝"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {s.reviewed_at ? new Date(s.reviewed_at).toLocaleDateString() : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search ? '没有找到匹配的投稿' : '暂无投稿'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {filtered.length} 条，第 {currentPage}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                下一页 <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
