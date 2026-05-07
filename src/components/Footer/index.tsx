import { isLoggedInAtom } from '@/store/authAtom'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useNavigate } from 'react-router-dom'

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const isLoggedIn = useAtomValue(isLoggedInAtom)

  return (
    <footer className="mb-1 mt-4 flex w-full items-center justify-center gap-3 text-sm ease-in">
      <button
        className="cursor-pointer text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        type="button"
        onClick={() => navigate(isLoggedIn ? '/admin' : '/admin/login')}
      >
        {isLoggedIn ? '管理后台' : '登录 / 后台'}
      </button>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <span className="text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Qwerty Learner</span>
      <span className="select-none rounded bg-slate-200 px-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Build <span className="select-all">{LATEST_COMMIT_HASH}</span>
      </span>
    </footer>
  )
}

export default Footer
