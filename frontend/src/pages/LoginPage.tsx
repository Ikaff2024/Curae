import { useState, type FormEvent } from 'react'
import {
  Heart, Mail, Lock, User, Phone, AlertCircle, Loader2,
  Building2, MapPin, ChevronRight, ChevronLeft, CheckCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'register'
type RegStep = 1 | 2

const TYPE_OPTIONS = [
  { value: 'cabinet',  label: 'Cabinet médical' },
  { value: 'clinique', label: 'Clinique' },
  { value: 'hopital',  label: 'Hôpital / CHU' },
  { value: 'centre',   label: 'Centre de santé' },
]

const SPECIALITES = [
  'Cardiologue', 'Médecin généraliste', 'Gynécologue', 'Pédiatre',
  'Diabétologue', 'Pneumologue', 'Chirurgien', 'Neurologue',
  'Ophtalmologue', 'ORL', 'Dermatologue', 'Autre spécialiste',
]

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [step, setStep] = useState<RegStep>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Étape 1 — Cabinet / Organisation
  const [org, setOrg] = useState({
    nom: '', type: 'cabinet', ville: 'Abidjan', telephone: '', email: '',
  })

  // Étape 2 — Compte administrateur médecin
  const [doc, setDoc] = useState({
    nom: '', prenoms: '', specialite: 'Cardiologue', telephone: '',
    email: '', password: '',
  })

  // Connexion
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  function setOrgField(field: keyof typeof org) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setOrg(prev => ({ ...prev, [field]: e.target.value }))
  }
  function setDocField(field: keyof typeof doc) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDoc(prev => ({ ...prev, [field]: e.target.value }))
  }

  function switchMode(m: Mode) {
    setMode(m)
    setStep(1)
    setError('')
  }

  function nextStep(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!org.nom.trim()) { setError('Le nom du cabinet est requis'); return }
    setStep(2)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!doc.nom.trim()) { setError('Le nom du médecin est requis'); return }
    if (!doc.email.trim()) { setError("L'e-mail est requis"); return }
    if (doc.password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return }

    setLoading(true)
    try {
      await register({
        nom: doc.nom,
        prenoms: doc.prenoms,
        specialite: doc.specialite,
        telephone: doc.telephone || org.telephone,
        email: doc.email,
        password: doc.password,
        organisation: {
          nom: org.nom,
          type: org.type as any,
          ville: org.ville,
          telephone: org.telephone || undefined,
          email: org.email || doc.email,
        },
      })
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(loginForm.email, loginForm.password)
    } catch (err: any) {
      setError(err.message === 'SESSION_EXPIRED' ? 'Session expirée' : err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const iStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 42px',
    fontSize: 14, borderRadius: 10,
    border: '1.5px solid #e0e0da',
    background: '#fafaf8', color: '#1a1a18',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  }
  const lStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#555', marginBottom: 5, letterSpacing: '0.01em',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = '#0f6e56')
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = '#e0e0da')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f7f5 0%, #f7f8f6 100%)',
      fontFamily: '"DM Sans", system-ui, sans-serif', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 20,
        border: '1px solid #e8e8e4',
        boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#0f6e56', padding: '28px 36px 24px', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Heart size={26} color="#fff" fill="#fff" />
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>Curaé</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
            {mode === 'login'
              ? 'Connexion à votre espace cabinet'
              : step === 1 ? 'Étape 1 — Votre cabinet' : 'Étape 2 — Compte administrateur'}
          </div>

          {/* Indicateur de progression inscription */}
          {mode === 'register' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                background: '#fff', color: '#0f6e56',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step === 1 ? '1' : <CheckCircle size={14} color="#0f6e56" />}
              </div>
              <div style={{ width: 40, height: 2, background: step === 2 ? '#fff' : 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
              <div style={{
                width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                background: step === 2 ? '#fff' : 'rgba(255,255,255,0.2)',
                color: step === 2 ? '#0f6e56' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                2
              </div>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e8e8e4' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              padding: '12px 0', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              background: mode === m ? '#fff' : '#fafaf8',
              color: mode === m ? '#0f6e56' : '#888',
              borderBottom: mode === m ? '2px solid #0f6e56' : '2px solid transparent',
              transition: 'color 0.15s',
            }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* ── CONNEXION ────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ padding: '24px 28px 28px' }}>
            {error && <ErrorBanner msg={error} />}

            <Field label="Adresse e-mail *">
              <Icon el={<Mail size={15} />} />
              <input type="email" value={loginForm.email} required
                onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                placeholder="dr.nom@cabinet.ci" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <Field label="Mot de passe *" style={{ marginBottom: 24 }}>
              <Icon el={<Lock size={15} />} />
              <input type="password" value={loginForm.password} required minLength={6}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <SubmitBtn loading={loading} label="Se connecter" />

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#888' }}>
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => switchMode('register')} style={{
                background: 'none', border: 'none', color: '#0f6e56',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              }}>
                Créer votre cabinet
              </button>
            </div>
          </form>
        )}

        {/* ── INSCRIPTION ÉTAPE 1 — Cabinet ────────────────────────────────── */}
        {mode === 'register' && step === 1 && (
          <form onSubmit={nextStep} style={{ padding: '24px 28px 28px' }}>
            {error && <ErrorBanner msg={error} />}

            <div style={{
              padding: '10px 14px', background: '#f0f7f5', borderRadius: 10,
              border: '1px solid #c0ddd5', fontSize: 12, color: '#0f6e56',
              marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <Building2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Commençons par votre structure médicale. Tous vos médecins, données et abonnements seront rattachés à cette organisation.</span>
            </div>

            <Field label="Nom du cabinet / clinique *">
              <Icon el={<Building2 size={15} />} />
              <input value={org.nom} onChange={setOrgField('nom')} required
                placeholder="ex : Cabinet Cardio Cocody" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <div style={{ marginBottom: 16 }}>
              <label style={lStyle}>Type de structure</label>
              <select value={org.type} onChange={setOrgField('type')} style={{ ...iStyle, paddingLeft: 14 }}
                onFocus={focus} onBlur={blur}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label="Ville" noMargin>
                <Icon el={<MapPin size={15} />} />
                <input value={org.ville} onChange={setOrgField('ville')}
                  placeholder="Abidjan" style={iStyle}
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Téléphone" noMargin>
                <Icon el={<Phone size={15} />} />
                <input value={org.telephone} onChange={setOrgField('telephone')}
                  placeholder="+225 07 00 00 00" style={iStyle}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            <Field label="E-mail du cabinet" style={{ marginBottom: 24 }}>
              <Icon el={<Mail size={15} />} />
              <input type="email" value={org.email} onChange={setOrgField('email')}
                placeholder="contact@cabinet.ci" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <button type="submit" style={{
              width: '100%', padding: '12px 0',
              background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}>
              Étape suivante <ChevronRight size={16} />
            </button>
          </form>
        )}

        {/* ── INSCRIPTION ÉTAPE 2 — Compte admin ───────────────────────────── */}
        {mode === 'register' && step === 2 && (
          <form onSubmit={handleRegister} style={{ padding: '24px 28px 28px' }}>
            {error && <ErrorBanner msg={error} />}

            <div style={{
              padding: '8px 12px', background: '#f7f8f6', borderRadius: 8,
              border: '1px solid #e0e0da', fontSize: 12, color: '#555',
              marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Building2 size={13} color="#0f6e56" />
              <span><strong style={{ color: '#0f6e56' }}>{org.nom}</strong> · {TYPE_OPTIONS.find(t => t.value === org.type)?.label} · {org.ville}</span>
              <button type="button" onClick={() => setStep(1)} style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: '#888', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                <ChevronLeft size={11} /> Modifier
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Field label="Nom *" noMargin>
                <Icon el={<User size={15} />} />
                <input value={doc.nom} onChange={setDocField('nom')} required
                  placeholder="KONÉ" style={iStyle}
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Prénoms" noMargin>
                <Icon el={<User size={15} />} />
                <input value={doc.prenoms} onChange={setDocField('prenoms')}
                  placeholder="Awa" style={iStyle}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lStyle}>Spécialité</label>
              <select value={doc.specialite} onChange={setDocField('specialite')}
                style={{ ...iStyle, paddingLeft: 14 }}
                onFocus={focus} onBlur={blur}>
                {SPECIALITES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <Field label="Adresse e-mail *">
              <Icon el={<Mail size={15} />} />
              <input type="email" value={doc.email} onChange={setDocField('email')} required
                placeholder="dr.kone@cabinet.ci" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <Field label="Mot de passe *" style={{ marginBottom: 22 }}>
              <Icon el={<Lock size={15} />} />
              <input type="password" value={doc.password} onChange={setDocField('password')}
                required minLength={6} placeholder="••••••••" style={iStyle}
                onFocus={focus} onBlur={blur} />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { setStep(1); setError('') }} style={{
                padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e0e0da',
                background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                color: '#555', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ChevronLeft size={15} />
              </button>
              <SubmitBtn loading={loading} label="Créer mon compte" flex />
            </div>
          </form>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Composants utilitaires ─────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 10, padding: '11px 14px', marginBottom: 18,
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: '#c0392b',
    }}>
      <AlertCircle size={15} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  )
}

function Field({ label, children, style, noMargin }: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
  noMargin?: boolean
}) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 14, position: 'relative', ...style }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: '#555', marginBottom: 5, letterSpacing: '0.01em',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

function Icon({ el }: { el: React.ReactNode }) {
  return (
    <span style={{
      position: 'absolute', left: 13, top: '50%',
      transform: 'translateY(-50%)', color: '#aaa',
      zIndex: 1, display: 'flex', pointerEvents: 'none',
    }}>
      {el}
    </span>
  )
}

function SubmitBtn({ loading, label, flex }: { loading: boolean; label: string; flex?: boolean }) {
  return (
    <button type="submit" disabled={loading} style={{
      flex: flex ? 1 : undefined,
      width: flex ? undefined : '100%',
      padding: '12px 0',
      background: loading ? '#a0c8be' : '#0f6e56',
      color: '#fff', border: 'none', borderRadius: 10,
      fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: 'inherit', transition: 'background 0.15s',
    }}>
      {loading
        ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> En cours…</>
        : label}
    </button>
  )
}
