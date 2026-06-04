import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../lib/db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

function makeToken(medecinId: string, organisationId: string) {
  return jwt.sign(
    { medecinId, organisationId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
// Accepte :
//   - Format complet  : { organisation: { nom, type, ville, telephone }, ...champs médecin }
//   - Format legacy   : { nom, prenoms, specialite, email, password, telephone }
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, nom, prenoms, specialite, telephone, organisation } = req.body

  if (!email || !password || !nom) {
    return res.status(400).json({ error: 'email, password et nom sont requis' })
  }

  try {
    // Vérif doublon e-mail
    const exists = await query('SELECT id FROM medecins WHERE email = $1', [email])
    if (exists.rows[0]) return res.status(409).json({ error: 'Email déjà utilisé' })

    const hash = await bcrypt.hash(password, 12)

    // ── Créer l'organisation ──────────────────────────────────────────────────
    let orgNom: string
    let orgType: string
    let orgVille: string
    let orgTel: string | null
    let orgEmail: string | null

    if (organisation && organisation.nom) {
      orgNom   = organisation.nom.trim()
      orgType  = organisation.type  || 'cabinet'
      orgVille = organisation.ville || 'Abidjan'
      orgTel   = organisation.telephone || telephone || null
      orgEmail = organisation.email || email
    } else {
      // Rétro-compatibilité : auto-créer un cabinet au nom du médecin
      orgNom   = `Cabinet ${(prenoms || '').trim()} ${nom.trim()}`.trim()
      orgType  = 'cabinet'
      orgVille = 'Abidjan'
      orgTel   = telephone || null
      orgEmail = email
    }

    const orgRes = await query(
      `INSERT INTO organisations (nom, type, ville, telephone, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, type, ville, telephone, email`,
      [orgNom, orgType, orgVille, orgTel, orgEmail]
    )
    const org = orgRes.rows[0]

    // ── Créer le médecin (admin de l'organisation) ────────────────────────────
    const medRes = await query(
      `INSERT INTO medecins (email, password_hash, nom, prenoms, specialite, telephone, organisation_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin_medecin')
       RETURNING id, email, nom, prenoms, specialite, telephone, organisation_id, role`,
      [email, hash, nom, prenoms || '', specialite || 'Médecin généraliste', telephone || '', org.id]
    )
    const medecin = medRes.rows[0]

    const token = makeToken(medecin.id, org.id)

    res.status(201).json({ token, medecin, organisation: org })
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
      `SELECT m.id, m.email, m.password_hash, m.nom, m.prenoms, m.specialite, m.telephone,
              m.organisation_id, m.role,
              o.nom AS organisation_nom, o.type AS organisation_type, o.ville AS organisation_ville
       FROM medecins m
       LEFT JOIN organisations o ON o.id = m.organisation_id
       WHERE m.email = $1`,
      [email]
    )
    const row = result.rows[0]
    if (!row) return res.status(401).json({ error: 'Identifiants incorrects' })

    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' })

    const token = makeToken(row.id, row.organisation_id)

    const medecin = {
      id: row.id, email: row.email, nom: row.nom, prenoms: row.prenoms,
      specialite: row.specialite, telephone: row.telephone,
      organisation_id: row.organisation_id, role: row.role,
    }
    const organisation = row.organisation_id ? {
      id: row.organisation_id, nom: row.organisation_nom,
      type: row.organisation_type, ville: row.organisation_ville,
    } : null

    res.json({ token, medecin, organisation })
  } catch (err: any) {
    console.error('[Auth Login]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.id, m.email, m.nom, m.prenoms, m.specialite, m.telephone,
              m.organisation_id, m.role,
              o.nom AS organisation_nom, o.type AS organisation_type,
              o.ville AS organisation_ville, o.telephone AS organisation_telephone,
              o.email AS organisation_email, o.adresse AS organisation_adresse
       FROM medecins m
       LEFT JOIN organisations o ON o.id = m.organisation_id
       WHERE m.id = $1`,
      [req.medecinId]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Médecin introuvable' })

    const medecin = {
      id: row.id, email: row.email, nom: row.nom, prenoms: row.prenoms,
      specialite: row.specialite, telephone: row.telephone,
      organisation_id: row.organisation_id, role: row.role,
    }
    const organisation = row.organisation_id ? {
      id: row.organisation_id, nom: row.organisation_nom,
      type: row.organisation_type, ville: row.organisation_ville,
      telephone: row.organisation_telephone, email: row.organisation_email,
      adresse: row.organisation_adresse,
    } : null

    res.json({ ...medecin, organisation })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/auth/me — mise à jour profil médecin
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nom, prenoms, specialite, telephone } = req.body
  if (!nom) return res.status(400).json({ error: 'Le nom est requis' })

  try {
    const result = await query(
      `UPDATE medecins
       SET nom=$1, prenoms=$2, specialite=$3, telephone=$4
       WHERE id=$5
       RETURNING id, email, nom, prenoms, specialite, telephone, organisation_id, role`,
      [nom, prenoms || '', specialite || '', telephone || '', req.medecinId]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Médecin introuvable' })
    res.json(row)
  } catch (err) {
    console.error('[Auth UpdateMe]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
