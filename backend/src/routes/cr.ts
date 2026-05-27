import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'

const router = Router()
router.use(authMiddleware)

// GET /api/cr — liste des comptes-rendus
router.get('/', async (req: AuthRequest, res: Response) => {
  const { patient_id, type_cr } = req.query as Record<string, string>
  const params: any[] = [req.medecinId]
  let conditions = 'cr.medecin_id = $1'

  if (patient_id) { params.push(patient_id); conditions += ` AND cr.patient_id = $${params.length}` }
  if (type_cr) { params.push(type_cr); conditions += ` AND cr.type_cr = $${params.length}` }

  try {
    const result = await query(
      `SELECT cr.*, p.nom, p.prenoms
       FROM comptes_rendus cr JOIN patients p ON p.id = cr.patient_id
       WHERE ${conditions} ORDER BY cr.created_at DESC`,
      params
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/cr/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT cr.*, p.nom, p.prenoms, p.date_naissance, p.sexe
       FROM comptes_rendus cr JOIN patients p ON p.id = cr.patient_id
       WHERE cr.id = $1 AND cr.medecin_id = $2`,
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Compte-rendu introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/cr
router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    patient_id, type_cr, motif, anamnese, examen_clinique,
    pa_droite, pa_gauche, fc, spo2, donnees_specialisees,
    conclusion, traitement, recommandations,
  } = req.body

  if (!patient_id || !type_cr) {
    return res.status(400).json({ error: 'patient_id et type_cr requis' })
  }

  try {
    const result = await query(
      `INSERT INTO comptes_rendus
         (medecin_id, patient_id, type_cr, motif, anamnese, examen_clinique,
          pa_droite, pa_gauche, fc, spo2, donnees_specialisees,
          conclusion, traitement, recommandations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.medecinId, patient_id, type_cr, motif || '', anamnese || '', examen_clinique || '',
       pa_droite || '', pa_gauche || '', fc || '', spo2 || '',
       JSON.stringify(donnees_specialisees || {}),
       conclusion || '', traitement || '', recommandations || '']
    )
    res.status(201).json(result.rows[0])
  } catch (err: any) {
    console.error('[CR POST]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/cr/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { conclusion, traitement, recommandations, statut } = req.body

  try {
    const result = await query(
      `UPDATE comptes_rendus SET conclusion=$3, traitement=$4, recommandations=$5, statut=$6, updated_at=NOW()
       WHERE id=$1 AND medecin_id=$2 RETURNING *`,
      [req.params.id, req.medecinId, conclusion, traitement, recommandations, statut || 'brouillon']
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Compte-rendu introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/cr/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM comptes_rendus WHERE id=$1 AND medecin_id=$2 RETURNING id',
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Compte-rendu introuvable' })
    res.json({ deleted: result.rows[0].id })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
