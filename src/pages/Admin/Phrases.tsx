import { supabase } from './hooks'
import { ChevronLeft, ChevronRight, FileText, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Phrase {
  id: string
  content: string
  translation: string
  category: string
  note: string
  created_at: string
}

const PAGE_SIZE = 15

export default function Phrases() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [showAdd, setShowAdd] = useState(false)
  const [addContent, setAddContent] = useState('')
  const [addTranslation, setAddTranslation] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addNote, setAddNote] = useState('')
  const [adding, setAdding] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPhrases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase.from('user_phrases').select('*').order('created_at', { ascending: false })
      if (e) throw e
      setPhrases(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPhrases()
  }, [fetchPhrases])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return phrases.filter(
      (p) => p.content.toLowerCase().includes(q) || p.translation.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }, [phrases, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleAdd = async () => {
    if (!addContent.trim()) return
    setAdding(true)
    try {
      const { error: e } = await supabase.from('user_phrases').insert({
        content: addContent.trim(),
        translation: addTranslation.trim(),
        category: addCategory.trim(),
        note: addNote.trim(),
      })
      if (e) throw e
      setAddContent('')
      setAddTranslation('')
      setAddCategory('')
      setAddNote('')
      setShowAdd(false)
      fetchPhrases()
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该短句？')) return
    const { error: e } = await supabase.from('user_phrases').delete().eq('id', id)
    if (e) alert(e.message)
    else fetchPhrases()
  }

  const startEdit = (p: Phrase) => {
    setEditId(p.id)
    setEditContent(p.content)
    setEditTranslation(p.translation)
    setEditCategory(p.category)
    setEditNote(p.note)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('user_phrases')
        .update({
          content: editContent.trim(),
          translation: editTranslation.trim(),
          category: editCategory.trim(),
          note: editNote.trim(),
        })
        .eq('id', editId)
      if (e) throw e
      setEditId(null)
      fetchPhrases()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button onClick={fetchPhrases} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">短句管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理你的英语短句练习库</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> 添加短句
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-900/20">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">添加新短句</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="英文短句 *"
              value={addContent}
              onChange={(e) => setAddContent(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:col-span-2"
            />
            <input
              placeholder="中文翻译"
              value={addTranslation}
              onChange={(e) => setAddTranslation(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:col-span-2"
            />
            <input
              placeholder="分类（如：日常对话）"
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="备注"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !addContent.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? '添加中...' : '添加'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
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
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜索短句..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">英文短句</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">翻译</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">分类</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-6 py-3">
                          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paged.map((p) =>
                    editId === p.id ? (
                      <tr key={p.id} className="bg-indigo-50/50 dark:bg-indigo-900/10">
                        <td className="px-4 py-2">
                          <input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editTranslation}
                            onChange={(e) => setEditTranslation(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={handleSaveEdit} disabled={saving} className="rounded p-1 text-green-600 hover:bg-green-50">
                              <Save className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={p.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => startEdit(p)}
                      >
                        <td className="max-w-sm truncate px-6 py-3 font-medium text-gray-900 dark:text-white">{p.content}</td>
                        <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">{p.translation || '-'}</td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{p.category || '-'}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(p.id)
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search ? '没有找到匹配的短句' : '还没有添加短句'}
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
