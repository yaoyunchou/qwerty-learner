import { supabase } from './hooks'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface WordItem {
  id: string
  name: string
  trans: string[]
  usphone: string
  ukphone: string
  notation: string
  sort_order: number
}

interface WordbookMeta {
  id: string
  name: string
  description: string
  language: string
}

const PAGE_SIZE = 20

export default function DictDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [meta, setMeta] = useState<WordbookMeta | null>(null)
  const [items, setItems] = useState<WordItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addTrans, setAddTrans] = useState('')
  const [addUsphone, setAddUsphone] = useState('')
  const [addUkphone, setAddUkphone] = useState('')
  const [addNotation, setAddNotation] = useState('')
  const [adding, setAdding] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTrans, setEditTrans] = useState('')
  const [editUsphone, setEditUsphone] = useState('')
  const [editUkphone, setEditUkphone] = useState('')
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const fetchItems = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data: wbData, error: wbErr } = await supabase
        .from('user_wordbooks')
        .select('id, name, description, language')
        .eq('id', id)
        .single()
      if (wbErr) throw wbErr
      setMeta(wbData)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const {
        data,
        error: itemErr,
        count,
      } = await supabase.from('wordbook_items').select('*', { count: 'exact' }).eq('wordbook_id', id).order('sort_order').range(from, to)
      if (itemErr) throw itemErr
      setItems(data ?? [])
      setTotalCount(count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleAdd = async () => {
    if (!addName.trim() || !addTrans.trim() || !id) return
    setAdding(true)
    try {
      const { error: e } = await supabase.from('wordbook_items').insert({
        wordbook_id: id,
        name: addName.trim(),
        trans: addTrans
          .split(/[;；\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        usphone: addUsphone.trim(),
        ukphone: addUkphone.trim(),
        notation: addNotation.trim(),
        sort_order: totalCount,
      })
      if (e) throw e
      setAddName('')
      setAddTrans('')
      setAddUsphone('')
      setAddUkphone('')
      setAddNotation('')
      setShowAdd(false)
      fetchItems()
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (itemId: string, name: string) => {
    if (!confirm(`删除词条「${name}」？`)) return
    const { error: e } = await supabase.from('wordbook_items').delete().eq('id', itemId)
    if (e) alert(e.message)
    else fetchItems()
  }

  const startEdit = (item: WordItem) => {
    setEditId(item.id)
    setEditName(item.name)
    setEditTrans(item.trans.join('；'))
    setEditUsphone(item.usphone)
    setEditUkphone(item.ukphone)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('wordbook_items')
        .update({
          name: editName.trim(),
          trans: editTrans
            .split(/[;；\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          usphone: editUsphone.trim(),
          ukphone: editUkphone.trim(),
        })
        .eq('id', editId)
      if (e) throw e
      setEditId(null)
      fetchItems()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setImporting(true)
    try {
      const text = await file.text()
      let words: { name: string; trans: string[]; usphone?: string; ukphone?: string }[] = []

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text)
        if (!Array.isArray(parsed)) throw new Error('JSON 需为数组格式')
        words = parsed.map((w: Record<string, unknown>) => ({
          name: String(w.name ?? ''),
          trans: Array.isArray(w.trans) ? w.trans.map(String) : [String(w.trans ?? '')],
          usphone: String(w.usphone ?? ''),
          ukphone: String(w.ukphone ?? ''),
        }))
      } else {
        const lines = text.split(/\r?\n/)
        for (const raw of lines) {
          const line = raw.trim()
          if (!line || line.startsWith('#')) continue
          const withPhone = line.match(/^(\S+)\s+(\/[^/\r\n]+\/)\s+(.+)$/)
          if (withPhone) {
            words.push({
              name: withPhone[1],
              trans: [withPhone[3].trim()],
              usphone: withPhone[2].slice(1, -1).trim(),
              ukphone: withPhone[2].slice(1, -1).trim(),
            })
          } else {
            const simple = line.match(/^(\S+)\s+(.+)$/)
            if (simple) {
              words.push({ name: simple[1], trans: [simple[2].trim()] })
            }
          }
        }
      }

      if (words.length === 0) throw new Error('文件中没有有效词条')

      const batchSize = 200
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize)
        const { error: insErr } = await supabase.from('wordbook_items').insert(
          batch.map((w, idx) => ({
            wordbook_id: id,
            name: w.name,
            trans: w.trans,
            usphone: w.usphone ?? '',
            ukphone: w.ukphone ?? '',
            sort_order: totalCount + i + idx,
          })),
        )
        if (insErr) throw insErr
      }

      alert(`成功导入 ${words.length} 个词条`)
      fetchItems()
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">加载失败</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button onClick={fetchItems} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
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
          <ArrowLeft className="h-4 w-4" /> 返回词本列表
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '加载中...' : meta?.name ?? id}</h1>
            {meta?.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{meta.description}</p>}
            {!loading && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">共 {totalCount.toLocaleString()} 个词条</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Upload className="h-4 w-4" /> {importing ? '导入中...' : '导入词条'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json,.txt" onChange={handleImport} className="hidden" />
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> 添加词条
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-900/20">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">添加新词条</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="单词 *"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="释义 *（用 ; 分隔多条）"
              value={addTrans}
              onChange={(e) => setAddTrans(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="美式音标"
              value={addUsphone}
              onChange={(e) => setAddUsphone(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="英式音标"
              value={addUkphone}
              onChange={(e) => setAddUkphone(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              placeholder="备注"
              value={addNotation}
              onChange={(e) => setAddNotation(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !addName.trim() || !addTrans.trim()}
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">单词</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">释义</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">美式音标</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">英式音标</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-6 py-3">
                          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                : items.map((item) =>
                    editId === item.id ? (
                      <tr key={item.id} className="bg-indigo-50/50 dark:bg-indigo-900/10">
                        <td className="px-4 py-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editTrans}
                            onChange={(e) => setEditTrans(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editUsphone}
                            onChange={(e) => setEditUsphone(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editUkphone}
                            onChange={(e) => setEditUkphone(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => startEdit(item)}
                      >
                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                        <td className="max-w-xs truncate px-6 py-3 text-gray-500 dark:text-gray-400">{item.trans?.join('；') || '-'}</td>
                        <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {item.usphone ? `/${item.usphone}/` : '-'}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {item.ukphone ? `/${item.ukphone}/` : '-'}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(item.id, item.name)
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    暂无词条，点击上方按钮添加或导入
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              第 {page}/{totalPages} 页，共 {totalCount.toLocaleString()} 个词条
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
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
