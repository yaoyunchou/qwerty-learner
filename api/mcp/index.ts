import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleOptions, json } from '../_lib/http'
import { handleMcpRequest } from '../_lib/mcp-server'
import { isSupabaseConfigured } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  if (!isSupabaseConfigured()) {
    return json(res, 500, { error: 'Server misconfigured: Supabase service role not set' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    await handleMcpRequest(req, res)
  } catch (err) {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : 'MCP error'
      json(res, 500, { error: message })
    }
  }
}
