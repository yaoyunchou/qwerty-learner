import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleOptions, json } from '../../server/http'
import { handleMcpRequest } from '../../server/mcp-server'
import { isSupabaseConfigured } from '../../server/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  if (!isSupabaseConfigured()) {
    return json(res, 503, {
      code: 'SERVER_NOT_CONFIGURED',
      error: '服务端尚未配置 Supabase，MCP 暂不可用',
      message:
        '这不是 MCP 客户端配置错误。请在 Vercel 设置 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 后重新部署，并在 Supabase 执行 migration。',
      missingEnv: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
        (key) => !(key === 'SUPABASE_URL' ? process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL : process.env.SUPABASE_SERVICE_ROLE_KEY),
      ),
      docs: 'docs/MCP_SETUP.md',
      setupCheck: '/api/health',
    })
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
