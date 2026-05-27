import { useState } from 'react'
import { X, Plus, Trash2, Printer, Save, Pill, ChevronDown } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface LigneMedicament {
  id: string
  nom: string
  dose: string
  frequence: string
  duree: string
  instructions: string
}

interface Props {
  onFermer: () => void
  patientNom?: string
  patientAge?: number
  medecinNom?: string
  medecinSpecialite?: string
}

// ─── Médicaments courants (Côte d'Ivoire) ────────────────────────────────────

const MEDICAMENTS_COURANTS = [
  'Amlodipine', 'Atenolol', 'Bisoprolol', 'Lisinopril', 'Ramipril', 'Losartan',
  'Furosémide', 'Spironolactone', 'Atorvastatine', 'Simvastatine',
  'Aspirine', 'Clopidogrel', 'Xarelto (rivaroxaban)', 'Eliquis (apixaban)',
  'Metformine', 'Glibenclamide', 'Insuline humaine', 'Sitagliptine',
  'Paracétamol', 'Ibuprofène', 'Amoxicilline', 'Azithromycine',
  'Metronidazole', 'Fluconazole', 'Oméprazole', 'Prednisolone',
  'Dexaméthasone', 'Salbutamol spray', 'Béclométhasone',
]

const FREQUENCES = [
  '1 fois par jour', '2 fois par jour', '3 fois par jour',
  'Matin et soir', 'Matin, midi et soir',
  'Toutes les 8 heures', 'Toutes les 12 heures',
  'Au coucher', 'Selon besoin',
]

const DUREES = [
  '5 jours', '7 jours', '10 jours', '14 jours', '21 jours',
  '1 mois', '3 mois', '6 mois', '1 an', 'Traitement de longue durée',
]

// ─── Utilitaires ────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

const CHIFFRES_FR = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix']

// ─── Composant ligne médicament ──────────────────────────────────────────────

