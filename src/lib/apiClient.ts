const API_KEY_STORAGE = 'ql_api_key'
const USER_ID_STORAGE = 'ql_user_id'
const KEY_PREFIX_STORAGE = 'ql_key_prefix'

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE)
}

export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_STORAGE)
}

export function storeApiKeySession(apiKey: string, userId: string, keyPrefix: string) {
  localStorage.setItem(API_KEY_STORAGE, apiKey)
  localStorage.setItem(USER_ID_STORAGE, userId)
  localStorage.setItem(KEY_PREFIX_STORAGE, keyPrefix)
}

export function clearApiKeySession() {
  localStorage.removeItem(API_KEY_STORAGE)
  localStorage.removeItem(USER_ID_STORAGE)
  localStorage.removeItem(KEY_PREFIX_STORAGE)
}

export function getKeyPrefix(): string | null {
  return localStorage.getItem(KEY_PREFIX_STORAGE)
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getStoredApiKey()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const res = await fetch(path, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data as T
}

export async function loginWithApiKey(apiKey: string) {
  return apiFetch<{ userId: string; keyPrefix: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  })
}

export async function createApiKey() {
  return apiFetch<{ userId: string; apiKey: string; warning: string }>('/api/auth/create-key', {
    method: 'POST',
  })
}

export async function bindRecoveryEmail(email: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/bind-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function fetchPlanToday(planId: string, date?: string) {
  const qs = date ? `?date=${date}` : ''
  return apiFetch<{
    planId: string
    date: string
    words: Array<{ name: string; trans: string[]; usphone?: string; ukphone?: string; role?: string }>
    breakdown: { new: number; review: number }
    practiceUrl: string
    completed: boolean
  }>(`/api/plans/${planId}/today${qs}`)
}

export async function completePlanDay(
  planId: string,
  date: string,
  stats?: Record<string, unknown>,
) {
  return apiFetch<{ ok: boolean }>(`/api/plans/${planId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ action: 'complete', date, stats }),
  })
}

export async function recordPlanWord(
  planId: string,
  payload: {
    word: string
    dictId: string
    wrongCount: number
    responseMs: number
    timingMs?: number[]
    mistakes?: Record<string, string[]>
    wpm?: number
    role?: string
    planDayId?: string
    sessionId?: string
  },
) {
  return apiFetch(`/api/plans/${planId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ action: 'word', ...payload }),
  })
}

export async function fetchStatsSummary() {
  return apiFetch('/api/stats/summary')
}

export async function fetchDailyReport(date?: string) {
  const qs = date ? `?date=${date}` : ''
  return apiFetch(`/api/stats/daily${qs}`)
}
