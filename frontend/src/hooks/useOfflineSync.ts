import { useState, useEffect, useCallback } from 'react'
import { readQueue, syncQueue, QueuedOp } from '../lib/offlineQueue'
import { getToken } from '../lib/api'

export interface OfflineSyncState {
  isOnline: boolean
  queueSize: number
  syncing: boolean
  lastSyncResult: { synced: number; failed: number } | null
  triggerSync: () => Promise<void>
  queue: QueuedOp[]
  refreshQueue: () => void
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueSize, setQueueSize] = useState(readQueue().length)
  const [queue, setQueue] = useState<QueuedOp[]>(readQueue())
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null)

  const refreshQueue = useCallback(() => {
    const q = readQueue()
    setQueue(q)
    setQueueSize(q.length)
  }, [])

  const triggerSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return
    setSyncing(true)
    try {
      const result = await syncQueue(getToken())
      setLastSyncResult({ synced: result.synced, failed: result.failed })
      refreshQueue()
    } finally {
      setSyncing(false)
    }
  }, [syncing, refreshQueue])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when connection restored
      if (readQueue().length > 0) {
        triggerSync()
      }
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerSync])

  // Refresh queue count on storage changes (other tabs)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'curae_offline_queue') refreshQueue()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshQueue])

  return { isOnline, queueSize, syncing, lastSyncResult, triggerSync, queue, refreshQueue }
}
