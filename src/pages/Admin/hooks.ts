import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useAdminAuth() {
  const navigate = useNavigate()
  const { isLoggedIn, signOut } = useAuth()

  const logout = useCallback(async () => {
    await signOut()
    navigate('/admin/login')
  }, [signOut, navigate])

  return { isAuthenticated: isLoggedIn, logout }
}

interface UseSupabaseQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSupabaseQuery<T>(
  queryFn: (() => Promise<{ data: T | null; error: { message: string } | null }>) | null,
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  const refetch = useCallback(() => setFetchCount((c) => c + 1), [])

  useEffect(() => {
    if (!queryFn) return

    let cancelled = false
    setLoading(true)
    setError(null)

    queryFn()
      .then(({ data: d, error: e }) => {
        if (cancelled) return
        if (e) {
          setError(e.message)
        } else {
          setData(d)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? '未知错误')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [queryFn, fetchCount])

  return { data, loading, error, refetch }
}

export { supabase }
