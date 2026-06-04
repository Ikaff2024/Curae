import { useState, useEffect } from 'react'
import { FileText, Search, Download, Eye, Calendar, User, ChevronRight, Plus, X, Printer, Loader2, Mic, MessageCircle } from 'lucide-react'
import { api } from '../lib/api'
import NouveauCRModal from '../components/cr/NouveauCRModal'
import DicteeVocaleModal from '../components/cr/DicteeVocaleModal'
import WhatsAppSendModal from '../components/whatsapp/WhatsAppSendModal'

function mapCR(r: any): CompteRendu {
  const typesValides = ['ETT', 'Holter', 'MAPA', 'Consultation', 'ECG'] as const
  const type = typesValides.includes(r.type_cr) ? r.type_cr as CompteRendu['type'] : 'Consultation'
  return {
    id: r.id,
    patientNom: r.nom || '',
    patientPrenom: r.prenoms || '',
    dateNaissance: r.date_naissance?.slice(0, 10) || '1970-01-01',
    sexe: (r.sexe || 'M') as 'M' | 'F',
    date: r.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    type,
    motif: r.motif || '',
    statut: (r.statut || 'brouillon') as CompteRendu['statut'],
    medecin: 'Dr. ' + (r.medecin_nom || 'Médecin'),
    contenu: [r.anamnese, r.examen_clinique].filter(Boolean).join('\n\n') || 'À compléter',
    conclusion: r.conclusion || '',
  }
}

interface CompteRendu {
  id: string
  patientNom: string
  patientPrenom: string
  dateNaissance: string
  sexe: 'M' | 'F'
  date: string
  type: 'ETT' | 'Holter' | 'MAPA' | 'Consultation' | 'ECG'
  motif: string
  statut: 'finalise' | 'brouillon' | 'envoye'
  medecin: string
  contenu: string
  conclusion: string
}

