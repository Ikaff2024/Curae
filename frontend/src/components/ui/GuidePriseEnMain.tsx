import { useState, useEffect } from 'react'
import {
  X, ChevronRight, ChevronLeft, Users, Calendar,
  FileText, BarChart2, Heart, CheckCircle, HelpCircle,
  UserPlus, CalendarPlus, FilePlus, CreditCard, Sparkles,
} from 'lucide-react'

type Page = 'dashboard' | 'patients' | 'agenda' | 'comptes-rendus' | 'facturation' | 'parametres'

interface Props {
  onNavigate: (page: Page) => void
  onClose: () => void
  startStep?: number
}

// ── Illustrations simulant l'UI réelle ───────────────────────────────────────

function IlluPatient() {
  return (
    <div style={{ background: '#f7f8f6', borderRadius: 12, padding: 16, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Patients</div>
        <div style={{ background: '#0f6e56', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 16 }}>+</span> Nouveau patient
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0f6e56', fontSize: 12 }}>KA</div>
        <div>
          <div style={{ fontWeight: 700 }}>KONÉ Awa Marie</div>
          <div style={{ color: '#888', fontSize: 12 }}>48 ans · HTA · NSIA</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Risque élevé</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8eef8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1a4a8a', fontSize: 12 }}>DB</div>
        <div>
          <div style={{ fontWeight: 700 }}>DIALLO Boubacar</div>
          <div style={{ color: '#888', fontSize: 12 }}>35 ans · Diabète · Allianz</div>
        </div>
      </div>
      {/* Flèche animée vers le bouton */}
      <div style={{ textAlign: 'right', marginTop: 10, color: '#0f6e56', fontSize: 12, fontWeight: 700, animation: 'pulse 1.5s ease-in-out infinite' }}>
        ↑ Cliquez ici pour ajouter un patient
      </div>
    </div>
  )
}

function IlluAgenda() {
  return (
    <div style={{ background: '#f7f8f6', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#888', fontWeight: 600 }}>{j}</div>
        ))}
        {Array.from({ length: 7 }, (_, i) => i + 2).map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 13, fontWeight: d === 5 ? 800 : 400, color: d === 5 ? '#fff' : '#1a1a18', background: d === 5 ? '#0f6e56' : 'transparent', borderRadius: 6, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0f6e56', minWidth: 40, textAlign: 'center' }}>09:00</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>KONÉ Awa Marie</div>
          <div style={{ color: '#888', fontSize: 11 }}>Contrôle cardiologique · 30 min</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#e8f4f0', color: '#0f6e56', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Confirmé</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ background: '#0f6e56', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 16 }}>+</span> Ajouter un RDV
        </div>
      </div>
      <div style={{ textAlign: 'right', marginTop: 8, color: '#0f6e56', fontSize: 12, fontWeight: 700 }}>
        ↑ Choisissez un jour, puis cliquez ici
      </div>
    </div>
  )
}

function IlluCR() {
  return (
    <div style={{ background: '#f7f8f6', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#0f6e56', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>🎙 Dictée vocale</div>
        <div style={{ background: '#0f6e56', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>+ Nouveau CR</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>KONÉ Awa Marie</div>
          <div style={{ background: '#e8f4f0', color: '#0f6e56', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Consultation</div>
          <div style={{ marginLeft: 'auto', background: '#e8f4f0', color: '#0f6e56', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Finalisé</div>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>Contrôle FA — bilan Xarelto · 5 mars 2025</div>
      </div>
      <div style={{ background: '#f0f0ff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#5a3aed', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #c4b5fd' }}>
        <Sparkles size={12} /> L'IA Curaé peut rédiger le CR à partir de votre dictée vocale
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, color: '#0f6e56', fontSize: 12, fontWeight: 700 }}>
        ↑ Dictée vocale = parlez, l'IA rédige
      </div>
    </div>
  )
}

function IlluFacture() {
  return (
    <div style={{ background: '#f7f8f6', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f6e56' }}>210 000</div>
          <div style={{ fontSize: 11, color: '#888' }}>Total facturé (FCFA)</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>150 000</div>
          <div style={{ fontSize: 11, color: '#888' }}>En attente remboursement</div>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>KONÉ Awa Marie</div>
          <div style={{ fontSize: 11, color: '#888' }}>45 000 FCFA · NSIA</div>
        </div>
        <div style={{ background: '#e8f4f0', color: '#0f6e56', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Remboursé</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ background: '#fff', border: '1.5px solid #0f6e56', color: '#0f6e56', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600 }}>📥 CSV</div>
        <div style={{ background: '#0f6e56', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>+ Nouvelle facture</div>
      </div>
    </div>
  )
}

// ── Étapes du guide ───────────────────────────────────────────────────────────

interface Etape {
  icone: React.ReactNode
  couleur: string
  titre: string
  description: string
  conseil: string
  illustration: React.ReactNode
  action?: { label: string; page: Page }
}

const ETAPES: Etape[] = [
  {
    icone: <Heart size={22} fill="#fff" />,
    couleur: '#0f6e56',
    titre: 'Bienvenue sur Curaé',
    description: 'Curaé centralise tout votre cabinet : patients, rendez-vous, comptes-rendus et facturation. Ce guide de 4 étapes vous montre l\'essentiel — moins de 3 minutes.',
    conseil: '💡 À tout moment, le bouton ? en bas à droite rouvre ce guide.',
    illustration: (
      <div style={{ background: '#f0f7f5', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          {[
            { icon: <Users size={20} />, label: 'Patients', color: '#0f6e56' },
            { icon: <Calendar size={20} />, label: 'Agenda', color: '#1a4a8a' },
            { icon: <FileText size={20} />, label: 'CR', color: '#7c3aed' },
            { icon: <BarChart2 size={20} />, label: 'Factures', color: '#d97706' },
          ].map(({ icon, label, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
          Tout est accessible depuis la barre de navigation à gauche
        </div>
      </div>
    ),
  },
  {
    icone: <UserPlus size={22} color="#fff" />,
    couleur: '#0f6e56',
    titre: 'Étape 1 — Créer un patient',
    description: 'Commencez par enregistrer vos patients. Cliquez sur "Patients" dans le menu, puis sur le bouton vert "+ Nouveau patient". Remplissez nom, date de naissance et téléphone — le reste est optionnel.',
    conseil: '💡 Le numéro de dossier est généré automatiquement. Vous pouvez importer vos patients existants en créant chaque dossier en 1 minute.',
    illustration: <IlluPatient />,
    action: { label: '→ Aller dans Patients', page: 'patients' },
  },
  {
    icone: <CalendarPlus size={22} color="#fff" />,
    couleur: '#1a4a8a',
    titre: 'Étape 2 — Planifier un rendez-vous',
    description: 'Dans l\'Agenda, cliquez sur un jour du calendrier puis sur "+ Ajouter un RDV". Choisissez le patient, l\'heure et le motif. Une confirmation WhatsApp peut être envoyée automatiquement.',
    conseil: '💡 Si un patient ne vient pas, marquez-le "No-show" — Curaé le comptabilise dans vos statistiques de présence.',
    illustration: <IlluAgenda />,
    action: { label: '→ Aller dans l\'Agenda', page: 'agenda' },
  },
  {
    icone: <FilePlus size={22} color="#fff" />,
    couleur: '#7c3aed',
    titre: 'Étape 3 — Rédiger un compte-rendu',
    description: 'Après une consultation, cliquez sur "+ Nouveau CR" ou sur "🎙 Dictée vocale". Parlez naturellement — l\'IA Curaé structure votre dictée en compte-rendu médical complet. Vous validez, corrigez, puis exportez en PDF.',
    conseil: '💡 La dictée vocale fonctionne en français ivoirien et reconnaît les termes médicaux courants. Vous gardez toujours la validation finale.',
    illustration: <IlluCR />,
    action: { label: '→ Aller dans Comptes-rendus', page: 'comptes-rendus' },
  },
  {
    icone: <CreditCard size={22} color="#fff" />,
    couleur: '#d97706',
    titre: 'Étape 4 — Gérer la facturation',
    description: 'Créez une facture depuis la page Facturation. Renseignez l\'assureur (NSIA, Allianz, AXA, Sanlam) et les actes — Curaé calcule automatiquement la part assurance et la part patient.',
    conseil: '💡 Exportez toutes vos factures en CSV (compatible Excel) en un clic pour votre comptabilité mensuelle.',
    illustration: <IlluFacture />,
    action: { label: '→ Aller dans Facturation', page: 'facturation' },
  },
  {
    icone: <CheckCircle size={22} color="#fff" />,
    couleur: '#059669',
    titre: 'Vous êtes prêt !',
    description: 'Vous connaissez l\'essentiel de Curaé. En cas de doute, le bouton ? en bas à droite rouvre ce guide à tout moment. Votre cabinet est maintenant entre de bonnes mains.',
    conseil: '💡 Commencez par créer 2-3 patients, puis planifiez leurs RDV. Vous prendrez vos marques rapidement.',
    illustration: (
      <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 24, textAlign: 'center', border: '1px solid #86efac' }}>
        <CheckCircle size={48} color="#059669" style={{ margin: '0 auto 12px', display: 'block' }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: '#059669', marginBottom: 8 }}>Félicitations !</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          Vous maîtrisez les 4 fonctions clés de Curaé.<br />
          <strong>Patients → Agenda → CR → Facturation</strong>
        </div>
      </div>
    ),
  },
]

// ── Composant principal ───────────────────────────────────────────────────────

export default function GuidePriseEnMain({ onNavigate, onClose, startStep = 0 }: Props) {
  const [etape, setEtape] = useState(startStep)
  const current = ETAPES[etape]
  const isFirst = etape === 0
  const isLast = etape === ETAPES.length - 1

  function suivant() {
    if (isLast) { onClose(); return }
    setEtape(e => e + 1)
  }
  function precedent() { if (!isFirst) setEtape(e => e - 1) }

  function naviguer(page: Page) {
    onNavigate(page)
    onClose()
  }

  return (
    <>
      {/* Backdrop semi-transparent */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Modal guide */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 520,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        zIndex: 1101, overflow: 'hidden',
        animation: 'guideIn 0.25s ease',
      }}>

        {/* Header coloré */}
        <div style={{ background: current.couleur, padding: '22px 24px 18px', position: 'relative' }}>
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Fermer le guide"
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {current.icone}
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {isFirst ? 'Guide de démarrage' : isLast ? 'Terminé !' : `${etape} / ${ETAPES.length - 2}`}
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{current.titre}</div>
            </div>
          </div>

          {/* Barre de progression */}
          {!isFirst && !isLast && (
            <div style={{ marginTop: 14, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }}>
              <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${((etape - 1) / (ETAPES.length - 3)) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          )}
        </div>

        {/* Corps */}
        <div style={{ padding: '20px 24px' }}>
          {/* Description */}
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#333', lineHeight: 1.65 }}>
            {current.description}
          </p>

          {/* Illustration */}
          <div style={{ marginBottom: 16 }}>
            {current.illustration}
          </div>

          {/* Conseil pro */}
          <div style={{
            background: '#fafaf8', borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#555', lineHeight: 1.5,
            border: '1px solid #e8e8e4',
          }}>
            {current.conseil}
          </div>
        </div>

        {/* Footer navigation */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e8e8e4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          {/* Bouton précédent */}
          <button
            onClick={precedent}
            disabled={isFirst}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9,
              border: '1.5px solid #e8e8e4', background: 'transparent',
              fontSize: 13, fontWeight: 600, cursor: isFirst ? 'default' : 'pointer',
              color: isFirst ? '#ccc' : '#555', fontFamily: 'inherit',
              opacity: isFirst ? 0 : 1,
            }}
          >
            <ChevronLeft size={15} /> Précédent
          </button>

          {/* Bouton action (aller à la page) */}
          {current.action && (
            <button
              onClick={() => naviguer(current.action!.page)}
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 9,
                border: '1.5px solid var(--accent, #0f6e56)',
                background: 'transparent', color: '#0f6e56',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {current.action.label}
            </button>
          )}

          {/* Bouton suivant */}
          <button
            onClick={suivant}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 9,
              border: 'none', background: current.couleur,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: '#fff', fontFamily: 'inherit',
            }}
          >
            {isLast ? 'Commencer !' : 'Suivant'} {!isLast && <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes guideIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}

// ── Bouton flottant d'aide ────────────────────────────────────────────────────

export function BoutonAide({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Guide de prise en main"
      style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 48, height: 48, borderRadius: '50%',
        background: '#0f6e56', color: '#fff',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(15,110,86,0.4)',
        zIndex: 900,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(15,110,86,0.5)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(15,110,86,0.4)'
      }}
    >
      <HelpCircle size={22} />
    </button>
  )
}
