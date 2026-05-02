import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { LanguageCategoryType, LanguageType } from '@/typings'
import { saveCustomDict, validateWordList } from '@/utils/db/custom-dict'
import { useCallback, useRef, useState } from 'react'
import IconFileUpload from '~icons/tabler/file-upload'

type LanguageOption = {
  label: string
  language: LanguageType
  languageCategory: LanguageCategoryType
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { label: '英语', language: 'en', languageCategory: 'en' },
  { label: '日语', language: 'ja', languageCategory: 'ja' },
  { label: '德语', language: 'de', languageCategory: 'de' },
  { label: '代码', language: 'code', languageCategory: 'code' },
]

export default function ImportDictModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGE_OPTIONS[0])
  const [fileError, setFileError] = useState('')
  const [parsedWords, setParsedWords] = useState<unknown[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setName('')
    setSelectedLang(LANGUAGE_OPTIONS[0])
    setFileError('')
    setParsedWords(null)
    setFileName('')
    setSaving(false)
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setFileError('')
      setParsedWords(null)

      if (!file.name.endsWith('.json')) {
        setFileError('请选择 .json 文件')
        return
      }

      if (file.size > 50 * 1024 * 1024) {
        setFileError('文件大小不能超过 50MB')
        return
      }

      setFileName(file.name)
      if (!name) {
        setName(file.name.replace(/\.json$/i, ''))
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (!validateWordList(data)) {
            setFileError('文件格式不正确。需要一个数组，每项至少包含 name (string) 和 trans (string[])')
            return
          }
          setParsedWords(data)
        } catch {
          setFileError('JSON 解析失败，请检查文件格式')
        }
      }
      reader.onerror = () => {
        setFileError('文件读取失败')
      }
      reader.readAsText(file)
    },
    [name],
  )

  const onSave = useCallback(async () => {
    if (!parsedWords || !name.trim()) return
    setSaving(true)
    try {
      await saveCustomDict(name.trim(), parsedWords as never, selectedLang.language, selectedLang.languageCategory)
      setOpen(false)
      resetState()
    } catch (err) {
      setFileError(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setSaving(false)
    }
  }, [parsedWords, name, selectedLang, resetState])

  const canSave = parsedWords && name.trim().length > 0 && !saving

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetState()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center space-x-2 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 text-sm font-medium text-emerald-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-emerald-300 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-emerald-400 dark:from-gray-800 dark:to-gray-700 dark:text-emerald-400 dark:hover:from-gray-700 dark:hover:to-gray-600"
        >
          <IconFileUpload className="h-4 w-4" />
          <span>导入词库</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导入自定义词库</DialogTitle>
          <DialogDescription>选择一个 JSON 文件，词条格式：[{`{ "name": "word", "trans": ["释义"] }`}, ...]</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">词库名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="为你的词库起个名字"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">语言类型</label>
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.language}
                  type="button"
                  onClick={() => setSelectedLang(opt)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedLang.language === opt.language
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">选择文件</label>
            <input ref={fileInputRef} type="file" accept=".json" onChange={onFileChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-400"
            >
              {fileName ? <span className="text-indigo-600 dark:text-indigo-400">{fileName}</span> : <span>点击选择 JSON 文件</span>}
            </button>
          </div>

          {parsedWords && <p className="text-sm text-emerald-600 dark:text-emerald-400">解析成功，共 {parsedWords.length} 个词条</p>}

          {fileError && <p className="text-sm text-red-500">{fileError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button disabled={!canSave} onClick={onSave}>
            {saving ? '保存中...' : '导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
