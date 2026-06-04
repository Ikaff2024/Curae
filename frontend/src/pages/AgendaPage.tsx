import { useState, useEffect } from 'react'
import { Calendar, Clock, User, CheckCircle, AlertCircle, XCircle, ChevronRight, Plus, Loader2, MessageCircle } from 'lucide-react'
import { patientsDemo, rdvDemo } from '../lib/demo-data'
import { api } from '../lib/api'
import type { RendezVous, Patient } from '../types'
import WhatsAppSendModal from '../components/whatsapp/WhatsAppSendModal'

function mapRdv(r: any): RendezVous & { nom?: string; prenoms?: string; telephone?: string } {
  return {
    id: r.id,
    patientId: r.patient_id,
    date: r.date?.slice(0, 10) || '',
    heure: r.heure?.slice(0, 5) || '',
    dureeMinutes: r.duree_minutes || 30,
    motif: r.motif || '',
    statut: (r.statut || 'confirme') as RendezVous['statut'],
    notes: r.notes || undefined,
    nom: r.nom,
    prenoms: r.prenoms,
    telephone: r.telephone,
  }
}

const STATUT_STYLES: Record<RendezVous['statut'], { bg: string; text: string; border: string; label: string }> = {
  confirme: { bg: '#e8f4f0', text: '#0f6e56', border: '#b0ddd0', label: 'Confirmé' },
  en_attente: { bg: '#fef9e7', text: '#a06010', border: '#f0d080', label: 'En attente' },
  annule: { bg: '#fef2f2', text: '#c0392b', border: '#f0b0b0', label: 'Annulé' },
  honore: { bg: '#f0f9f0', text: '#1a6b3a', border: '#90d0a0', label: 'Honoré' },
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function RdvRow({ rdv, patient, onWhatsApp }: { rdv: RendezVous; patient?: Patient; onWhatsApp?: () => void }) {
  const style = STATUT_STYLES[rdv.statut]
  const Icon = rdv.statut === 'confirme' ? CheckCircle
    : rdv.statut === 'annule' ? XCircle
    : rdv.statut === 'honore' ? CheckCircle
    : AlertCircle

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 1fr auto auto auto',
      alignItems: 'center',
      gap: 16,
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
      cursor: 'pointer',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {/* Heure */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
          {rdv.heure}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rdv.dureeMinutes} min</div>
      </div>

      {/* Infos patient */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          {patient && (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: patient.sexe === 'F' ? '#e8f4f0' : '#e8eef8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: patient.sexe === 'F' ? '#0f6e56' : '#1a4a8a',
              fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {patient.nom[0]}{patient.prenoms[0]}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {patient ? `${patient.nom} ${patient.prenoms}` : 'Patient inconnu'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rdv.motif}</div>
          </div>
        </div>
        {patient && (
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 42 }}>
            <User size={10} /> {patient.telephone}
          </div>
        )}
      </div>

      {/* Statut */}
      <div>
        <span style={{
          background: style.bg, color: style.text,
          border: `1px solid ${style.border}`,
          borderRadius: 20, fontSize: 12, fontWeight: 600,
          padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          <Icon size={11} /> {style.label}
        </span>
      </div>

      {/* WhatsApp */}
      <button
        onClick={e => { e.stopPropagation(); onWhatsApp?.() }}
        title="Envoyer confirmation via WhatsApp"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #25d366',
          cursor: 'pointer', color: '#25d366', flexShrink: 0,
        }}
      >
        <MessageCircle size={15} />
      </button>

      <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
    </div>
  )
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [rdvList, setRdvList] = useState<(RendezVous & { nom?: string; prenoms?: string; telephone?: string })[]>([])
  const [patients, setPatients] = useState<Patient[]>(patientsDemo)
  const [loading, setLoading] = useState(true)
  const [whatsappRdv, setWhatsappRdv] = useState<{ id: string; nom: string; type: 'confirmation' | 'rappel' | 'annulation' } | null>(null)
  const [showNouveauRDV, setShowNouveauRDV] = useState(false)
  const [rdvForm, setRdvForm] = useState({ patientId: '', motif: '', heure: '09:00', dureeMinutes: 30, notes: '' })
  const [rdvSaving, setRdvSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.rdv.list().then(list => setRdvList(list.map(mapRdv))).catch(() => setRdvList(rdvDemo as any)),
      api.patients.list().then(res => setPatients(res.patients)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const weekDays = getWeekDays(currentDate)
  const today = new Date()

  const allRdv = loading ? rdvDemo : rdvList
  const rdvDuJour = allRdv.filter(rdv => isSameDay(new Date(rdv.date), selectedDay))
  const rdvSemaine = allRdv.filter(rdv => {
    const d = new Date(rdv.date)
    return weekDays.some(w => isSameDay(d, w))
  })

  function prevWeek() {
    const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d)
  }
  function nextWeek() {
    const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d)
  }

  async function handleSaveRDV(e: React.FormEvent) {
    e.preventDefault()
    if (!rdvForm.patientId) return
    setRdvSaving(true)
    try {
      const dateStr = selectedDay.toISOString().slice(0, 10)
      const newRdv = await api.rdv.create({
        patient_id: rdvForm.patientId,
        date: dateStr,
        heure: rdvForm.heure,
        duree_minutes: rdvForm.dureeMinutes,
        motif: rdvForm.motif,
        notes: rdvForm.notes,
        statut: 'confirme',
      })
      const patient = patients.find(p => p.id === rdvForm.patientId)
      setRdvList(prev => [...prev, { ...mapRdv(newRdv), nom: patient?.nom, prenoms: patient?.prenoms, telephone: patient?.telephone }])
      setShowNouveauRDV(false)
      setRdvForm({ patientId: '', motif: '', heure: '09:00', dureeMinutes: 30, notes: '' })
    } catch (err) {
      console.error('[RDV create]', err)
    } finally {
      setRdvSaving(false)
    }
  }

  return (
    <div className="dashboard-content" style={{ padding: '28px 36px', height: '100%', boxSizing: 'border-box' }}>

      {/* Layout principal : calendrier + liste côte à côte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, height: '100%' }}>

        {/* Colonne principale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Ce jour', value: rdvDuJour.length, icon: <Clock size={14} />, color: 'var(--accent)' },
              { label: 'Cette semaine', value: rdvSemaine.length, icon: <Calendar size={14} />, color: '#1a4a8a' },
              { label: 'En attente confirmation', value: allRdv.filter(r => r.statut === 'en_attente').length, icon: <AlertCircle size={14} />, color: '#a06010' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.color, flexShrink: 0,
                }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Calendrier semaine */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Navigation mois */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {MOIS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={prevWeek} style={navBtnStyle}>←</button>
                <button
                  onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()) }}
                  style={{ ...navBtnStyle, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(15,110,86,0.2)' }}
                >
                  Aujourd'hui
                </button>
                <button onClick={nextWeek} style={navBtnStyle}>→</button>
              </div>
            </div>

            {/* Jours */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDay)
                const rdvCount = allRdv.filter(r => isSameDay(new Date(r.date), day)).length

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '18px 8px', border: 'none', cursor: 'pointer',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginBottom: 6 }}>
                      {JOURS[day.getDay()]}
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 800,
                      color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                    }}>
                      {day.getDate()}
                    </div>
                    {rdvCount > 0 ? (
                      <div style={{
                        marginTop: 6, fontSize: 10, fontWeight: 700,
                        color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--accent)',
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--accent-light)',
                        borderRadius: 10, padding: '1px 6px', display: 'inline-block',
                      }}>
                        {rdvCount} RDV
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, height: 18 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Liste RDV du jour */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', flex: 1,
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <button
                onClick={() => setShowNouveauRDV(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 7, padding: '7px 14px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                <Plus size={13} /> Ajouter un RDV
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 size={24} color="#0f6e56" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              </div>
            ) : rdvDuJour.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
                <Calendar size={28} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
                Aucun rendez-vous ce jour
              </div>
            ) : (
              rdvDuJour.map(rdv => {
                const patient = (rdv as any).nom
                  ? { nom: (rdv as any).nom, prenoms: (rdv as any).prenoms, telephone: (rdv as any).telephone, sexe: 'M' } as Patient
                  : patients.find(p => p.id === rdv.patientId)
                const nomComplet = patient ? `${patient.nom} ${patient.prenoms}` : '—'
                return (
                  <RdvRow
                    key={rdv.id} rdv={rdv} patient={patient}
                    onWhatsApp={() => setWhatsappRdv({ id: rdv.id, nom: nomComplet, type: 'confirmation' })}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Panneau latéral droit : tous les prochains RDV */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
            Prochains rendez-vous
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allRdv.map((rdv, idx) => {
              const patient = (rdv as any).nom
                ? { nom: (rdv as any).nom, prenoms: (rdv as any).prenoms } as Patient
                : patients.find(p => p.id === rdv.patientId)
              const style = STATUT_STYLES[rdv.statut]
              return (
                <div key={rdv.id} style={{
                  padding: '14px 18px',
                  borderBottom: idx < allRdv.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {patient ? `${patient.nom} ${patient.prenoms}` : '—'}
                    </span>
                    <span style={{
                      background: style.bg, color: style.text,
                      borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    }}>
                      {style.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>
                    {new Date(rdv.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {rdv.heure}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rdv.motif}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {whatsappRdv && (
        <WhatsAppSendModal
          onFermer={() => setWhatsappRdv(null)}
          rdvId={whatsappRdv.id}
          type={whatsappRdv.type}
          patientNom={whatsappRdv.nom}
        />
      )}

      {/* Modal Nouveau RDV */}
      {showNouveauRDV && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }} onClick={() => setShowNouveauRDV(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: 'var(--accent)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Nouveau rendez-vous</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
                  {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <button onClick={() => setShowNouveauRDV(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</button>
            </div>
            {/* Form */}
            <form onSubmit={handleSaveRDV} style={{ padding: '24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patient *</label>
                <select
                  required value={rdvForm.patientId}
                  onChange={e => setRdvForm(f => ({ ...f, patientId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 9, border: '1.5px solid #e8e8e4', background: '#fafaf8', fontFamily: 'inherit' }}
                >
                  <option value="">— Sélectionner un patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenoms}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Heure</label>
                  <input type="time" value={rdvForm.heure}
                    onChange={e => setRdvForm(f => ({ ...f, heure: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 9, border: '1.5px solid #e8e8e4', background: '#fafaf8', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Durée (min)</label>
                  <select value={rdvForm.dureeMinutes}
                    onChange={e => setRdvForm(f => ({ ...f, dureeMinutes: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 9, border: '1.5px solid #e8e8e4', background: '#fafaf8', fontFamily: 'inherit' }}>
                    {[15, 20, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Motif</label>
                <input value={rdvForm.motif} onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))}
                  placeholder="Consultation de contrôle, bilan annuel…"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 9, border: '1.5px solid #e8e8e4', background: '#fafaf8', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowNouveauRDV(false)}
                  style={{ padding: '10px 20px', borderRadius: 9, border: '1.5px solid #e8e8e4', background: 'transparent', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Annuler
                </button>
                <button type="submit" disabled={rdvSaving}
                  style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: rdvSaving ? '#a0c8be' : 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: rdvSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {rdvSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</> : '+ Enregistrer le RDV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 14px', cursor: 'pointer',
  background: 'var(--surface)', fontSize: 13, color: 'var(--text)',
  fontFamily: 'inherit',
}
