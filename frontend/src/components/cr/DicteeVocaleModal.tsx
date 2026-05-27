import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Mic, MicOff, ChevronRight, Loader2,
  CheckCircle, AlertTriangle, Edit3, Save, RefreshCw, User, ChevronDown,
} from 'lucide-react'
import { api } from '../../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────

type Etape = 0 | 1 | 2 | 3 | 4 | 5

const TYPES_CR = [
  { id: 'consultation_generale', label: 'Médecine générale' },
  { id: 'consultation',          label: 'Cardiologie' },
  { id: 'gynecologie',           label: 'Gynécologie / Obstétrique' },
  { id: 'pediatrie',             label: 'Pédiatrie' },
  { id: 'diabetologie',          label: 'Diabétologie' },
  { id: 'echocardiographie',     label: 'Échocardiographie' },
  { id: 'holter_ecg',            label: 'Holter ECG' },
  { id: 'holter_ta',             label: 'Holter tensionnel' },
]

interface CRStructure {
  motif: string
  anamnese: string
  examen_clinique: string
  conclusion: string
  traitement: string
  recommandations: string
}

interface Props {
  onFermer: () => void
  onSauvegarder: (cr: CRStructure & { transcription: string; patient_id: string; type_cr: string }) => void
}

// ─── Regex zones sensibles ───────────────────────────────────────────────────

const ZONES_SENSIBLES: { pattern: RegExp; label: string; couleur: string; bg: string }[] = [
  {
    pattern: /\b(\d+)\s*(mg|mcg|µg|g|ml|cp|comprimé|gélule|sachet|UI|unités?)\b(?:\s*(?:x|par|\/)\s*\d+\s*(?:fois?|j|jour|semaine|mois)?)?/gi,
    label: 'Posologie',
    couleur: '#dc2626',
    bg: '#fee2e2',
  },
  {
    pattern: /\b(metformine|amlodipine|atenolol|bisoprolol|lisinopril|enalapril|ramipril|losartan|furosemide|furosémide|spironolactone|atorvastatine|simvastatine|aspirine|clopidogrel|warfarine|dabigatran|rivaroxaban|apixaban|insuline|glibenclamide|glimepiride|sitagliptine|paracétamol|ibuprofen|amoxicilline|azithromycine|ciprofloxacine|metronidazole|fluconazole|oméprazole|pantoprazole|prednisolone|prednisone|dexamethasone)\b/gi,
    label: 'Médicament',
    couleur: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    pattern: /\b(allergi(?:e|que|ques?)\s+(?:à|au|aux)\s+\S+(?:\s+\S+)?|allergi(?:e|que)\s+connue?)\b/gi,
    label: 'Allergie',
    couleur: '#b45309',
    bg: '#fef3c7',
  },
  {
    pattern: /\b(diagnosti(?:c|qué)|conclusion\s*:?|impression\s+clinique|diagnostic\s+retenu)\b/gi,
    label: 'Diagnostic',
    couleur: '#0f6e56',
    bg: '#d1fae5',
  },
  {
    pattern: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})\b/gi,
    label: 'Date',
    couleur: '#1d4ed8',
    bg: '#dbeafe',
  },
  {
    pattern: /\b(\d+(?:[.,]\d+)?\s*(?:mmol\/l|mg\/dl|g\/l|g\/dl|%|bpm|mmhg|\/min|ui\/l|µmol\/l|nmol\/l|pmol\/l|mmo\/l))\b/gi,
    label: 'Résultat bio',
    couleur: '#0e7490',
    bg: '#cffafe',
  },
]

