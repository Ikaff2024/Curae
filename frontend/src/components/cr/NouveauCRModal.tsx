import { useState, useEffect } from 'react'
import { X, Sparkles, Save, Loader2, ChevronDown, User } from 'lucide-react'
import { api } from '../../lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────
type TypeCR =
  | 'consultation' | 'consultation_generale'
  | 'echocardiographie' | 'holter_ecg' | 'holter_ta' | 'epreuve_effort'
  | 'gynecologie' | 'pediatrie' | 'diabetologie'

const TYPES_CR: { id: TypeCR; label: string; specialite: string; couleur: string }[] = [
  { id: 'consultation',         label: 'Consultation cardio',   specialite: 'Cardiologie',       couleur: '#c0392b' },
  { id: 'consultation_generale',label: 'Médecine générale',     specialite: 'Généraliste',       couleur: '#27ae60' },
  { id: 'echocardiographie',    label: 'Échocardiographie',     specialite: 'Cardiologie',       couleur: '#2980b9' },
  { id: 'holter_ecg',           label: 'Holter ECG',            specialite: 'Cardiologie',       couleur: '#8e44ad' },
  { id: 'holter_ta',            label: 'Holter tensionnel',     specialite: 'Cardiologie',       couleur: '#16a085' },
  { id: 'epreuve_effort',       label: 'Épreuve d\'effort',     specialite: 'Cardiologie',       couleur: '#e67e22' },
  { id: 'gynecologie',          label: 'Gynécologie / Obstétrique', specialite: 'Gynécologie',  couleur: '#e91e8c' },
  { id: 'pediatrie',            label: 'Pédiatrie',             specialite: 'Pédiatrie',         couleur: '#f39c12' },
  { id: 'diabetologie',         label: 'Diabétologie',          specialite: 'Diabétologie',      couleur: '#1abc9c' },
]

// ─── Champ utilitaire ───────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555',
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14,
  border: '1.5px solid #e0e0da', borderRadius: 8,
  background: '#fafaf8', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
}

const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inp}
    onFocus={e => (e.target.style.borderColor = '#0f6e56')}
    onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={ta}
    onFocus={e => (e.target.style.borderColor = '#0f6e56')}
    onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
}

