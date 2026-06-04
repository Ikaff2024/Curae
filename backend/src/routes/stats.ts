import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { query } from '../lib/db'

const router = Router()
router.use(authMiddleware)

// GET /api/stats/dashboard — données agrégées pour le tableau de bord
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const mid = req.medecinId

  try {
    const [
      patientsRes,
      rdvRes,
      crRes,
      facturesRes,
      abonnementRes,
    ] = await Promise.all([
      // Total patients + nouveaux ce mois
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS nouveaux_ce_mois
        FROM patients WHERE medecin_id = $1
      `, [mid]),

      // RDV : taux de présence (30 derniers jours)
      query(`
        SELECT
          COUNT(*) AS total_rdv,
          COUNT(*) FILTER (WHERE statut IN ('honore','confirme')) AS presents,
          COUNT(*) FILTER (WHERE statut = 'no_show') AS no_shows,
          COUNT(*) FILTER (WHERE statut = 'annule') AS annules,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND statut = 'confirme') AS prochains_confirmes
        FROM rendez_vous
        WHERE medecin_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
      `, [mid]),

      // CRs récents — patients à risque (PA élevée, HbA1c élevée)
      query(`
        SELECT
          cr.patient_id,
          p.nom, p.prenoms,
          cr.pa_droite, cr.pa_gauche, cr.fc,
          cr.donnees_specialisees,
          cr.traitement,
          cr.created_at
        FROM comptes_rendus cr
        JOIN patients p ON p.id = cr.patient_id
        WHERE cr.medecin_id = $1
          AND cr.created_at >= NOW() - INTERVAL '90 days'
        ORDER BY cr.created_at DESC
      `, [mid]),

      // Revenus par mois (6 derniers mois)
      query(`
        SELECT
          to_char(date_emission, 'YYYY-MM') AS mois,
          SUM(montant_total) AS total,
          SUM(montant_patient) AS patients_part,
          COUNT(*) AS nb_factures,
          COUNT(*) FILTER (WHERE statut = 'paye') AS nb_payes
        FROM factures
        WHERE medecin_id = $1
          AND date_emission >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY mois
        ORDER BY mois ASC
      `, [mid]),

      // Abonnement actuel
      query(`
        SELECT plan, statut, date_fin FROM abonnements WHERE medecin_id = $1 LIMIT 1
      `, [mid]),
    ])

    // ── Patients à risque ────────────────────────────────────────────
    const ANTICOAG = ['warfarine','warfarin','coumadine','pradaxa','xarelto','eliquis',
      'heparine','héparine','dabigatran','rivaroxaban','apixaban','previscan']

    type PatientRisque = { id: string; nom: string; prenoms: string; risques: string[] }
    const risqueMap: Record<string, PatientRisque> = {}

    for (const cr of crRes.rows) {
      const pid = cr.patient_id
      if (!risqueMap[pid]) risqueMap[pid] = { id: pid, nom: cr.nom, prenoms: cr.prenoms, risques: [] }
      const r = risqueMap[pid]

      // PA élevée
      const paTxt = cr.pa_droite || cr.pa_gauche || ''
      const paMatch = paTxt.match(/(\d+)\s*\/\s*(\d+)/)
      if (paMatch && (parseInt(paMatch[1]) >= 160 || parseInt(paMatch[2]) >= 100)) {
        if (!r.risques.includes('HTA sévère')) r.risques.push('HTA sévère')
      }

      // Anticoagulants
      const trt = (cr.traitement || '').toLowerCase()
      if (ANTICOAG.some(a => trt.includes(a))) {
        if (!r.risques.includes('Anticoagulant')) r.risques.push('Anticoagulant')
      }

      // HbA1c
      const ds = typeof cr.donnees_specialisees === 'string'
        ? JSON.parse(cr.donnees_specialisees)
        : (cr.donnees_specialisees || {})
      if (ds.hba1c && parseFloat(ds.hba1c) >= 8) {
        if (!r.risques.includes('HbA1c ≥ 8%')) r.risques.push('HbA1c ≥ 8%')
      }
    }

    const patientsRisque = Object.values(risqueMap).filter(p => p.risques.length > 0)

    // ── Taux présence ────────────────────────────────────────────────
    const rdv = rdvRes.rows[0]
    const tauxPresence = rdv.total_rdv > 0
      ? Math.round((parseInt(rdv.presents) / parseInt(rdv.total_rdv)) * 100)
      : null

    // ── Revenus ──────────────────────────────────────────────────────
    const revenus = facturesRes.rows.map(r => ({
      mois: r.mois,
      total: parseInt(r.total) || 0,
      patients_part: parseInt(r.patients_part) || 0,
      nb_factures: parseInt(r.nb_factures),
      nb_payes: parseInt(r.nb_payes),
    }))

    const revenusMoisActuel = revenus.find(r => r.mois === new Date().toISOString().slice(0, 7))
    const revenusMoisPrecedent = revenus[revenus.length - 2] || null

    res.json({
      patients: {
        total: parseInt(patientsRes.rows[0]?.total || '0'),
        nouveaux_ce_mois: parseInt(patientsRes.rows[0]?.nouveaux_ce_mois || '0'),
      },
      rdv: {
        total_30j: parseInt(rdv.total_rdv),
        presents: parseInt(rdv.presents),
        no_shows: parseInt(rdv.no_shows),
        annules: parseInt(rdv.annules),
        prochains_confirmes: parseInt(rdv.prochains_confirmes),
        taux_presence: tauxPresence,
      },
      patientsRisque,
      revenus,
      revenusMoisActuel,
      revenusMoisPrecedent,
      abonnement: abonnementRes.rows[0] || { plan: 'essai', statut: 'essai', date_fin: null },
    })
  } catch (err) {
    console.error('[Stats Dashboard]', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/export?type=factures|patients|rdv — export CSV
router.get('/export', async (req: AuthRequest, res: Response) => {
  const { type = 'factures', from, to } = req.query as Record<string, string>
  const mid = req.medecinId

  // Valider le format date (YYYY-MM-DD) avant toute utilisation en SQL
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const safeFrom = from && DATE_RE.test(from) ? from : null
  const safeTo   = to   && DATE_RE.test(to)   ? to   : null

  try {
    let csv = ''
    const sep = ';'

    if (type === 'factures') {
      const params: unknown[] = [mid]
      let dateFilter = ''
      if (safeFrom) { params.push(safeFrom); dateFilter += ` AND f.date_emission >= $${params.length}` }
      if (safeTo)   { params.push(safeTo);   dateFilter += ` AND f.date_emission <= $${params.length}` }

      const r = await query(`
        SELECT f.numero, f.date_emission, p.nom, p.prenoms, p.assurance,
               f.montant_total, f.montant_assurance, f.montant_patient,
               f.mode_paiement, f.statut, f.actes
        FROM factures f
        JOIN patients p ON p.id = f.patient_id
        WHERE f.medecin_id = $1${dateFilter}
        ORDER BY f.date_emission DESC
      `, params)

      csv = `Numéro${sep}Date${sep}Nom${sep}Prénoms${sep}Assureur${sep}Total (FCFA)${sep}Part assurance${sep}Part patient${sep}Mode paiement${sep}Statut${sep}Actes\n`
      csv += r.rows.map(row =>
        [row.numero, row.date_emission?.toISOString?.().slice(0,10) || row.date_emission,
         row.nom, row.prenoms, row.assurance || 'Aucun',
         row.montant_total, row.montant_assurance, row.montant_patient,
         row.mode_paiement, row.statut,
         Array.isArray(row.actes) ? row.actes.join(' + ') : (row.actes || '')]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(sep)
      ).join('\n')

    } else if (type === 'patients') {
      const r = await query(`
        SELECT numero_dossier, nom, prenoms, date_naissance, sexe,
               telephone, assurance, adresse, created_at
        FROM patients WHERE medecin_id = $1 ORDER BY nom, prenoms
      `, [mid])

      csv = `Dossier${sep}Nom${sep}Prénoms${sep}Date naissance${sep}Sexe${sep}Téléphone${sep}Assureur${sep}Adresse${sep}Date création\n`
      csv += r.rows.map(row =>
        [row.numero_dossier, row.nom, row.prenoms,
         row.date_naissance?.toISOString?.().slice(0,10) || row.date_naissance,
         row.sexe, row.telephone, row.assurance || '', row.adresse || '',
         row.created_at?.toISOString?.().slice(0,10) || '']
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(sep)
      ).join('\n')

    } else if (type === 'rdv') {
      const params: unknown[] = [mid]
      let dateFilter = ''
      if (safeFrom) { params.push(safeFrom); dateFilter += ` AND r.date >= $${params.length}` }
      if (safeTo)   { params.push(safeTo);   dateFilter += ` AND r.date <= $${params.length}` }

      const r = await query(`
        SELECT r.date, r.heure, p.nom, p.prenoms, r.motif,
               r.type_rdv, r.statut, r.duree_minutes
        FROM rendez_vous r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.medecin_id = $1${dateFilter}
        ORDER BY r.date DESC, r.heure DESC
      `, params)

      csv = `Date${sep}Heure${sep}Nom${sep}Prénoms${sep}Motif${sep}Type${sep}Statut${sep}Durée (min)\n`
      csv += r.rows.map(row =>
        [row.date?.toISOString?.().slice(0,10) || row.date,
         row.heure, row.nom, row.prenoms, row.motif || '',
         row.type_rdv, row.statut, row.duree_minutes]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(sep)
      ).join('\n')
    }

    const filename = `curae_${type}_${new Date().toISOString().slice(0,10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('﻿' + csv) // BOM for Excel
  } catch (err) {
    console.error('[Export CSV]', err)
    res.status(500).json({ error: 'Erreur export' })
  }
})

export default router
