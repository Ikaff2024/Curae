import { useState, useEffect } from 'react'
import {
  Users, Calendar, TrendingUp, AlertTriangle, CheckCircle,
  CreditCard, Loader2, Activity, ArrowUpRight, ArrowDownRight,
  ShieldAlert, RefreshCw,
} from 'lucide-react'
import { api } from '../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  patients: { total: number; nouveaux_ce_mois: number }
  rdv: {
    total_30j: number; presents: number; no_shows: number
    annules: number; prochains_confirmes: number; taux_presence: number | null
  }
  patientsRisque: { id: string; nom: string; prenoms: string; risques: string[] }[]
  revenus: { mois: string; total: number; patients_part: number; nb_factures: number; nb_payes: number }[]
  revenusMoisActuel: { mois: string; total: number } | null
  revenusMoisPrecedent: { mois: string; total: number } | null
  abonnement: { plan: string; statut: string; date_fin: string | null }
}

// ─── Demo data pour mode offline ────────────────────────────────────────────

const DEMO: DashboardData = {
  patients: { total: 142, nouveaux_ce_mois: 8 },
  rdv: {
    total_30j: 67, presents: 58, no_shows: 5,
    annules: 4, prochains_confirmes: 12, taux_presence: 87,
  },
  patientsRisque: [
    { id: '1', nom: "N'GORAN", prenoms: 'Konan Éric', risques: ['Anticoagulant', 'HTA sévère'] },
    { id: '2', nom: 'KOUASSI', prenoms: 'Ama Céleste', risques: ['HbA1c ≥ 8%'] },
    { id: '3', nom: 'DIALLO', prenoms: 'Ibrahim', risques: ['HTA sévère'] },
  ],
  revenus: [
    { mois: '2024-12', total: 1_850_000, patients_part: 1_200_000, nb_factures: 42, nb_payes: 38 },
    { mois: '2025-01', total: 2_100_000, patients_part: 1_400_000, nb_factures: 48, nb_payes: 44 },
    { mois: '2025-02', total: 1_950_000, patients_part: 1_350_000, nb_factures: 45, nb_payes: 40 },
    { mois: '2025-03', total: 2_300_000, patients_part: 1_600_000, nb_factures: 52, nb_payes: 50 },
    { mois: '2025-04', total: 2_150_000, patients_part: 1_500_000, nb_factures: 50, nb_payes: 47 },
    { mois: '2025-05', total: 2_420_000, patients_part: 1_700_000, nb_factures: 55, nb_payes: 53 },
  ],
  revenusMoisActuel: { mois: '2025-05', total: 2_420_000 },
  revenusMoisPrecedent: { mois: '2025-04', total: 2_150_000 },
  abonnement: { plan: 'solo', statut: 'actif', date_fin: '2025-12-31' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formaterFCFA(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M FCFA`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K FCFA`
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function nomMois(yyyy_mm: string): string {
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const [, m] = yyyy_mm.split('-')
  return MOIS[parseInt(m) - 1] || yyyy_mm
}

// ─── Sparkline revenus ───────────────────────────────────────────────────────

function SparklineRevenus({ revenus }: { revenus: DashboardData['revenus'] }) {
  if (revenus.length < 2) return null

  const vals = revenus.map(r => r.total)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const W = 320, H = 72

  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * (W - 24) + 12,
    y: H - 8 - ((v - minV) / range) * (H - 20),
  }))

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L 12 ${H} Z`

  const lastPt = pts[pts.length - 1]
  const trend = vals[vals.length - 1] > vals[vals.length - 2] ? 'up' : 'down'

  return (
    <div style={{ position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trend === 'up' ? '#0f6e56' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trend === 'up' ? '#0f6e56' : '#ef4444'} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#revGrad)" />
        <path d={d} fill="none" stroke={trend === 'up' ? '#0f6e56' : '#ef4444'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPt.x} cy={lastPt.y} r={4} fill={trend === 'up' ? '#0f6e56' : '#ef4444'} />
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '0 8px', marginTop: -2,
      }}>
        {revenus.map((r, i) => (
          <div key={i} style={{ fontSize: 9, color: '#aaa', textAlign: 'center', width: 40 }}>
            {nomMois(r.mois)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sous-composants stat card ───────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, couleur, trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  couleur: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: '1px solid #e8e8e4',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${couleur}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: couleur, flexShrink: 0,
        }}>
          {icon}
        </div>
        {trend && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 12, fontWeight: 700,
            color: trend === 'up' ? '#0f6e56' : '#dc2626',
          }}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#1a1a18', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: couleur, fontWeight: 600, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── Barre de progression taux ────────────────────────────────────────────────

function BarreProgression({ label, valeur, max, couleur }: { label: string; valeur: number; max: number; couleur: string }) {
  const pct = Math.min(100, Math.round((valeur / max) * 100))
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#555', fontWeight: 600 }}>{label}</span>
        <span style={{ color: couleur, fontWeight: 700 }}>{valeur}</span>
      </div>
      <div style={{ height: 6, background: '#f0f0ee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`, background: couleur,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  )
}

