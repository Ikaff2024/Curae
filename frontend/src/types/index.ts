export type Sexe = 'M' | 'F'

export type StatutPatient = 'actif' | 'inactif'

export type Assureur = 'NSIA' | 'Allianz' | 'Sanlam' | 'AXA' | 'Autre' | 'Aucun'

export interface Patient {
  id: string
  numeroDossier: string
  nom: string
  prenoms: string
  dateNaissance: string
  sexe: Sexe
  telephone: string
  whatsapp?: string
  email?: string
  assureur: Assureur
  numeroAssurance?: string
  adresse?: string
  profession?: string
  personneUrgence?: {
    nom: string
    telephone: string
    lien: string
  }
  antecedents?: string
  statut: StatutPatient
  dateCreation: string
  dernierRdv?: string
  prochainRdv?: string
}

export interface RendezVous {
  id: string
  patientId: string
  patient?: Patient
  date: string
  heure: string
  dureeMinutes: number
  motif: string
  statut: 'confirme' | 'en_attente' | 'annule' | 'honore'
  notes?: string
}

export interface Acte {
  id: string
  code: string
  libelle: string
  prixBase: number
}
