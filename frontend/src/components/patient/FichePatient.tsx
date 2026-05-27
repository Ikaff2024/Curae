import { useState, useEffect, useCallback } from 'react'
import type { Patient, Assureur, Sexe } from '../../types'
import { patientsDemo } from '../../lib/demo-data'
import { api } from '../../lib/api'
import NouveauPatientForm from './NouveauPatientForm'
import HistoriqueVitaux from './HistoriqueVitaux'
import PatientTimeline from './PatientTimeline'
import ResumeCliniqueModal from './ResumeCliniqueModal'
import OrdonnanceModal from '../cr/OrdonnanceModal'
import {
  Search, User, Phone, Calendar, FileText,
  ChevronRight, Plus, Clock, AlertCircle,
  MessageCircle, X, Stethoscope, Loader2, WifiOff,
  Sparkles, ClipboardList, Activity, ShieldAlert,
} from 'lucide-react'

function mapPatient(p: any): Patient {
  return {
    id: p.id,
    numeroDossier: p.numero_dossier || '',
    nom: p.nom,
    prenoms: p.prenoms,
    dateNaissance: p.date_naissance?.slice(0, 10) || '',
    sexe: (p.sexe || 'M') as Sexe,
    telephone: p.telephone || '',
    whatsapp: p.whatsapp || undefined,
    email: p.email || undefined,
    assureur: (p.assurance || 'Aucun') as Assureur,
    numeroAssurance: p.numero_assurance || undefined,
    adresse: p.adresse || undefined,
    antecedents: p.antecedents || undefined,
    statut: 'actif',
    dateCreation: p.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  }
}

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance)
  const aujourd = new Date()
  let age = aujourd.getFullYear() - naissance.getFullYear()
  const m = aujourd.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--
  return age
}

function formaterDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function badgeAssureur(assureur: string) {
  const couleurs: Record<string, string> = {
    NSIA: '#1a6b3a', Allianz: '#003781', Sanlam: '#e31837',
    AXA: '#00008f', Autre: '#6b6b6b', Aucun: '#9a9a9a',
  }
  return (
    <span style={{
      background: couleurs[assureur] || '#6b6b6b',
      color: '#fff', fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 4,
    }}>
      {assureur}
    </span>
  )
}

// ── Calcul de risque local depuis antécédents ────────────────────────────────

const KEYWORDS_ELEVE = ['xarelto', 'warfarin', 'warfarine', 'eliquis', 'pradaxa',
  'rivaroxaban', 'apixaban', 'dabigatran', 'anticoag', 'fibrillation', 'avc',
  'infarct', 'coronar', 'insuffisance cardiaque']

const KEYWORDS_MODERE = ['hta', 'hypertension', 'diabète', 'diabetes', 'diabetique',
  'diabétique', 'hba1c', 'dyslipidémie', 'dyslipid', 'obésité', 'obese',
  'asthme', 'bpco', 'arythmie', 'fa ', 'insuffisance rénale']

function computeRisqueLocal(patient: Patient): 'eleve' | 'modere' | null {
  const txt = (patient.antecedents || '').toLowerCase()
  if (!txt) return null
  if (KEYWORDS_ELEVE.some(k => txt.includes(k))) return 'eleve'
  if (KEYWORDS_MODERE.filter(k => txt.includes(k)).length >= 2) return 'modere'
  if (KEYWORDS_MODERE.some(k => txt.includes(k))) return 'modere'
  return null
}

function BadgeRisqueCard({ niveau }: { niveau: 'eleve' | 'modere' | null }) {
  if (!niveau) return null
  const isEleve = niveau === 'eleve'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: isEleve ? '#fee2e2' : '#fef3c7',
      color: isEleve ? '#dc2626' : '#92400e',
      border: `1px solid ${isEleve ? '#fca5a5' : '#fcd34d'}`,
    }}>
      <ShieldAlert size={9} />
      {isEleve ? 'Vigilance' : 'Attention'}
    </span>
  )
}

// ── DetailPatient modal avec onglets ─────────────────────────────────────────

interface DetailProps {
  patient: Patient
  onFermer: () => void
  onStartConsultation: (patient: Patient) => void
}

const TABS = [
  { key: 'resume',     label: 'Résumé',    icon: <User size={13} /> },
  { key: 'vitaux',     label: 'Vitaux',    icon: <Activity size={13} /> },
  { key: 'historique', label: 'Historique', icon: <ClipboardList size={13} /> },
] as const

type TabKey = typeof TABS[number]['key']