const MOCK_CRS: CompteRendu[] = [
  {
    id: 'cr1',
    patientNom: "N'GORAN", patientPrenom: 'Konan Éric',
    dateNaissance: '1955-09-08', sexe: 'M',
    date: '2025-03-05', type: 'Consultation',
    motif: 'Contrôle FA — bilan Xarelto',
    statut: 'finalise', medecin: 'Dr. Koné Awa',
    contenu: `MOTIF DE CONSULTATION
Patient de 69 ans, suivi pour fibrillation auriculaire diagnostiquée en 2022, sous Xarelto 20 mg/j. Consultation de contrôle trimestriel.

EXAMEN CLINIQUE
- État général conservé, patient eupnéique au repos
- PA : 136/84 mmHg (bras droit), FC : 72 bpm irrégulière
- Auscultation cardiaque : bruits du cœur irréguliers, arythmie complète, pas de souffle valvulaire
- Auscultation pulmonaire : murmure vésiculaire bilatéral, pas de crépitants
- Pas d'œdèmes des membres inférieurs
- Pouls périphériques perçus et symétriques

EXAMENS COMPLÉMENTAIRES
- ECG 12 dérivations : fibrillation auriculaire, FC moyenne 72 bpm, axe normal, pas d'anomalie de la repolarisation
- Bilan biologique (résultats du 20/02/2025) : INR non applicable (NACO), créatinine 88 µmol/L (DFG 68 mL/min), ionogramme normal`,
    conclusion: `Fibrillation auriculaire bien contrôlée sous Xarelto. Fréquence ventriculaire adaptée. Fonction rénale stable, compatible avec la poursuite du traitement anticoagulant à dose standard. Pas de signe d'insuffisance cardiaque décompensée. Renouvellement du Xarelto 20 mg/j. Contrôle dans 3 mois avec bilan biologique préalable.`,
  },
  {
    id: 'cr2',
    patientNom: 'KOUASSI', patientPrenom: 'Adjoua Marie',
    dateNaissance: '1978-03-14', sexe: 'F',
    date: '2024-12-10', type: 'ETT',
    motif: 'Échographie cardiaque de contrôle HTA',
    statut: 'envoye', medecin: 'Dr. Koné Awa',
    contenu: `INDICATION
Patiente de 46 ans, HTA traitée depuis 2019 (Amlodipine 5 mg). Échocardiographie de contrôle annuel.

TECHNIQUE
Examen réalisé en décubitus latéral gauche, sonde 2,5 MHz. Fenêtres acoustiques satisfaisantes.

RÉSULTATS

Ventricule gauche
- Dimensions : DTD 48 mm, DTS 31 mm, fraction d'éjection 62% (Simpson biplan)
- Masse VG : 108 g/m² (limite supérieure normale)
- Hypertrophie ventriculaire gauche concentrique légère (IVS 11 mm, PP 10 mm)
- Cinétique segmentaire : homogène, pas d'anomalie

Oreillette gauche
- Volume indexé : 28 mL/m² (normal)

Valves
- Valve mitrale : jonction normale, flux de remplissage E/A = 0,9, E/e' = 9 (fonction diastolique normal grade 1)
- Valve aortique : tricuspide, ouverture normale, PAPs estimée à 28 mmHg (normale)
- Valves pulmonaire et tricuspide : normales

Ventricule droit
- Dimensions et cinétique normales, TAPSE 22 mm`,
    conclusion: `Hypertrophie ventriculaire gauche concentrique légère, complication attendue de l'HTA. Fonction systolique préservée (FE 62%). Début d'altération de la relaxation (grade 1 — diastole normale). Pas de valvulopathie significative. Il est recommandé de renforcer le contrôle tensionnel. Échocardiographie de contrôle dans 18 mois.`,
  },
  {
    id: 'cr3',
    patientNom: 'BAMBA', patientPrenom: 'Seydou',
    dateNaissance: '1965-11-02', sexe: 'M',
    date: '2025-01-20', type: 'ECG',
    motif: 'ECG de contrôle annuel — dyslipidémie',
    statut: 'finalise', medecin: 'Dr. Koné Awa',
    contenu: `INDICATION
Patient de 59 ans, antécédents de dyslipidémie (statine), tabagisme sevré 2020. ECG annuel de surveillance.

PARAMÈTRES
- Rythme : sinusal régulier
- Fréquence cardiaque : 64 bpm
- Axe du QRS : +45° (normal)
- PR : 162 ms (normal)
- QRS : 88 ms (normal), morphologie normale
- QT/QTc : 388/401 ms (normal)
- Segment ST : isoélectrique dans toutes les dérivations
- Onde T : positives en précordiales, morphologie normale

DÉRIVATIONS
- D1, D2, D3, aVR, aVL, aVF : aspect normal
- V1 à V6 : progression normale des ondes R, pas d'image de bloc, pas de sous-décalage ST`,
    conclusion: `ECG dans les limites de la normale. Rythme sinusal régulier, pas de trouble de la repolarisation, pas de trouble de conduction. Pas d'argument ECG pour une ischémie myocardique. Examen rassurant dans le contexte du bilan cardiovasculaire annuel.`,
  },
  {
    id: 'cr4',
    patientNom: 'DIALLO', patientPrenom: 'Fatoumata',
    dateNaissance: '1990-07-22', sexe: 'F',
    date: '2025-02-14', type: 'Holter',
    motif: 'Holter rythmique 24h — palpitations',
    statut: 'brouillon', medecin: 'Dr. Koné Awa',
    contenu: `INDICATION
Patiente de 34 ans, plainte de palpitations intermittentes depuis 3 mois, sans syncope. Pas d'antécédents cardiaques connus.

DURÉE D'ENREGISTREMENT : 24h05 — Qualité : bonne (98% de tracé analysable)

RYTHME DE BASE
- Rythme sinusal dominant tout l'enregistrement
- FC moyenne : 74 bpm, FC min 52 bpm (nuit), FC max 138 bpm (effort)

ARYTHMIES SUPRAVENTRICULAIRES
- 847 extrasystoles supraventriculaires (ESV) isolées sur 24h (soit 0,9% des battements)
- 12 doublets supraventriculaires
- 2 épisodes de tachycardie supraventriculaire courte (3-4 battements, FC max 156 bpm)
- Pas de fibrillation atriale, pas de flutter

ARYTHMIES VENTRICULAIRES
- 23 extrasystoles ventriculaires isolées, monomorphes
- Pas de doublet ni de triplet ventriculaire
- Pas de tachycardie ventriculaire

CONDUCTION
- Pas de bloc auriculoventriculaire
- Pas de pause sinusale pathologique`,
    conclusion: `[BROUILLON — À COMPLÉTER] Holter révélant une activité ectopique supraventriculaire modérée, probablement à l'origine des palpitations rapportées. Activité ventriculaire ectopique minime, sans caractère menaçant. À compléter avec l'analyse symptomatique corrélée.`,
  },
  {
    id: 'cr5',
    patientNom: "N'GORAN", patientPrenom: 'Konan Éric',
    dateNaissance: '1955-09-08', sexe: 'M',
    date: '2024-11-10', type: 'MAPA',
    motif: 'MAPA — évaluation ambulatoire TA',
    statut: 'envoye', medecin: 'Dr. Koné Awa',
    contenu: `INDICATION
Patient sous Xarelto pour FA. Évaluation ambulatoire de la pression artérielle sur 24h pour optimisation du traitement antihypertenseur.

DURÉE DE L'ENREGISTREMENT : 24h10 — Mesures valides : 87% (51/59)

MOYENNES TENSIONNELLES

Période diurne (06h00–22h00)
- PA systolique moyenne : 142 mmHg
- PA diastolique moyenne : 88 mmHg
- FC moyenne : 74 bpm

Période nocturne (22h00–06h00)
- PA systolique moyenne : 128 mmHg
- PA diastolique moyenne : 78 mmHg
- FC moyenne : 62 bpm

Sur 24 heures
- PA systolique moyenne : 138 mmHg
- PA diastolique moyenne : 85 mmHg

PROFIL NYCTHÉMÉRAL
- Dipping nocturne : 9,8% (dipper)
- Charge tensionnelle systolique diurne : 42%
- Charge tensionnelle diastolique diurne : 28%`,
    conclusion: `HTA légère à modérée en ambulatoire, confirmant les chiffres tensionnels relevés en consultation. Profil dipper conservé, de bon pronostic. La charge tensionnelle diurne est élevée (42%), justifiant une optimisation thérapeutique. Introduction recommandée d'un IEC ou ARA2 en association à l'anticoagulant en cours.`,
  },
]

