import type { VercelRequest, VercelResponse } from '@vercel/node'
import { json, handleOptions } from '../_lib/http'

// Temporary minimal handler to validate Vercel serverless build
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  return json(res, 200, { ok: true, service: 'mcp', status: 'booting' })
}
