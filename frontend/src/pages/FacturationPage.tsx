import { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight, Download, Plus, FileDown } from 'lucide-react'
import { api } from '../lib/api'

function exporterCSV() {
  const url = api.stats.exportUrl('factures')
  const a = document.createElement('a')
  a.href = url
  a.download = `curae_factures_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

interface Facture {
  id: string
  patientNom: string
  patientPrenom: string
  date: string
  actes: string
  montant: number
  assureur: string
  statut: 'rembourse' | 'en_attente' | 'refuse' | 'direct'
  referenceBordereau?: string
}

const MOCK_FACTURES: Facture[] = [
  { id: 'f1', patientNom: 'KOUASSI', patientPrenom: 'Adjoua Marie', date: '2024-12-10', actes: 'Consultation + ETT', montant: 45000, assureur: 'NSIA', statut: 'rembourse', referenceBordereau: 'NSIA-2024-1234' },
  { id: 'f2', patientNom: 'BAMBA', patientPrenom: 'Seydou', date: '2025-01-20', actes: 'Consultation + ECG', montant: 30000, assureur: 'Allianz', statut: 'en_attente', referenceBordereau: 'ALZ-2025-0089' },
  { id: 'f3', patientNom: "N'GORAN", patientPrenom: 'Konan Éric', date: '2025-03-05', actes: 'Consultation + Holter 24h', montant: 65000, assureur: 'AXA', statut: 'en_attente', referenceBordereau: 'AXA-2025-0341' },
  { id: 'f4', patientNom: 'DIALLO', patientPrenom: 'Fatoumata', date: '2025-02-14', actes: 'Consultation + MAPA', montant: 55000, assureur: 'Sanlam', statut: 'en_attente' },
  { id: 'f5', patientNom: 'TRAORÉ', patientPrenom: 'Aminata', date: '2024-11-28', actes: 'Consultation', montant: 15000, assureur: 'Aucun', statut: 'direct' },
]

const STATUT_STYLES: Record<Facture['statut'], { label: string; bg: string; text: string; Icon: React.ComponentType<{ size?: number }> }> = {
  rembourse: { label: 'Remboursé', bg: '#e8f4f0', text: '#0f6e56', Icon: CheckCircle },
  en_attente: { label: 'En attente', bg: '#fef9e7', text: '#a06010', Icon: Clock },
  refuse: { label: 'Refusé', bg: '#fef2f2', text: '#c0392b', Icon: AlertCircle },
  direct: { label: 'Paiement direct', bg: '#f0f0f8', text: '#5a5a9a', Icon: CheckCircle },
}

const ASSUREUR_COLORS: Record<string, string> = {
  NSIA: '#1a6b3a', Allianz: '#003781', Sanlam: '#e31837', AXA: '#00008f', Aucun: '#9a9a9a',
}

function formaterMontant(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}
function formaterDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FacturationPage() {
  const [filtreStatut, setFiltreStatut] = useState<Facture['statut'] | 'Tous'>('Tous')
  const [factures, setFactures] = useState<Facture[]>(MOCK_FACTURES)

  useEffect(() => {
    api.factures.list()
      .then(list => {
        if (list.length > 0) setFactures(list.map((f: any) => ({
          id: f.id,
          patientNom: f.nom || '',
          patientPrenom: f.prenoms || '',
          date: f.date_emission?.slice(0, 10) || '',
          actes: Array.isArray(f.actes) ? f.actes.join(', ') : (f.actes || ''),
          montant: Number(f.montant_total) || 0,
          assureur: f.assurance || 'Aucun',
          statut: (f.statut || 'en_attente') as Facture['statut'],
          referenceBordereau: f.numero,
        })))
      })
      .catch(() => {})
  }, [])

  const total = factures.reduce((s, f) => s + f.montant, 0)
  const rembourse = factures.filter(f => f.statut === 'rembourse').reduce((s, f) => s + f.montant, 0)
  const enAttente = factures.filter(f => f.statut === 'en_attente').reduce((s, f) => s + f.montant, 0)
  const tauxRecouvrement = total > 0 ? Math.round((rembourse / total) * 100) : 0

  const parAssureur = factures.reduce<Record<string, number>>((acc, f) => {
    acc[f.assureur] = (acc[f.assureur] || 0) + f.montant
    return acc
  }, {})

  const resultats = filtreStatut === 'Tous' ? factures : factures.filter(f => f.statut === filtreStatut)

  return (
    <div style={{ padding: '28px 36px', height: '100%', boxSizing: 'border-box' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total facturé', value: formaterMontant(total), icon: <BarChart2 size={15} />, color: 'var(--text)', sub: `${factures.length} factures` },
          { label: 'Remboursé', value: formaterMontant(rembourse), icon: <CheckCircle size={15} />, color: '#0f6e56', sub: `Taux ${tauxRecouvrement}%` },
          { label: 'En attente', value: formaterMontant(enAttente), icon: <Clock size={15} />, color: '#a06010', sub: `${factures.filter(f => f.statut === 'en_attente').length} dossiers` },
          { label: 'Paiement direct', value: formaterMontant(factures.filter(f => f.statut === 'direct').reduce((s, f) => s + f.montant, 0)), icon: <TrendingUp size={15} />, color: '#5a5a9a', sub: 'sans assurance' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, color: k.color }}>
              {k.icon}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Corps principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

        {/* Liste factures */}
        <div>
          {/* Barre outils */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {(['Tous', 'rembourse', 'en_attente', 'direct'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltreStatut(s)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: filtreStatut === s ? 'var(--accent)' : 'var(--surface)',
                    color: filtreStatut === s ? '#fff' : 'var(--text)',
                    transition: 'background 0.15s', fontFamily: 'inherit',
                  }}
                >
                  {s === 'Tous' ? 'Toutes' : STATUT_STYLES[s as Facture['statut']].label}
                </button>
              ))}
            </div>
            <button
              onClick={exporterCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: 'var(--accent)',
                border: '1.5px solid var(--accent)', borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
              title="Exporter en CSV (Excel)"
            >
              <FileDown size={14} /> CSV
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={14} /> Nouvelle facture
            </button>
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Entête */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
              padding: '10px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              {['Patient', 'Montant', 'Date', 'Statut', 'Actions'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {h}
                </div>
              ))}
            </div>

            {resultats.map((f, idx) => {
              const style = STATUT_STYLES[f.statut]
              const { Icon } = style
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                    padding: '14px 20px', alignItems: 'center',
                    borderBottom: idx < resultats.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  {/* Patient */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.patientNom} {f.patientPrenom}</span>
                      <span style={{
                        background: ASSUREUR_COLORS[f.assureur] || '#888', color: '#fff',
                        borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '1px 7px',
                      }}>{f.assureur}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.actes}</div>
                    {f.referenceBordereau && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 1 }}>
                        {f.referenceBordereau}
                      </div>
                    )}
                  </div>

                  {/* Montant */}
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{formaterMontant(f.montant)}</div>

                  {/* Date */}
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{formaterDate(f.date)}</div>

                  {/* Statut */}
                  <div>
                    <span style={{
                      background: style.bg, color: style.text,
                      borderRadius: 6, fontSize: 12, fontWeight: 600,
                      padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content',
                    }}>
                      <Icon size={10} /> {style.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={actionBtn}><Download size={12} /></button>
                    <ChevronRight size={14} style={{ color: 'var(--muted)', alignSelf: 'center' }} />
                  </div>
                </div>
              )
            })}

            {resultats.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: 14 }}>
                Aucune facture
              </div>
            )}
          </div>
        </div>

        {/* Panneau latéral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Répartition assureurs */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Répartition par assureur</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(parAssureur)
                .sort((a, b) => b[1] - a[1])
                .map(([assureur, montant]) => {
                  const pct = Math.round((montant / total) * 100)
                  return (
                    <div key={assureur}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{assureur}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4, width: `${pct}%`,
                          background: ASSUREUR_COLORS[assureur] || '#888',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {formaterMontant(montant)}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Taux de recouvrement */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Taux de recouvrement</div>
            <div style={{ position: 'relative', height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${tauxRecouvrement}%`,
                background: 'var(--accent)', borderRadius: 5, transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{tauxRecouvrement}%</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>des factures remboursées</div>
          </div>

          {/* Actions rapides */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Actions rapides</div>
            {['Générer bordereau NSIA', 'Générer bordereau Allianz'].map(action => (
              <button key={action} style={{
                width: '100%', textAlign: 'left', padding: '9px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: 'var(--accent)', fontWeight: 600,
                marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s', fontFamily: 'inherit',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                {action} <ChevronRight size={13} />
              </button>
            ))}
            <button
              onClick={exporterCSV}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: 'var(--accent)', fontWeight: 600,
                marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              Exporter factures CSV <FileDown size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 6,
  padding: '5px 8px', cursor: 'pointer', background: 'var(--surface)',
  color: 'var(--muted)', display: 'flex', alignItems: 'center',
  fontFamily: 'inherit',
}