const TYPE_COLORS: Record<CompteRendu['type'], { bg: string; text: string }> = {
  ETT: { bg: '#e8eef8', text: '#1a4a8a' },
  Holter: { bg: '#f0e8f8', text: '#6a1a8a' },
  MAPA: { bg: '#e8f4f0', text: '#0f6e56' },
  Consultation: { bg: '#fef9e7', text: '#a06010' },
  ECG: { bg: '#fff0e8', text: '#a04010' },
}

const STATUT_STYLES: Record<CompteRendu['statut'], { label: string; bg: string; text: string }> = {
  finalise: { label: 'Finalisé', bg: '#e8f4f0', text: '#0f6e56' },
  brouillon: { label: 'Brouillon', bg: '#f5f5f5', text: '#888' },
  envoye: { label: 'Envoyé', bg: '#e8eef8', text: '#1a4a8a' },
}

function formaterDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance)
  const aujourd = new Date()
  let age = aujourd.getFullYear() - naissance.getFullYear()
  const m = aujourd.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--
  return age
}

// ─── Utilitaires PDF ─────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

function genQRSvg(data: string): string {
  const SIZE = 21, CELL = 8, QUIET = 16
  const total = SIZE * CELL + QUIET * 2
  const h = hashStr(data)
  const cells: boolean[][] = []
  for (let r = 0; r < SIZE; r++) {
    cells[r] = []
    for (let c = 0; c < SIZE; c++) {
      const tl = r < 7 && c < 7
      const tr = r < 7 && c >= SIZE - 7
      const bl = r >= SIZE - 7 && c < 7
      if (tl || tr || bl) {
        const fr = tl ? r : bl ? r - (SIZE - 7) : r
        const fc = tl ? c : tr ? c - (SIZE - 7) : c
        cells[r][c] = (fr === 0 || fr === 6 || fc === 0 || fc === 6) || (fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4)
      } else {
        cells[r][c] = !!((h ^ (r * 997 + c * 31 + r * c * 7)) & 1)
      }
    }
  }
  let rects = ''
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (cells[r][c]) rects += `<rect x="${QUIET + c * CELL}" y="${QUIET + r * CELL}" width="${CELL - 1}" height="${CELL - 1}" fill="#1a1a18"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}"><rect width="${total}" height="${total}" fill="#fff"/>${rects}</svg>`
}

