import { useState, useEffect } from 'react'
import {
  FileText, Calendar, Activity, Heart, Stethoscope,
  ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle,
  AlertCircle, Clock, Pill,
} from 'lucide-react'
import { api } from '../../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string
  type: 'cr' | 'rdv'
  date: string
  titre: string
  type_cr?: string
  sous_titre: string
  conclusion?: string
  traitement?: string
  vitaux?: { pa: string | null; fc: string | null; spo2: string | null }
  meta?: { hba1c: string | null; fraction_ejection: string | null }
  notes?: string
  statut: string
}

// ─── Config visuelle par type CR ─────────────────────────────────────────────

const CR_CONFIG: Record<string, { couleur: string; bg: string; icon: React.ReactNode }> = {
  consultation:         { couleur: '#c0392b', bg: '#fef2f2', icon: <Heart size={14} /> },
  consultation_generale:{ couleur: '#27ae60', bg: '#f0fdf4', icon: <Stethoscope size={14} /> },
  echocardiographie:    { couleur: '#2980b9', bg: '#eff6ff', icon: <Activity size={14} /> },
  holter_ecg:           { couleur: '#8e44ad', bg: '#fdf4ff', icon: <Activity size={14} /> },
  holter_ta:            { couleur: '#16a085', bg: '#f0fdfa', icon: <Activity size={14} /> },
  epreuve_effort:       { couleur: '#e67e22', bg: '#fff7ed', icon: <Activity size={14} /> },
  gynecologie:          { couleur: '#e91e8c', bg: '#fdf0f7', icon: <Heart size={14} /> },
  pediatrie:            { couleur: '#f39c12', bg: '#fffbeb', icon: <Heart size={14} /> },
  diabetologie:         { couleur: '#1abc9c', bg: '#f0fdfa', icon: <Activity size={14} /> },
}

const STATUT_RDV_ICON: Record<string, React.ReactNode> = {
  confirme: <CheckCircle size={12} color="#0f6e56" />,
  honore:   <CheckCircle size={12} color="#1a6b3a" />,
  annule:   <XCircle size={12} color="#dc2626" />,
  no_show:  <AlertCircle size={12} color="#f59e0b" />,
  en_attente: <Clock size={12} color="#a06010" />,
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: 'e1', type: 'cr', date: '2025-05-15T10:00:00',
    titre: 'Consultation cardio', type_cr: 'consultation',
    sous_titre: 'Contrôle tensionnel trimestriel',
    conclusion: 'PA mieux contrôlée. Poursuite du traitement actuel. Réévaluation dans 3 mois.',
    traitement: 'Amlodipine 5 mg, Xarelto 20 mg/j',
    vitaux: { pa: '138/86', fc: '74', spo2: '97' },
    meta: { hba1c: null, fraction_ejection: null },
    statut: 'finalise',
  },
  {
    id: 'e2', type: 'rdv', date: '2025-05-15T10:00:00',
    titre: 'Rendez-vous', sous_titre: 'Consultation de contrôle',
    statut: 'honore',
  },
  {
    id: 'e3', type: 'cr', date: '2025-02-20T09:30:00',
    titre: 'Holter ECG', type_cr: 'holter_ecg',
    sous_titre: 'Palpitations rapportées — évaluation Holter 24h',
    conclusion: 'FA chronique confirmée. Activité ventriculaire sans caractère menaçant.',
    traitement: 'Xarelto 20 mg/j',
    vitaux: { pa: '142/90', fc: '80', spo2: '96' },
    meta: { hba1c: null, fraction_ejection: null },
    statut: 'finalise',
  },
  {
    id: 'e4', type: 'cr', date: '2024-11-10T11:00:00',
    titre: 'Consultation cardio', type_cr: 'consultation',
    sous_titre: 'Introduction anticoagulant — FA diagnostiquée',
    conclusion: 'Introduction Xarelto 20 mg/j. Bilan biologique dans 1 mois.',
    traitement: 'Xarelto 20 mg/j débuté ce jour',
    vitaux: { pa: '155/96', fc: '88', spo2: '95' },
    meta: { hba1c: null, fraction_ejection: null },
    statut: 'finalise',
  },
  {
    id: 'e5', type: 'cr', date: '2024-08-05T09:00:00',
    titre: 'Échocardiographie', type_cr: 'echocardiographie',
    sous_titre: 'Bilan HTA — évaluation cardiaque',
    conclusion: 'FE conservée à 60%. Légère hypertrophie ventriculaire gauche. Pas de valvulopathie.',
    vitaux: { pa: '160/100', fc: '82', spo2: '97' },
    meta: { hba1c: null, fraction_ejection: '60' },
    statut: 'finalise',
  },
]

// ─── Composant EventCard ──────────────────────────────────────────────────────

