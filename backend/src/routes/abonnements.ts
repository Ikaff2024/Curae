import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'
import { creerPaiement, verifierPaiement, calculerDateFin, PLANS, PlanAbonnement } from '../lib/wave'

const router = Router()

// ── Routes publiques ──────────────────────────────────────────────────

// GET /api/abonnements/plans — liste les plans
router.get('/plans', (_req, res) => {
  res.json(Object.values(PLANS))
})

// POST /api/abonnements/webhook — callback Wave après paiement
router.post('/webhook', async (req, res) => {
  res.status(200).send('OK') // Répondre immédiatement

  try {
    const { type, data } = req.body
    if (type !== 'checkout.session.completed') return

    const ref = data?.client_reference as string
    if (!ref?.startsWith('curae-')) return

    // Extraire plan et medecin_id depuis la ref
    // Format: curae-{plan}-{medecin_id_slice}-{timestamp}
    const parts = ref.split('-')
    const plan = parts[1] as PlanAbonnement
    const medecinSlice = parts[2]

    // Trouver le médecin par le slice de son ID
    const mRes = await query(
      `SELECT id FROM medecins WHERE LEFT(id::text, 8) = $1`,
      [medecinSlice]
    )
    if (!mRes.rows[0]) return

    const medecin_id = mRes.rows[0].id
    const dateDebut = new Date()
    const dateFin = calculerDateFin(dateDebut)

    // Créer ou renouveler l'abonnement
    await query(`
      INSERT INTO abonnements (medecin_id, plan, statut, date_debut, date_fin, wave_ref, montant_paye)
      VALUES ($1, $2, 'actif', $3, $4, $5, $6)
      ON CONFLICT (medecin_id)
      DO UPDATE SET plan=$2, statut='actif', date_debut=$3, date_fin=$4, wave_ref=$5, montant_paye=$6
    `, [medecin_id, plan, dateDebut.toISOString(), dateFin.toISOString(), ref, data.amount])

    console.log(`[Wave Webhook] Abonnement activé — ${medecin_id} plan ${plan}`)
  } catch (err) {
    console.error('[Wave Webhook Error]', err)
  }
})

// ── Routes protégées ──────────────────────────────────────────────────
router.use(authMiddleware)

// GET /api/abonnements/moi — statut abonnement du médecin connecté
router.get('/moi', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM abonnements WHERE medecin_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.medecinId]
    )

    if (!result.rows[0]) {
      // Créer un essai gratuit 30j
      const fin = calculerDateFin()
      const abo = await query(`
        INSERT INTO abonnements (medecin_id, plan, statut, date_fin)
        VALUES ($1, 'solo', 'essai', $2) RETURNING *
      `, [req.medecinId, fin.toISOString()])
      return res.json({ ...abo.rows[0], plan_info: PLANS['solo'], jours_restants: 30 })
    }

    const abo = result.rows[0]
    const maintenant = new Date()
    const dateFin = new Date(abo.date_fin)
    const joursRestants = Math.max(0, Math.ceil((dateFin.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)))

    // Marquer expiré si dépassé
    if (joursRestants === 0 && abo.statut === 'actif') {
      await query(`UPDATE abonnements SET statut = 'expire' WHERE id = $1`, [abo.id])
      abo.statut = 'expire'
    }

    res.json({ ...abo, plan_info: PLANS[abo.plan as PlanAbonnement], jours_restants: joursRestants })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/abonnements/payer — initier un paiement Wave
router.post('/payer', async (req: AuthRequest, res: Response) => {
  const { plan, telephone } = req.body
  if (!plan || !PLANS[plan as PlanAbonnement]) {
    return res.status(400).json({ error: 'Plan invalide. Options: solo, cabinet' })
  }

  try {
    const paiement = await creerPaiement(req.medecinId!, plan as PlanAbonnement, telephone)

    // Enregistrer la tentative de paiement
    await query(`
      INSERT INTO abonnements (medecin_id, plan, statut, wave_session_id)
      VALUES ($1, $2, 'essai', $3)
      ON CONFLICT DO NOTHING
    `, [req.medecinId, plan, paiement.id])

    res.json({
      checkout_url: paiement.checkout_url,
      wave_launch_url: paiement.wave_launch_url,
      montant: paiement.amount,
      devise: 'FCFA',
      plan: PLANS[plan as PlanAbonnement],
      simule: paiement.simule || false,
    })
  } catch (err: any) {
    console.error('[Wave Paiement]', err)
    res.status(500).json({ error: 'Erreur initiation paiement: ' + err.message })
  }
})

// POST /api/abonnements/verifier/:session_id — vérifier après retour Wave
router.post('/verifier/:session_id', async (req: AuthRequest, res: Response) => {
  try {
    const { statut, montant, ref } = await verifierPaiement(req.params.session_id)

    if (statut === 'complete') {
      const fin = calculerDateFin()
      const abo = await query(`
        UPDATE abonnements
        SET statut = 'actif', date_fin = $1, wave_ref = $2, montant_paye = $3
        WHERE medecin_id = $4
        RETURNING *
      `, [fin.toISOString(), ref, montant, req.medecinId])
      return res.json({ statut: 'actif', abonnement: abo.rows[0] })
    }

    res.json({ statut })
  } catch (err) {
    res.status(500).json({ error: 'Erreur vérification paiement' })
  }
})

export default router
