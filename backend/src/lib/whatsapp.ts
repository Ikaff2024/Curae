import dotenv from 'dotenv'
dotenv.config()

const WA_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
const WA_API = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`

// ── Types ─────────────────────────────────────────────────────────────
export type TypeMessage =
  | 'confirmation_rdv'
  | 'rappel_rdv'
  | 'annulation_rdv'
  | 'resultat_disponible'
  | 'message_libre'

interface Patient {
  nom: string
  prenoms: string
  whatsapp: string
}

interface RDV {
  date: string
  heure: string
  duree_minutes?: number
  motif?: string
}

// ── Formatage date/heure ─────────────────────────────────────────────
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

function fmtDate(s: string): string {
  const d = new Date(s)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

function normaliserTel(tel: string): string {
  // Convertir +225 07 12 34 56 → 22507123456
  return tel.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '')
}

// ── Templates messages ────────────────────────────────────────────────
export function genererMessage(type: TypeMessage, patient: Patient, rdv?: RDV, extras?: Record<string,string>): string {
  const prenom = patient.prenoms.split(' ')[0]

  switch (type) {
    case 'confirmation_rdv':
      return [
        `Bonjour ${prenom} 👋`,
        ``,
        `✅ Votre rendez-vous est *confirmé* :`,
        `📅 ${fmtDate(rdv!.date)}`,
        `🕐 ${rdv!.heure}`,
        rdv!.motif ? `📋 ${rdv!.motif}` : '',
        ``,
        `📍 Cabinet Dr. Koné Awa`,
        `Cocody, Riviera 2, Abidjan`,
        ``,
        `En cas d'empêchement, merci de nous prévenir au moins 24h à l'avance.`,
        ``,
        `À bientôt 🫀 _Curaé_`,
      ].filter(l => l !== null).join('\n')

    case 'rappel_rdv':
      return [
        `Bonjour ${prenom} 👋`,
        ``,
        `🔔 *Rappel* — Vous avez un rendez-vous *demain* :`,
        `📅 ${fmtDate(rdv!.date)}`,
        `🕐 ${rdv!.heure}`,
        rdv!.motif ? `📋 ${rdv!.motif}` : '',
        ``,
        `📍 Cabinet Dr. Koné Awa · Cocody, Riviera 2`,
        ``,
        `Merci de confirmer votre présence en répondant *OUI* à ce message.`,
        ``,
        `_Curaé · Cabinet Dr. Koné Awa_`,
      ].filter(l => l !== null).join('\n')

    case 'annulation_rdv':
      return [
        `Bonjour ${prenom},`,
        ``,
        `Votre rendez-vous du *${fmtDate(rdv!.date)}* à *${rdv!.heure}* a été annulé.`,
        ``,
        `Pour prendre un nouveau rendez-vous, contactez-nous :`,
        `📞 +225 07 00 00 00`,
        ``,
        `_Cabinet Dr. Koné Awa_`,
      ].join('\n')

    case 'resultat_disponible':
      return [
        `Bonjour ${prenom} 👋`,
        ``,
        `📋 Votre *compte-rendu médical* est disponible.`,
        extras?.type_cr ? `Type : ${extras.type_cr}` : '',
        ``,
        `Vous pouvez le récupérer au cabinet ou nous demander de vous l'envoyer.`,
        ``,
        `_Dr. Koné Awa · Cardiologue · Curaé_`,
      ].filter(l => l !== null).join('\n')

    case 'message_libre':
      return extras?.texte || `Bonjour ${prenom}, message du cabinet Dr. Koné Awa.`

    default:
      return `Bonjour ${prenom}, message du cabinet Dr. Koné Awa.`
  }
}

// ── Envoi WhatsApp ───────────────────────────────────────────────────
export async function envoyerWhatsApp(
  patient: Patient,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string; simule?: boolean }> {

  // Mode simulation si pas de token configuré
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp SIMULATION] → ${patient.whatsapp}`)
    console.log(message)
    return { success: true, messageId: `sim_${Date.now()}`, simule: true }
  }

  const tel = normaliserTel(patient.whatsapp)
  if (!tel || tel.length < 10) {
    return { success: false, error: 'Numéro WhatsApp invalide' }
  }

  try {
    const res = await fetch(WA_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: tel,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    })

    const data = await res.json() as any as any
    if (!res.ok) {
      console.error('[WhatsApp Error]', data)
      return { success: false, error: data.error?.message || 'Erreur API WhatsApp' }
    }

    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (err: any) {
    console.error('[WhatsApp Network Error]', err)
    return { success: false, error: err.message }
  }
}

// ── Fonctions métier ─────────────────────────────────────────────────
export async function envoyerConfirmation(patient: Patient, rdv: RDV) {
  const msg = genererMessage('confirmation_rdv', patient, rdv)
  return envoyerWhatsApp(patient, msg)
}

export async function envoyerRappel(patient: Patient, rdv: RDV) {
  const msg = genererMessage('rappel_rdv', patient, rdv)
  return envoyerWhatsApp(patient, msg)
}

export async function envoyerAnnulation(patient: Patient, rdv: RDV) {
  const msg = genererMessage('annulation_rdv', patient, rdv)
  return envoyerWhatsApp(patient, msg)
}

export async function envoyerResultatDisponible(patient: Patient, typeCR: string) {
  const msg = genererMessage('resultat_disponible', patient, undefined, { type_cr: typeCR })
  return envoyerWhatsApp(patient, msg)
}
