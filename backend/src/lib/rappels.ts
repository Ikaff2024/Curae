import { query } from './db'
import { envoyerRappel } from './whatsapp'

/**
 * Envoie les rappels WhatsApp J-1 pour tous les RDV du lendemain
 * confirmés et non encore rappelés.
 *
 * Appeler via cron tous les jours à 18h00 :
 * 0 18 * * * ts-node /path/to/curae/backend/src/lib/rappels.ts
 */
export async function lancerRappels(): Promise<{ envoyes: number; erreurs: number }> {
  console.log(`[Rappels] Démarrage — ${new Date().toISOString()}`)

  // RDV de demain, confirmés, avec patient ayant un numéro WhatsApp, pas encore rappelés
  const result = await query(`
    SELECT
      r.id AS rdv_id,
      r.date, r.heure, r.motif,
      p.nom, p.prenoms, p.whatsapp
    FROM rendez_vous r
    JOIN patients p ON p.id = r.patient_id
    WHERE r.date = CURRENT_DATE + INTERVAL '1 day'
      AND r.statut = 'confirme'
      AND r.rappel_envoye = false
      AND p.whatsapp IS NOT NULL
      AND p.whatsapp != ''
    ORDER BY r.heure
  `)

  let envoyes = 0
  let erreurs = 0

  for (const rdv of result.rows) {
    try {
      const res = await envoyerRappel(
        { nom: rdv.nom, prenoms: rdv.prenoms, whatsapp: rdv.whatsapp },
        { date: rdv.date.toISOString().slice(0, 10), heure: rdv.heure, motif: rdv.motif }
      )

      if (res.success) {
        // Marquer le rappel comme envoyé
        await query(
          `UPDATE rendez_vous SET rappel_envoye = true WHERE id = $1`,
          [rdv.rdv_id]
        )
        envoyes++
        console.log(`[Rappels] ✅ ${rdv.nom} ${rdv.prenoms} — ${rdv.heure}${res.simule ? ' (simulé)' : ''}`)
      } else {
        erreurs++
        console.error(`[Rappels] ❌ ${rdv.nom} — ${res.error}`)
      }
    } catch (err) {
      erreurs++
      console.error(`[Rappels] ❌ Exception pour ${rdv.nom}:`, err)
    }
  }

  console.log(`[Rappels] Terminé — ${envoyes} envoyés, ${erreurs} erreurs`)
  return { envoyes, erreurs }
}

// Exécution directe si appelé comme script
if (require.main === module) {
  lancerRappels()
    .then(r => { console.log(r); process.exit(0) })
    .catch(e => { console.error(e); process.exit(1) })
}
