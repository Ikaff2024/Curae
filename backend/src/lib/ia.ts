import dotenv from 'dotenv'
dotenv.config()

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const MODEL = 'claude-opus-4-5'

export type TypeCR =
  | 'consultation' | 'consultation_generale'
  | 'echocardiographie' | 'holter_ecg' | 'holter_ta' | 'epreuve_effort'
  | 'gynecologie' | 'pediatrie' | 'diabetologie'

// ── Types ─────────────────────────────────────────────────────────────
interface DonneesCR {
  type_cr: string
  patient: {
    nom: string
    prenoms: string
    age: number
    sexe: string
    antecedents?: string
  }
  motif?: string
  anamnese?: string
  examen_clinique?: string
  pa_droite?: string
  pa_gauche?: string
  fc?: string
  spo2?: string
  donnees_specialisees?: Record<string, any>
}

interface ResultatIA {
  conclusion: string
  traitement?: string
  recommandations?: string
  tokens_utilises?: number
  simule?: boolean
}

// ── Prompts par type de CR ────────────────────────────────────────────
function construirePrompt(donnees: DonneesCR): string {
  const { patient, type_cr, motif, anamnese, examen_clinique, pa_droite, pa_gauche, fc, spo2, donnees_specialisees } = donnees
  const d = donnees_specialisees || {}

  const specialiteContexte: Record<string, string> = {
    gynecologie:       'gynécologue-obstétricien à Abidjan, spécialisé en suivi de grossesse et pathologies gynécologiques en contexte africain (paludisme gestationnel, anémie, grossesses à risque)',
    pediatrie:         'pédiatre à Abidjan, spécialisé dans le suivi de la croissance et du développement de l\'enfant en contexte ivoirien (malnutrition, paludisme, infections respiratoires)',
    diabetologie:      'diabétologue à Abidjan, spécialisé dans la prise en charge du diabète en Afrique subsaharienne (diabète type 2 prédominant, complications précoces, accès limité à l\'insuline)',
    consultation_generale: 'médecin généraliste à Abidjan, prenant en charge des pathologies courantes en milieu africain',
  }
  const specialite = specialiteContexte[type_cr] || 'cardiologue à Abidjan, Côte d\'Ivoire, expert en pathologies cardiovasculaires en contexte africain (HTA, cardiopathies du paludisme, rhumatismales)'

  const contexte = `
Tu es Dr. Koné Awa, ${specialite}.
Tu rédiges un compte-rendu médical professionnel en français.
Ton style est précis, concis, et adapté au contexte africain (accès limité à certains équipements, médicaments disponibles localement).
`.trim()

  const patientInfo = `
Patient: ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans
Antécédents: ${patient.antecedents || 'Aucun antécédent notable'}
Motif: ${motif || 'Consultation de suivi'}
`.trim()

  const constantes = `
Constantes: PA droite ${pa_droite || '—'} mmHg | PA gauche ${pa_gauche || '—'} mmHg | FC ${fc || '—'} bpm | SpO2 ${spo2 || '—'}%
`.trim()

  let donneesSpecifiques = ''

  if (type_cr === 'echocardiographie' && d) {
    donneesSpecifiques = `
Échocardiographie:
- VG: DTD ${d.vg_dtd || '—'} mm / DTS ${d.vg_dts || '—'} mm / FE ${d.fraction_ejection || '—'}%
- Parois: septum ${d.septum || '—'} mm / paroi post ${d.paroi_post || '—'} mm
- OG: ${d.oreillette_gauche || '—'} mm / Aorte: ${d.aorte || '—'} mm
- Valve mitrale: ${d.valve_mitrale || '—'}
- Valve aortique: ${d.valve_aortique || '—'}
- Péricarde: ${d.pericarde || '—'}
- Conclusion echo partielle: ${d.conclusion_echo || 'À compléter'}
`.trim()
  }

  if ((type_cr === 'holter_ecg' || type_cr === 'holter_ta') && d) {
    donneesSpecifiques = `
Holter ${type_cr === 'holter_ecg' ? 'ECG' : 'tensionnel'}:
- Durée: ${d.duree || '—'}
- FC: moy ${d.frequence_moy || '—'} / min ${d.frequence_min || '—'} / max ${d.frequence_max || '—'} bpm
- Pauses: ${d.pausess || '—'}
- ESV: ${d.extrasystoles_v || '—'}
- ESSV: ${d.extrasystoles_sv || '—'}
- Troubles conduction: ${d.troubles_conduction || 'Aucun'}
- Conclusion initiale: ${d.conclusion_holter || 'À compléter'}
`.trim()
  }

  if (type_cr === 'epreuve_effort' && d) {
    donneesSpecifiques = `
Épreuve d'effort:
- Protocole: ${d.protocole || '—'} / Durée: ${d.duree_effort || '—'} / FC max: ${d.fc_max || '—'} bpm / METs: ${d.mets || '—'}
- TA repos/effort: ${d.ta_repos || '—'} → ${d.ta_effort || '—'}
- ST: sus-décalage ${d.sus_decalage || 'aucun'} / sous-décalage ${d.sous_decalage || 'aucun'}
- Symptômes: ${d.symptomes || 'Aucun symptôme rapporté'}
`.trim()
  }

  if (type_cr === 'gynecologie' && d) {
    donneesSpecifiques = `
Examen gynécologique:
- DDR: ${d.ddr || '—'} / Terme: ${d.terme || '—'} SA
- Hauteur utérine: ${d.hauteur_uterine || '—'} cm
- Bruits du cœur fœtal: ${d.bcf || '—'} bpm
- Présentation: ${d.presentation || '—'}
- Toucher vaginal: ${d.toucher_vaginal || '—'}
- Échographie obstétricale: ${d.echo_obstetricale || '—'}
- NFS / Groupe sanguin: ${d.nfs_groupe || '—'}
- Protéinurie: ${d.proteinurie || '—'}
`.trim()
  }

  if (type_cr === 'pediatrie' && d) {
    donneesSpecifiques = `
Examen pédiatrique:
- Poids: ${d.poids || '—'} kg / Taille: ${d.taille || '—'} cm / PC: ${d.perimetre_cranien || '—'} cm
- Courbe de croissance: ${d.courbe_croissance || '—'} (percentile OMS)
- Développement psychomoteur: ${d.dev_psychomoteur || '—'}
- Vaccins à jour: ${d.vaccins || '—'}
- Alimentation: ${d.alimentation || '—'}
- Motif pédiatrique: ${d.motif_pediatrique || motif || '—'}
`.trim()
  }

  if (type_cr === 'diabetologie' && d) {
    donneesSpecifiques = `
Bilan diabétologique:
- HbA1c: ${d.hba1c || '—'}% / Glycémie à jeun: ${d.glycemie_jeun || '—'} g/L
- Glycémie post-prandiale: ${d.glycemie_pp || '—'} g/L
- Créatinine: ${d.creatinine || '—'} µmol/L / DFG: ${d.dfg || '—'} mL/min
- Microalbuminurie: ${d.microalbuminurie || '—'}
- Examen des pieds: ${d.examen_pieds || '—'}
- Neuropathie: ${d.neuropathie || '—'}
- Fond d'œil: ${d.fond_oeil || '—'}
- Traitement actuel: ${d.traitement_diabete || '—'}
`.trim()
  }

  return `
${contexte}

${patientInfo}
${anamnese ? `\nAnamnèse: ${anamnese}` : ''}
${examen_clinique ? `\nExamen clinique: ${examen_clinique}` : ''}
${constantes}
${donneesSpecifiques ? `\n${donneesSpecifiques}` : ''}

---

Rédige les 3 sections suivantes du compte-rendu en JSON STRICT (sans markdown, sans commentaire) :
{
  "conclusion": "texte de conclusion médicale structuré (3-6 phrases, style professionnel)",
  "traitement": "proposition thérapeutique adaptée (médicaments avec posologies si pertinent)",
  "recommandations": "recommandations hygiéno-diététiques et de suivi (3-5 points)"
}

Adapte le contenu au contexte ivoirien : médicaments disponibles en Côte d'Ivoire, recommandations réalistes.
Ne génère rien d'autre que le JSON.
`.trim()
}

