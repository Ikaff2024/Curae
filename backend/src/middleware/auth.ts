import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  medecinId?: string
  organisationId?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { medecinId: string; organisationId?: string }
    req.medecinId = payload.medecinId
    req.organisationId = payload.organisationId
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
