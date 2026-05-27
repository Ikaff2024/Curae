import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../lib/db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, nom, prenoms, specialite, telephone } = req.body
  if (!email || !password || !nom) {
    return res.status(400).json({ error: 'email, password et nom sont requis' })
  }

  try {
    const exists = await query('SELECT id FROM medecins WHERE email = $1', [email])
    if (exists.rows[0]) return res.status(409).json({ error: 'Email déjà utilisé' })

    const hash = await bcrypt.hash(password, 12)
    const result = await query(
      `INSERT INTO medecins (email, password_hash, nom, prenoms, specialite, telephone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, nom, prenoms, specialite`,
      [email, hash, nom, prenoms || '', specialite || 'Médecin généraliste', telephone || '']
    )

    const medecin = result.rows[0]
    const token = jwt.sign({ medecinId: medecin.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

    res.status(201).json({ token, medecin })
  } catch (err: any) {
    console.error('[Auth Register]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email et password requis' })

  try {
    const result = await query(
      'SELECT id, email, password_hash, nom, prenoms, specialite FROM medecins WHERE email = $1',
      [email]
    )
    const medecin = result.rows[0]
    if (!medecin) return res.status(401).json({ error: 'Identifiants incorrects' })

    const ok = await bcrypt.compare(password, medecin.password_hash)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' })

    const token = jwt.sign({ medecinId: medecin.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

    const { password_hash: _, ...safe } = medecin
    res.json({ token, medecin: safe })
  } catch (err: any) {
    console.error('[Auth Login]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, nom, prenoms, specialite, telephone FROM medecins WHERE id = $1',
      [req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Médecin introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
