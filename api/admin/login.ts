import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { password } = req.body || {}

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' })
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server misconfigured: ADMIN_PASSWORD not set' })
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid password' })
    }

    return res.status(200).json({ token: password })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
