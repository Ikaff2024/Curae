import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'
import { genererCR } from '../lib/ia'

const router = Router()
router.use(authMiddleware)

// POST /api/ia/generer-cr
// Génère conclusion + traitement + recommandations depuis les données du formulaire
router.post('/generer-cr', async (req: AuthRequest, res: Response) => {
  const {
    patient_id, type_cr, motif, anamnese, examen_clinique,
    pa_droite, pa_gauche, fc, spo2, donnees_specialisees,
  } = req.body

  if (!patient_id || !type_cr) {
    return res.status(400).json({ error: 'patient_id et type_cr requis' })
  }

  try {
    // Récupérer les données patient
    const pRes = await query(
      `SELECT nom, prenoms, date_naissance, sexe, antecedents
       FROM patients WHERE id = $1 AND medecin_id = $2`,
      [patient_id, req.medecinId]
    )
    if (!pRes.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })

    const p = pRes.rows[0]
    const dob = new Date(p.date_naissance)
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--

    const donnees = {
      type_cr,
      patient: { nom: p.nom, prenoms: p.prenoms, age, sexe: p.sexe, antecedents: p.antecedents },
      motif, anamnese, examen_clinique,
      pa_droite, pa_gauche, fc, spo2,
      donnees_specialisees,
    }

    const debut = Date.now()
    const resultat = await genererCR(donnees)
    const duree = Date.now() - debut

    console.log(`[IA] CR généré en ${duree}ms${resultat.simule ? ' (simulé)' : ''}`)

    res.json({
      ...resultat,
      duree_ms: duree,
      model: resultat.simule ? 'simulation' : 'claude-opus-4-5',
    })
  } catch (err: any) {
    console.error('[IA Route]', err)
    res.status(500).json({ error: 'Erreur génération IA: ' + err.message })
  }
})

// POST /api/ia/reformuler
// Reformule un texte médical dans un style plus professionnel
router.post('/reformuler', async (req: AuthRequest, res: Response) => {
  const { texte, contexte } = req.body
  if (!texte) return res.status(400).json({ error: 'Texte requis' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ texte_reformule: texte, simule: true })
  }

  try {
    const prompt = `Tu es un cardiologue francophone. Reformule ce texte médical en style professionnel, concis et précis, sans en changer le sens. Contexte: ${contexte || 'compte-rendu cardiologique'}.\n\nTexte: ${texte}\n\nRetourne uniquement le texte reformulé, sans commentaire.`

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await r.json() as any as any
    res.json({ texte_reformule: data.content?.[0]?.text || texte })
  } catch (err: any) {
    res.json({ texte_reformule: texte, erreur: err.message })
  }
})

