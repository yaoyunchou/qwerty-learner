import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleOptions, json } from '../../server/http'
import { handleMcpRequest } from '../../server/mcp-server'
import { isSupabaseConfigured } from '../../server/supabase'

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
