import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TOKEN_KEY = 'admin_token'

export function useAdminAuth() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const isAuthenticated = !!token

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    navigate('/admin/login')
  }, [navigate])

  return { token, isAuthenticated, logout }
}

interface UseAdminFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminFetch<T = unknown>(url: string | null): UseAdminFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  const token = localStorage.getItem(TOKEN_KEY)

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!url) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`请求失败 (${res.status})`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || '未知错误')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [url, token, fetchCount])

  return { data, loading, error, refetch }
}
