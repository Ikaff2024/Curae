// Lightweight offline mutation queue — stored in localStorage, replayed on reconnect

export interface QueuedOp {
  id: string
  ts: number
  method: 'POST' | 'PUT' | 'DELETE'
  path: string
  body: unknown
  label: string  // human-readable description for UI
}

const QUEUE_KEY = 'curae_offline_queue'
const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

export function enqueue(op: Omit<QueuedOp, 'id' | 'ts'>) {
  const queue = readQueue()
  const entry: QueuedOp = {
    ...op,
    id: Math.random().toString(36).slice(2, 11),
    ts: Date.now(),
  }
  queue.push(entry)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry.id
}

export function readQueue(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

export function removeFromQueue(id: string) {
  const queue = readQueue().filter(op => op.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

async function replayOne(op: QueuedOp, token: string | null): Promise<void> {
  const res = await fetch(`${BASE}${op.path}`, {
    method: op.method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(op.body),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
}

export interface SyncResult { synced: number; failed: number; errors: string[] }

export async function syncQueue(token: string | null): Promise<SyncResult> {
  const queue = readQueue()
  if (queue.length === 0) return { synced: 0, failed: 0, errors: [] }

  let synced = 0, failed = 0
  const errors: string[] = []
  const remaining: QueuedOp[] = []

  for (const op of queue) {
    try {
      await replayOne(op, token)
      synced++
    } catch (e: any) {
      failed++
      errors.push(`${op.label}: ${e.message}`)
      remaining.push(op)
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  return { synced, failed, errors }
}
