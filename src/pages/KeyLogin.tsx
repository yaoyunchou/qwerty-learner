import { useAuth } from '@/hooks/useAuth'
import { isLoggedInAtom } from '@/store/authAtom'
import { useAtomValue } from 'jotai'
import { Copy, Key, Keyboard, LogIn, Mail, UserPlus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

export default function KeyLogin() {
  const navigate = useNavigate()
  const { signInWithKey, createKey, bindEmail } = useAuth()
  const isLoggedIn = useAtomValue(isLoggedInAtom)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [apiKey, setApiKey] = useState('')
  const [newKey, setNewKey] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBindEmail, setShowBindEmail] = useState(false)

  if (isLoggedIn && !newKey) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signInWithKey(apiKey.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const result = await createKey()
      setNewKey(result.apiKey)
      setInfo(result.warning)
      setShowBindEmail(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBindEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!recoveryEmail) return
    setLoading(true)
    try {
      await bindEmail(recoveryEmail.trim())
      setInfo('找回邮箱已绑定')
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败')
    } finally {
      setLoading(false)
    }
  }

  const copyKey = () => {
    if (newKey) navigator.clipboard.writeText(newKey)
    setInfo('已复制到剪贴板')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm dark:bg-gray-900/95">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/50">
              <Keyboard className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Qwerty Learner</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mode === 'login' ? '使用 API Key 登录同步学习数据' : '创建新账号获取 API Key'}
            </p>
          </div>

          {newKey ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                {info || '请立即保存此 Key，丢失后无法找回（除非已绑定邮箱）'}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-3 font-mono text-xs break-all dark:bg-gray-800">
                <Key className="h-4 w-4 shrink-0" />
                <span className="flex-1">{newKey}</span>
                <button type="button" onClick={copyKey} className="shrink-0 text-indigo-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {showBindEmail && (
                <form onSubmit={handleBindEmail} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    绑定找回邮箱（可选）
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    绑定邮箱
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700"
              >
                进入练习
              </button>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="ql_..."
                    required
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <LogIn className="h-5 w-5" />
                {loading ? '登录中…' : '登录'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                创建账号将生成唯一 API Key，用于登录和 AI 工具（MCP）访问您的学习数据。
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <UserPlus className="h-5 w-5" />
                {loading ? '创建中…' : '创建账号'}
              </button>
            </div>
          )}

          {!newKey && (
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {mode === 'login' ? '没有 Key？创建新账号' : '已有 Key？去登录'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ← 返回练习首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
