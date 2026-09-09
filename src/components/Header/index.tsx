import logo from '@/assets/logo.svg'
import { currentUserAtom, isLoggedInAtom } from '@/store/authAtom'
import { useAtomValue } from 'jotai'
import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  const isLoggedIn = useAtomValue(isLoggedInAtom)
  const user = useAtomValue(currentUserAtom)
  const navigate = useNavigate()

  return (
    <header className="container z-20 mx-auto w-full px-10 py-6">
      <div className="flex w-full flex-col items-center justify-between space-y-3 lg:flex-row lg:space-y-0">
        <NavLink className="flex items-center text-2xl font-bold text-indigo-500 no-underline hover:no-underline lg:text-4xl" to="/">
          <img src={logo} className="mr-3 h-16 w-16" alt="Qwerty Learner Logo" />
          <h1>Qwerty Learner</h1>
        </NavLink>
        <nav className="my-card on element flex w-auto content-center items-center justify-end space-x-3 rounded-xl bg-white p-4 transition-colors duration-300 dark:bg-gray-800">
          {children}
          {isLoggedIn && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
              title="管理后台"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {(user?.user_metadata?.nickname || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">我的</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
