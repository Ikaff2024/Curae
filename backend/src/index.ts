// Curaé API — backend Express
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import authRoutes          from './routes/auth'
import patientsRoutes      from './routes/patients'
import rdvRoutes           from './routes/rdv'
import crRoutes            from './routes/cr'
import facturesRoutes      from './routes/factures'
import whatsappRoutes      from './routes/whatsapp'
import iaRoutes            from './routes/ia'
import abonnementsRoutes   from './routes/abonnements'
import statsRoutes         from './routes/stats'
import organisationRoutes  from './routes/organisation'
import { runMigrations }   from './lib/migrations'
import pool                from './lib/db'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: (origin, callback) => {
    // En développement : autoriser tous les localhost (Vite, CRA, etc.)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true)
    // En production : vérifier FRONTEND_URL
    const allowed = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean)
    if (allowed.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origine non autorisée — ${origin}`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// Rate limiting — auth uniquement (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => { console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`); next() })
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', version: '1.0.0', app: 'Curaé API', db: 'ok' })
  } catch {
    res.status(503).json({ status: 'degraded', version: '1.0.0', app: 'Curaé API', db: 'error' })
  }
})

app.use('/api/auth',         authLimiter, authRoutes)
app.use('/api/patients',     patientsRoutes)
app.use('/api/rdv',          rdvRoutes)
app.use('/api/cr',           crRoutes)
app.use('/api/factures',     facturesRoutes)
app.use('/api/whatsapp',     whatsappRoutes)
app.use('/api/ia',           iaRoutes)
app.use('/api/abonnements',   abonnementsRoutes)
app.use('/api/stats',         statsRoutes)
app.use('/api/organisation',  organisationRoutes)

app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }))
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err); res.status(500).json({ error: 'Erreur interne' })
})

app.listen(PORT, async () => {
  console.log(`\n🫀 Curaé API v1.0.0 → http://localhost:${PORT}/health\n`)
  await runMigrations()
})
export default app
