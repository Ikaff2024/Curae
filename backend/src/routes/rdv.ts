import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'
import { envoyerConfirmation, envoyerAnnulation } from '../lib/whatsapp'

const router = Router()
router.use(authMiddleware)

// GET /api/rdv — liste des rdv (filtrables par date)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { date, mois, statut } = req.query as Record<string, string>
  const params: any[] = [req.medecinId]
  let conditions = 'r.medecin_id = $1'

  if (date) { params.push(date); conditions += ` AND r.date = $${params.length}` }
  if (mois) { params.push(mois); conditions += ` AND TO_CHAR(r.date, 'YYYY-MM') = $${params.length}` }
  if (statut) { params.push(statut); conditions += ` AND r.statut = $${params.length}` }

  try {
    const result = await query(
      `SELECT r.*, p.nom, p.prenoms, p.telephone, p.whatsapp
       FROM rendez_vous r
       JOIN patients p ON p.id = r.patient_id
       WHERE ${conditions}
       ORDER BY r.date, r.heure`,
      params
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/rdv/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT r.*, p.nom, p.prenoms, p.telephone, p.whatsapp
       FROM rendez_vous r JOIN patients p ON p.id = r.patient_id
       WHERE r.id = $1 AND r.medecin_id = $2`,
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'RDV introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/rdv
router.post('/', async (req: AuthRequest, res: Response) => {
  const { patient_id, date, heure, duree_minutes = 30, motif, type_rdv = 'consultation', notes } = req.body
  if (!patient_id || !date || !heure) {
    return res.status(400).json({ error: 'patient_id, date et heure requis' })
  }

  try {
    const result = await query(
      `INSERT INTO rendez_vous (medecin_id, patient_id, date, heure, duree_minutes, motif, type_rdv, notes, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirme') RETURNING *`,
      [req.medecinId, patient_id, date, heure, duree_minutes, motif || '', type_rdv, notes || '']
    )
    const rdv = result.rows[0]

    // Envoyer confirmation WhatsApp si disponible
    const pRes = await query('SELECT nom, prenoms, whatsapp FROM patients WHERE id=$1', [patient_id])
    if (pRes.rows[0]?.whatsapp) {
      envoyerConfirmation(pRes.rows[0], { date, heure, motif }).catch(() => {})
    }

    res.status(201).json(rdv)
  } catch (err: any) {
    console.error('[RDV POST]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/rdv/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { date, heure, duree_minutes, motif, statut, notes } = req.body

  try {
    const result = await query(
      `UPDATE rendez_vous SET date=$3, heure=$4, duree_minutes=$5, motif=$6, statut=$7, notes=$8, updated_at=NOW()
       WHERE id=$1 AND medecin_id=$2 RETURNING *`,
      [req.params.id, req.medecinId, date, heure, duree_minutes, motif, statut, notes]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'RDV introuvable' })

    // WhatsApp annulation
    if (statut === 'annule') {
      const rdv = result.rows[0]
      const pRes = await query('SELECT nom, prenoms, whatsapp FROM patients WHERE id=$1', [rdv.patient_id])
      if (pRes.rows[0]?.whatsapp) {
        envoyerAnnulation(pRes.rows[0], { date, heure, motif }).catch(() => {})
      }
    }

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/rdv/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM rendez_vous WHERE id=$1 AND medecin_id=$2 RETURNING id',
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'RDV introuvable' })
    res.json({ deleted: result.rows[0].id })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
