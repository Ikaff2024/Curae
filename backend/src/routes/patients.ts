import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'

const router = Router()
router.use(authMiddleware)

// GET /api/patients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = '1', limit = '50' } = req.query as Record<string, string>
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let sql = `SELECT id, nom, prenoms, date_naissance, sexe, telephone, whatsapp,
                      numero_dossier, assurance, created_at
               FROM patients WHERE medecin_id = $1`
    const params: any[] = [req.medecinId]

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (nom ILIKE $${params.length} OR prenoms ILIKE $${params.length} OR telephone LIKE $${params.length})`
    }

    sql += ` ORDER BY nom, prenoms LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), offset)

    const result = await query(sql, params)
    res.json({ patients: result.rows, total: result.rowCount })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/patients/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM patients WHERE id = $1 AND medecin_id = $2`,
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/patients
router.post('/', async (req: AuthRequest, res: Response) => {
  const { nom, prenoms, date_naissance, sexe, telephone, whatsapp, assurance, numero_assurance, antecedents, adresse } = req.body
  if (!nom || !prenoms || !date_naissance) {
    return res.status(400).json({ error: 'nom, prenoms et date_naissance requis' })
  }

  try {
    const annee = new Date().getFullYear()
    const slug = (nom.slice(0, 3) + prenoms.slice(0, 2)).toUpperCase().replace(/[^A-Z]/g, '')
    const numero_dossier = `CUR-${annee}-${slug}-${Date.now().toString().slice(-4)}`

    const result = await query(
      `INSERT INTO patients
         (medecin_id, nom, prenoms, date_naissance, sexe, telephone, whatsapp,
          numero_dossier, assurance, numero_assurance, antecedents, adresse)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.medecinId, nom, prenoms, date_naissance, sexe || 'M', telephone || '', whatsapp || '',
       numero_dossier, assurance || '', numero_assurance || '', antecedents || '', adresse || '']
    )
    res.status(201).json(result.rows[0])
  } catch (err: any) {
    console.error('[Patients POST]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/patients/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { nom, prenoms, date_naissance, sexe, telephone, whatsapp, assurance, numero_assurance, antecedents, adresse } = req.body

  try {
    const result = await query(
      `UPDATE patients SET
         nom=$3, prenoms=$4, date_naissance=$5, sexe=$6, telephone=$7, whatsapp=$8,
         assurance=$9, numero_assurance=$10, antecedents=$11, adresse=$12, updated_at=NOW()
       WHERE id=$1 AND medecin_id=$2 RETURNING *`,
      [req.params.id, req.medecinId, nom, prenoms, date_naissance, sexe, telephone, whatsapp, assurance, numero_assurance, antecedents, adresse]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/patients/:id/tendances — agrégation vitaux sur 6 derniers CRs
router.get('/:id/tendances', async (req: AuthRequest, res: Response) => {
  try {
    const patientRes = await query(
      'SELECT id FROM patients WHERE id = $1 AND medecin_id = $2',
      [req.params.id, req.medecinId]
    )
    if (!patientRes.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })

    const crRes = await query(
      `SELECT pa_droite, pa_gauche, fc, spo2, donnees_specialisees, traitement, created_at
       FROM comptes_rendus
       WHERE patient_id = $1 AND medecin_id = $2
       ORDER BY created_at DESC LIMIT 6`,
      [req.params.id, req.medecinId]
    )

    const crs = crRes.rows.reverse()

    function parsePA(pa: string | null): { sys: number; dia: number } | null {
      if (!pa) return null
      const m = pa.match(/(\d+)\s*\/\s*(\d+)/)
      return m ? { sys: parseInt(m[1]), dia: parseInt(m[2]) } : null
    }

    const series = crs.map(cr => {
      const pa = parsePA(cr.pa_droite) || parsePA(cr.pa_gauche)
      const ds = typeof cr.donnees_specialisees === 'string'
        ? JSON.parse(cr.donnees_specialisees)
        : (cr.donnees_specialisees || {})
      return {
        date: cr.created_at,
        pa_sys: pa?.sys ?? null,
        pa_dia: pa?.dia ?? null,
        fc: cr.fc ? parseInt(cr.fc) || null : null,
        spo2: cr.spo2 ? parseInt(cr.spo2) || null : null,
        hba1c: ds.hba1c ? parseFloat(ds.hba1c) || null : null,
        creatinine: ds.creatinine ? parseFloat(ds.creatinine) || null : null,
      }
    })

    const ANTICOAGULANTS = ['warfarine','warfarin','coumadine','pradaxa','xarelto','eliquis',
      'heparine','héparine','dabigatran','rivaroxaban','apixaban','previscan','sintrom']
    const traitements = crs.map(c => (c.traitement || '').toLowerCase()).join(' ')
    const surAnticoag = ANTICOAGULANTS.some(a => traitements.includes(a))

    const alerts: string[] = []

    if (surAnticoag) {
      const avecCreat = series.filter(s => s.creatinine !== null).slice(-1)[0]
      if (!avecCreat) {
        alerts.push('Anticoagulant prescrit — créatinine non documentée dans les CRs récents')
      } else {
        const jours = (Date.now() - new Date(avecCreat.date).getTime()) / 86400000
        if (jours > 90) alerts.push(`Anticoagulant — créatinine non vérifiée depuis ${Math.round(jours)} jours`)
      }
    }

    const paSerie = series.filter(s => s.pa_sys !== null)
    if (paSerie.length >= 2) {
      const recentsHTA = paSerie.slice(-3).filter(s => (s.pa_sys ?? 0) >= 140 || (s.pa_dia ?? 0) >= 90)
      if (recentsHTA.length >= 2) alerts.push('HTA non contrôlée — PA ≥ 140/90 sur plusieurs consultations récentes')
    }

    const fcSerie = series.filter(s => s.fc !== null)
    if (fcSerie.length >= 2) {
      const fcRecent = fcSerie[fcSerie.length - 1]!.fc!
      if (fcRecent > 110) alerts.push(`Tachycardie — FC ${fcRecent} bpm à la dernière consultation`)
      if (fcRecent < 50) alerts.push(`Bradycardie — FC ${fcRecent} bpm à la dernière consultation`)
    }

    // ── Score de risque ────────────────────────────────────────────
    let score = 0
    const paSerieFull = series.filter(s => s.pa_sys !== null)
    const recentsHTA_severe = paSerieFull.slice(-3).filter(s => (s.pa_sys ?? 0) >= 160 || (s.pa_dia ?? 0) >= 100)
    const recentsHTA_mod    = paSerieFull.slice(-3).filter(s => (s.pa_sys ?? 0) >= 140 || (s.pa_dia ?? 0) >= 90)
    if (recentsHTA_severe.length >= 2) score += 30
    else if (recentsHTA_mod.length >= 2) score += 20
    if (surAnticoag) score += 15
    const lastHba1c = series.filter(s => s.hba1c !== null).slice(-1)[0]?.hba1c
    if (lastHba1c && lastHba1c >= 8) score += 25
    else if (lastHba1c && lastHba1c >= 7) score += 15
    const lastFcVal = series.filter(s => s.fc !== null).slice(-1)[0]?.fc
    if (lastFcVal && (lastFcVal > 110 || lastFcVal < 50)) score += 15
    const lastSpo2 = series.filter(s => s.spo2 !== null).slice(-1)[0]?.spo2
    if (lastSpo2 && lastSpo2 < 90) score += 25
    else if (lastSpo2 && lastSpo2 < 95) score += 10
    const scoreNiveau: 'faible' | 'modere' | 'eleve' = score >= 60 ? 'eleve' : score >= 30 ? 'modere' : 'faible'

    res.json({ series, alerts, count: crs.length, score_risque: score, score_niveau: scoreNiveau })
  } catch (err) {
    console.error('[Tendances]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/patients/:id/timeline — historique chronologique CRs + RDVs
router.get('/:id/timeline', async (req: AuthRequest, res: Response) => {
  try {
    const pRes = await query(
      'SELECT id FROM patients WHERE id = $1 AND medecin_id = $2',
      [req.params.id, req.medecinId]
    )
    if (!pRes.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })

    const [crRes, rdvRes] = await Promise.all([
      query(
        `SELECT id, type_cr, motif, conclusion, traitement, pa_droite, pa_gauche, fc, spo2,
                donnees_specialisees, statut, created_at
         FROM comptes_rendus
         WHERE patient_id = $1 AND medecin_id = $2
         ORDER BY created_at DESC LIMIT 50`,
        [req.params.id, req.medecinId]
      ),
      query(
        `SELECT id, date, heure, motif, type_rdv, statut, notes
         FROM rendez_vous
         WHERE patient_id = $1 AND medecin_id = $2
         ORDER BY date DESC LIMIT 50`,
        [req.params.id, req.medecinId]
      ),
    ])

    const TYPE_LABELS: Record<string, string> = {
      consultation: 'Consultation cardio', consultation_generale: 'Consultation générale',
      echocardiographie: 'Échocardiographie', holter_ecg: 'Holter ECG',
      holter_ta: 'Holter tensionnel', epreuve_effort: "Épreuve d'effort",
      gynecologie: 'Gynécologie', pediatrie: 'Pédiatrie', diabetologie: 'Diabétologie',
    }

    const events: any[] = []

    for (const cr of crRes.rows) {
      const ds = typeof cr.donnees_specialisees === 'string'
        ? JSON.parse(cr.donnees_specialisees)
        : (cr.donnees_specialisees || {})
      events.push({
        id: cr.id, type: 'cr',
        date: cr.created_at,
        titre: TYPE_LABELS[cr.type_cr] || cr.type_cr,
        type_cr: cr.type_cr,
        sous_titre: cr.motif || '',
        conclusion: cr.conclusion ? cr.conclusion.slice(0, 300) : '',
        traitement: cr.traitement || '',
        vitaux: { pa: cr.pa_droite || cr.pa_gauche || null, fc: cr.fc || null, spo2: cr.spo2 || null },
        meta: {
          hba1c: ds.hba1c || null,
          fraction_ejection: ds.fraction_ejection || null,
          hba1c_date: ds.hba1c_date || null,
        },
        statut: cr.statut,
      })
    }

    for (const rdv of rdvRes.rows) {
      events.push({
        id: rdv.id, type: 'rdv',
        date: `${rdv.date}T${rdv.heure || '00:00'}:00`,
        titre: 'Rendez-vous',
        sous_titre: rdv.motif || '',
        notes: rdv.notes || '',
        statut: rdv.statut,
        type_rdv: rdv.type_rdv,
      })
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    res.json({ events, total: events.length })
  } catch (err) {
    console.error('[Timeline]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/patients/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM patients WHERE id = $1 AND medecin_id = $2 RETURNING id',
      [req.params.id, req.medecinId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient introuvable' })
    res.json({ deleted: result.rows[0].id })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
