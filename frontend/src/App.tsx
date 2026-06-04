import { useState, useEffect } from 'react'
import {
  Users, Calendar, FileText, BarChart2,
  Settings, LogOut, Heart, Loader2, LayoutDashboard, Menu, X,
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import FichePatient from './components/patient/FichePatient'
import AgendaPage from './pages/AgendaPage'
import ComptesRendusPage from './pages/ComptesRendusPage'
import FacturationPage from './pages/FacturationPage'
import ConsultationPage from './pages/ConsultationPage'
import ParamètresPage, { type DocteurProfile } from './pages/ParamètresPage'
import DashboardPage from './pages/DashboardPage'
import OfflineBanner from './components/ui/OfflineBanner'
import GuidePriseEnMain, { BoutonAide } from './components/ui/GuidePriseEnMain'
import { useOfflineSync } from './hooks/useOfflineSync'
import { useIsMobile } from './hooks/useIsMobile'
import type { Patient } from './types'

const GUIDE_KEY = 'curae_guide_done'

type Page = 'dashboard' | 'patients' | 'agenda' | 'comptes-rendus' | 'facturation' | 'parametres'

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',      label: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
  { id: 'patients',       label: 'Patients',         icon: <Users size={18} /> },
  { id: 'agenda',         label: 'Agenda',           icon: <Calendar size={18} /> },
  { id: 'comptes-rendus', label: 'Comptes-rendus',   icon: <FileText size={18} /> },
  { id: 'facturation',    label: 'Facturation',      icon: <BarChart2 size={18} /> },
]

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Tableau de bord', patients: 'Patients', agenda: 'Agenda',
  'comptes-rendus': 'Comptes-rendus', facturation: 'Facturation', parametres: 'Paramètres',
}

