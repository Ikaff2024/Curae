import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err)
})

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] ${(Date.now() - start)}ms — ${text.slice(0, 60).replace(/\s+/g, ' ')}`)
  }
  return res
}

export default pool
