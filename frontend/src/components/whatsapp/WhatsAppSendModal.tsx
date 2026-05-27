import { useState, useEffect } from 'react'
import { X, MessageCircle, Send, CheckCircle, AlertTriangle, Loader2, Phone } from 'lucide-react'
import { api } from '../../lib/api'

type TypeMessage = 'confirmation_rdv' | 'rappel_rdv' | 'annulation_rdv' | 'resultat_disponible' | 'message_libre'

interface Props {
  onFermer: () => void
  // Mode RDV
  rdvId?: string
  type?: 'confirmation' | 'rappel' | 'annulation'
  // Mode CR
  patientId?: string
  patientNom?: string
  patientWhatsapp?: string
  typeCR?: string
  // Surcharge manuelle
  messageInitial?: string
}

type Etat = 'preview' | 'envoi' | 'succes' | 'erreur'

const TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmation de RDV',
  rappel: 'Rappel de RDV',
  annulation: 'Annulation de RDV',
  resultat_disponible: 'Résultat disponible',
  message_libre: 'Message personnalisé',
}

function WhatsAppBubble({ message }: { message: string }) {
  const lignes = message.split('\n')
  return (
    <div style={{
      background: '#e7f5e3', borderRadius: '12px 12px 2px 12px',
      padding: '12px 14px', maxWidth: 360, fontSize: 13.5, lineHeight: 1.65,
      color: '#1a1a18', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', fontFamily: 'inherit',
    }}>
      {lignes.map((l, i) => {
        if (l === '') return <br key={i} />
        // Bold: *texte*
        const parts = l.split(/\*([^*]+)\*/g)
        return (
          <div key={i}>
            {parts.map((p, j) =>
              j % 2 === 1
                ? <strong key={j}>{p}</strong>
                : <span key={j}>{p.replace(/_([^_]+)_/g, '$1')}</span>
            )}
          </div>
        )
      })}
      <div style={{ fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 }}>
        {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        <span style={{ marginLeft: 4 }}>✓✓</span>
      </div>
    </div>
  )
}

export default function WhatsAppSendModal({
  onFermer, rdvId, type, patientId, patientNom, patientWhatsapp, typeCR, messageInitial,
}: Props) {
  const [etat, setEtat] = useState<Etat>('preview')
  const [message, setMessage] = useState(messageInitial || '')
  const [destinataire, setDestinataire] = useState(patientWhatsapp || '')
  const [messageEnvoye, setMessageEnvoye] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [simule, setSimule] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Charger le preview depuis le backend
  useEffect(() => {
    if (messageInitial) { setMessage(messageInitial); return }

    let body: any = {}
    if (rdvId && type) {
      body = { rdv_id: rdvId, type: `${type}_rdv` }
    } else if (patientId) {
      body = { patient_id: patientId, type: 'resultat_disponible' }
    }

    api.whatsapp.preview(body)
      .then(r => {
        setMessage(r.message || '')
        if (r.destinataire) setDestinataire(r.destinataire)
      })
      .catch(() => {
        // Fallback preview local
        setMessage(buildFallbackMessage())
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function buildFallbackMessage(): string {
    if (type === 'confirmation') {
      return `Bonjour 👋\n\n✅ Votre rendez-vous est *confirmé*.\n\n📍 Cabinet Dr. Koné Awa\nCocody, Riviera 2, Abidjan\n\nÀ bientôt 🫀 _Curaé_`
    }
    if (type === 'rappel') {
      return `Bonjour 👋\n\n🔔 *Rappel* — Vous avez un rendez-vous *demain*.\n\nMerci de confirmer en répondant *OUI*.\n\n_Curaé · Cabinet Dr. Koné Awa_`
    }
    if (type === 'annulation') {
      return `Bonjour,\n\nVotre rendez-vous a été annulé.\n\nContactez-nous pour un nouveau rendez-vous.\n📞 +225 07 00 00 00\n\n_Cabinet Dr. Koné Awa_`
    }
    if (typeCR) {
      return `Bonjour 👋\n\n📋 Votre *compte-rendu médical* (${typeCR}) est disponible.\n\nVenez le récupérer au cabinet.\n\n_Dr. Koné Awa · Curaé_`
    }
    return `Bonjour, message du cabinet Dr. Koné Awa.`
  }

  async function envoyer() {
    if (!message.trim()) return
    setEtat('envoi')
    setErreur(null)

    try {
      let payload: any = { message }
      if (rdvId && type) payload = { rdv_id: rdvId, type }
      else if (patientId) payload = { patient_id: patientId, texte: message }

      const res = await api.whatsapp.envoyer(payload)
      setSimule(!!res.simule)
      setMessageEnvoye(message)
      setEtat('succes')
    } catch (e: any) {
      setErreur(e.message || 'Erreur lors de l\'envoi')
      setEtat('erreur')
    }
  }

  const typeLabel = type ? TYPE_LABELS[type] : typeCR ? 'Résultat disponible' : 'Message WhatsApp'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 520,
        border: '1px solid #e0e0da',
        overflow: 'hidden', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header WhatsApp */}
        <div style={{
          background: '#25d366',
          padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={20} color="#fff" />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>WhatsApp</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{typeLabel}</div>
            </div>
          </div>
          <button onClick={onFermer} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: 8, padding: 7, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Destinataire */}
          {(destinataire || patientNom) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: '#f0fdf4', borderRadius: 10,
              border: '1px solid #86efac',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#25d366',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Phone size={16} color="#fff" />
              </div>
              <div>
                {patientNom && <div style={{ fontWeight: 700, fontSize: 14 }}>{patientNom}</div>}
                <div style={{ fontSize: 13, color: '#16a34a', fontFamily: 'monospace' }}>
                  {destinataire || 'Numéro non renseigné'}
                </div>
              </div>
            </div>
          )}

          {/* Zone preview/succes/envoi/erreur */}
          {etat === 'preview' && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Aperçu du message
                </div>
                {!editMode ? (
                  <div style={{
                    background: '#e2f4e9', borderRadius: 12, padding: 16,
                    display: 'flex', justifyContent: 'flex-end',
                  }}>
                    <WhatsAppBubble message={message} />
                  </div>
                ) : (
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={10}
                    style={{
                      width: '100%', padding: '10px 12px', fontSize: 13.5,
                      border: '1.5px solid #25d366', borderRadius: 10,
                      background: '#f9fdf9', outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.65, boxSizing: 'border-box',
                    }}
                  />
                )}
                <button
                  onClick={() => setEditMode(e => !e)}
                  style={{
                    fontSize: 12, color: '#25d366', background: 'none', border: 'none',
                    cursor: 'pointer', marginTop: 6, fontWeight: 600, textDecoration: 'underline',
                  }}
                >
                  {editMode ? 'Voir l\'aperçu' : 'Modifier le message'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={onFermer}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0da',
                    background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555', fontFamily: 'inherit',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={envoyer}
                  disabled={!message.trim()}
                  style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 0', borderRadius: 9,
                    background: message.trim() ? '#25d366' : '#e5e7eb',
                    color: message.trim() ? '#fff' : '#9ca3af',
                    border: 'none', fontSize: 14, fontWeight: 700, cursor: message.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  <Send size={16} /> Envoyer via WhatsApp
                </button>
              </div>
            </>
          )}

          {etat === 'envoi' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <Loader2 size={36} color="#25d366" style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              <div style={{ fontSize: 14, color: '#555' }}>Envoi en cours…</div>
            </div>
          )}

          {etat === 'succes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={28} color="#25d366" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>Message envoyé !</div>
                  {simule && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      (mode simulation — API WhatsApp non configurée)
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#e2f4e9', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <WhatsAppBubble message={messageEnvoye} />
              </div>

              <button
                onClick={onFermer}
                style={{
                  padding: '11px 0', borderRadius: 9, background: '#25d366',
                  color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Fermer
              </button>
            </div>
          )}

          {etat === 'erreur' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', background: '#fee2e2', borderRadius: 10,
                border: '1px solid #fca5a5',
              }}>
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>Échec de l'envoi</div>
                  <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 2 }}>{erreur}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onFermer}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0da',
                    background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555', fontFamily: 'inherit',
                  }}
                >
                  Fermer
                </button>
                <button
                  onClick={() => { setEtat('preview'); setErreur(null) }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 9, background: '#25d366',
                    color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
