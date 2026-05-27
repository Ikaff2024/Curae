const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

export function getToken(): string | null {
  return localStorage.getItem('curae_token')
}
export function setToken(token: string) {
  localStorage.setItem('curae_token', token)
}
export function clearToken() {
  localStorage.removeItem('curae_token')
  localStorage.removeItem('curae_user')
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('curae:logout'))
    throw new Error('SESSION_EXPIRED')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Erreur ${res.status}`)
  }

  return res.json()
}

export const api = {
  auth: {
    login:    (email: string, password: string) =>
      http<{ token: string; medecin: any; organisation: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: any) =>
      http<{ token: string; medecin: any; organisation: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => http<any>('/auth/me'),
  },

  organisation: {
    me:     () => http<any>('/organisation/me'),
    update: (data: any) => http<any>('/organisation/me', { method: 'PUT', body: JSON.stringify(data) }),
  },

  patients: {
    list:      (search?: string) =>
      http<{ patients: any[] }>(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get:       (id: string) => http<any>(`/patients/${id}`),
    create:    (data: any) => http<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update:    (id: string, data: any) => http<any>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:    (id: string) => http<any>(`/patients/${id}`, { method: 'DELETE' }),
    tendances: (id: string) => http<{ series: any[]; alerts: string[]; count: number; score_risque: number; score_niveau: string }>(`/patients/${id}/tendances`),
    timeline:  (id: string) => http<{ events: any[]; total: number }>(`/patients/${id}/timeline`),
  },

  rdv: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ) : ''
      return http<any[]>(`/rdv${qs}`)
    },
    create: (data: any) => http<any>('/rdv', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => http<any>(`/rdv/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  ia: {
    resumePatient: (patient_id: string) => http<any>('/ia/resume-patient', { method: 'POST', body: JSON.stringify({ patient_id }) }),
  },

  cr: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ) : ''
      return http<any[]>(`/cr${qs}`)
    },
    create: (data: any) => http<any>('/cr', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => http<any>(`/cr/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    genererIA: (data: any) => http<any>('/ia/generer-cr', { method: 'POST', body: JSON.stringify(data) }),
    structurerTranscription: (data: any) => http<any>('/ia/structurer-transcription', { method: 'POST', body: JSON.stringify(data) }),
  },

  factures: {
    list:  (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ) : ''
      return http<any[]>(`/factures${qs}`)
    },
    stats: () => http<any>('/factures/stats'),
  },

  abonnement: {
    moi: () => http<any>('/abonnements/moi'),
  },

  stats: {
    dashboard: () => http<any>('/stats/dashboard'),
    exportUrl: (type: string, from?: string, to?: string) => {
      const token = getToken()
      const qs = new URLSearchParams({ type, ...(from ? { from } : {}), ...(to ? { to } : {}) })
      const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'
      return `${BASE}/stats/export?${qs}&_token=${token}`
    },
  },

  whatsapp: {
    envoyer: (data: any) => http<any>('/whatsapp/send', { method: 'POST', body: JSON.stringify(data) }),
    preview: (data: any) => http<any>('/whatsapp/preview', { method: 'POST', body: JSON.stringify(data) }),
  },
}
