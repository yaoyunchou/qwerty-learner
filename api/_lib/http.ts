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

export function getSiteOrigin(): string {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'
}

export function practicePlanUrl(planId: string, date?: string) {
  const base = `${getSiteOrigin()}/practice/plan/${planId}`
  return date ? `${base}?date=${date}` : base
}
