import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'

const router = Router()
router.use(authMiddleware)

// GET /api/organisation/me — infos de l'organisation du médecin connecté
router.get('/me', async (req: AuthRequest, res: Response) => {
  if (!req.organisationId) return res.status(404).json({ error: 'Aucune organisation associée' })

  try {
    const [orgRes, membresRes] = await Promise.all([
      query(`SELECT * FROM organisations WHERE id = $1`, [req.organisationId]),
      query(
        `SELECT id, nom, prenoms, specialite, role, email, telephone
         FROM medecins WHERE organisation_id = $1 ORDER BY nom, prenoms`,
        [req.organisationId]
      ),
    ])

    if (!orgRes.rows[0]) return res.status(404).json({ error: 'Organisation introuvable' })

    res.json({
      organisation: orgRes.rows[0],
      membres: membresRes.rows,
    })
  } catch (err) {
    console.error('[Org Me]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/organisation/me — mise à jour des infos de l'organisation
router.put('/me', async (req: AuthRequest, res: Response) => {
  if (!req.organisationId) return res.status(404).json({ error: 'Aucune organisation associée' })

  // Seul l'admin peut modifier
  const medecinRes = await query('SELECT role FROM medecins WHERE id = $1', [req.medecinId])
  if (!['admin_medecin', 'admin'].includes(medecinRes.rows[0]?.role)) {
    return res.status(403).json({ error: 'Droits insuffisants' })
  }

  const { nom, type, adresse, ville, pays, telephone, email } = req.body

  try {
    const result = await query(
      `UPDATE organisations
       SET nom = COALESCE($1, nom),
           type = COALESCE($2, type),
           adresse = COALESCE($3, adresse),
           ville = COALESCE($4, ville),
           pays = COALESCE($5, pays),
           telephone = COALESCE($6, telephone),
           email = COALESCE($7, email),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [nom, type, adresse, ville, pays, telephone, email, req.organisationId]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('[Org Update]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
