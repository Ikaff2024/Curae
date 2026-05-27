import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { TrendingUp, AlertTriangle, Activity } from 'lucide-react'

interface Mesure {
  date: string
  pa_sys: number | null
  pa_dia: number | null
  fc: number | null
  spo2: number | null
  hba1c: number | null
  creatinine: number | null
}

interface TendancesData {
  series: Mesure[]
  alerts: string[]
  count: number
}

// SVG sparkline — valeurs null ignorées, ligne connecte les points connus
function Sparkline({
  values,
  min,
  max,
  color,
  width = 120,
  height = 38,
}: {
  values: (number | null)[]
  min: number
  max: number
  color: string
  width?: number
  height?: number
}) {
  const pts = values
    .map((v, i) => v !== null ? { x: i, y: v } : null)
    .filter(Boolean) as { x: number; y: number }[]

  if (pts.length < 2) {
    return (
      <svg width={width} height={height}>
        {pts.length === 1 && (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={3}
            fill={color}
          />
        )}
        {pts.length === 0 && (
          <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize={10} fill="#bbb">—</text>
        )}
      </svg>
    )
  }

  const range = max - min || 1
  const toX = (i: number) => (i / (values.length - 1)) * (width - 8) + 4
  const toY = (v: number) => height - 4 - ((v - min) / range) * (height - 10)

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`).join(' ')

  const lastPt = pts[pts.length - 1]
  const lastX = toX(lastPt.x)
  const lastY = toY(lastPt.y)

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3.5} fill={color} />
    </svg>
  )
}

function badgeCouleur(valeur: number | null, type: 'pa_sys' | 'pa_dia' | 'fc' | 'spo2' | 'hba1c'): string {
  if (valeur === null) return '#9ca3af'
  if (type === 'pa_sys') return valeur >= 160 ? '#dc2626' : valeur >= 140 ? '#f59e0b' : '#0f6e56'
  if (type === 'pa_dia') return valeur >= 100 ? '#dc2626' : valeur >= 90 ? '#f59e0b' : '#0f6e56'
  if (type === 'fc') return valeur > 110 || valeur < 50 ? '#dc2626' : valeur > 100 || valeur < 55 ? '#f59e0b' : '#0f6e56'
  if (type === 'spo2') return valeur < 90 ? '#dc2626' : valeur < 95 ? '#f59e0b' : '#0f6e56'
  if (type === 'hba1c') return valeur >= 8 ? '#dc2626' : valeur >= 7 ? '#f59e0b' : '#0f6e56'
  return '#0f6e56'
}

function MetriqueCard({
  label,
  unit,
  values,
  last,
  min,
  max,
  type,
  color,
}: {
  label: string
  unit: string
  values: (number | null)[]
  last: number | null
  min: number
  max: number
  type: 'pa_sys' | 'pa_dia' | 'fc' | 'spo2' | 'hba1c'
  color: string
}) {
  const c = badgeCouleur(last, type)
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 10, padding: '12px 14px',
      border: `1.5px solid ${last !== null ? c + '40' : 'var(--border)'}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>
            {last !== null ? last : '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3 }}>{unit}</span>
        </div>
        <Sparkline values={values} min={min} max={max} color={color} />
      </div>
    </div>
  )
}

interface Props {
  patientId: string
}

// Demo data utilisée quand le backend n'est pas disponible
const DEMO: TendancesData = {
  count: 5,
  alerts: [],
  series: [
    { date: '2024-01-10', pa_sys: 135, pa_dia: 88, fc: 72, spo2: 97, hba1c: null, creatinine: null },
    { date: '2024-02-15', pa_sys: 142, pa_dia: 92, fc: 76, spo2: 98, hba1c: null, creatinine: null },
    { date: '2024-03-20', pa_sys: 138, pa_dia: 90, fc: 74, spo2: 97, hba1c: null, creatinine: null },
    { date: '2024-04-18', pa_sys: 145, pa_dia: 94, fc: 80, spo2: 96, hba1c: null, creatinine: null },
    { date: '2024-05-22', pa_sys: 148, pa_dia: 96, fc: 82, spo2: 97, hba1c: null, creatinine: null },
  ],
}

export default function HistoriqueVitaux({ patientId }: Props) {
  const [data, setData] = useState<TendancesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.patients.tendances(patientId)
      .then(setData)
      .catch(() => setData(DEMO))
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) return (
    <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 13 }}>
      Chargement des tendances…
    </div>
  )

  if (!data || data.count === 0) return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, background: 'var(--surface)',
      border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13, textAlign: 'center',
    }}>
      Aucun compte-rendu — les tendances s'afficheront après la première consultation.
    </div>
  )

  const { series, alerts } = data
  const paSys  = series.map(s => s.pa_sys)
  const paDia  = series.map(s => s.pa_dia)
  const fcVals = series.map(s => s.fc)
  const spo2V  = series.map(s => s.spo2)
  const hba1cV = series.map(s => s.hba1c)

  function last<T>(arr: T[]): T | undefined { return arr[arr.length - 1] }
  const lastPaSys  = last(paSys.filter(v => v !== null) as number[]) ?? null
  const lastPaDia  = last(paDia.filter(v => v !== null) as number[]) ?? null
  const lastFc     = last(fcVals.filter(v => v !== null) as number[]) ?? null
  const lastSpo2   = last(spo2V.filter(v => v !== null) as number[]) ?? null
  const lastHba1c  = last(hba1cV.filter(v => v !== null) as number[]) ?? null

  const hasHba1c = hba1cV.some(v => v !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>
        <TrendingUp size={15} color="var(--accent)" />
        Tendances sur {data.count} consultation{data.count > 1 ? 's' : ''}
      </div>

      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '9px 13px', borderRadius: 9,
              background: '#fef3c7', border: '1px solid #f59e0b',
              fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.4,
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: '#b45309' }} />
              {a}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: hasHba1c ? 'repeat(5,1fr)' : 'repeat(4,1fr)', gap: 8 }}>
        <MetriqueCard
          label="PA sys" unit="mmHg"
          values={paSys} last={lastPaSys}
          min={90} max={180} type="pa_sys" color="#ef4444"
        />
        <MetriqueCard
          label="PA dia" unit="mmHg"
          values={paDia} last={lastPaDia}
          min={50} max={120} type="pa_dia" color="#f97316"
        />
        <MetriqueCard
          label="FC" unit="bpm"
          values={fcVals} last={lastFc}
          min={40} max={130} type="fc" color="#3b82f6"
        />
        <MetriqueCard
          label="SpO₂" unit="%"
          values={spo2V} last={lastSpo2}
          min={85} max={100} type="spo2" color="#0f6e56"
        />
        {hasHba1c && (
          <MetriqueCard
            label="HbA1c" unit="%"
            values={hba1cV} last={lastHba1c}
            min={4} max={12} type="hba1c" color="#8b5cf6"
          />
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Activity size={10} />
        Données issues des {data.count} derniers comptes-rendus —
        <span style={{ color: '#0f6e56', fontWeight: 600 }}>vert</span> normal ·
        <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 4 }}>jaune</span> attention ·
        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 4 }}>rouge</span> alerte
      </div>
    </div>
  )
}
