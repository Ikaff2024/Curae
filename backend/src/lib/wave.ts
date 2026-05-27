import dotenv from 'dotenv'
dotenv.config()

const WAVE_API_KEY = process.env.WAVE_API_KEY || ''
const WAVE_API_URL = 'https://api.wave.com/v1'

// ── Types ─────────────────────────────────────────────────────────────
export type PlanAbonnement = 'solo' | 'cabinet'

export interface Plan {
  id: PlanAbonnement
  nom: string
  prix_fcfa: number
  description: string
  fonctionnalites: string[]
}

export interface PaiementWave {
  checkout_url: string
  wave_launch_url: string
  id: string
  amount: number
  currency: string
  client_reference: string
}

export interface Abonnement {
  medecin_id: string
  plan: PlanAbonnement
  statut: 'actif' | 'expire' | 'annule' | 'essai'
  date_debut: string
  date_fin: string
  wave_ref?: string
}

// ── Plans tarifaires ─────────────────────────────────────────────────
export const PLANS: Record<PlanAbonnement, Plan> = {
  solo: {
    id: 'solo',
    nom: 'Cabinet Solo',
    prix_fcfa: 35000,
    description: 'Pour un médecin seul',
    fonctionnalites: [
      'Patients illimités',
      'Agenda + rappels WhatsApp',
      'Comptes-rendus structurés',
      'Facturation assureurs',
      'Export PDF',
      'Support par WhatsApp',
    ],
  },
  cabinet: {
    id: 'cabinet',
    nom: 'Cabinet + Secrétaire',
    prix_fcfa: 65000,
    description: 'Pour médecin + secrétaire',
    fonctionnalites: [
      'Tout du plan Solo',
      '2 comptes utilisateurs',
      'Génération CR par IA',
      'Dashboard financier avancé',
      'Rappels automatiques',
      'Support prioritaire',
    ],
  },
}

// ── Créer un paiement Wave ────────────────────────────────────────────
export async function creerPaiement(
  medecin_id: string,
  plan: PlanAbonnement,
  telephone_client?: string
): Promise<PaiementWave & { simule?: boolean }> {

  const planInfo = PLANS[plan]
  const ref = `curae-${plan}-${medecin_id.slice(0, 8)}-${Date.now()}`

  // Mode simulation si pas de clé
  if (!WAVE_API_KEY) {
    console.log(`[Wave SIMULATION] Paiement ${planInfo.prix_fcfa} FCFA — ref: ${ref}`)
    return {
      checkout_url: `https://pay.wave.com/m/curae_demo?amount=${planInfo.prix_fcfa}&ref=${ref}`,
      wave_launch_url: `wave://pay/checkout/${ref}`,
      id: `sim_${Date.now()}`,
      amount: planInfo.prix_fcfa,
      currency: 'XOF',
      client_reference: ref,
      simule: true,
    }
  }

  const body: any = {
    amount: String(planInfo.prix_fcfa),
    currency: 'XOF',
    error_url: `${process.env.FRONTEND_URL}/abonnement?statut=erreur`,
    success_url: `${process.env.FRONTEND_URL}/abonnement?statut=succes&ref=${ref}`,
    client_reference: ref,
  }

  if (telephone_client) body.client_phone_number = telephone_client

  const res = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json() as any
    throw new Error(err.message || 'Erreur API Wave')
  }

  const data = await res.json() as any
  return {
    checkout_url: data.wave_launch_url || data.checkout_url,
    wave_launch_url: data.wave_launch_url,
    id: data.id,
    amount: planInfo.prix_fcfa,
    currency: 'XOF',
    client_reference: ref,
  }
}

// ── Vérifier statut d'un paiement ────────────────────────────────────
export async function verifierPaiement(session_id: string): Promise<{
  statut: 'complete' | 'pending' | 'failed'
  montant?: number
  ref?: string
}> {
  if (!WAVE_API_KEY || session_id.startsWith('sim_')) {
    return { statut: 'complete', montant: 35000, ref: session_id }
  }

  const res = await fetch(`${WAVE_API_URL}/checkout/sessions/${session_id}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  })

  if (!res.ok) return { statut: 'failed' }

  const data = await res.json() as any
  return {
    statut: data.payment_status === 'succeeded' ? 'complete' : data.payment_status === 'processing' ? 'pending' : 'failed',
    montant: data.amount,
    ref: data.client_reference,
  }
}

// ── Calculer date de fin d'abonnement ────────────────────────────────
export function calculerDateFin(dateDebut: Date = new Date()): Date {
  const fin = new Date(dateDebut)
  fin.setMonth(fin.getMonth() + 1)
  return fin
}