// ─── Badge risque ─────────────────────────────────────────────────────────────

function BadgeRisque({ label }: { label: string }) {
  const couleurs: Record<string, [string, string]> = {
    'HTA sévère':    ['#fef2f2', '#dc2626'],
    'Anticoagulant': ['#fef3c7', '#b45309'],
    'HbA1c ≥ 8%':   ['#fdf4ff', '#9333ea'],
  }
  const [bg, txt] = couleurs[label] || ['#f3f4f6', '#6b7280']
  return (
    <span style={{
      background: bg, color: txt,
      fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 4,
    }}>
      {label}
    </span>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  function charger() {
    setLoading(true)
    api.stats.dashboard()
      .then(d => { setData(d); setOffline(false); setLastUpdate(new Date()) })
      .catch(() => { setData(DEMO); setOffline(true); setLastUpdate(new Date()) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <Loader2 size={28} color="#0f6e56" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const d = data || DEMO

  const revenuActuel = d.revenusMoisActuel?.total || 0
  const revenuPrecedent = d.revenusMoisPrecedent?.total || 0
  const trendRevenus = revenuActuel >= revenuPrecedent ? 'up' as const : 'down' as const

  const pctVariationRevenus = revenuPrecedent > 0
    ? Math.round(((revenuActuel - revenuPrecedent) / revenuPrecedent) * 100)
    : null

  const totalRdv = d.rdv.total_30j
  const tauxPresence = d.rdv.taux_presence

  // Statut abonnement
  const abonnement = d.abonnement
  const dateFinAbo = abonnement.date_fin ? new Date(abonnement.date_fin) : null
  const joursRestants = dateFinAbo ? Math.ceil((dateFinAbo.getTime() - Date.now()) / 86400000) : null
  const aboExpireBientot = joursRestants !== null && joursRestants <= 30

  return (
    <div className="dashboard-content" style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Bannière offline */}
      {offline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', background: '#fef9e7', borderRadius: 10,
          border: '1px solid #f0d080', fontSize: 13, color: '#a06010',
        }}>
          <AlertTriangle size={14} />
          Mode démo — données réelles disponibles une fois le backend connecté.
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#888' }}>
            Tableau de bord — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button
          onClick={charger}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid #e0e0da', background: 'transparent',
            fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {lastUpdate ? `Mis à jour ${lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Actualiser'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-stats-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Patients suivis" icon={<Users size={18} />} couleur="#0f6e56"
          value={d.patients.total}
          sub={`+${d.patients.nouveaux_ce_mois} ce mois`}
        />
        <StatCard
          label="Taux de présence (30j)" icon={<Calendar size={18} />} couleur="#1a4a8a"
          value={tauxPresence !== null ? `${tauxPresence}%` : '—'}
          sub={`${d.rdv.presents}/${totalRdv} RDV honorés`}
          trend={tauxPresence !== null ? (tauxPresence >= 80 ? 'up' : 'down') : null}
        />
        <StatCard
          label={`Revenus — ${d.revenusMoisActuel ? nomMois(d.revenusMoisActuel.mois) : 'ce mois'}`}
          icon={<TrendingUp size={18} />} couleur="#7c3aed"
          value={formaterFCFA(revenuActuel)}
          sub={pctVariationRevenus !== null ? `${pctVariationRevenus > 0 ? '+' : ''}${pctVariationRevenus}% vs mois précédent` : ''}
          trend={trendRevenus}
        />
        <StatCard
          label="Patients à risque élevé" icon={<ShieldAlert size={18} />} couleur="#dc2626"
          value={d.patientsRisque.length}
          sub={d.patientsRisque.length > 0 ? 'Nécessitent un suivi attentif' : 'Aucun patient à risque élevé'}
          trend={d.patientsRisque.length > 0 ? 'down' : null}
        />
      </div>

      {/* Ligne 2 : revenus + RDV + risque */}
      <div className="grid-dashboard-main" style={{ display: 'grid', gridTemplateColumns: '1fr 280px 340px', gap: 16 }}>

        {/* Graphique revenus */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #e8e8e4', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Évolution des revenus</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>6 derniers mois — en FCFA</div>
            </div>
            {d.revenusMoisActuel && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f6e56' }}>
                  {formaterFCFA(d.revenusMoisActuel.total)}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>{nomMois(d.revenusMoisActuel.mois)}</div>
              </div>
            )}
          </div>
          <SparklineRevenus revenus={d.revenus} />
          {d.revenus.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {d.revenus.slice(-3).map(r => (
                <div key={r.mois} style={{ flex: 1, minWidth: 80, padding: '10px 14px', background: '#f7f8f6', borderRadius: 9 }}>
                  <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>{nomMois(r.mois)}</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{formaterFCFA(r.total)}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{r.nb_payes}/{r.nb_factures} payées</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistiques RDV */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #e8e8e4', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Rendez-vous</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>30 derniers jours</div>
          </div>

          {/* Taux présence en anneau SVG */}
          {tauxPresence !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg width={100} height={100} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={38} fill="none" stroke="#f0f0ee" strokeWidth={10} />
                  <circle
                    cx={50} cy={50} r={38} fill="none"
                    stroke={tauxPresence >= 80 ? '#0f6e56' : tauxPresence >= 60 ? '#f59e0b' : '#dc2626'}
                    strokeWidth={10}
                    strokeDasharray={`${(tauxPresence / 100) * 238.76} 238.76`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18' }}>{tauxPresence}%</div>
                  <div style={{ fontSize: 9, color: '#888' }}>présence</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <BarreProgression label="Présents / honorés" valeur={d.rdv.presents} max={totalRdv || 1} couleur="#0f6e56" />
            <BarreProgression label="Annulés" valeur={d.rdv.annules} max={totalRdv || 1} couleur="#f59e0b" />
            <BarreProgression label="No-show" valeur={d.rdv.no_shows} max={totalRdv || 1} couleur="#dc2626" />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
            background: '#e8f4f0', borderRadius: 8,
            fontSize: 12, color: '#0f6e56', fontWeight: 600,
          }}>
            <CheckCircle size={13} />
            {d.rdv.prochains_confirmes} RDV confirmés à venir
          </div>
        </div>

        {/* Patients à risque */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #e8e8e4', display: 'flex', flexDirection: 'column', gap: 12,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Patients à surveiller</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>Facteurs de risque détectés sur 90j</div>
            </div>
          </div>

          {d.patientsRisque.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8, padding: '24px 0', color: '#888',
            }}>
              <CheckCircle size={28} color="#0f6e56" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f6e56' }}>Aucun patient à risque élevé</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 200 }}>
              {d.patientsRisque.map(p => (
                <div key={p.id} style={{
                  padding: '10px 12px', background: '#fef9f9', borderRadius: 9,
                  border: '1px solid #fde8e8',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#dc2626', fontSize: 11, fontWeight: 700,
                  }}>
                    {p.nom[0]}{p.prenoms[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      {p.nom} {p.prenoms}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.risques.map(r => <BadgeRisque key={r} label={r} />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Abonnement */}
      <div style={{
        background: aboExpireBientot ? '#fef9e7' : '#f0fdf4',
        border: `1px solid ${aboExpireBientot ? '#f59e0b' : '#86efac'}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: aboExpireBientot ? '#fef3c7' : '#d1fae5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: aboExpireBientot ? '#b45309' : '#0f6e56',
          }}>
            <CreditCard size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a18' }}>
              Abonnement Curaé — Plan {abonnement.plan === 'solo' ? 'Solo' : 'Cabinet'}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              {abonnement.statut === 'actif' ? '✅ Actif' : abonnement.statut === 'essai' ? '🔔 Période d\'essai' : '❌ Expiré'}
              {dateFinAbo && ` · Expire le ${dateFinAbo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              {joursRestants !== null && joursRestants <= 60 && ` (${joursRestants} jours restants)`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>
              {abonnement.plan === 'solo' ? '35 000 FCFA/mois' : '65 000 FCFA/mois'}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>Paiement Wave CI</div>
          </div>
          {aboExpireBientot && (
            <button style={{
              padding: '8px 16px', borderRadius: 8, background: '#f59e0b',
              color: '#fff', border: 'none', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              Renouveler
            </button>
          )}
        </div>
      </div>

      {/* Activité IA */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed10, #4f46e510)',
        border: '1px solid #c4b5fd',
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Activity size={20} color="#7c3aed" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a18' }}>Intelligence artificielle Curaé</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
            Génération de comptes-rendus, dictée vocale structurée, et alertes cliniques — alimentées par Claude (Anthropic).
            L'IA assiste la rédaction, mais le médecin garde toujours la validation finale.
          </div>
        </div>
      </div>
    </div>
  )
}
