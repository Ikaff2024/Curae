import { WifiOff, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'
import type { OfflineSyncState } from '../../hooks/useOfflineSync'

interface Props {
  state: OfflineSyncState
}

export default function OfflineBanner({ state }: Props) {
  const { isOnline, queueSize, syncing, lastSyncResult, triggerSync } = state

  // Show nothing when fully online with no queue and no recent sync
  if (isOnline && queueSize === 0 && !lastSyncResult) return null

  // Just synced successfully — show brief confirmation
  if (isOnline && queueSize === 0 && lastSyncResult && lastSyncResult.synced > 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: '#e8f4f0', borderRadius: 10,
        border: '1px solid #a0d4c0', fontSize: 13, color: '#0f6e56',
        marginBottom: 12,
      }}>
        <CheckCircle size={14} />
        {lastSyncResult.synced} opération{lastSyncResult.synced > 1 ? 's' : ''} synchronisée{lastSyncResult.synced > 1 ? 's' : ''} avec le serveur.
      </div>
    )
  }

  // Offline with pending ops
  if (!isOnline) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', background: '#fef9e7', borderRadius: 10,
        border: '1px solid #f0d080', fontSize: 13, color: '#a06010',
        marginBottom: 12,
      }}>
        <WifiOff size={14} />
        <span style={{ flex: 1 }}>
          Mode hors ligne — les modifications sont sauvegardées localement
          {queueSize > 0 && <> ({queueSize} opération{queueSize > 1 ? 's' : ''} en attente)</>}.
        </span>
      </div>
    )
  }

  // Online with pending queue
  if (isOnline && queueSize > 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', background: '#eff6ff', borderRadius: 10,
        border: '1px solid #bfdbfe', fontSize: 13, color: '#1a4a8a',
        marginBottom: 12,
      }}>
        {syncing
          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : <RefreshCw size={14} />}
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        <span style={{ flex: 1 }}>
          {syncing
            ? `Synchronisation de ${queueSize} opération${queueSize > 1 ? 's' : ''}…`
            : `${queueSize} opération${queueSize > 1 ? 's' : ''} à synchroniser.`}
        </span>
        {!syncing && (
          <button
            onClick={triggerSync}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: '#1a4a8a', color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Synchroniser
          </button>
        )}
      </div>
    )
  }

  return null
}