// POST /api/ia/resume-patient
// Génère un résumé clinique longitudinal à partir des derniers CRs du patient
router.post('/resume-patient', async (req: AuthRequest, res: Response) => {
  const { patient_id } = req.body
  if (!patient_id) return res.status(400).json({ error: 'patient_id requis' })

  try {
    const [pRes, crRes] = await Promise.all([
      query(
        `SELECT nom, prenoms, date_naissance, sexe, antecedents FROM patients
         WHERE id = $1 AND medecin_id = $2`,
        [patient_id, req.medecinId]
      ),
      query(
        `SELECT type_cr, motif, anamnese, examen_clinique, pa_droite, pa_gauche, fc, spo2,
                conclusion, traitement, recommandations, donnees_specialisees, created_at
         FROM comptes_rendus
         WHERE patient_id = $1 AND medecin_id = $2
         ORDER BY created_at DESC LIMIT 20`,
        [patient_id, req.medecinId]
      ),
    ])

    if (!pRes.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })
    const p = pRes.rows[0]
    const age = Math.floor((Date.now() - new Date(p.date_naissance).getTime()) / (365.25 * 86400000))
    const crs = crRes.rows

    if (crs.length === 0) {
      return res.json({
        resume: 'Aucun compte-rendu disponible pour ce patient.',
        sections: { contexte: '', antecedents: p.antecedents || '', evolution: '', traitements: '', vigilance: '' },
        simule: true,
      })
    }

    const histoText = crs.map((cr, i) => {
      const date = new Date(cr.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const pa = cr.pa_droite || cr.pa_gauche ? `PA: ${cr.pa_droite || cr.pa_gauche}` : ''
      const fc = cr.fc ? `FC: ${cr.fc}bpm` : ''
      const spo2 = cr.spo2 ? `SpO2: ${cr.spo2}%` : ''
      const vitaux = [pa, fc, spo2].filter(Boolean).join(', ')
      return `[${i + 1}] ${date} — ${cr.type_cr} — ${cr.motif || ''}
Vitaux: ${vitaux || 'non renseignés'}
Conclusion: ${cr.conclusion || '—'}
Traitement: ${cr.traitement || '—'}`
    }).join('\n\n')

    if (!process.env.ANTHROPIC_API_KEY) {
      // Simulation locale
      const traitements = [...new Set(crs.flatMap(cr =>
        (cr.traitement || '').split(/[,;\n]/).map((t: string) => t.trim()).filter((t: string) => t.length > 3)
      ))].slice(0, 5).join(', ')
      return res.json({
        sections: {
          contexte: `${p.sexe === 'F' ? 'Patiente' : 'Patient'} de ${age} ans, suivi(e) pour ${crs[0].motif || 'consultation médicale'}.`,
          antecedents: p.antecedents || 'Non documentés',
          evolution: `${crs.length} consultation(s) enregistrée(s). Dernière visite : ${new Date(crs[0].created_at).toLocaleDateString('fr-FR')}.`,
          traitements: traitements || 'Non documentés',
          vigilance: 'Suivi régulier recommandé.',
        },
        simule: true,
      })
    }

    const prompt = `Tu es un médecin spécialiste. Génère un résumé clinique synthétique de ce patient basé sur son historique médical.

PATIENT: ${p.nom} ${p.prenoms}, ${p.sexe === 'F' ? 'Femme' : 'Homme'}, ${age} ans
ANTÉCÉDENTS: ${p.antecedents || 'Non documentés'}

HISTORIQUE DES CONSULTATIONS (${crs.length} au total, du plus récent au plus ancien):
${histoText}

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "contexte": "1-2 phrases: qui est le patient, pourquoi il est suivi",
  "antecedents": "pathologies connues et antécédents importants",
  "evolution": "évolution clinique sur la période documentée (tendances, amélioration, détérioration)",
  "traitements": "traitements actuels ou récents identifiés",
  "vigilance": "points de surveillance prioritaires pour ce patient"
}
Style: médecin parlant à un confrère. Concis, factuel, professionnel. Contexte Côte d'Ivoire/Afrique de l'Ouest.`

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await r.json() as any
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON non parseable')
    const sections = JSON.parse(jsonMatch[0])
    res.json({ sections, simule: false })
  } catch (err: any) {
    console.error('[IA resume-patient]', err)
    res.status(500).json({ error: 'Erreur génération résumé: ' + err.message })
  }
})

// POST /api/ia/structurer-transcription
// Prend une transcription vocale brute et la structure en CR médical
router.post('/structurer-transcription', async (req: AuthRequest, res: Response) => {
  const { transcription, type_cr, patient_context } = req.body
  if (!transcription) return res.status(400).json({ error: 'Transcription requise' })

  if (!process.env.ANTHROPIC_API_KEY) {
    // Simulation: retourner une structure fictive basée sur la transcription
    const mots = transcription.split(' ').slice(0, 8).join(' ')
    return res.json({
      motif: `Consultation — ${mots}…`,
      anamnese: transcription.length > 100 ? transcription.slice(0, 200) : transcription,
      examen_clinique: 'Examen clinique normal. Pas de signe de détresse.',
      conclusion: 'Bilan satisfaisant. Surveillance recommandée.',
      traitement: '',
      recommandations: 'Revoir dans 3 mois.',
      simule: true,
    })
  }

  try {
    const prompt = `Tu es un médecin francophone expert. On t'a transmis la transcription d'une dictée médicale brute. Restructure-la en un compte-rendu médical structuré en JSON.

Type de consultation: ${type_cr || 'consultation générale'}
Contexte patient: ${patient_context || 'non précisé'}

Transcription brute:
"${transcription}"

Retourne UNIQUEMENT un objet JSON valide avec ces champs (strings, pas de markdown):
{
  "motif": "motif de consultation en 1-2 phrases",
  "anamnese": "anamnèse développée",
  "examen_clinique": "examen clinique structuré",
  "conclusion": "conclusion médicale",
  "traitement": "traitement prescrit (médicaments et posologies si mentionnés)",
  "recommandations": "recommandations et suivi"
}

Règles:
- Si une information n'est pas dans la transcription, laisse le champ vide ""
- Conserve les chiffres exacts (PA, FC, doses médicaments)
- Style professionnel médical francophone (Côte d'Ivoire / Afrique de l'Ouest)
- JAMAIS de commentaires en dehors du JSON`

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json() as any
    let text = data.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse IA non parseable')
    const structured = JSON.parse(jsonMatch[0])

    res.json({ ...structured, simule: false })
  } catch (err: any) {
    console.error('[IA structurer-transcription]', err)
    // Fallback gracieux
    res.json({
      motif: transcription.slice(0, 150),
      anamnese: transcription,
      examen_clinique: '',
      conclusion: '',
      traitement: '',
      recommandations: '',
      simule: true,
      erreur: err.message,
    })
  }
})

export default router
