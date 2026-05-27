import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, setToken, clearToken, getToken } from '../lib/api'

export interface MedecinAuth {
  id: string
  email: string
  nom: string
  prenoms: string
  specialite: string
  telephone?: string
}

interface AuthContextType {
  user: MedecinAuth | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; nom: string; prenoms?: string; specialite?: string; telephone?: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MedecinAuth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) { setIsLoading(false); return }

    api.auth.me()
      .then(m => setUser(m))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))

    window.addEventListener('curae:logout', logout)
    return () => window.removeEventListener('curae:logout', logout)
  }, [logout])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    setToken(res.token)
    localStorage.setItem('curae_user', JSON.stringify(res.medecin))
    setUser(res.medecin)
  }

  const register = async (data: Parameters<AuthContextType['register']>[0]) => {
    const res = await api.auth.register(data)
    setToken(res.token)
    localStorage.setItem('curae_user', JSON.stringify(res.medecin))
    setUser(res.medecin)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
