import { useState, useEffect } from 'react'
import { X, Sparkles, Copy, Printer, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'

interface Sections {
  contexte: string
  antecedents: string
  evolution: string
  traitements: string
  vigilance: string
}

interface Props {
  patientId: string
  patientNom: string
  onFermer: () => void
}

const SECTION_CONFIG: { key: keyof Sections; label: string; couleur: string; bg: string }[] = [
  { key: 'contexte',    label: 'Contexte patient',       couleur: '#0f6e56', bg: '#f0fdf4' },
  { key: 'antecedents', label: 'Antécédents et pathologies', couleur: '#1a4a8a', bg: '#eff6ff' },
  { key: 'evolution',   label: 'Évolution clinique',     couleur: '#7c3aed', bg: '#f5f3ff' },
  { key: 'traitements', label: 'Traitements actuels',    couleur: '#b45309', bg: '#fffbeb' },
  { key: 'vigilance',   label: 'Points de vigilance',    couleur: '#dc2626', bg: '#fef2f2' },
]

export default function ResumeCliniqueModal({ patientId, patientNom, onFermer }: Props) {
  const [sections, setSections] = useState<Sections | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [simule, setSimule] = useState(false)

  useEffect(() => {
    api.ia.resumePatient(patientId)
      .then(r => { setSections(r.sections); setSimule(!!r.simule) })
      .catch(e => setErreur(e.message || 'Erreur génération'))
      .finally(() => setLoading(false))
  }, [patientId])

  function copierTexte() {
    if (!sections) return
    const txt = SECTION_CONFIG.map(s => `${s.label.toUpperCase()}\n${sections[s.key]}`).join('\n\n')
    navigator.clipboard.writeText(`Résumé clinique — ${patientNom}\n\n${txt}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function imprimer() {
    if (!sections) return
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Résumé clinique — ${patientNom}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; font-size: 12pt; color: #1a1a18; padding: 2cm 2.5cm; }
.header { border-bottom: 2px solid #0f6e56; padding-bottom: 14px; margin-bottom: 20px; }
.title { font-size: 20pt; font-weight: bold; color: #0f6e56; }
.subtitle { font-size: 11pt; color: #555; margin-top: 4px; }
.section { margin-bottom: 18px; }
.section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #0f6e56; border-bottom: 1px solid #c0ddd5; padding-bottom: 4px; margin-bottom: 8px; }
.section-body { font-size: 11pt; line-height: 1.7; }
.footer { margin-top: 32px; border-top: 1px solid #d0d0cc; padding-top: 10px; font-size: 9pt; color: #888; display: flex; justify-content: space-between; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; }
</style></head><body>
<div class="header">
  <div class="title">Résumé clinique IA</div>
  <div class="subtitle">${patientNom} — Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>
${SECTION_CONFIG.map(s => `<div class="section">
  <div class="section-title">${s.label}</div>
  <div class="section-body">${sections![s.key] || '—'}</div>
</div>`).join('')}
<div class="footer">
  <span>Curaé — Résumé généré par IA (Claude) — non substitutif à l'évaluation médicale</span>
  <span>${new Date().toLocaleDateString('fr-FR')}</span>
</div>
</body></html>`
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 250, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 640,
        border: '1px solid #e0e0da',
        overflow: 'hidden', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          padding: '16px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="#fff" />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Résumé clinique IA</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{patientNom}</div>
            </div>
          </div>
          <button onClick={onFermer} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: 8, padding: 7, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={17} />
          </button>
        </div>

        {/* Contenu */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
              }}>
                <Loader2 size={24} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#333', textAlign: 'center' }}>Analyse en cours…</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' }}>
                  L'IA synthétise l'historique médical du patient
                </div>
              </div>
            </div>
          )}

          {erreur && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '14px 16px', background: '#fee2e2', borderRadius: 10,
              border: '1px solid #fca5a5',
            }}>
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>Erreur de génération</div>
                <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 2 }}>{erreur}</div>
              </div>
            </div>
          )}

          {sections && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {simule && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 12px', background: '#fef3c7', borderRadius: 8,
                  border: '1px solid #fcd34d', fontSize: 12, color: '#92400e',
                }}>
                  <AlertTriangle size={13} />
                  Mode simulation — résumé basé sur les données locales (ANTHROPIC_API_KEY non configurée)
                </div>
              )}

              {SECTION_CONFIG.map(({ key, label, couleur, bg }) => (
                sections[key] ? (
                  <div key={key} style={{
                    borderRadius: 10, border: `1px solid ${couleur}25`,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      background: bg, padding: '8px 14px',
                      fontSize: 11, fontWeight: 700, color: couleur,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {label}
                    </div>
                    <div style={{
                      padding: '12px 14px', fontSize: 13.5, lineHeight: 1.7, color: '#333',
                    }}>
                      {sections[key]}
                    </div>
                  </div>
                ) : null
              ))}

              <div style={{
                padding: '10px 14px', background: '#f9fafb', borderRadius: 8,
                border: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280',
                fontStyle: 'italic', textAlign: 'center',
              }}>
                Résumé généré par l'IA — toujours vérifier avec le dossier médical complet
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {sections && !loading && (
          <div style={{
            padding: '14px 22px', borderTop: '1px solid #e0e0da',
            background: '#fafaf8', display: 'flex', gap: 10, justifyContent: 'flex-end',
            flexShrink: 0,
          }}>
            <button
              onClick={copierTexte}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8,
                border: '1.5px solid #e0e0da', background: 'transparent',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
                fontFamily: 'inherit',
              }}
            >
              {copied ? <CheckCircle size={14} color="#0f6e56" /> : <Copy size={14} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={imprimer}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8,
                background: '#7c3aed', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Printer size={14} /> Imprimer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
