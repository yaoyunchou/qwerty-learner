import type { VercelRequest } from '@vercel/node'

export function checkAuth(req: VercelRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return false
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  return token === adminPassword
}
