import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'

const router = Router()
router.use(authMiddleware)

// GET /api/factures
router.get('/', async (req: AuthRequest, res: Response) => {
  const { patient_id, statut, mois } = req.query as Record<string, string>
  const params: any[] = [req.medecinId]
  let conditions = 'f.medecin_id = $1'

  if (patient_id) { params.push(patient_id); conditions += ` AND f.patient_id = $${params.length}` }
  if (statut) { params.push(statut); conditions += ` AND f.statut = $${params.length}` }
  if (mois) { params.push(mois); conditions += ` AND TO_CHAR(f.date_emission, 'YYYY-MM') = $${params.length}` }

  try {
    const result = await query(
      `SELECT f.*, p.nom, p.prenoms, p.assurance
       FROM factures f JOIN patients p ON p.id = f.patient_id
       WHERE ${conditions} ORDER BY f.date_emission DESC`,
      params
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/factures/stats — stats agrégées
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
         SUM(montant_total) AS total_facture,
         SUM(CASE WHEN statut='paye' THEN montant_total ELSE 0 END) AS total_paye,
         SUM(CASE WHEN statut='en_attente' THEN montant_total ELSE 0 END) AS total_en_attente,
         COUNT(*) AS nombre_factures
       FROM factures WHERE medecin_id = $1`,
      [req.medecinId]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/factures/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT f.*, p.nom, p.prenoms, p.telephone, p.assurance, p.numero_assurance
       FROM factures f JOIN patients p ON p.id = f.patient_id
       WHERE f.id = $1 AND f.medecin_id = $2`,
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Facture introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/factures
router.post('/', async (req: AuthRequest, res: Response) => {
  const { patient_id, actes, montant_total, montant_assurance, montant_patient, mode_paiement, notes } = req.body
  if (!patient_id || !montant_total) {
    return res.status(400).json({ error: 'patient_id et montant_total requis' })
  }

  try {
    const annee = new Date().getFullYear()
    const seq = Date.now().toString().slice(-5)
    const numero = `FAC-${annee}-${seq}`

    const result = await query(
      `INSERT INTO factures
         (medecin_id, patient_id, numero, actes, montant_total, montant_assurance, montant_patient,
          mode_paiement, notes, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_attente') RETURNING *`,
      [req.medecinId, patient_id, numero, JSON.stringify(actes || []),
       montant_total, montant_assurance || 0, montant_patient || montant_total,
       mode_paiement || 'direct', notes || '']
    )
    res.status(201).json(result.rows[0])
  } catch (err: any) {
    console.error('[Factures POST]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/factures/:id/statut
router.put('/:id/statut', async (req: AuthRequest, res: Response) => {
  const { statut, date_paiement } = req.body
  if (!['en_attente', 'paye', 'rembourse', 'annule'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' })
  }

  try {
    const result = await query(
      `UPDATE factures SET statut=$3, date_paiement=$4, updated_at=NOW()
       WHERE id=$1 AND medecin_id=$2 RETURNING *`,
      [req.params.id, req.medecinId, statut, date_paiement || null]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Facture introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