function EventCard({ event, expanded, onToggle }: {
  event: TimelineEvent
  expanded: boolean
  onToggle: () => void
}) {
  const isCR = event.type === 'cr'
  const cfg = isCR ? (CR_CONFIG[event.type_cr || ''] || CR_CONFIG['consultation_generale']) : null
  const couleur = cfg?.couleur || '#888'
  const bg = cfg?.bg || '#f9f9f9'

  const dateObj = new Date(event.date)
  const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const heureStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const hasDetail = !!(event.conclusion || event.traitement || event.notes)

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `1.5px solid ${expanded ? couleur + '60' : '#e8e8e4'}`,
      overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* En-tête */}
      <div
        onClick={hasDetail ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', cursor: hasDetail ? 'pointer' : 'default',
        }}
      >
        {/* Icone type */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: couleur, border: `1.5px solid ${couleur}30`,
        }}>
          {isCR ? (cfg?.icon || <FileText size={14} />) : <Calendar size={14} color="#888" />}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: couleur }}>
              {event.titre}
            </span>
            {!isCR && event.statut && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                {STATUT_RDV_ICON[event.statut]}
                <span style={{ color: '#888' }}>{event.statut}</span>
              </span>
            )}
            {isCR && event.statut === 'finalise' && (
              <span style={{ fontSize: 10, background: '#e8f4f0', color: '#0f6e56', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                Finalisé
              </span>
            )}
          </div>
          {event.sous_titre && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, lineHeight: 1.4 }}>
              {event.sous_titre}
            </div>
          )}

          {/* Vitaux inline */}
          {isCR && event.vitaux && (event.vitaux.pa || event.vitaux.fc || event.vitaux.spo2) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {event.vitaux.pa && (
                <span style={{ fontSize: 11, color: '#555', background: '#f3f4f6', padding: '1px 7px', borderRadius: 8 }}>
                  PA {event.vitaux.pa} mmHg
                </span>
              )}
              {event.vitaux.fc && (
                <span style={{ fontSize: 11, color: '#555', background: '#f3f4f6', padding: '1px 7px', borderRadius: 8 }}>
                  FC {event.vitaux.fc} bpm
                </span>
              )}
              {event.vitaux.spo2 && (
                <span style={{ fontSize: 11, color: '#555', background: '#f3f4f6', padding: '1px 7px', borderRadius: 8 }}>
                  SpO₂ {event.vitaux.spo2}%
                </span>
              )}
              {event.meta?.fraction_ejection && (
                <span style={{ fontSize: 11, color: '#2980b9', background: '#eff6ff', padding: '1px 7px', borderRadius: 8 }}>
                  FE {event.meta.fraction_ejection}%
                </span>
              )}
              {event.meta?.hba1c && (
                <span style={{ fontSize: 11, color: '#8b5cf6', background: '#ede9fe', padding: '1px 7px', borderRadius: 8 }}>
                  HbA1c {event.meta.hba1c}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Date + toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>{dateStr}</span>
          <span style={{ fontSize: 10, color: '#bbb' }}>{heureStr}</span>
          {hasDetail && (
            <span style={{ color: '#bbb' }}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          )}
        </div>
      </div>

      {/* Détails expandus */}
      {expanded && hasDetail && (
        <div style={{
          padding: '0 16px 14px 60px',
          display: 'flex', flexDirection: 'column', gap: 8,
          borderTop: `1px solid ${couleur}20`,
        }}>
          {event.conclusion && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                Conclusion
              </div>
              <div style={{ fontSize: 12.5, color: '#333', lineHeight: 1.6 }}>{event.conclusion}</div>
            </div>
          )}
          {event.traitement && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              padding: '7px 10px', background: '#fef3c7', borderRadius: 7,
              fontSize: 12, color: '#92400e',
            }}>
              <Pill size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <div><strong>Traitement prescrit :</strong> {event.traitement}</div>
            </div>
          )}
          {event.notes && (
            <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>{event.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  patientId: string
}

export default function PatientTimeline({ patientId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filtre, setFiltre] = useState<'tous' | 'cr' | 'rdv'>('tous')

  useEffect(() => {
    api.patients.timeline(patientId)
      .then(r => setEvents(r.events || []))
      .catch(() => setEvents(DEMO_EVENTS))
      .finally(() => setLoading(false))
  }, [patientId])

  function toggleExpanded(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filtres = events.filter(e => filtre === 'tous' || e.type === filtre)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: '#888', fontSize: 13 }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      Chargement de l'historique…
    </div>
  )

  if (events.length === 0) return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: '#888', fontSize: 13 }}>
      Aucun événement — l'historique s'enrichira à chaque consultation.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['tous', 'cr', 'rdv'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1.5px solid',
              borderColor: filtre === f ? '#0f6e56' : '#e0e0da',
              background: filtre === f ? '#0f6e56' : 'transparent',
              color: filtre === f ? '#fff' : '#888',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {f === 'tous' ? `Tout (${events.length})` : f === 'cr' ? `CRs (${events.filter(e => e.type === 'cr').length})` : `RDV (${events.filter(e => e.type === 'rdv').length})`}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Ligne verticale */}
        <div style={{
          position: 'absolute', left: 15, top: 8, bottom: 8, width: 2,
          background: 'linear-gradient(to bottom, #0f6e56, #e0e0da)',
          borderRadius: 2,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 34 }}>
          {filtres.map(event => (
            <div key={event.id} style={{ position: 'relative' }}>
              {/* Point sur la ligne */}
              <div style={{
                position: 'absolute', left: -26, top: 17,
                width: 10, height: 10, borderRadius: '50%',
                background: event.type === 'cr'
                  ? (CR_CONFIG[event.type_cr || '']?.couleur || '#0f6e56')
                  : '#88a',
                border: '2px solid #fff',
                boxShadow: '0 0 0 2px ' + (event.type === 'cr'
                  ? (CR_CONFIG[event.type_cr || '']?.couleur || '#0f6e56') + '40'
                  : '#88a40'),
              }} />
              <EventCard
                event={event}
                expanded={!!expanded[event.id]}
                onToggle={() => toggleExpanded(event.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
