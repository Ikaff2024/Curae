import { useState } from 'react'
import { X, User, Phone, Calendar, Shield, MapPin, Briefcase, Heart } from 'lucide-react'
import type { Patient, Assureur, Sexe } from '../../types'

interface Props {
  onFermer: () => void
  onSauvegarder: (patient: Patient) => void
}

const ASSUREURS: Assureur[] = ['NSIA', 'Allianz', 'Sanlam', 'AXA', 'Autre', 'Aucun']

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: 'var(--muted)',
        fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  fontSize: 14, borderRadius: 8,
  border: '1.5px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default function NouveauPatientForm({ onFermer, onSauvegarder }: Props) {
  const [form, setForm] = useState({
    nom: '',
    prenoms: '',
    dateNaissance: '',
    sexe: 'M' as Sexe,
    telephone: '',
    whatsapp: '',
    email: '',
    assureur: 'Aucun' as Assureur,
    numeroAssurance: '',
    adresse: '',
    profession: '',
    antecedents: '',
  })
  const [erreurs, setErreurs] = useState<Partial<Record<keyof typeof form, string>>>({})

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (erreurs[key]) setErreurs(prev => ({ ...prev, [key]: undefined }))
  }

  function valider(): boolean {
    const e: typeof erreurs = {}
    if (!form.nom.trim()) e.nom = 'Nom requis'
    if (!form.prenoms.trim()) e.prenoms = 'Prénom requis'
    if (!form.dateNaissance) e.dateNaissance = 'Date de naissance requise'
    if (!form.telephone.trim()) e.telephone = 'Téléphone requis'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valider()) return

    const now = new Date().toISOString().split('T')[0]
    const numero = `CUR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`

    const patient: Patient = {
      id: crypto.randomUUID(),
      numeroDossier: numero,
      nom: form.nom.toUpperCase(),
      prenoms: form.prenoms,
      dateNaissance: form.dateNaissance,
      sexe: form.sexe,
      telephone: form.telephone,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      assureur: form.assureur,
      numeroAssurance: form.numeroAssurance || undefined,
      adresse: form.adresse || undefined,
      profession: form.profession || undefined,
      antecedents: form.antecedents || undefined,
      statut: 'actif',
      dateCreation: now,
    }

    onSauvegarder(patient)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 16,
        width: '100%', maxWidth: 640,
        border: '1px solid var(--border)',
        overflow: 'hidden', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--accent)', padding: '18px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Nouveau patient</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Créer un dossier médical</div>
            </div>
          </div>
          <button onClick={onFermer} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <Section titre="Identité" icon={<User size={14} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Champ label="Nom *">
                <input
                  value={form.nom}
                  onChange={e => set('nom', e.target.value)}
                  placeholder="KOUASSI"
                  style={{ ...inputStyle, borderColor: erreurs.nom ? '#e74c3c' : 'var(--border)' }}
                  onFocus={e => (e.target.style.borderColor = erreurs.nom ? '#e74c3c' : 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = erreurs.nom ? '#e74c3c' : 'var(--border)')}
                />
                {erreurs.nom && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>{erreurs.nom}</div>}
              </Champ>
              <Champ label="Prénoms *">
                <input
                  value={form.prenoms}
                  onChange={e => set('prenoms', e.target.value)}
                  placeholder="Adjoua Marie"
                  style={{ ...inputStyle, borderColor: erreurs.prenoms ? '#e74c3c' : 'var(--border)' }}
                  onFocus={e => (e.target.style.borderColor = erreurs.prenoms ? '#e74c3c' : 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = erreurs.prenoms ? '#e74c3c' : 'var(--border)')}
                />
                {erreurs.prenoms && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>{erreurs.prenoms}</div>}
              </Champ>
              <Champ label="Date de naissance *">
                <input
                  type="date"
                  value={form.dateNaissance}
                  onChange={e => set('dateNaissance', e.target.value)}
                  style={{ ...inputStyle, borderColor: erreurs.dateNaissance ? '#e74c3c' : 'var(--border)' }}
                  onFocus={e => (e.target.style.borderColor = erreurs.dateNaissance ? '#e74c3c' : 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = erreurs.dateNaissance ? '#e74c3c' : 'var(--border)')}
                />
                {erreurs.dateNaissance && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>{erreurs.dateNaissance}</div>}
              </Champ>
              <Champ label="Sexe">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['M', 'F'] as Sexe[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('sexe', s)}
                      style={{
                        flex: 1, padding: '10px 0',
                        borderRadius: 8, border: '1.5px solid',
                        borderColor: form.sexe === s ? 'var(--accent)' : 'var(--border)',
                        background: form.sexe === s ? 'var(--accent-light)' : 'transparent',
                        color: form.sexe === s ? 'var(--accent)' : 'var(--text)',
                        fontWeight: 700, cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      {s === 'M' ? 'Homme' : 'Femme'}
                    </button>
                  ))}
                </div>
              </Champ>
            </div>
          </Section>

          <Section titre="Contact" icon={<Phone size={14} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Champ label="Téléphone *">
                <input
                  value={form.telephone}
                  onChange={e => set('telephone', e.target.value)}
                  placeholder="+225 07 12 34 56"
                  style={{ ...inputStyle, borderColor: erreurs.telephone ? '#e74c3c' : 'var(--border)' }}
                  onFocus={e => (e.target.style.borderColor = erreurs.telephone ? '#e74c3c' : 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = erreurs.telephone ? '#e74c3c' : 'var(--border)')}
                />
                {erreurs.telephone && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>{erreurs.telephone}</div>}
              </Champ>
              <Champ label="WhatsApp">
                <input
                  value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="+225 07 12 34 56"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </Champ>
              <Champ label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="email@exemple.com"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </Champ>
              <Champ label="Adresse">
                <input
                  value={form.adresse}
                  onChange={e => set('adresse', e.target.value)}
                  placeholder="Cocody, Abidjan"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </Champ>
            </div>
          </Section>

          <Section titre="Assurance" icon={<Shield size={14} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Champ label="Assureur">
                <select
                  value={form.assureur}
                  onChange={e => set('assureur', e.target.value as Assureur)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                >
                  {ASSUREURS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Champ>
              {form.assureur !== 'Aucun' && (
                <Champ label="N° d'assurance">
                  <input
                    value={form.numeroAssurance}
                    onChange={e => set('numeroAssurance', e.target.value)}
                    placeholder="NSIA-2024-XXXXX"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </Champ>
              )}
            </div>
          </Section>

          <Section titre="Informations complémentaires" icon={<Heart size={14} />}>
            <div style={{ display: 'grid', gap: 14 }}>
              <Champ label="Profession">
                <input
                  value={form.profession}
                  onChange={e => set('profession', e.target.value)}
                  placeholder="Enseignante, Commerçant…"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </Champ>
              <Champ label="Antécédents médicaux">
                <textarea
                  value={form.antecedents}
                  onChange={e => set('antecedents', e.target.value)}
                  placeholder="HTA traitée depuis 2019. Diabète type 2…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </Champ>
            </div>
          </Section>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={onFermer}
              style={{
                padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
              }}
            >
              Créer le dossier
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ titre, icon, children }: { titre: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        {icon}
        {titre}
      </div>
      {children}
    </div>
  )
}
