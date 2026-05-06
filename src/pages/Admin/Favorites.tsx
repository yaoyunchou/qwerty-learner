import { supabase } from './hooks'
import { ChevronLeft, ChevronRight, Heart, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Favorite {
  id: string
  word_name: string
  word_trans: string[]
  word_usphone: string
  word_ukphone: string
  source_dict: string
  note: string
  created_at: string
}

const PAGE_SIZE = 20

export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase.from('user_favorites').select('*').order('created_at', { ascending: false })
      if (e) throw e
      setFavorites(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return favorites.filter(
      (f) =>
        f.word_name.toLowerCase().includes(q) ||
        f.word_trans.some((t) => t.toLowerCase().includes(q)) ||
        f.source_dict.toLowerCase().includes(q),
    )
  }, [favorites, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`取消收藏「${name}」？`)) return
    const { error: e } = await supabase.from('user_favorites').delete().eq('id', id)
    if (e) alert(e.message)
    else fetchFavorites()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <Heart className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button onClick={fetchFavorites} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">收藏管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">查看和管理已收藏的单词</p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜索收藏..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">单词</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">释义</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">音标</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">来源词典</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">备注</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-3">
                          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paged.map((fav) => (
                    <tr key={fav.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{fav.word_name}</td>
                      <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">{fav.word_trans?.join('；') || '-'}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {fav.word_usphone ? `/${fav.word_usphone}/` : '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{fav.source_dict || '-'}</td>
                      <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">{fav.note || '-'}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDelete(fav.id, fav.word_name)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search ? '没有找到匹配的收藏' : '还没有收藏任何单词'}
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