function DetailPatient({ patient, onFermer, onStartConsultation }: DetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('resume')
  const [showResumeIA, setShowResumeIA] = useState(false)
  const [showOrdonnance, setShowOrdonnance] = useState(false)

  const age = calculerAge(patient.dateNaissance)
  const patientNomComplet = `${patient.nom} ${patient.prenoms}`

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('curae_user') || '{}') } catch { return {} }
  })()
  const medecinNom = [user.prenoms, user.nom].filter(Boolean).join(' ') || 'Médecin'
  const medecinSpecialite = user.specialite || ''

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 24,
      }}>
        <div style={{
          background: 'var(--bg)', borderRadius: 16,
          width: '100%', maxWidth: 700,
          border: '1px solid var(--border)',
          overflow: 'hidden', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--accent)', padding: '20px 26px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16,
              }}>
                {patient.nom[0]}{patient.prenoms[0]}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 19, lineHeight: 1.2 }}>
                    {patientNomComplet}
                  </div>
                  {computeRisqueLocal(patient) && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: computeRisqueLocal(patient) === 'eleve' ? '#dc262680' : '#f59e0b80',
                      color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                      {computeRisqueLocal(patient) === 'eleve' ? '⚠ Vigilance accrue' : '⚡ Attention'}
                    </span>
                  )}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                  {patient.sexe === 'F' ? 'Femme' : 'Homme'} · {age} ans · {patient.numeroDossier}
                </div>
              </div>
            </div>
            <button onClick={onFermer} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Onglets */}
          <div style={{
            display: 'flex', background: '#f7f7f3',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 22px', cursor: 'pointer', border: 'none',
                  background: activeTab === tab.key ? 'var(--bg)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 13, fontFamily: 'inherit',
                  borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'color 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu onglet */}
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            {activeTab === 'resume' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Champ label="Date de naissance" valeur={formaterDate(patient.dateNaissance)} />
                  <Champ label="Téléphone" valeur={patient.telephone} />
                  <Champ
                    label="Assureur"
                    valeur={<>{badgeAssureur(patient.assureur)}{patient.numeroAssurance && <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 6 }}>{patient.numeroAssurance}</span>}</>}
                  />
                  <Champ label="Adresse" valeur={patient.adresse || '—'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <RdvCard label="Dernier RDV" date={patient.dernierRdv} />
                  <RdvCard label="Prochain RDV" date={patient.prochainRdv} highlighted />
                </div>

                {patient.antecedents && (
                  <div style={{
                    background: '#fff8f0', borderRadius: 12, padding: 16,
                    border: '1px solid #f0d0a0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a06010', fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
                      <AlertCircle size={13} /> Antécédents médicaux
                    </div>
                    <div style={{ fontSize: 13.5, color: '#5a3a10', lineHeight: 1.7 }}>
                      {patient.antecedents}
                    </div>
                  </div>
                )}

                {patient.personneUrgence && (
                  <Champ
                    label="Contact urgence"
                    valeur={`${patient.personneUrgence.nom} (${patient.personneUrgence.lien}) — ${patient.personneUrgence.telephone}`}
                  />
                )}

                {!patient.antecedents && !patient.personneUrgence && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>
                    Aucun antécédent renseigné
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vitaux' && (
              <HistoriqueVitaux patientId={patient.id} />
            )}

            {activeTab === 'historique' && (
              <PatientTimeline patientId={patient.id} />
            )}
          </div>

          {/* Actions */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', gap: 8, flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => { onFermer(); onStartConsultation(patient) }}
              style={{
                flex: 1, minWidth: 160,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 16px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <Stethoscope size={15} /> Consultation
            </button>
            <button
              onClick={() => setShowResumeIA(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: '#7c3aed', color: '#fff', border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <Sparkles size={14} /> Résumé IA
            </button>
            <button
              onClick={() => setShowOrdonnance(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: '#1a4a8a', color: '#fff', border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <FileText size={14} /> Ordonnance
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: '#e8f5e8', color: '#25d366', border: '1.5px solid #25d366',
              fontFamily: 'inherit',
            }}>
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      {showResumeIA && (
        <ResumeCliniqueModal
          patientId={patient.id}
          patientNom={patientNomComplet}
          onFermer={() => setShowResumeIA(false)}
        />
      )}

      {showOrdonnance && (
        <OrdonnanceModal
          patientNom={patientNomComplet}
          patientAge={age}
          medecinNom={medecinNom}
          medecinSpecialite={medecinSpecialite}
          onFermer={() => setShowOrdonnance(false)}
        />
      )}
    </>
  )
}

function RdvCard({ label, date, highlighted }: { label: string; date?: string; highlighted?: boolean }) {
  return (
    <div style={{
      background: highlighted && date ? 'var(--accent-light)' : 'var(--surface)',
      borderRadius: 10, padding: 14,
      border: `1px solid ${highlighted && date ? 'rgba(15,110,86,0.3)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
        <Clock size={12} /> {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: highlighted && date ? 'var(--accent)' : 'var(--text)' }}>
        {date ? formaterDate(date) : 'Aucun'}
      </div>
    </div>
  )
}

function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{valeur}</div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

interface FichePatientProps {
  onStartConsultation: (patient: Patient) => void
}

export default function FichePatient({ onStartConsultation }: FichePatientProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [patientSelectionne, setPatientSelectionne] = useState<Patient | null>(null)
  const [showNouveauForm, setShowNouveauForm] = useState(false)

  const chargerPatients = useCallback(async (search?: string) => {
    try {
      const res = await api.patients.list(search)
      setPatients(res.patients.map(mapPatient))
      setOffline(false)
    } catch {
      if (patients.length === 0) {
        setPatients(patientsDemo)
        setOffline(true)
      }
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chargerPatients() }, [chargerPatients])

  const resultats = patients.filter(p => {
    if (!recherche.trim()) return true
    const q = recherche.toLowerCase()
    return (
      p.nom.toLowerCase().includes(q) ||
      p.prenoms.toLowerCase().includes(q) ||
      p.numeroDossier.toLowerCase().includes(q) ||
      p.telephone.includes(q)
    )
  })

  async function handleSauvegarderPatient(patient: Patient) {
    try {
      const res = await api.patients.create({
        nom: patient.nom, prenoms: patient.prenoms,
        date_naissance: patient.dateNaissance, sexe: patient.sexe,
        telephone: patient.telephone, whatsapp: patient.whatsapp,
        assurance: patient.assureur === 'Aucun' ? '' : patient.assureur,
        numero_assurance: patient.numeroAssurance,
        antecedents: patient.antecedents, adresse: patient.adresse,
      })
      setPatients(prev => [mapPatient(res), ...prev])
    } catch {
      setPatients(prev => [patient, ...prev])
    }
    setShowNouveauForm(false)
    setPatientSelectionne(patient)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={28} color="#0f6e56" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div className="dashboard-content" style={{ padding: '28px 36px' }}>
      {offline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 16px', background: '#fef9e7', borderRadius: 10,
          border: '1px solid #f0d080', fontSize: 13, color: '#a06010',
        }}>
          <WifiOff size={14} />
          Mode démo — backend non disponible. Les modifications ne seront pas sauvegardées.
        </div>
      )}

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--muted)',
          }} />
          <input
            type="text"
            placeholder="Rechercher — nom, prénom, numéro de dossier, téléphone…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{
              width: '100%', padding: '13px 16px 13px 44px',
              fontSize: 15, borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {resultats.length} patient{resultats.length > 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowNouveauForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 9, padding: '11px 20px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} /> Nouveau patient
        </button>
      </div>

      {/* Grille patients */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
        {resultats.map(patient => {
          const age = calculerAge(patient.dateNaissance)
          const risque = computeRisqueLocal(patient)
          return (
            <div
              key={patient.id}
              onClick={() => setPatientSelectionne(patient)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '18px 22px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(15,110,86,0.1)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: patient.sexe === 'F' ? '#e8f4f0' : '#e8eef8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: patient.sexe === 'F' ? '#0f6e56' : '#1a4a8a',
                fontWeight: 700, fontSize: 15,
                position: 'relative',
              }}>
                {patient.nom[0]}{patient.prenoms[0]}
                {risque === 'eleve' && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#dc2626', border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} title="Vigilance accrue" />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {patient.nom} {patient.prenoms}
                  </span>
                  {badgeAssureur(patient.assureur)}
                  <BadgeRisqueCard niveau={risque} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--muted)', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> {patient.sexe === 'F' ? 'F' : 'H'} · {age} ans
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={12} /> {patient.telephone}
                  </span>
                </div>
                {patient.prochainRdv && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                    <Calendar size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    RDV prévu · {formaterDate(patient.prochainRdv)}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, fontFamily: 'monospace' }}>
                  {patient.numeroDossier}
                </div>
                {patient.dernierRdv && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Vu le {formaterDate(patient.dernierRdv).split(' ').slice(0, 2).join(' ')}
                  </div>
                )}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            </div>
          )
        })}

        {resultats.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', textAlign: 'center', padding: '64px 0',
            color: 'var(--muted)', fontSize: 15,
          }}>
            Aucun patient trouvé pour "{recherche}"
          </div>
        )}
      </div>

      {patientSelectionne && (
        <DetailPatient
          patient={patientSelectionne}
          onFermer={() => setPatientSelectionne(null)}
          onStartConsultation={onStartConsultation}
        />
      )}

      {showNouveauForm && (
        <NouveauPatientForm
          onFermer={() => setShowNouveauForm(false)}
          onSauvegarder={handleSauvegarderPatient}
        />
      )}
    </div>
  )
}
