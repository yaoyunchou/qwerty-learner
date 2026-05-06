import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'
import { checkAuth } from './auth'

let cachedStats: { data: Record<string, unknown>; timestamp: number } | null = null
const CACHE_TTL_MS = 60_000

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
    const now = Date.now()
    if (cachedStats && now - cachedStats.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cachedStats.data)
    }

    const dictsDir = path.join(process.cwd(), 'public', 'dicts')

    if (!fs.existsSync(dictsDir)) {
      return res.status(500).json({ error: 'Dicts directory not found' })
    }

    const files = fs.readdirSync(dictsDir).filter((f) => f.endsWith('.json'))
    const totalDictionaries = files.length

    let totalWords = 0
    for (const filename of files) {
      try {
        const filePath = path.join(dictsDir, filename)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const words = JSON.parse(raw)
        if (Array.isArray(words)) {
          totalWords += words.length
        }
      } catch {
        // skip unreadable files
      }
    }

    let categories: string[] = []
    const registryPath = path.join(process.cwd(), 'public', 'dict-db.json')
    if (fs.existsSync(registryPath)) {
      try {
        const registryRaw = fs.readFileSync(registryPath, 'utf-8')
        const registry = JSON.parse(registryRaw)
        if (Array.isArray(registry)) {
          const categorySet = new Set<string>()
          for (const entry of registry) {
            if (entry.category) {
              categorySet.add(entry.category)
            }
          }
          categories = Array.from(categorySet).sort()
        }
      } catch {
        // registry not available
      }
    }

    const stats = {
      totalDictionaries,
      totalWords,
      categories: categories.length,
    }

    cachedStats = { data: stats, timestamp: now }

    return res.status(200).json(stats)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