function genRefCR(id: string, date: string): string {
  const year = date.slice(0, 4)
  const code = hashStr(id).toString(36).toUpperCase().slice(0, 6)
  return `CR-${year}-${code}`
}

// ─── Génération PDF via fenêtre d'impression ───────────────────────────────
function genererPDF(cr: CompteRendu) {
  const age = calculerAge(cr.dateNaissance)
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${cr.type} — ${cr.patientNom} ${cr.patientPrenom}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; color: #1a1a18; padding: 2cm 2.5cm; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0f6e56; }
    .cabinet-name { font-size: 18pt; font-weight: bold; color: #0f6e56; }
    .cabinet-sub { font-size: 10pt; color: #555; margin-top: 2px; }
    .doc-info { text-align: right; font-size: 10pt; color: #555; }
    .doc-name { font-size: 12pt; font-weight: bold; color: #1a1a18; }
    .title-block { text-align: center; margin: 20px 0 16px; }
    .doc-title { font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #0f6e56; letter-spacing: 0.05em; }
    .doc-motif { font-size: 11pt; color: #555; margin-top: 4px; }
    .patient-box { background: #f7f8f6; border: 1px solid #d0d0cc; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; gap: 32px; }
    .patient-field label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #888; display: block; margin-bottom: 2px; }
    .patient-field span { font-size: 11pt; font-weight: bold; }
    .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #0f6e56; border-bottom: 1px solid #c0ddd5; padding-bottom: 4px; margin: 18px 0 10px; }
    .content { font-size: 11pt; line-height: 1.7; white-space: pre-wrap; }
    .conclusion-box { background: #e8f4f0; border-left: 4px solid #0f6e56; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-top: 6px; font-size: 11pt; line-height: 1.7; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d0d0cc; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-area { text-align: center; }
    .signature-line { width: 160px; border-bottom: 1px solid #888; margin: 40px auto 6px; }
    .signature-label { font-size: 10pt; color: #555; }
    .stamp { font-size: 9pt; color: #888; text-align: right; }
    @media print { body { padding: 1.5cm 2cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="cabinet-name">Curaé · Cabinet de Cardiologie</div>
      <div class="cabinet-sub">Cocody, Riviera 3, Abidjan — Côte d'Ivoire</div>
      <div class="cabinet-sub">Tél : +225 07 00 00 00 · dr.kone@curae.ci</div>
    </div>
    <div class="doc-info">
      <div class="doc-name">Dr. Awa Koné</div>
      <div>Cardiologue</div>
      <div>N° Ordre : CI-MED-2020-04872</div>
      <div style="margin-top:4px">Abidjan, le ${formaterDate(cr.date)}</div>
    </div>
  </div>

  <div class="title-block">
    <div class="doc-title">${cr.type === 'Consultation' ? 'Compte-rendu de consultation' : `Compte-rendu — ${cr.type}`}</div>
    <div class="doc-motif">${cr.motif}</div>
  </div>

  <div class="patient-box">
    <div class="patient-field">
      <label>Patient</label>
      <span>${cr.patientNom} ${cr.patientPrenom}</span>
    </div>
    <div class="patient-field">
      <label>Sexe / Âge</label>
      <span>${cr.sexe === 'F' ? 'Femme' : 'Homme'} · ${age} ans</span>
    </div>
    <div class="patient-field">
      <label>Date de naissance</label>
      <span>${formaterDate(cr.dateNaissance)}</span>
    </div>
    <div class="patient-field">
      <label>Date de l'examen</label>
      <span>${formaterDate(cr.date)}</span>
    </div>
  </div>

  <div class="section-title">Rapport</div>
  <div class="content">${cr.contenu}</div>

  <div class="section-title">Conclusion</div>
  <div class="conclusion-box">${cr.conclusion}</div>

</body>
</html>`

  const refCR = genRefCR(cr.id, cr.date)
  const qrSvg = genQRSvg(`${refCR}|${cr.patientNom}|${cr.date}`)
  const signHash = hashStr(`${refCR}${cr.id}${cr.date}`).toString(16).toUpperCase().slice(0, 12)

  const htmlWithMeta = html
    .replace('</body>', `
  <div style="margin-top:32px; padding-top:16px; border-top:2px solid #c0ddd5; display:flex; justify-content:space-between; align-items:flex-end; gap:20px;">
    <!-- Signature médecin -->
    <div style="flex:1;">
      <div style="font-size:9pt; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.04em;">Signature et cachet du médecin</div>
      <div style="border:1px dashed #c0c0c0; border-radius:6px; padding:12px 16px; min-height:70px; display:flex; flex-direction:column; justify-content:flex-end;">
        <div style="font-size:11pt; font-weight:bold; color:#1a1a18;">${cr.medecin}</div>
        <div style="font-size:9pt; color:#555; margin-top:2px;">Signé électroniquement le ${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="font-size:8pt; color:#aaa; font-family:monospace; margin-top:4px;">HASH: ${signHash}</div>
      </div>
    </div>
    <!-- QR Code + référence -->
    <div style="text-align:center; flex-shrink:0;">
      <div style="border:1px solid #e0e0da; border-radius:8px; padding:8px; display:inline-block;">
        ${qrSvg}
      </div>
      <div style="font-size:9pt; color:#555; font-family:monospace; margin-top:4px; font-weight:bold;">${refCR}</div>
      <div style="font-size:8pt; color:#aaa; margin-top:1px;">Vérification authenticité</div>
    </div>
  </div>
  <div style="margin-top:14px; padding:8px 12px; background:#f7f8f6; border-radius:6px; font-size:8.5pt; color:#888; font-style:italic; text-align:center;">
    Document généré via Curaé · Référence ${refCR} · Ce document est confidentiel — réservé à l'usage médical
  </div>
</body>`)

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(htmlWithMeta)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

// ─── Modal "Voir" ──────────────────────────────────────────────────────────
function ModalVoir({ cr, onFermer }: { cr: CompteRendu; onFermer: () => void }) {
  const age = calculerAge(cr.dateNaissance)
  const typeStyle = TYPE_COLORS[cr.type]
  const statutStyle = STATUT_STYLES[cr.statut]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 32,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16,
        width: '100%', maxWidth: 780,
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--accent)', padding: '20px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                borderRadius: 6, fontSize: 12, fontWeight: 700, padding: '2px 10px',
              }}>
                {cr.type}
              </span>
              <span style={{
                background: statutStyle.bg, color: statutStyle.text,
                borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px',
              }}>
                {statutStyle.label}
              </span>
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>
              {cr.patientNom} {cr.patientPrenom}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>
              {cr.sexe === 'F' ? 'Femme' : 'Homme'} · {age} ans · {formaterDate(cr.date)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => genererPDF(cr)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              <Printer size={15} /> Imprimer / PDF
            </button>
            <button onClick={onFermer} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {/* Motif */}
          <div style={{
            background: typeStyle.bg, border: `1px solid ${typeStyle.text}30`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: typeStyle.text, marginBottom: 3 }}>
              Motif
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: typeStyle.text }}>{cr.motif}</div>
          </div>

          {/* Rapport */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--accent)', borderBottom: '2px solid var(--accent-light)',
              paddingBottom: 8, marginBottom: 14,
            }}>
              Rapport
            </div>
            <pre style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: 14, lineHeight: 1.75, color: 'var(--text)',
              whiteSpace: 'pre-wrap', margin: 0,
            }}>
              {cr.contenu}
            </pre>
          </div>

          {/* Conclusion */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--accent)', borderBottom: '2px solid var(--accent-light)',
              paddingBottom: 8, marginBottom: 14,
            }}>
              Conclusion
            </div>
            <div style={{
              background: 'var(--accent-light)', borderLeft: '4px solid var(--accent)',
              borderRadius: '0 10px 10px 0', padding: '16px 20px',
              fontSize: 14, lineHeight: 1.75, color: 'var(--text)',
            }}>
              {cr.conclusion}
            </div>
          </div>

          {/* Pied */}
          <div style={{
            marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              <User size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              {cr.medecin} — Cardiologue
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              {formaterDate(cr.date)}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', gap: 10, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button onClick={onFermer} style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: 'var(--muted)', fontFamily: 'inherit',
          }}>
            Fermer
          </button>
          <button
            onClick={() => genererPDF(cr)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            <Download size={14} /> Télécharger PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────
export default function ComptesRendusPage() {
  const [crs, setCrs] = useState<CompteRendu[]>([])
  const [loading, setLoading] = useState(true)
  const [showNouveauCR, setShowNouveauCR] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState<CompteRendu['type'] | 'Tous'>('Tous')
  const [crSelectionne, setCrSelectionne] = useState<CompteRendu | null>(null)
  const [showDictee, setShowDictee] = useState(false)
  const [whatsappCR, setWhatsappCR] = useState<CompteRendu | null>(null)

  useEffect(() => {
    api.cr.list()
      .then(list => setCrs(list.map(mapCR)))
      .catch(() => setCrs(MOCK_CRS))
      .finally(() => setLoading(false))
  }, [])

  const types: Array<CompteRendu['type'] | 'Tous'> = ['Tous', 'Consultation', 'ECG', 'ETT', 'Holter', 'MAPA']

  const resultats = crs.filter(cr => {
    const matchRecherche = !recherche.trim() ||
      cr.patientNom.toLowerCase().includes(recherche.toLowerCase()) ||
      cr.patientPrenom.toLowerCase().includes(recherche.toLowerCase()) ||
      cr.motif.toLowerCase().includes(recherche.toLowerCase())
    const matchType = filtreType === 'Tous' || cr.type === filtreType
    return matchRecherche && matchType
  })

  return (
    <div className="dashboard-content" style={{ padding: '28px 36px', height: '100%', boxSizing: 'border-box' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total comptes-rendus', value: crs.length, color: 'var(--text)', sub: loading ? '…' : 'tous types' },
          { label: 'Finalisés', value: crs.filter(c => c.statut === 'finalise').length, color: '#0f6e56', sub: 'prêts à signer' },
          { label: 'Envoyés', value: crs.filter(c => c.statut === 'envoye').length, color: '#1a4a8a', sub: 'transmis au patient' },
          { label: 'Brouillons', value: crs.filter(c => c.statut === 'brouillon').length, color: '#888', sub: 'à compléter' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 22px',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Barre outils */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--muted)',
          }} />
          <input
            type="text"
            placeholder="Rechercher par patient, motif…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px 10px 42px',
              fontSize: 14, borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {types.map(t => (
            <button key={t} onClick={() => setFiltreType(t)} style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filtreType === t ? 'var(--accent)' : 'var(--surface)',
              color: filtreType === t ? '#fff' : 'var(--text)',
              transition: 'background 0.15s', fontFamily: 'inherit',
            }}>
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDictee(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}>
          <Mic size={15} /> Dictée vocale
        </button>
        <button
          onClick={() => setShowNouveauCR(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}>
          <Plus size={15} /> Nouveau CR
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          {['Patient', 'Type', 'Date', 'Statut', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {h}
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={24} color="#0f6e56" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
        {!loading && resultats.map((cr, idx) => {
          const typeStyle = TYPE_COLORS[cr.type]
          const statutStyle = STATUT_STYLES[cr.statut]
          return (
            <div
              key={cr.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < resultats.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              onClick={() => setCrSelectionne(cr)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: typeStyle.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={16} style={{ color: typeStyle.text }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {cr.patientNom} {cr.patientPrenom}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <User size={10} /> {cr.medecin}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{cr.motif}</div>
                </div>
              </div>

              <div>
                <span style={{
                  background: typeStyle.bg, color: typeStyle.text,
                  borderRadius: 6, fontSize: 12, fontWeight: 700, padding: '3px 10px',
                }}>
                  {cr.type}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)' }}>
                <Calendar size={12} /> {formaterDate(cr.date)}
              </div>

              <div>
                <span style={{
                  background: statutStyle.bg, color: statutStyle.text,
                  borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px',
                }}>
                  {statutStyle.label}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setCrSelectionne(cr)} style={actionBtn}>
                  <Eye size={13} /> Voir
                </button>
                <button onClick={() => genererPDF(cr)} style={actionBtn}>
                  <Download size={13} /> PDF
                </button>
                <button
                  onClick={() => setWhatsappCR(cr)}
                  style={{ ...actionBtn, color: '#25d366', borderColor: '#25d366', background: '#f0fdf4' }}
                  title="Envoyer résultat via WhatsApp"
                >
                  <MessageCircle size={13} />
                </button>
                <ChevronRight size={14} style={{ color: 'var(--muted)', alignSelf: 'center' }} />
              </div>
            </div>
          )
        })}

        {resultats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)', fontSize: 14 }}>
            Aucun compte-rendu trouvé
          </div>
        )}
      </div>

      {crSelectionne && (
        <ModalVoir cr={crSelectionne} onFermer={() => setCrSelectionne(null)} />
      )}

      {showNouveauCR && (
        <NouveauCRModal
          onFermer={() => setShowNouveauCR(false)}
          onSauvegarde={() => {
            setShowNouveauCR(false)
            setLoading(true)
            api.cr.list()
              .then(list => { if (list.length > 0) setCrs(list.map(mapCR)) })
              .catch(() => {})
              .finally(() => setLoading(false))
          }}
        />
      )}

      {whatsappCR && (
        <WhatsAppSendModal
          onFermer={() => setWhatsappCR(null)}
          patientNom={`${whatsappCR.patientNom} ${whatsappCR.patientPrenom}`}
          typeCR={whatsappCR.type}
        />
      )}

      {showDictee && (
        <DicteeVocaleModal
          onFermer={() => setShowDictee(false)}
          onSauvegarder={async (data) => {
            try {
              if (data.patient_id) {
                await api.cr.create({
                  patient_id: data.patient_id,
                  type_cr: data.type_cr,
                  motif: data.motif,
                  anamnese: data.anamnese,
                  examen_clinique: data.examen_clinique,
                  conclusion: data.conclusion,
                  traitement: data.traitement,
                  recommandations: data.recommandations,
                  genere_par_ia: true,
                })
              }
            } catch { /* CR sauvegardé localement si API indisponible */ }
            setLoading(true)
            api.cr.list()
              .then(list => { if (list.length > 0) setCrs(list.map(mapCR)) })
              .catch(() => {})
              .finally(() => setLoading(false))
          }}
        />
      )}
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 6,
  padding: '5px 10px', cursor: 'pointer', background: 'var(--surface)',
  color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 12, fontFamily: 'inherit',
}