function highlightSensitiveZones(text: string): React.ReactNode[] {
  if (!text) return []

  // Build sorted list of matches with their zone info
  type Match = { start: number; end: number; label: string; couleur: string; bg: string; text: string }
  const matches: Match[] = []

  for (const zone of ZONES_SENSIBLES) {
    zone.pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = zone.pattern.exec(text)) !== null) {
      // No overlap
      const overlaps = matches.some(ex => m!.index < ex.end && m!.index + m![0].length > ex.start)
      if (!overlaps) {
        matches.push({ start: m.index, end: m.index + m[0].length, label: zone.label, couleur: zone.couleur, bg: zone.bg, text: m[0] })
      }
    }
  }

  matches.sort((a, b) => a.start - b.start)

  const nodes: React.ReactNode[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.start > cursor) nodes.push(text.slice(cursor, match.start))
    nodes.push(
      <mark
        key={match.start}
        title={match.label}
        style={{
          background: match.bg, color: match.couleur,
          borderRadius: 3, padding: '0 2px',
          fontWeight: 600, borderBottom: `1.5px solid ${match.couleur}`,
          cursor: 'help',
        }}
      >
        {match.text}
      </mark>
    )
    cursor = match.end
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function ProgressBar({ etape }: { etape: Etape }) {
  if (etape === 0) return null
  const labels = ['Dictée', 'Correction', 'IA', 'Validation', 'Terminé']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 4px' }}>
      {labels.map((label, i) => {
        const n = (i + 1) as Etape
        const done = etape > n
        const active = etape === n
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 5 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#0f6e56' : active ? '#0f6e56' : '#e5e7eb',
                color: done || active ? '#fff' : '#9ca3af',
                fontSize: 11, fontWeight: 700, transition: 'all 0.3s',
              }}>
                {done ? <CheckCircle size={13} /> : n}
              </div>
              <div style={{ fontSize: 9, color: active ? '#0f6e56' : done ? '#0f6e56' : '#9ca3af', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap' }}>
                {label}
              </div>
            </div>
            {n < 5 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px', marginBottom: 16,
                background: done ? '#0f6e56' : '#e5e7eb', transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function EditableField({ label, value, onChange, multiline = true }: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '9px 12px', fontSize: 13.5, border: '1.5px solid #e0e0da',
            borderRadius: 8, background: '#fafaf8', outline: 'none', resize: 'vertical',
            fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#0f6e56')}
          onBlur={e => (e.target.style.borderColor = '#e0e0da')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px', fontSize: 13.5, border: '1.5px solid #e0e0da',
            borderRadius: 8, background: '#fafaf8', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#0f6e56')}
          onBlur={e => (e.target.style.borderColor = '#e0e0da')}
        />
      )}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DicteeVocaleModal({ onFermer, onSauvegarder }: Props) {
  const [etape, setEtape] = useState<Etape>(0)
  const [enregistrement, setEnregistrement] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [transcriptionBrute, setTranscriptionBrute] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [supportSpeech, setSupportSpeech] = useState(true)
  const [cr, setCR] = useState<CRStructure>({
    motif: '', anamnese: '', examen_clinique: '', conclusion: '', traitement: '', recommandations: '',
  })

  // Étape 0 — sélection patient + type
  const [patients, setPatients] = useState<any[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [patientSelectionne, setPatientSelectionne] = useState<{ id: string; nom: string; prenoms: string } | null>(null)
  const [typeCR, setTypeCR] = useState('consultation_generale')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  useEffect(() => {
    api.patients.list().then(r => setPatients(r.patients || [])).catch(() => {})
  }, [])

  const recognitionRef = useRef<any>(null)
  const transcriptAccRef = useRef('')

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupportSpeech(false)
    }
    return () => { recognitionRef.current?.stop() }
  }, [])

  const demarrerDictee = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    transcriptAccRef.current = transcription

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = transcriptAccRef.current
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += (final ? ' ' : '') + t
          transcriptAccRef.current = final
        } else {
          interim = t
        }
      }
      setTranscription(final + (interim ? ' ' + interim : ''))
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      setErreur(`Erreur microphone: ${e.error}`)
      setEnregistrement(false)
    }

    recognition.onend = () => {
      if (enregistrement) recognition.start()
    }

    recognition.start()
    recognitionRef.current = recognition
    setEnregistrement(true)
    setErreur(null)
  }, [transcription, enregistrement])

  const arreterDictee = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setEnregistrement(false)
  }, [])

  async function validerTranscription() {
    if (!transcription.trim()) {
      setErreur('La transcription est vide. Dictez ou saisissez le texte.')
      return
    }
    setTranscriptionBrute(transcription)
    setEtape(3)
    setChargement(true)
    setErreur(null)

    try {
      const res = await api.cr.structurerTranscription({
        transcription,
        type_cr: typeCR,
        patient_context: patientSelectionne ? `${patientSelectionne.nom} ${patientSelectionne.prenoms}` : '',
      })
      setCR({
        motif: res.motif || '',
        anamnese: res.anamnese || '',
        examen_clinique: res.examen_clinique || '',
        conclusion: res.conclusion || '',
        traitement: res.traitement || '',
        recommandations: res.recommandations || '',
      })
      setEtape(4)
    } catch (e: any) {
      setErreur('Structuration IA échouée. Vérifiez votre connexion.')
      setEtape(2)
    } finally {
      setChargement(false)
    }
  }

  function validerCR() {
    onSauvegarder({
      ...cr,
      transcription: transcriptionBrute,
      patient_id: patientSelectionne?.id || '',
      type_cr: typeCR,
    })
    setEtape(5)
  }

  function updateCR(field: keyof CRStructure) {
    return (v: string) => setCR(prev => ({ ...prev, [field]: v }))
  }

  // ── Étape 0 — Sélection patient + type de consultation ───────────────────

  const patientsFiltrés = patients.filter(p => {
    const q = patientSearch.toLowerCase()
    return !q || p.nom?.toLowerCase().includes(q) || p.prenoms?.toLowerCase().includes(q)
  }).slice(0, 8)

  const renderEtape0 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>
          Sélectionner le patient et le type de consultation
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Ces informations structureront le compte-rendu final
        </div>
      </div>

      {/* Patient search */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Patient
        </div>
        <div style={{ position: 'relative' }}>
          <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb' }} />
          <input
            type="text"
            value={patientSelectionne ? `${patientSelectionne.nom} ${patientSelectionne.prenoms}` : patientSearch}
            onChange={e => {
              setPatientSearch(e.target.value)
              setPatientSelectionne(null)
              setShowPatientDropdown(true)
            }}
            onFocus={() => setShowPatientDropdown(true)}
            placeholder="Rechercher un patient…"
            style={{
              width: '100%', padding: '10px 12px 10px 38px', fontSize: 14,
              border: `1.5px solid ${patientSelectionne ? '#0f6e56' : '#e0e0da'}`, borderRadius: 9,
              background: '#fafaf8', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
          {showPatientDropdown && patientsFiltrés.length > 0 && !patientSelectionne && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1px solid #e0e0da', borderRadius: 9,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden',
            }}>
              {patientsFiltrés.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setPatientSelectionne({ id: p.id, nom: p.nom, prenoms: p.prenoms }); setShowPatientDropdown(false) }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                    borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f5f3'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: '#e8f4f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0f6e56', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.nom?.[0]}{p.prenoms?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nom} {p.prenoms}</div>
                    {p.telephone && <div style={{ fontSize: 12, color: '#888' }}>{p.telephone}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!patientSelectionne && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            Optionnel — la dictée est possible sans patient sélectionné
          </div>
        )}
      </div>

      {/* Type CR */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Type de consultation
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={typeCR}
            onChange={e => setTypeCR(e.target.value)}
            style={{
              width: '100%', padding: '10px 36px 10px 12px', fontSize: 14, appearance: 'none',
              border: '1.5px solid #e0e0da', borderRadius: 9, background: '#fafaf8',
              outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {TYPES_CR.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }} />
        </div>
      </div>

      <button
        onClick={() => { setShowPatientDropdown(false); setEtape(1) }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 0', borderRadius: 10, background: '#0f6e56',
          color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4,
        }}
      >
        Démarrer la dictée <Mic size={16} />
      </button>
    </div>
  )

  // ── Rendu par étape ────────────────────────────────────────────────────────

  const renderEtape1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '16px 0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 }}>
          {patientSelectionne ? `Consultation — ${patientSelectionne.nom} ${patientSelectionne.prenoms}` : 'Nouvelle dictée médicale'}
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Appuyez sur le micro et dictez votre compte-rendu à voix haute
        </div>
      </div>

      {!supportSpeech && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: '#fef3c7', borderRadius: 9, border: '1px solid #f59e0b',
          fontSize: 12, color: '#92400e', maxWidth: 420, textAlign: 'center',
        }}>
          <AlertTriangle size={14} />
          Microphone non disponible sur ce navigateur. Saisissez directement ci-dessous.
        </div>
      )}

      <button
        onClick={enregistrement ? arreterDictee : demarrerDictee}
        disabled={!supportSpeech}
        style={{
          width: 90, height: 90, borderRadius: '50%',
          background: enregistrement ? '#dc2626' : '#0f6e56',
          border: `4px solid ${enregistrement ? '#fca5a5' : '#86efac'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: supportSpeech ? 'pointer' : 'not-allowed',
          boxShadow: enregistrement ? '0 0 0 6px rgba(220,38,38,0.2)' : '0 4px 20px rgba(15,110,86,0.3)',
          transition: 'all 0.2s', outline: 'none',
          animation: enregistrement ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {enregistrement ? <MicOff size={32} color="#fff" /> : <Mic size={32} color="#fff" />}
      </button>
      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 6px rgba(220,38,38,0.2) } 50% { box-shadow: 0 0 0 12px rgba(220,38,38,0.05) } }`}</style>

      <div style={{ fontSize: 13, color: enregistrement ? '#dc2626' : '#888', fontWeight: enregistrement ? 700 : 400 }}>
        {enregistrement ? '● Enregistrement en cours…' : 'Cliquez pour démarrer'}
      </div>

      {/* Zone de transcription temps-réel */}
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Transcription {enregistrement ? '(temps réel)' : ''}
        </div>
        <textarea
          value={transcription}
          onChange={e => { setTranscription(e.target.value); transcriptAccRef.current = e.target.value }}
          placeholder="La transcription apparaîtra ici…&#10;Vous pouvez aussi saisir directement."
          rows={6}
          style={{
            width: '100%', padding: '12px 14px', fontSize: 14,
            border: `1.5px solid ${enregistrement ? '#dc2626' : '#e0e0da'}`,
            borderRadius: 10, background: '#fafaf8', outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7,
            boxSizing: 'border-box', transition: 'border-color 0.3s',
          }}
        />
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
          {transcription.split(/\s+/).filter(Boolean).length} mots
        </div>
      </div>

      <button
        onClick={() => setEtape(2)}
        disabled={!transcription.trim()}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 10,
          background: transcription.trim() ? '#0f6e56' : '#e5e7eb',
          color: transcription.trim() ? '#fff' : '#9ca3af',
          border: 'none', fontSize: 14, fontWeight: 700, cursor: transcription.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        Valider et corriger <ChevronRight size={16} />
      </button>
    </div>
  )

  const renderEtape2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>
          Relisez et corrigez votre transcription
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Vérifiez les termes médicaux avant la structuration IA
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Edit3 size={14} style={{ position: 'absolute', top: 12, right: 12, color: '#bbb' }} />
        <textarea
          value={transcription}
          onChange={e => setTranscription(e.target.value)}
          rows={10}
          style={{
            width: '100%', padding: '12px 14px', fontSize: 14,
            border: '1.5px solid #e0e0da', borderRadius: 10, background: '#fafaf8',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            lineHeight: 1.7, boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = '#0f6e56')}
          onBlur={e => (e.target.style.borderColor = '#e0e0da')}
        />
      </div>

      {erreur && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          <AlertTriangle size={15} />
          {erreur}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setEtape(1)}
          style={{
            flex: 1, padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0da',
            background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
          }}
        >
          ← Recommencer
        </button>
        <button
          onClick={validerTranscription}
          style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 9, background: '#7c3aed',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Structurer avec l'IA <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )

  const renderEtape3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '32px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
      }}>
        <Loader2 size={28} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>Structuration IA en cours…</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
          L'IA structure votre dictée en compte-rendu médical
        </div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 360,
      }}>
        {['Analyse de la transcription', 'Identification des sections', 'Structuration médicale', 'Extraction des zones sensibles'].map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, background: '#f3f4f6',
            fontSize: 13, color: '#6b7280',
          }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', animationDelay: `${i * 0.2}s` }} />
            {step}
          </div>
        ))}
      </div>
    </div>
  )

  const renderEtape4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: '10px 14px', borderRadius: 9,
        background: '#f0fdf4', border: '1px solid #86efac',
        fontSize: 12, color: '#166534', fontWeight: 600,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
        <span>
          Les <mark style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 3, padding: '0 2px' }}>médicaments</mark>,{' '}
          <mark style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 3, padding: '0 2px' }}>posologies</mark>,{' '}
          <mark style={{ background: '#fef3c7', color: '#b45309', borderRadius: 3, padding: '0 2px' }}>allergies</mark>{' '}
          et autres zones sensibles sont surlignées — vérifiez-les attentivement avant de valider.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <EditableField label="Motif de consultation" value={cr.motif} onChange={updateCR('motif')} multiline={false} />
        <EditableField label="Anamnèse" value={cr.anamnese} onChange={updateCR('anamnese')} />
        <EditableField label="Examen clinique" value={cr.examen_clinique} onChange={updateCR('examen_clinique')} />
        <EditableField label="Conclusion" value={cr.conclusion} onChange={updateCR('conclusion')} />

        {/* Traitement avec zones surlignées */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Traitement prescrit
            <span style={{ fontSize: 10, fontWeight: 500, color: '#888', marginLeft: 6, textTransform: 'none' }}>
              (zones sensibles surlignées — modifiable)
            </span>
          </div>
          {cr.traitement && (
            <div style={{
              padding: '10px 12px', background: '#fafaf8', border: '1px solid #e0e0da',
              borderRadius: 8, fontSize: 13.5, lineHeight: 1.7, marginBottom: 6,
              color: '#333',
            }}>
              {highlightSensitiveZones(cr.traitement)}
            </div>
          )}
          <textarea
            value={cr.traitement}
            onChange={e => updateCR('traitement')(e.target.value)}
            rows={3}
            placeholder="Traitement prescrit…"
            style={{
              width: '100%', padding: '9px 12px', fontSize: 13.5,
              border: '1.5px solid #e0e0da', borderRadius: 8,
              background: '#fafaf8', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#0f6e56')}
            onBlur={e => (e.target.style.borderColor = '#e0e0da')}
          />
        </div>

        <EditableField label="Recommandations et suivi" value={cr.recommandations} onChange={updateCR('recommandations')} />
      </div>

      <div style={{
        padding: '10px 14px', background: '#f9fafb', borderRadius: 8,
        border: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280',
        fontStyle: 'italic',
      }}>
        L'IA assiste la rédaction — le médecin garde toujours la validation finale
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { setEtape(2); setChargement(false) }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0da',
            background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555',
          }}
        >
          <RefreshCw size={14} /> Retraiter
        </button>
        <button
          onClick={validerCR}
          style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 9, background: '#0f6e56',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Save size={16} /> Valider et sauvegarder
        </button>
      </div>
    </div>
  )

  const renderEtape5 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#0f6e56',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(15,110,86,0.3)',
      }}>
        <CheckCircle size={32} color="#fff" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#333' }}>Compte-rendu sauvegardé</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
          Le CR a été créé avec succès et est disponible dans la liste des comptes-rendus.
        </div>
      </div>
      <button
        onClick={onFermer}
        style={{
          padding: '12px 32px', borderRadius: 10, background: '#0f6e56',
          color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Fermer
      </button>
    </div>
  )

  const ETAPES_CONTENU: Record<Etape, () => React.ReactNode> = {
    0: renderEtape0,
    1: renderEtape1,
    2: renderEtape2,
    3: renderEtape3,
    4: renderEtape4,
    5: renderEtape5,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 680,
        border: '1px solid #e0e0da',
        overflow: 'hidden', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f6e56, #0a5240)',
          padding: '18px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mic size={20} color="#fff" />
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Dictée vocale</div>
          </div>
          <button
            onClick={onFermer}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ padding: '16px 24px 0', background: '#fff', flexShrink: 0 }}>
          <ProgressBar etape={etape} />
        </div>

        {/* Contenu */}
        <div style={{ padding: '20px 24px 24px', overflowY: 'auto', flex: 1 }}>
          {chargement && etape === 3 ? renderEtape3() : ETAPES_CONTENU[etape]?.()}
        </div>
      </div>
    </div>
  )
}