export default function App() {
  const { user, organisation, isAuthenticated, isLoading, logout } = useAuth()
  const offlineSync = useOfflineSync()
  const isMobile = useIsMobile()
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [consultationPatient, setConsultationPatient] = useState<Patient | null>(null)
  const [profile, setProfile] = useState<DocteurProfile | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // Ouvrir le guide automatiquement au premier login (après auth réussie)
  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem(GUIDE_KEY)) {
      const t = setTimeout(() => setShowGuide(true), 800)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated])

  function navigate(p: Page) {
    setPage(p)
    setSidebarOpen(false)
  }

  function fermerGuide() {
    localStorage.setItem(GUIDE_KEY, '1')
    setShowGuide(false)
  }

  // Spinner de chargement initial (vérification token)
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7f8f6', fontFamily: '"DM Sans", system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="#0f6e56" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          <div style={{ color: '#888', fontSize: 14 }}>Chargement de Curaé…</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Page de connexion
  if (!isAuthenticated) return <LoginPage />

  // Profil actif = données API (user) ou saisie dans Paramètres
  const activeProfile: DocteurProfile = profile || {
    titre: 'Dr.',
    prenom: user?.prenoms?.split(' ')[0] || user?.nom || '',
    nom: user?.nom || '',
    specialite: user?.specialite || 'Médecin',
    ville: organisation?.ville || 'Abidjan',
    pays: "Côte d'Ivoire",
    telephone: user?.telephone || '',
    email: user?.email || '',
    numeroOrdre: '',
    cabinet: organisation?.nom || `Cabinet ${user?.specialite || 'Médical'}`,
    adresseCabinet: '',
  }

  // Mode consultation plein écran
  if (consultationPatient) {
    return (
      <ConsultationPage
        patient={consultationPatient}
        onEnd={() => setConsultationPatient(null)}
      />
    )
  }

  const navBtnStyle = (id: Page): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center',
    gap: 10, padding: '10px 12px', borderRadius: 10,
    border: 'none', cursor: 'pointer', marginBottom: 2,
    fontSize: 14, fontWeight: page === id ? 700 : 500,
    background: page === id ? 'var(--accent-light)' : 'transparent',
    color: page === id ? 'var(--accent)' : 'var(--text)',
    textAlign: 'left', transition: 'background 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: 'var(--bg)', color: 'var(--text)',
      '--bg': '#f7f8f6',
      '--surface': '#ffffff',
      '--border': '#e8e8e4',
      '--text': '#1a1a18',
      '--muted': '#888',
      '--accent': '#0f6e56',
      '--accent-light': '#e8f4f0',
    } as React.CSSProperties}>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar${isMobile && sidebarOpen ? ' open' : ''}`} style={{
        width: 240, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '0 0 16px',
      }}>
        {/* Logo */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Heart size={18} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--accent)' }}>
                Curaé
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -2 }}>
                {activeProfile.cabinet}
              </div>
            </div>
          </div>
        </div>

        {/* Profil médecin */}
        <button
          onClick={() => navigate('parametres')}
          style={{
            margin: '8px 12px 16px',
            padding: '12px 14px',
            background: page === 'parametres' ? 'var(--accent)' : 'var(--accent-light)',
            borderRadius: 10,
            border: `1px solid ${page === 'parametres' ? 'var(--accent)' : 'rgba(15,110,86,0.15)'}`,
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'background 0.15s', fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: page === 'parametres' ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {(activeProfile.prenom[0] || '?')}{(activeProfile.nom[0] || '?')}
          </div>
          <div>
            <div style={{ fontSize: 13, color: page === 'parametres' ? '#fff' : 'var(--accent)', fontWeight: 700 }}>
              {activeProfile.titre} {activeProfile.prenom} {activeProfile.nom}
            </div>
            <div style={{ fontSize: 11, color: page === 'parametres' ? 'rgba(255,255,255,0.75)' : 'var(--muted)', marginTop: 1 }}>
              {activeProfile.specialite} · {activeProfile.ville.split(',')[0]}
            </div>
          </div>
        </button>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={navBtnStyle(item.id)}
              onMouseEnter={e => { if (page !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (page !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bas sidebar */}
        <div style={{ padding: '0 8px', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <button
            onClick={() => navigate('parametres')}
            style={{ ...navBtnStyle('parametres'), color: page === 'parametres' ? 'var(--accent)' : 'var(--muted)' }}
            onMouseEnter={e => { if (page !== 'parametres') (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
            onMouseLeave={e => { if (page !== 'parametres') (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <Settings size={18} /> <span style={{ flex: 1 }}>Paramètres</span>
          </button>
          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: '10px 12px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              fontSize: 14, background: 'transparent',
              color: 'var(--muted)', textAlign: 'left', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Zone principale */}
      <main className="app-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          padding: isMobile ? '14px 16px' : '18px 36px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 0 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(o => !o)}
                style={{
                  width: 36, height: 36, borderRadius: 9,
                  border: 'none', background: 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, color: 'var(--text)',
                }}
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {PAGE_TITLES[page]}
              </h1>
              {!isMobile && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
          {!isMobile && (
            <div style={{
              padding: '7px 16px', background: 'var(--accent-light)',
              borderRadius: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600,
            }}>
              {activeProfile.titre} {activeProfile.prenom} {activeProfile.nom}
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(offlineSync.queueSize > 0 || !offlineSync.isOnline || offlineSync.lastSyncResult?.synced) && (
            <div style={{ padding: '12px 36px 0' }}>
              <OfflineBanner state={offlineSync} />
            </div>
          )}
          {page === 'dashboard'      && <DashboardPage />}
          {page === 'patients'       && <FichePatient onStartConsultation={setConsultationPatient} />}
          {page === 'agenda'         && <AgendaPage />}
          {page === 'comptes-rendus' && <ComptesRendusPage />}
          {page === 'facturation'    && <FacturationPage />}
          {page === 'parametres'     && (
            <ParamètresPage profile={activeProfile} onSave={p => setProfile(p)} />
          )}
        </div>
      </main>

      {/* Bouton d'aide flottant */}
      <BoutonAide onClick={() => setShowGuide(true)} />

      {/* Guide de prise en main */}
      {showGuide && (
        <GuidePriseEnMain
          onNavigate={navigate}
          onClose={fermerGuide}
        />
      )}

      {/* Bottom navigation — mobile only */}
      <nav className="bottom-nav">
        {[
          { id: 'dashboard'      as Page, icon: <LayoutDashboard size={20} />, label: 'Accueil' },
          { id: 'patients'       as Page, icon: <Users size={20} />,           label: 'Patients' },
          { id: 'agenda'         as Page, icon: <Calendar size={20} />,        label: 'Agenda' },
          { id: 'comptes-rendus' as Page, icon: <FileText size={20} />,        label: 'CR' },
          { id: 'facturation'    as Page, icon: <BarChart2 size={20} />,       label: 'Factures' },
        ].map(item => (
          <button
            key={item.id}
            className={`bottom-nav-btn${page === item.id ? ' active' : ''}`}
            onClick={() => navigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
