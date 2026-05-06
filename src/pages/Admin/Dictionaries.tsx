import { supabase } from './hooks'
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Wordbook {
  id: string
  name: string
  description: string
  language: string
  language_category: string
  is_public: boolean
  created_at: string
  item_count?: number
}

const PAGE_SIZE = 15

export default function Dictionaries() {
  const navigate = useNavigate()
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newLang, setNewLang] = useState('en')
  const [creating, setCreating] = useState(false)

  const fetchWordbooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase.from('user_wordbooks').select('*').order('created_at', { ascending: false })
      if (e) throw e
      setWordbooks(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWordbooks()
  }, [fetchWordbooks])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return wordbooks.filter((wb) => wb.name.toLowerCase().includes(q) || wb.description?.toLowerCase().includes(q))
  }, [wordbooks, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { error: e } = await supabase.from('user_wordbooks').insert({
        name: newName.trim(),
        description: newDesc.trim(),
        language: newLang,
        language_category: newLang === 'code' ? 'code' : newLang,
      })
      if (e) throw e
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      fetchWordbooks()
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除词本「${name}」及其所有词条？`)) return
    const { error: e } = await supabase.from('user_wordbooks').delete().eq('id', id)
    if (e) {
      alert(e.message)
    } else {
      fetchWordbooks()
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <BookOpen className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={fetchWordbooks}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">词本管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理你的云端单词本</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          新建词本
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-900/20">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">创建新词本</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              placeholder="词本名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="描述（选填）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="de">德语</option>
              <option value="code">编程</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜索词本..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名称</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">描述</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">语言</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">创建时间</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
                : paged.map((wb) => (
                    <tr
                      key={wb.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => navigate(`/admin/dictionaries/${wb.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{wb.name}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-gray-500 dark:text-gray-400">{wb.description || '-'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{wb.language}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(wb.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(wb.id, wb.name)
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search ? '没有找到匹配的词本' : '还没有创建词本'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {filtered.length} 个词本，第 {currentPage}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
