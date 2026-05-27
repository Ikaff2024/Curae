import { Router, Response, Request } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'
import {
  envoyerConfirmation,
  envoyerRappel,
  envoyerAnnulation,
  envoyerResultatDisponible,
  envoyerWhatsApp,
  genererMessage,
} from '../lib/whatsapp'
import { lancerRappels } from '../lib/rappels'

const router = Router()

// ── Routes protégées (JWT) ────────────────────────────────────────────
router.use('/send', authMiddleware)
router.use('/rappels', authMiddleware)
router.use('/preview', authMiddleware)

// POST /api/whatsapp/send — envoi manuel
router.post('/send', async (req: AuthRequest, res: Response) => {
  const { rdv_id, patient_id, type } = req.body

  try {
    let patient: any
    let rdv: any

    if (rdv_id) {
      // Envoi lié à un RDV
      const r = await query(`
        SELECT r.*, p.nom, p.prenoms, p.whatsapp
        FROM rendez_vous r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.id = $1 AND r.medecin_id = $2
      `, [rdv_id, req.medecinId])

      if (!r.rows[0]) return res.status(404).json({ error: 'RDV introuvable' })

      const row = r.rows[0]
      patient = { nom: row.nom, prenoms: row.prenoms, whatsapp: row.whatsapp }
      rdv = { date: row.date.toISOString().slice(0, 10), heure: row.heure, motif: row.motif }

      let result
      if (type === 'confirmation') result = await envoyerConfirmation(patient, rdv)
      else if (type === 'rappel') result = await envoyerRappel(patient, rdv)
      else if (type === 'annulation') result = await envoyerAnnulation(patient, rdv)
      else return res.status(400).json({ error: 'Type de message invalide' })

      if (result.success && type === 'confirmation') {
        await query(`UPDATE rendez_vous SET statut = 'confirme' WHERE id = $1`, [rdv_id])
      }

      return res.json({ ...result, message: genererMessage(type === 'confirmation' ? 'confirmation_rdv' : type === 'rappel' ? 'rappel_rdv' : 'annulation_rdv', patient, rdv) })

    } else if (patient_id) {
      // Envoi libre vers un patient
      const p = await query(`
        SELECT nom, prenoms, whatsapp FROM patients
        WHERE id = $1 AND medecin_id = $2
      `, [patient_id, req.medecinId])

      if (!p.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })
      if (!p.rows[0].whatsapp) return res.status(400).json({ error: 'Patient sans numéro WhatsApp' })

      patient = p.rows[0]
      const message = req.body.message || genererMessage('message_libre', patient, undefined, { texte: req.body.texte })
      const result = await envoyerWhatsApp(patient, message)
      return res.json({ ...result, message })
    }

    res.status(400).json({ error: 'rdv_id ou patient_id requis' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/whatsapp/preview — prévisualiser un message sans l'envoyer
router.post('/preview', async (req: AuthRequest, res: Response) => {
  const { type, rdv_id, patient_id } = req.body
  try {
    let patient: any, rdv: any

    if (rdv_id) {
      const r = await query(`
        SELECT r.*, p.nom, p.prenoms, p.whatsapp
        FROM rendez_vous r JOIN patients p ON p.id = r.patient_id
        WHERE r.id = $1 AND r.medecin_id = $2
      `, [rdv_id, req.medecinId])
      if (!r.rows[0]) return res.status(404).json({ error: 'RDV introuvable' })
      const row = r.rows[0]
      patient = { nom: row.nom, prenoms: row.prenoms, whatsapp: row.whatsapp }
      rdv = { date: row.date.toISOString().slice(0, 10), heure: row.heure, motif: row.motif }
    }

    const message = genererMessage(type, patient, rdv)
    res.json({ message, destinataire: patient?.whatsapp })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/whatsapp/rappels — déclencher les rappels manuellement
router.post('/rappels', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await lancerRappels()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors des rappels' })
  }
})

// ── Webhook Meta (vérification + réception messages entrants) ─────────
// GET /api/whatsapp/webhook — vérification Meta
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Vérifié ✅')
    return res.status(200).send(challenge)
  }
  res.status(403).json({ error: 'Vérification échouée' })
})

// POST /api/whatsapp/webhook — messages entrants (réponses patients)
router.post('/webhook', async (req: Request, res: Response) => {
  res.status(200).send('OK') // Répondre immédiatement à Meta

  try {
    const body = req.body
    if (body.object !== 'whatsapp_business_account') return

    const changes = body.entry?.[0]?.changes
    if (!changes) return

    for (const change of changes) {
      const messages = change.value?.messages
      if (!messages) continue

      for (const msg of messages) {
        const from = msg.from // numéro expéditeur
        const text = msg.text?.body?.trim().toUpperCase()

        console.log(`[WhatsApp Entrant] ${from}: ${text}`)

        // Si le patient répond OUI → confirmer son RDV
        if (text === 'OUI' || text === 'O' || text === 'YES') {
          // Chercher le prochain RDV de ce patient
          const tel = '+' + from
          await query(`
            UPDATE rendez_vous SET statut = 'confirme'
            WHERE patient_id = (
              SELECT id FROM patients
              WHERE whatsapp ILIKE $1 OR telephone ILIKE $1
              LIMIT 1
            )
            AND date >= CURRENT_DATE
            AND statut = 'en_attente'
            AND id = (
              SELECT id FROM rendez_vous
              WHERE patient_id = (SELECT id FROM patients WHERE whatsapp ILIKE $1 LIMIT 1)
              AND date >= CURRENT_DATE ORDER BY date LIMIT 1
            )
          `, [tel])
          console.log(`[WhatsApp] RDV confirmé par réponse OUI — ${from}`)
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook Error]', err)
  }
})

export default router
