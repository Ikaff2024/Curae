import { useState } from 'react'
import {
  User, Mail, Phone, MapPin, Briefcase,
  Bell, Palette, Save, CheckCircle, Loader2,
} from 'lucide-react'
import { api } from '../lib/api'

export interface DocteurProfile {
  prenom: string
  nom: string
  titre: string
  specialite: string
  ville: string
  pays: string
  telephone: string
  email: string
  numeroOrdre: string
  cabinet: string
  adresseCabinet: string
}

interface Props {
  profile: DocteurProfile
  onSave: (profile: DocteurProfile) => void
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 12, color: 'var(--muted)',
        fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  fontSize: 14, borderRadius: 9,
  border: '1.5px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function Section({ titre, icon, children }: { titre: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '14px 22px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{titre}</span>
      </div>
      <div style={{ padding: '22px' }}>{children}</div>
    </div>
  )
}

export default function ParamètresPage({ profile, onSave }: Props) {
  const [form, setForm] = useState<DocteurProfile>(profile)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function set<K extends keyof DocteurProfile>(key: K, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
    setSaved(false)
    setSaveError('')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await api.auth.updateMe({
        nom:       form.nom,
        prenoms:   form.prenom,
        specialite: form.specialite,
        telephone: form.telephone,
      })
      // Mettre à jour le nom du cabinet si renseigné
      if (form.cabinet) {
        await api.organisation.update({ nom: form.cabinet, adresse: form.adresseCabinet }).catch(() => {})
      }
      onSave(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--accent)'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--border)'
  }

  return (
    <div className="dashboard-content" style={{ padding: '28px 36px', maxWidth: 900, boxSizing: 'border-box' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Paramètres du compte</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Configurez votre profil médecin et les préférences du cabinet
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {saveError && (
            <div style={{ fontSize: 12, color: '#dc2626', maxWidth: 240, textAlign: 'right' }}>{saveError}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: saved ? '#1a6b3a' : 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 9, padding: '11px 22px',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s', fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sauvegarde…</>
              : saved
                ? <><CheckCircle size={15} /> Sauvegardé</>
                : <><Save size={15} /> Sauvegarder</>}
          </button>
        </div>
      </div>

      {/* Profil médecin */}
      <Section titre="Profil médecin" icon={<User size={15} />}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0,
          }}>
            {form.prenom[0]}{form.nom[0]}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{form.titre} {form.prenom} {form.nom}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>{form.specialite} · {form.ville}, {form.pays}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, fontFamily: 'monospace' }}>
              N° Ordre: {form.numeroOrdre || 'Non renseigné'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Champ label="Titre">
            <select
              value={form.titre}
              onChange={e => set('titre', e.target.value)}
              style={{ ...input, cursor: 'pointer' }}
              onFocus={focusStyle} onBlur={blurStyle}
            >
              {['Dr.', 'Pr.', 'Mme', 'M.'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Champ>
          <Champ label="Prénom">
            <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle} placeholder="Awa" />
          </Champ>
          <Champ label="Nom">
            <input value={form.nom} onChange={e => set('nom', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle} placeholder="Koné" />
          </Champ>
          <Champ label="Spécialité">
            <input value={form.specialite} onChange={e => set('specialite', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle} placeholder="Cardiologue" />
          </Champ>
          <Champ label="N° Ordre médical">
            <input value={form.numeroOrdre} onChange={e => set('numeroOrdre', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle} placeholder="CI-MED-2024-XXXXX" />
          </Champ>
        </div>
      </Section>

      {/* Contact */}
      <Section titre="Coordonnées" icon={<Phone size={15} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <Champ label="Email professionnel">
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input value={form.email} onChange={e => set('email', e.target.value)} type="email"
                style={{ ...input, paddingLeft: 36 }} onFocus={focusStyle} onBlur={blurStyle}
                placeholder="dr.kone@cabinet.ci" />
            </div>
          </Champ>
          <Champ label="Téléphone professionnel">
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
                style={{ ...input, paddingLeft: 36 }} onFocus={focusStyle} onBlur={blurStyle}
                placeholder="+225 07 XX XX XX" />
            </div>
          </Champ>
          <Champ label="Ville">
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input value={form.ville} onChange={e => set('ville', e.target.value)}
                style={{ ...input, paddingLeft: 36 }} onFocus={focusStyle} onBlur={blurStyle}
                placeholder="Cocody, Abidjan" />
            </div>
          </Champ>
          <Champ label="Pays">
            <select value={form.pays} onChange={e => set('pays', e.target.value)}
              style={{ ...input, cursor: 'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
              {['Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Guinée', 'Cameroun', 'Ghana', 'Nigeria', 'France'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Champ>
        </div>
      </Section>

      {/* Cabinet */}
      <Section titre="Informations du cabinet" icon={<Briefcase size={15} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <Champ label="Nom du cabinet">
            <input value={form.cabinet} onChange={e => set('cabinet', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle}
              placeholder="Cabinet de Cardiologie" />
          </Champ>
          <Champ label="Adresse complète">
            <input value={form.adresseCabinet} onChange={e => set('adresseCabinet', e.target.value)}
              style={input} onFocus={focusStyle} onBlur={blurStyle}
              placeholder="Cocody, Riviera 3, Abidjan" />
          </Champ>
        </div>
      </Section>

      {/* Notifications */}
      <Section titre="Notifications" icon={<Bell size={15} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'Rappels de rendez-vous patients', desc: 'Notification 24h avant chaque RDV', defaultOn: true },
            { label: 'Alertes de consultation', desc: "Alertes en temps réel pendant la consultation", defaultOn: true },
            { label: 'Rapports hebdomadaires', desc: 'Résumé des activités chaque lundi matin', defaultOn: false },
            { label: 'Mises à jour système', desc: 'Nouvelles fonctionnalités et correctifs Curaé', defaultOn: true },
          ].map((notif, idx, arr) => (
            <ToggleRow
              key={notif.label}
              label={notif.label}
              desc={notif.desc}
              defaultOn={notif.defaultOn}
              isLast={idx === arr.length - 1}
            />
          ))}
        </div>
      </Section>

      {/* Apparence */}
      <Section titre="Apparence" icon={<Palette size={15} />}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Thème de couleur principal</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Vert médical', color: '#0f6e56', selected: true },
              { label: 'Bleu professionnel', color: '#1a4a8a', selected: false },
              { label: 'Violet doux', color: '#6a1a8a', selected: false },
              { label: 'Ardoise sobre', color: '#3a4a5a', selected: false },
            ].map(theme => (
              <button key={theme.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${theme.selected ? theme.color : 'var(--border)'}`,
                background: theme.selected ? `${theme.color}12` : 'transparent',
                fontFamily: 'inherit',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: theme.color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.selected ? theme.color : 'var(--muted)' }}>
                  {theme.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Version */}
      <div style={{ textAlign: 'center', padding: '12px 0 4px', color: 'var(--muted)', fontSize: 12 }}>
        Curaé v1.0.0 — Cabinet médical ·
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}> Côte d'Ivoire</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, defaultOn, isLast }: { label: string; desc: string; defaultOn: boolean; isLast: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none',
          background: on ? 'var(--accent)' : '#d0d0d0',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: on ? 23 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
}
