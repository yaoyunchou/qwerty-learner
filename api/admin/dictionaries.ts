import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'
import { checkAuth } from './auth'

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
    const dictsDir = path.join(process.cwd(), 'public', 'dicts')

    if (!fs.existsSync(dictsDir)) {
      return res.status(500).json({ error: 'Dicts directory not found' })
    }

    const files = fs.readdirSync(dictsDir).filter((f) => f.endsWith('.json'))

    const dictionaries = files.map((filename) => {
      try {
        const filePath = path.join(dictsDir, filename)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const words = JSON.parse(raw)
        const wordCount = Array.isArray(words) ? words.length : 0
        const sampleWords = Array.isArray(words) ? words.slice(0, 3) : []

        return {
          filename,
          id: filename.replace(/\.json$/, ''),
          wordCount,
          sampleWords,
        }
      } catch {
        return {
          filename,
          id: filename.replace(/\.json$/, ''),
          wordCount: 0,
          sampleWords: [],
          error: 'Failed to read file',
        }
      }
    })

    return res.status(200).json({ dictionaries })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
