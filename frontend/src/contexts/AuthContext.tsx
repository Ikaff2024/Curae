import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, setToken, clearToken, getToken } from '../lib/api'

export interface OrganisationAuth {
  id: string
  nom: string
  type: string
  ville: string
  telephone?: string
  email?: string
  adresse?: string
}

export interface MedecinAuth {
  id: string
  email: string
  nom: string
  prenoms: string
  specialite: string
  telephone?: string
  organisation_id?: string
  role?: string
}

export interface RegisterOrgData {
  nom: string
  type: 'cabinet' | 'clinique' | 'hopital' | 'centre'
  ville?: string
  telephone?: string
  email?: string
}

export interface RegisterUserData {
  email: string
  password: string
  nom: string
  prenoms?: string
  specialite?: string
  telephone?: string
  organisation?: RegisterOrgData
}

interface AuthContextType {
  user: MedecinAuth | null
  organisation: OrganisationAuth | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterUserData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MedecinAuth | null>(null)
  const [organisation, setOrganisation] = useState<OrganisationAuth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem('curae_organisation')
    setUser(null)
    setOrganisation(null)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) { setIsLoading(false); return }

    api.auth.me()
      .then((data: any) => {
        const { organisation: org, ...medecin } = data
        setUser(medecin)
        if (org) {
          setOrganisation(org)
          localStorage.setItem('curae_organisation', JSON.stringify(org))
        }
        localStorage.setItem('curae_user', JSON.stringify(medecin))
      })
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))

    window.addEventListener('curae:logout', logout)
    return () => window.removeEventListener('curae:logout', logout)
  }, [logout])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password) as any
    setToken(res.token)
    setUser(res.medecin)
    localStorage.setItem('curae_user', JSON.stringify(res.medecin))
    if (res.organisation) {
      setOrganisation(res.organisation)
      localStorage.setItem('curae_organisation', JSON.stringify(res.organisation))
    }
  }

  const register = async (data: RegisterUserData) => {
    const res = await api.auth.register(data) as any
    setToken(res.token)
    setUser(res.medecin)
    localStorage.setItem('curae_user', JSON.stringify(res.medecin))
    if (res.organisation) {
      setOrganisation(res.organisation)
      localStorage.setItem('curae_organisation', JSON.stringify(res.organisation))
    }
  }

  return (
    <AuthContext.Provider value={{ user, organisation, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
