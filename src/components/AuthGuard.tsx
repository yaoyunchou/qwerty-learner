import { isLoggedInAtom, sessionAtom } from '@/store/authAtom'
import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const session = useAtomValue(sessionAtom)
  const isLoggedIn = useAtomValue(isLoggedInAtom)

  if (session === null && !isLoggedIn) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