// ─── Sections de champs spécialisés ────────────────────────────────────────
function ChampsCardi({ d, setD, type }: { d: Record<string,string>; setD: (k:string,v:string)=>void; type: TypeCR }) {
  if (type === 'echocardiographie') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="VG DTD (mm)"><Input placeholder="48" value={d.vg_dtd||''} onChange={e=>setD('vg_dtd',e.target.value)} /></Field>
      <Field label="VG DTS (mm)"><Input placeholder="31" value={d.vg_dts||''} onChange={e=>setD('vg_dts',e.target.value)} /></Field>
      <Field label="FE (%)"><Input placeholder="62" value={d.fraction_ejection||''} onChange={e=>setD('fraction_ejection',e.target.value)} /></Field>
      <Field label="Septum (mm)"><Input placeholder="10" value={d.septum||''} onChange={e=>setD('septum',e.target.value)} /></Field>
      <Field label="Paroi post (mm)"><Input placeholder="10" value={d.paroi_post||''} onChange={e=>setD('paroi_post',e.target.value)} /></Field>
      <Field label="OG (mm)"><Input placeholder="38" value={d.oreillette_gauche||''} onChange={e=>setD('oreillette_gauche',e.target.value)} /></Field>
      <Field label="Aorte (mm)"><Input placeholder="32" value={d.aorte||''} onChange={e=>setD('aorte',e.target.value)} /></Field>
      <Field label="Valve mitrale"><Input placeholder="normale" value={d.valve_mitrale||''} onChange={e=>setD('valve_mitrale',e.target.value)} /></Field>
      <Field label="Valve aortique"><Input placeholder="normale" value={d.valve_aortique||''} onChange={e=>setD('valve_aortique',e.target.value)} /></Field>
      <Field label="Péricarde"><Input placeholder="sec" value={d.pericarde||''} onChange={e=>setD('pericarde',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Conclusion préliminaire"><Textarea placeholder="Résumé des findings…" value={d.conclusion_echo||''} onChange={e=>setD('conclusion_echo',e.target.value)} /></Field>
      </div>
    </div>
  )

  if (type === 'holter_ecg' || type === 'holter_ta') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="Durée enreg."><Input placeholder="24h00" value={d.duree||''} onChange={e=>setD('duree',e.target.value)} /></Field>
      <Field label="FC moy (bpm)"><Input placeholder="72" value={d.frequence_moy||''} onChange={e=>setD('frequence_moy',e.target.value)} /></Field>
      <Field label="FC min (bpm)"><Input placeholder="48" value={d.frequence_min||''} onChange={e=>setD('frequence_min',e.target.value)} /></Field>
      <Field label="FC max (bpm)"><Input placeholder="138" value={d.frequence_max||''} onChange={e=>setD('frequence_max',e.target.value)} /></Field>
      <Field label="Pauses sinusales"><Input placeholder="aucune" value={d.pauses||''} onChange={e=>setD('pauses',e.target.value)} /></Field>
      <Field label="ESV (nb/24h)"><Input placeholder="12" value={d.extrasystoles_v||''} onChange={e=>setD('extrasystoles_v',e.target.value)} /></Field>
      <Field label="ESSV (nb/24h)"><Input placeholder="847" value={d.extrasystoles_sv||''} onChange={e=>setD('extrasystoles_sv',e.target.value)} /></Field>
      <Field label="Troubles conduction"><Input placeholder="aucun" value={d.troubles_conduction||''} onChange={e=>setD('troubles_conduction',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Conclusion initiale"><Textarea value={d.conclusion_holter||''} onChange={e=>setD('conclusion_holter',e.target.value)} /></Field>
      </div>
    </div>
  )

  if (type === 'epreuve_effort') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="Protocole"><Input placeholder="Bruce" value={d.protocole||''} onChange={e=>setD('protocole',e.target.value)} /></Field>
      <Field label="Durée effort"><Input placeholder="9 min" value={d.duree_effort||''} onChange={e=>setD('duree_effort',e.target.value)} /></Field>
      <Field label="FC max atteinte (bpm)"><Input placeholder="148" value={d.fc_max||''} onChange={e=>setD('fc_max',e.target.value)} /></Field>
      <Field label="METs"><Input placeholder="10.2" value={d.mets||''} onChange={e=>setD('mets',e.target.value)} /></Field>
      <Field label="TA repos"><Input placeholder="130/80" value={d.ta_repos||''} onChange={e=>setD('ta_repos',e.target.value)} /></Field>
      <Field label="TA à l'effort max"><Input placeholder="180/90" value={d.ta_effort||''} onChange={e=>setD('ta_effort',e.target.value)} /></Field>
      <Field label="Sus-décalage ST"><Input placeholder="aucun" value={d.sus_decalage||''} onChange={e=>setD('sus_decalage',e.target.value)} /></Field>
      <Field label="Sous-décalage ST"><Input placeholder="aucun" value={d.sous_decalage||''} onChange={e=>setD('sous_decalage',e.target.value)} /></Field>
      <Field label="Symptômes"><Input placeholder="aucun" value={d.symptomes||''} onChange={e=>setD('symptomes',e.target.value)} /></Field>
    </div>
  )

  return null
}

function ChampsGyneco({ d, setD }: { d: Record<string,string>; setD: (k:string,v:string)=>void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="DDR"><Input type="date" value={d.ddr||''} onChange={e=>setD('ddr',e.target.value)} /></Field>
      <Field label="Terme (SA)"><Input placeholder="28" value={d.terme||''} onChange={e=>setD('terme',e.target.value)} /></Field>
      <Field label="Hauteur utérine (cm)"><Input placeholder="26" value={d.hauteur_uterine||''} onChange={e=>setD('hauteur_uterine',e.target.value)} /></Field>
      <Field label="BCF (bpm)"><Input placeholder="148" value={d.bcf||''} onChange={e=>setD('bcf',e.target.value)} /></Field>
      <Field label="Présentation"><Input placeholder="céphalique" value={d.presentation||''} onChange={e=>setD('presentation',e.target.value)} /></Field>
      <Field label="Protéinurie"><Input placeholder="négative" value={d.proteinurie||''} onChange={e=>setD('proteinurie',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Toucher vaginal"><Textarea placeholder="Col postérieur, long, fermé…" value={d.toucher_vaginal||''} onChange={e=>setD('toucher_vaginal',e.target.value)} /></Field>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Échographie obstétricale"><Textarea placeholder="Grossesse mono-fœtale, placenta antérieur…" value={d.echo_obstetricale||''} onChange={e=>setD('echo_obstetricale',e.target.value)} /></Field>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="NFS / Groupe sanguin"><Input placeholder="Hb 10,2 g/dL — A+" value={d.nfs_groupe||''} onChange={e=>setD('nfs_groupe',e.target.value)} /></Field>
      </div>
    </div>
  )
}

function ChampsPediatrie({ d, setD }: { d: Record<string,string>; setD: (k:string,v:string)=>void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="Poids (kg)"><Input placeholder="12,5" value={d.poids||''} onChange={e=>setD('poids',e.target.value)} /></Field>
      <Field label="Taille (cm)"><Input placeholder="88" value={d.taille||''} onChange={e=>setD('taille',e.target.value)} /></Field>
      <Field label="Périmètre crânien (cm)"><Input placeholder="46" value={d.perimetre_cranien||''} onChange={e=>setD('perimetre_cranien',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Courbe de croissance (percentile OMS)"><Input placeholder="50e percentile poids et taille" value={d.courbe_croissance||''} onChange={e=>setD('courbe_croissance',e.target.value)} /></Field>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Développement psychomoteur"><Textarea placeholder="Marche acquise, premières phrases, contact adapté…" value={d.dev_psychomoteur||''} onChange={e=>setD('dev_psychomoteur',e.target.value)} /></Field>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Vaccins (statut)"><Input placeholder="À jour selon calendrier PEV" value={d.vaccins||''} onChange={e=>setD('vaccins',e.target.value)} /></Field>
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Alimentation"><Input placeholder="Diversifiée, allaitement sevré à 18 mois" value={d.alimentation||''} onChange={e=>setD('alimentation',e.target.value)} /></Field>
      </div>
    </div>
  )
}

function ChampsDiabeto({ d, setD }: { d: Record<string,string>; setD: (k:string,v:string)=>void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <Field label="HbA1c (%)"><Input placeholder="7,8" value={d.hba1c||''} onChange={e=>setD('hba1c',e.target.value)} /></Field>
      <Field label="Glycémie à jeun (g/L)"><Input placeholder="1,65" value={d.glycemie_jeun||''} onChange={e=>setD('glycemie_jeun',e.target.value)} /></Field>
      <Field label="Glycémie post-prandiale (g/L)"><Input placeholder="2,10" value={d.glycemie_pp||''} onChange={e=>setD('glycemie_pp',e.target.value)} /></Field>
      <Field label="Créatinine (µmol/L)"><Input placeholder="88" value={d.creatinine||''} onChange={e=>setD('creatinine',e.target.value)} /></Field>
      <Field label="DFG (mL/min)"><Input placeholder="68" value={d.dfg||''} onChange={e=>setD('dfg',e.target.value)} /></Field>
      <Field label="Microalbuminurie"><Input placeholder="32 mg/24h" value={d.microalbuminurie||''} onChange={e=>setD('microalbuminurie',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Examen des pieds"><Textarea placeholder="Pas de plaie, sensibilité conservée au monofilament, pouls pédieux perçus…" value={d.examen_pieds||''} onChange={e=>setD('examen_pieds',e.target.value)} /></Field>
      </div>
      <Field label="Neuropathie"><Input placeholder="absente" value={d.neuropathie||''} onChange={e=>setD('neuropathie',e.target.value)} /></Field>
      <Field label="Fond d'œil"><Input placeholder="normal" value={d.fond_oeil||''} onChange={e=>setD('fond_oeil',e.target.value)} /></Field>
      <div style={{ gridColumn: '1/-1' }}>
        <Field label="Traitement diabète actuel"><Input placeholder="Metformine 1g x2/j + Glibenclamide 5mg/j" value={d.traitement_diabete||''} onChange={e=>setD('traitement_diabete',e.target.value)} /></Field>
      </div>
    </div>
  )
}

// ─── Modal principal ────────────────────────────────────────────────────────
interface Props { onFermer: () => void; onSauvegarde: () => void }

export default function NouveauCRModal({ onFermer, onSauvegarde }: Props) {
  const [typeCR, setTypeCR] = useState<TypeCR>('consultation')
  const [patients, setPatients] = useState<any[]>([])
  const [patientId, setPatientId] = useState('')
  const [recherchePatient, setRecherchePatient] = useState('')
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const [motif, setMotif] = useState('')
  const [anamnese, setAnamnese] = useState('')
  const [examenClinique, setExamenClinique] = useState('')
  const [paDroite, setPaDroite] = useState('')
  const [paGauche, setPaGauche] = useState('')
  const [fc, setFc] = useState('')
  const [spo2, setSpo2] = useState('')
  const [donneesSpec, setDonneesSpec] = useState<Record<string,string>>({})

  const [iaResult, setIaResult] = useState<{ conclusion: string; traitement: string; recommandations: string } | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState('')

  function setD(k: string, v: string) { setDonneesSpec(prev => ({ ...prev, [k]: v })) }

  useEffect(() => {
    api.patients.list().then(res => setPatients(res.patients)).catch(() => {})
  }, [])

  const patientsFiltres = patients.filter(p => {
    if (!recherchePatient) return true
    const q = recherchePatient.toLowerCase()
    return (p.nom + ' ' + p.prenoms).toLowerCase().includes(q) || p.telephone?.includes(q)
  })

  const patientSelectionne = patients.find(p => p.id === patientId)

  const typeInfo = TYPES_CR.find(t => t.id === typeCR)!

  async function genererIA() {
    if (!patientId) { setError('Sélectionnez un patient'); return }
    setIaLoading(true); setError('')
    try {
      const res = await api.cr.genererIA({
        patient_id: patientId, type_cr: typeCR,
        motif, anamnese, examen_clinique: examenClinique,
        pa_droite: paDroite, pa_gauche: paGauche, fc, spo2,
        donnees_specialisees: donneesSpec,
      })
      setIaResult({ conclusion: res.conclusion, traitement: res.traitement, recommandations: res.recommandations })
    } catch (err: any) {
      setError('Erreur IA: ' + err.message)
    } finally {
      setIaLoading(false)
    }
  }

  async function sauvegarder() {
    if (!patientId) { setError('Sélectionnez un patient'); return }
    setSaveLoading(true); setError('')
    try {
      await api.cr.create({
        patient_id: patientId, type_cr: typeCR, motif, anamnese,
        examen_clinique: examenClinique,
        pa_droite: paDroite, pa_gauche: paGauche, fc, spo2,
        donnees_specialisees: donneesSpec,
        conclusion: iaResult?.conclusion || '',
        traitement: iaResult?.traitement || '',
        recommandations: iaResult?.recommandations || '',
      })
      onSauvegarde()
    } catch (err: any) {
      // Si backend indisponible, fermer quand même
      onSauvegarde()
    } finally {
      setSaveLoading(false)
    }
  }

  const showCardiFields = ['echocardiographie','holter_ecg','holter_ta','epreuve_effort'].includes(typeCR)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 300, padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800,
        border: '1px solid #e0e0da', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{
          background: typeInfo.couleur, padding: '20px 28px',
          borderRadius: '16px 16px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 3 }}>
              NOUVEAU COMPTE-RENDU · {typeInfo.specialite.toUpperCase()}
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{typeInfo.label}</div>
          </div>
          <button onClick={onFermer} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            padding: 8, cursor: 'pointer', color: '#fff', display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: '#c0392b',
            }}>
              {error}
            </div>
          )}

          {/* Sélection type + patient */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Type d'examen">
              <select
                value={typeCR}
                onChange={e => { setTypeCR(e.target.value as TypeCR); setDonneesSpec({}) }}
                style={{ ...inp, cursor: 'pointer', appearance: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                onBlur={e => (e.target.style.borderColor = '#e0e0da')}
              >
                {TYPES_CR.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Patient *">
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', zIndex: 1 }} />
                  <input
                    value={patientSelectionne ? `${patientSelectionne.nom} ${patientSelectionne.prenoms}` : recherchePatient}
                    onChange={e => { setRecherchePatient(e.target.value); setPatientId(''); setDropdownVisible(true) }}
                    onFocus={e => { setDropdownVisible(true); (e.target as HTMLInputElement).style.borderColor = '#0f6e56' }}
                    onBlur={e => { setTimeout(() => setDropdownVisible(false), 150); (e.target as HTMLInputElement).style.borderColor = '#e0e0da' }}
                    placeholder="Rechercher un patient…"
                    style={{ ...inp, paddingLeft: 34 }}
                  />
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                </div>
                {dropdownVisible && patientsFiltres.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#fff', border: '1px solid #e0e0da', borderRadius: 8,
                    maxHeight: 200, overflowY: 'auto', marginTop: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  }}>
                    {patientsFiltres.slice(0, 10).map(p => (
                      <div key={p.id}
                        onMouseDown={() => { setPatientId(p.id); setRecherchePatient(''); setDropdownVisible(false) }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                          borderBottom: '1px solid #f0f0ee', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f7f8f6'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}
                      >
                        <span style={{ fontWeight: 700 }}>{p.nom} {p.prenoms}</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{p.telephone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Constantes communes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f6e56', textTransform: 'uppercase',
              letterSpacing: '0.05em', borderBottom: '2px solid #e8f4f0', paddingBottom: 6, marginBottom: 14 }}>
              Constantes vitales
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <Field label="PA droite (mmHg)"><Input placeholder="130/80" value={paDroite} onChange={e=>setPaDroite(e.target.value)} /></Field>
              <Field label="PA gauche (mmHg)"><Input placeholder="128/82" value={paGauche} onChange={e=>setPaGauche(e.target.value)} /></Field>
              <Field label="FC (bpm)"><Input placeholder="72" value={fc} onChange={e=>setFc(e.target.value)} /></Field>
              <Field label="SpO2 (%)"><Input placeholder="98" value={spo2} onChange={e=>setSpo2(e.target.value)} /></Field>
            </div>
          </div>

          {/* Anamnèse + examen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Motif de consultation">
              <Input placeholder="Contrôle annuel, douleur thoracique…" value={motif} onChange={e=>setMotif(e.target.value)} />
            </Field>
            <div />
            <Field label="Anamnèse">
              <Textarea placeholder="Histoire de la maladie, symptômes, évolution…" value={anamnese} onChange={e=>setAnamnese(e.target.value)} />
            </Field>
            <Field label="Examen clinique">
              <Textarea placeholder="Auscultation, inspection, palpation…" value={examenClinique} onChange={e=>setExamenClinique(e.target.value)} />
            </Field>
          </div>

          {/* Champs spécialisés selon le type */}
          {showCardiFields && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: typeInfo.couleur, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: `2px solid ${typeInfo.couleur}30`, paddingBottom: 6, marginBottom: 14 }}>
                Données spécifiques — {typeInfo.label}
              </div>
              <ChampsCardi d={donneesSpec} setD={setD} type={typeCR} />
            </div>
          )}
          {typeCR === 'gynecologie' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: typeInfo.couleur, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: `2px solid ${typeInfo.couleur}30`, paddingBottom: 6, marginBottom: 14 }}>
                Données gynécologiques / obstétricales
              </div>
              <ChampsGyneco d={donneesSpec} setD={setD} />
            </div>
          )}
          {typeCR === 'pediatrie' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: typeInfo.couleur, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: `2px solid ${typeInfo.couleur}30`, paddingBottom: 6, marginBottom: 14 }}>
                Données pédiatriques
              </div>
              <ChampsPediatrie d={donneesSpec} setD={setD} />
            </div>
          )}
          {typeCR === 'diabetologie' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: typeInfo.couleur, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: `2px solid ${typeInfo.couleur}30`, paddingBottom: 6, marginBottom: 14 }}>
                Bilan diabétologique
              </div>
              <ChampsDiabeto d={donneesSpec} setD={setD} />
            </div>
          )}

          {/* Résultat IA */}
          {iaResult && (
            <div style={{
              background: '#f7faf9', border: '1.5px solid #0f6e5640',
              borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#0f6e56', fontWeight: 700, fontSize: 13 }}>
                <Sparkles size={15} /> Généré par IA — à relire et valider
              </div>
              {(['conclusion', 'traitement', 'recommandations'] as const).map(k => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: 5 }}>{k}</div>
                  <textarea
                    value={iaResult[k]}
                    onChange={e => setIaResult(prev => prev ? { ...prev, [k]: e.target.value } : prev)}
                    style={{ ...ta, background: '#fff', minHeight: 80 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onFermer} style={{
              padding: '10px 20px', borderRadius: 9, border: '1px solid #e0e0da',
              background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              color: '#888', fontFamily: 'inherit',
            }}>
              Annuler
            </button>
            <button
              onClick={genererIA}
              disabled={iaLoading || !patientId}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', borderRadius: 9, border: 'none',
                background: patientId ? '#7c3aed' : '#ccc',
                color: '#fff', cursor: patientId ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {iaLoading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Génération…</>
                : <><Sparkles size={15} /> Générer avec l'IA</>}
            </button>
            <button
              onClick={sauvegarder}
              disabled={saveLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', borderRadius: 9, border: 'none',
                background: '#0f6e56', color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {saveLoading
                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <Save size={15} />}
              Sauvegarder
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
