import { useState, type FormEvent } from 'react'
import { Heart, Mail, Lock, User, Phone, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenoms: '', specialite: 'Cardiologue', telephone: '',
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        if (!form.nom.trim()) throw new Error('Le nom est requis')
        await register({
          email: form.email,
          password: form.password,
          nom: form.nom,
          prenoms: form.prenoms,
          specialite: form.specialite,
          telephone: form.telephone,
        })
      }
    } catch (err: any) {
      setError(err.message === 'SESSION_EXPIRED' ? 'Session expirée' : err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 42px',
    fontSize: 15, borderRadius: 10,
    border: '1.5px solid #e0e0da',
    background: '#fafaf8', color: '#1a1a18',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#555', marginBottom: 6,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f7f8f6', fontFamily: '"DM Sans", system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 20,
        border: '1px solid #e8e8e4',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: '#0f6e56', padding: '32px 36px 28px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Heart size={28} color="#fff" fill="#fff" />
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>Curaé</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
            {mode === 'login' ? 'Connexion à votre espace médecin' : 'Créer votre compte médecin'}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e8e8e4' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                padding: '13px 0', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                background: mode === m ? '#fff' : '#fafaf8',
                color: mode === m ? '#0f6e56' : '#888',
                borderBottom: mode === m ? '2px solid #0f6e56' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, color: '#c0392b',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                    <input value={form.nom} onChange={set('nom')} placeholder="KONÉ" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                      onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Prénoms</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                    <input value={form.prenoms} onChange={set('prenoms')} placeholder="Awa" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                      onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Spécialité</label>
                <select value={form.specialite} onChange={set('specialite')} style={{
                  ...inputStyle, paddingLeft: 14, cursor: 'pointer', appearance: 'none',
                }}>
                  {['Cardiologue', 'Médecin généraliste', 'Gynécologue', 'Pédiatre', 'Diabétologue',
                    'Pneumologue', 'Chirurgien', 'Autre spécialiste'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Téléphone / WhatsApp</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                  <input value={form.telephone} onChange={set('telephone')} placeholder="+225 07 00 00 00" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                    onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Adresse e-mail *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input type="email" value={form.email} onChange={set('email')}
                placeholder="dr.nom@cabinet.ci" required style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Mot de passe *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input type="password" value={form.password} onChange={set('password')}
                placeholder="••••••••" required minLength={6} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0f6e56')}
                onBlur={e => (e.target.style.borderColor = '#e0e0da')} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0',
              background: loading ? '#a0c8be' : '#0f6e56',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Connexion…</>
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => setMode('register')} style={{
                background: 'none', border: 'none', color: '#0f6e56',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              }}>
                S'inscrire gratuitement
              </button>
            </div>
          )}
        </form>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