// ── Appel API Claude ──────────────────────────────────────────────────
export async function genererCR(donnees: DonneesCR): Promise<ResultatIA> {

  // Mode simulation si pas de clé
  if (!ANTHROPIC_KEY) {
    console.log('[IA] Mode simulation — pas de clé ANTHROPIC_API_KEY')
    return genererCRSimule(donnees)
  }

  const prompt = construirePrompt(donnees)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json() as any
      throw new Error(err.error?.message || 'Erreur API Claude')
    }

    const data = await res.json() as any
    const texte = data.content?.[0]?.text || ''

    // Parser le JSON retourné
    const parsed = JSON.parse(texte.trim())

    return {
      conclusion: parsed.conclusion || '',
      traitement: parsed.traitement || '',
      recommandations: parsed.recommandations || '',
      tokens_utilises: data.usage?.output_tokens,
    }
  } catch (err: any) {
    console.error('[IA] Erreur génération CR:', err.message)
    // Fallback sur simulation en cas d'erreur
    return genererCRSimule(donnees)
  }
}

// ── Simulation IA (quand pas de clé API) ─────────────────────────────
function genererCRSimule(donnees: DonneesCR): ResultatIA {
  const { type_cr, patient, donnees_specialisees: d } = donnees

  const simulations: Record<string, ResultatIA> = {
    echocardiographie: {
      conclusion: `Échocardiographie transthoracique réalisée chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans. La fonction systolique du ventricule gauche est conservée avec une fraction d'éjection à ${d?.fraction_ejection || '60'}%. Les cavités cardiaques sont de dimensions normales. Absence d'épanchement péricardique. Pas de valvulopathie significative identifiée.`,
      traitement: `Poursuite du traitement en cours. Adaptation thérapeutique selon les résultats cliniques et biologiques. Contrôle tensionnel strict si HTA associée (objectif < 130/80 mmHg).`,
      recommandations: `Régime hyposodé strict (< 6g NaCl/j). Activité physique modérée adaptée (marche 30 min/j). Éviction des facteurs de risque cardiovasculaire (tabac, alcool). Contrôle biologique dans 3 mois (NFS, ionogramme, créatinémie, bilan lipidique). Consulter en urgence si douleur thoracique, dyspnée ou palpitations.`,
      simule: true,
    },
    holter_ecg: {
      conclusion: `Holter ECG de 24h réalisé chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom}. Rythme sinusal de base. Fréquence cardiaque moyenne à ${d?.frequence_moy || '72'} bpm. Quelques extrasystoles ventriculaires isolées sans caractère malin. Pas de pause significative ni de trouble conductif notable. Examen dans les limites de la normale pour l'âge.`,
      traitement: `Surveillance clinique. Pas de modification thérapeutique urgente nécessaire. Poursuite du traitement antihypertenseur si indiqué.`,
      recommandations: `Limiter les excitants (café, thé fort, boissons énergisantes). Gestion du stress. Contrôle ECG en cas de palpitations ou malaise. Réévaluation dans 6 mois ou si aggravation symptomatique.`,
      simule: true,
    },
    holter_ta: {
      conclusion: `Holter tensionnel sur 24h réalisé chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom}. Les mesures tensionnelles diurnes sont en moyenne élevées, compatibles avec une HTA insuffisamment contrôlée en période d'activité. Le profil nocturne montre un bon dipping tensionnel. Ces résultats justifient une révision du traitement antihypertenseur.`,
      traitement: `Adaptation du traitement antihypertenseur : majoration de la posologie de l'Amlodipine à 10mg/j ou ajout d'un IEC (Périndopril 5mg/j). Prise du traitement de préférence le matin. Réévaluation dans 4 à 6 semaines.`,
      recommandations: `Automesure tensionnelle quotidienne (matin et soir, noter les résultats). Régime hyposodé strict. Réduction du stress professionnel. Activité physique régulière. Consultation de suivi dans 6 semaines avec carnet tensionnel.`,
      simule: true,
    },
    epreuve_effort: {
      conclusion: `Épreuve d'effort réalisée selon le protocole ${d?.protocole || 'Bruce'} chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom}. Test arrêté après ${d?.duree_effort || '9 min'} d'effort. Fréquence cardiaque maximale atteinte à ${d?.fc_max || '148'} bpm. Pas de modification ischémique du segment ST. Pas de trouble du rythme induit. Bonne tolérance à l'effort. Test négatif pour une ischémie myocardique d'effort.`,
      traitement: `Pas de traitement spécifique lié à l'épreuve d'effort. Maintien du traitement actuel. Optimisation des facteurs de risque cardiovasculaire.`,
      recommandations: `Programme d'activité physique progressive (marche rapide, natation, vélo — 3 séances/semaine de 45 min). Arrêt du tabac si fumeur. Contrôle du poids et alimentation équilibrée. Contrôle médical annuel recommandé.`,
      simule: true,
    },
    consultation: {
      conclusion: `Consultation cardiologique de ${patient.antecedents ? 'suivi' : 'bilan'} chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans. Examen clinique sans anomalie cardio-vasculaire évidente. Paramètres hémodynamiques dans les valeurs attendues pour l'âge. La situation clinique est stable et ne nécessite pas de modification thérapeutique urgente.`,
      traitement: `Maintien du traitement en cours. Prescription renouvelée pour 3 mois. Contrôle biologique recommandé avant la prochaine consultation.`,
      recommandations: `Suivi régulier tous les 3 à 6 mois. Maintien d'une activité physique adaptée. Régime alimentaire équilibré pauvre en sel et en graisses saturées. Consulter sans délai en cas de symptômes nouveaux (douleur thoracique, palpitations, dyspnée, syncope).`,
      simule: true,
    },
    consultation_generale: {
      conclusion: `Consultation de médecine générale chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans. Examen clinique complet réalisé, situation clinique stable. Pas d'urgence médicale identifiée. Prise en charge adaptée aux plaintes exprimées.`,
      traitement: `Traitement symptomatique prescrit selon la pathologie identifiée. Ordonnance remise au patient. Renouvellement des traitements chroniques si nécessaire.`,
      recommandations: `Suivi médical régulier. Hydratation suffisante. Repos si nécessaire. Revenir en consultation si aggravation ou apparition de nouveaux symptômes. Bilan biologique annuel recommandé.`,
      simule: true,
    },
    gynecologie: {
      conclusion: `Consultation gynécologique chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans. ${d?.terme ? `Grossesse à ${d.terme} SA, évolution satisfaisante.` : 'Examen gynécologique réalisé, pas d\'anomalie majeure identifiée.'} Bruits du cœur fœtal perçus à ${d?.bcf || '—'} bpm. Hauteur utérine concordante avec le terme. Pas de signe d'alerte obstétrical identifié lors de cette consultation.`,
      traitement: `Supplémentation en acide folique et fer à poursuivre. Prévention du paludisme gestationnel (traitement préventif intermittent selon protocole national ivoirien). Consultation programmée dans ${d?.terme && parseInt(d.terme) > 32 ? '2' : '4'} semaines.`,
      recommandations: `Repos relatif, éviter les efforts physiques intenses. Alimentation équilibrée riche en fer et protéines. Moustiquaire imprégnée d'insecticide la nuit. Consultation en urgence si contractions avant terme, saignements, fièvre ou céphalées intenses. Prochaine échographie obstétricale programmée.`,
      simule: true,
    },
    pediatrie: {
      conclusion: `Consultation pédiatrique de ${patient.antecedents ? 'suivi' : 'bilan'} chez ${patient.sexe === 'F' ? 'la petite' : 'le petit'} ${patient.nom} ${patient.prenoms}, ${patient.age} an${patient.age > 1 ? 's' : ''}. Poids ${d?.poids || '—'} kg, taille ${d?.taille || '—'} cm. Développement staturo-pondéral ${d?.courbe_croissance ? `sur le ${d.courbe_croissance} percentile` : 'à évaluer sur les courbes OMS'}. Développement psychomoteur ${d?.dev_psychomoteur || 'adapté à l\'âge'}. Examen clinique sans anomalie majeure.`,
      traitement: `Traitement adapté selon les symptômes présentés. Vitamines et supplémentation selon les carences identifiées. Prévention antipaludéenne adaptée à l'âge.`,
      recommandations: `Alimentation diversifiée adaptée à l'âge, allaitement maternel si possible. Mise à jour du carnet vaccinal selon calendrier national ivoirien. Moustiquaire imprégnée d'insecticide. Consultation de suivi dans ${patient.age < 1 ? '1 mois' : '3 mois'}. Consulter en urgence si fièvre élevée, refus d'alimentation ou détresse respiratoire.`,
      simule: true,
    },
    diabetologie: {
      conclusion: `Consultation diabétologique de suivi chez ${patient.sexe === 'F' ? 'Mme' : 'M.'} ${patient.nom} ${patient.prenoms}, ${patient.age} ans. HbA1c à ${d?.hba1c || '—'}% ${d?.hba1c ? (parseFloat(d.hba1c) > 8 ? '(déséquilibré, objectif < 7%)' : parseFloat(d.hba1c) > 7 ? '(partiellement contrôlé)' : '(objectif atteint)') : ''}. Glycémie à jeun ${d?.glycemie_jeun || '—'} g/L. Fonction rénale : créatinine ${d?.creatinine || '—'} µmol/L, DFG ${d?.dfg || '—'} mL/min. Examen des pieds : ${d?.examen_pieds || 'réalisé, pas de lésion évolutive'}. Pas de complication aiguë identifiée lors de cette consultation.`,
      traitement: `Adaptation thérapeutique selon le déséquilibre glycémique. ${d?.hba1c && parseFloat(d.hba1c) > 8 ? 'Intensification du traitement : majoration de la Metformine ou ajout de Glibenclamide selon tolérance.' : 'Maintien du traitement actuel, bonne tolérance.'} Contrôle de la tension artérielle (objectif < 130/80 mmHg chez le diabétique).`,
      recommandations: `Régime diabétique strict : réduction des sucres rapides et graisses saturées. Activité physique régulière (30 min/j, 5 j/semaine). Autosurveillance glycémique quotidienne. Soins podologiques réguliers. HbA1c de contrôle dans 3 mois. Fond d'œil et microalbuminurie annuels.`,
      simule: true,
    },
  }

  return simulations[type_cr] || simulations.consultation
}
