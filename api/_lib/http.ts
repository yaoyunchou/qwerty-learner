import type { VercelRequest, VercelResponse } from '@vercel/node'

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id')
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.status(204).end()
    return true
  }
  return false
}

export function json(res: VercelResponse, status: number, body: unknown) {
  setCors(res)
  res.status(status).json(body)
}

const DEFAULT_SITE_URL = 'https://qwerty-learner-3z4e.vercel.app'

export function getSiteOrigin(): string {
  const configured = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || process.env.VITE_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NODE_ENV === 'production') return DEFAULT_SITE_URL
  return 'http://localhost:5173'
}

export function practicePlanUrl(planId: string, date?: string, apiKey?: string) {
  const base = `${getSiteOrigin()}/practice/plan/${planId}`
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (apiKey?.startsWith('ql_')) params.set('key', apiKey)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
