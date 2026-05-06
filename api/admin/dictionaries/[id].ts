import { checkAuth } from '../auth'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Dictionary id is required' })
    }

    if (/[/\\]/.test(id)) {
      return res.status(400).json({ error: 'Invalid dictionary id' })
    }
    const sanitizedId = id

    const filePath = path.join(process.cwd(), 'public', 'dicts', `${sanitizedId}.json`)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Dictionary not found' })
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const words = JSON.parse(raw)

    if (!Array.isArray(words)) {
      return res.status(500).json({ error: 'Invalid dictionary format' })
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const totalWords = words.length
    const totalPages = Math.ceil(totalWords / pageSize)
    const start = (page - 1) * pageSize
    const paginatedWords = words.slice(start, start + pageSize)

    return res.status(200).json({
      id: sanitizedId,
      name: sanitizedId,
      totalWords,
      page,
      pageSize,
      totalPages,
      words: paginatedWords,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