function LigneMed({
  ligne,
  onChange,
  onDelete,
  index,
}: {
  ligne: LigneMedicament
  onChange: (id: string, key: keyof LigneMedicament, val: string) => void
  onDelete: (id: string) => void
  index: number
}) {
  const [suggestionsVisible, setSuggestionsVisible] = useState(false)
  const suggestions = MEDICAMENTS_COURANTS.filter(m =>
    ligne.nom && m.toLowerCase().includes(ligne.nom.toLowerCase()) && m !== ligne.nom
  ).slice(0, 6)

  const field = (key: keyof LigneMedicament, placeholder: string, flex = 1) => (
    <input
      type="text"
      value={ligne[key]}
      onChange={e => onChange(ligne.id, key, e.target.value)}
      placeholder={placeholder}
      style={{
        flex, padding: '8px 10px', fontSize: 13, border: '1.5px solid #e0e0da',
        borderRadius: 7, background: '#fafaf8', outline: 'none', fontFamily: 'inherit',
      }}
      onFocus={e => (e.target.style.borderColor = '#0f6e56')}
      onBlur={e => (e.target.style.borderColor = '#e0e0da')}
    />
  )

  return (
    <div style={{
      background: '#fafaf8', borderRadius: 10, border: '1px solid #e8e8e4', padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Ligne 1 : numéro + nom + dose */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: '#0f6e56',
          color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Nom avec autocomplete */}
        <div style={{ flex: 2, position: 'relative' }}>
          <input
            type="text"
            value={ligne.nom}
            onChange={e => { onChange(ligne.id, 'nom', e.target.value); setSuggestionsVisible(true) }}
            onFocus={() => setSuggestionsVisible(true)}
            onBlur={() => setTimeout(() => setSuggestionsVisible(false), 150)}
            placeholder="Nom du médicament…"
            style={{
              width: '100%', padding: '8px 10px', fontSize: 13, border: '1.5px solid #e0e0da',
              borderRadius: 7, background: '#fafaf8', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocusCapture={e => (e.target.style.borderColor = '#0f6e56')}
            onBlurCapture={e => (e.target.style.borderColor = '#e0e0da')}
          />
          {suggestionsVisible && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1px solid #e0e0da', borderRadius: 8,
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)', marginTop: 2, overflow: 'hidden',
            }}>
              {suggestions.map(s => (
                <div
                  key={s}
                  onMouseDown={() => { onChange(ligne.id, 'nom', s); setSuggestionsVisible(false) }}
                  style={{
                    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                    borderBottom: '1px solid #f0f0ee',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f5f3'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <Pill size={12} color="#0f6e56" /> {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {field('dose', 'Dose (ex: 5 mg)')}

        <button
          onClick={() => onDelete(ligne.id)}
          style={{
            width: 30, height: 30, borderRadius: 7, background: '#fee2e2',
            border: 'none', cursor: 'pointer', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Ligne 2 : fréquence + durée */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={ligne.frequence}
            onChange={e => onChange(ligne.id, 'frequence', e.target.value)}
            style={{
              width: '100%', padding: '8px 28px 8px 10px', fontSize: 13,
              border: '1.5px solid #e0e0da', borderRadius: 7, background: '#fafaf8',
              outline: 'none', appearance: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">Fréquence…</option>
            {FREQUENCES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }} />
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={ligne.duree}
            onChange={e => onChange(ligne.id, 'duree', e.target.value)}
            style={{
              width: '100%', padding: '8px 28px 8px 10px', fontSize: 13,
              border: '1.5px solid #e0e0da', borderRadius: 7, background: '#fafaf8',
              outline: 'none', appearance: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">Durée…</option>
            {DUREES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Instructions facultatives */}
      <input
        type="text"
        value={ligne.instructions}
        onChange={e => onChange(ligne.id, 'instructions', e.target.value)}
        placeholder="Instructions particulières (ex: à jeun, avec repas, ne pas écraser…)"
        style={{
          padding: '7px 10px', fontSize: 12, border: '1.5px solid #e0e0da',
          borderRadius: 7, background: '#fafaf8', outline: 'none', fontFamily: 'inherit',
          color: '#888',
        }}
        onFocus={e => (e.target.style.borderColor = '#0f6e56')}
        onBlur={e => (e.target.style.borderColor = '#e0e0da')}
      />
    </div>
  )
}

// ─── Génération PDF ──────────────────────────────────────────────────────────

function genererOrdonnancePDF(
  lignes: LigneMedicament[],
  patientNom: string,
  patientAge: number | undefined,
  medecinNom: string,
  medecinSpecialite: string,
  ordoNum: string,
) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const lignesHtml = lignes.map((l, i) => {
    const num = CHIFFRES_FR[i + 1] || `${i + 1}`
    return `
    <div class="med-line">
      <div class="med-num">${num.toUpperCase()}</div>
      <div class="med-body">
        <div class="med-name">${l.nom}${l.dose ? ' — ' + l.dose : ''}</div>
        <div class="med-detail">
          ${l.frequence || ''}${l.frequence && l.duree ? ' · ' : ''}${l.duree || ''}
        </div>
        ${l.instructions ? `<div class="med-instr">${l.instructions}</div>` : ''}
      </div>
    </div>`
  }).join('')

  // QR code simple SVG (texte encodé)
  const qrData = `ORDO:${ordoNum}:${patientNom}:${new Date().toISOString().slice(0, 10)}`
  const qrSvg = generateSimpleQR(qrData)

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Ordonnance — ${patientNom}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a18; padding: 1.5cm 2cm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #0f6e56; margin-bottom: 18px; }
.cabinet { font-size: 16pt; font-weight: bold; color: #0f6e56; }
.cabinet-sub { font-size: 9pt; color: #555; margin-top: 2px; }
.doc-info { text-align: right; font-size: 9pt; color: #555; }
.doc-name { font-size: 12pt; font-weight: bold; color: #1a1a18; }
.ordo-title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #0f6e56; margin: 0 0 14px; }
.patient-box { background: #f4f7f4; border: 1px solid #c0ddd5; border-radius: 5px; padding: 10px 14px; margin-bottom: 18px; display: flex; gap: 30px; }
.patient-field label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #888; display: block; margin-bottom: 1px; }
.patient-field span { font-size: 11pt; font-weight: bold; }
.med-line { display: flex; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #ddd; }
.med-line:last-child { border-bottom: none; }
.med-num { font-size: 10pt; font-weight: bold; color: #0f6e56; min-width: 40px; }
.med-body { flex: 1; }
.med-name { font-size: 12pt; font-weight: bold; }
.med-detail { font-size: 10pt; color: #333; margin-top: 2px; }
.med-instr { font-size: 9pt; color: #888; margin-top: 2px; font-style: italic; }
.footer { margin-top: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
.signature-area { text-align: center; }
.signature-line { width: 160px; border-bottom: 1px solid #888; margin: 36px auto 6px; }
.signature-label { font-size: 9pt; color: #555; }
.qr-area { text-align: center; }
.qr-label { font-size: 7pt; color: #aaa; margin-top: 4px; }
.stamp-area { font-size: 8pt; color: #888; }
.numero { font-size: 8pt; color: #aaa; font-family: monospace; }
@media print { body { padding: 1cm 1.5cm; } }
</style></head><body>
<div class="header">
  <div>
    <div class="cabinet">Curaé · ${medecinSpecialite}</div>
    <div class="cabinet-sub">${medecinNom}</div>
    <div class="cabinet-sub">Cocody, Riviera 3 · Abidjan, Côte d'Ivoire</div>
    <div class="cabinet-sub">Tél : +225 07 00 00 00</div>
  </div>
  <div class="doc-info">
    <div class="doc-name">${medecinNom}</div>
    <div>${medecinSpecialite}</div>
    <div style="margin-top:6px">Abidjan, le ${date}</div>
    <div class="numero">Réf : ${ordoNum}</div>
  </div>
</div>

<div class="ordo-title">Ordonnance médicale</div>

<div class="patient-box">
  <div class="patient-field">
    <label>Patient(e)</label>
    <span>${patientNom}</span>
  </div>
  ${patientAge ? `<div class="patient-field"><label>Âge</label><span>${patientAge} ans</span></div>` : ''}
</div>

<div>${lignesHtml}</div>

<div class="footer">
  <div class="signature-area">
    <div class="signature-line"></div>
    <div class="signature-label">${medecinNom}<br/>${medecinSpecialite}</div>
  </div>
  <div class="qr-area">
    ${qrSvg}
    <div class="qr-label">Authentification · ${ordoNum}</div>
  </div>
  <div class="stamp-area">
    <div style="border:2px solid #0f6e56;border-radius:4px;padding:8px 12px;color:#0f6e56;font-weight:bold;font-size:8pt;text-align:center">
      CACHET<br/>DU MÉDECIN
    </div>
    <div style="margin-top:6px;font-size:7pt;color:#aaa">Généré via Curaé · ${date}</div>
  </div>
</div>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 600)
}

// Génère un QR code SVG simplifié (matrice aléatoire comme placeholder visuel)
function generateSimpleQR(data: string): string {
  const size = 10
  const cells = []
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) & 0xffff
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = (hash ^ (r * 17 + c * 31)) & 1
      if (v) cells.push(`<rect x="${c * 4 + 2}" y="${r * 4 + 2}" width="3" height="3" fill="#0f6e56"/>`)
    }
  }
  // Finder patterns (coins)
  const fp = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="14" height="14" fill="#0f6e56"/><rect x="${x + 2}" y="${y + 2}" width="10" height="10" fill="#fff"/><rect x="${x + 4}" y="${y + 4}" width="6" height="6" fill="#0f6e56"/>`
  return `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">${fp(2, 2)}${fp(2, 34)}${fp(34, 2)}${cells.join('')}</svg>`
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OrdonnanceModal({
  onFermer, patientNom = '', patientAge, medecinNom = 'Dr.', medecinSpecialite = 'Médecin',
}: Props) {
  const [lignes, setLignes] = useState<LigneMedicament[]>([
    { id: genId(), nom: '', dose: '', frequence: '', duree: '', instructions: '' },
  ])
  const [mention, setMention] = useState('')

  function ajouterLigne() {
    setLignes(prev => [...prev, { id: genId(), nom: '', dose: '', frequence: '', duree: '', instructions: '' }])
  }

  function supprimerLigne(id: string) {
    setLignes(prev => prev.filter(l => l.id !== id))
  }

  function modifierLigne(id: string, key: keyof LigneMedicament, val: string) {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l))
  }

  const ordoNum = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const lignesRemplies = lignes.filter(l => l.nom.trim())

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 250, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 660,
        border: '1px solid #e0e0da',
        overflow: 'hidden', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          background: '#0f6e56', padding: '16px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill size={18} color="#fff" />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Ordonnance médicale</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                {patientNom || 'Patient'} · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
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
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lignes.map((l, i) => (
            <LigneMed key={l.id} ligne={l} index={i} onChange={modifierLigne} onDelete={supprimerLigne} />
          ))}

          <button
            onClick={ajouterLigne}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', borderRadius: 9,
              border: '1.5px dashed #0f6e56', background: 'transparent',
              fontSize: 13, fontWeight: 600, color: '#0f6e56', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Ajouter un médicament
          </button>

          {/* Mention complémentaire */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
              Mention complémentaire (optionnel)
            </div>
            <textarea
              value={mention}
              onChange={e => setMention(e.target.value)}
              placeholder="Ex: Repos au lit 3 jours. Éviter l'effort. Réévaluation dans 1 semaine…"
              rows={2}
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                border: '1.5px solid #e0e0da', borderRadius: 8, background: '#fafaf8',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#0f6e56')}
              onBlur={e => (e.target.style.borderColor = '#e0e0da')}
            />
          </div>

          {/* Info QR */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', background: '#f0fdf4', borderRadius: 8,
            border: '1px solid #86efac', fontSize: 12, color: '#166534',
          }}>
            <Save size={13} />
            L'ordonnance sera générée avec numéro unique, QR code d'authentification et zone de signature.
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid #e0e0da',
          background: '#fafaf8', display: 'flex', gap: 10, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button
            onClick={onFermer}
            style={{
              padding: '10px 20px', borderRadius: 9, border: '1.5px solid #e0e0da',
              background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: '#555', fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => genererOrdonnancePDF(lignesRemplies, patientNom, patientAge, medecinNom, medecinSpecialite, ordoNum)}
            disabled={lignesRemplies.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 9,
              background: lignesRemplies.length > 0 ? '#0f6e56' : '#e5e7eb',
              color: lignesRemplies.length > 0 ? '#fff' : '#9ca3af',
              border: 'none', fontSize: 14, fontWeight: 700,
              cursor: lignesRemplies.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            <Printer size={15} /> Générer ordonnance PDF
          </button>
        </div>
      </div>
    </div>
  )
}
