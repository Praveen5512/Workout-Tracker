import { 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Dumbbell 
} from 'lucide-react';

export default function Header({ syncState, onTriggerSync, onOpenSettings }) {
  const { isOnline, isSyncing, pendingCount } = syncState;

  // Render appropriate sync status badge
  const renderSyncBadge = () => {
    if (!isOnline) {
      return (
        <div className="sync-badge badge-offline" title="Offline - changes stored locally">
          <WifiOff size={13} className="badge-icon" />
          <span>Offline</span>
        </div>
      );
    }

    if (isSyncing) {
      return (
        <div className="sync-badge badge-syncing" title="Synchronizing with Google Sheets...">
          <RefreshCw size={13} className="badge-icon animate-spin-slow" />
          <span>Syncing...</span>
        </div>
      );
    }

    if (pendingCount > 0) {
      return (
        <button 
          onClick={onTriggerSync}
          className="sync-badge badge-pending hover-scale" 
          title="Click to synchronize pending changes"
        >
          <Clock size={13} className="badge-icon" />
          <span>{pendingCount} Pending</span>
        </button>
      );
    }

    return (
      <div className="sync-badge badge-synced" title="All changes synchronized">
        <CheckCircle2 size={13} className="badge-icon" />
        <span>Synced</span>
      </div>
    );
  };

  return (
    <header className="app-header glass-panel">
      <div className="header-left">
        <div className="brand-icon-wrapper">
          <Dumbbell size={20} className="brand-icon" />
        </div>
        <div className="brand-text">
          <div className="brand-title" role="banner" aria-label="ApexTrack Workout Tracker">Apex<span className="brand-highlight">Track</span></div>
          <div className="connection-pill">
            <span className={isOnline ? 'pulse-dot-online' : 'pulse-dot-offline'}></span>
            <span className="connection-label">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {renderSyncBadge()}

        {isOnline && (
          <button 
            id="btn-header-manual-sync"
            className="header-icon-btn hover-glow" 
            onClick={onTriggerSync} 
            disabled={isSyncing}
            title="Manual Sync"
            aria-label="Synchronize data"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin-slow' : ''} />
          </button>
        )}

        <button 
          id="btn-header-open-settings"
          className="header-icon-btn" 
          onClick={onOpenSettings}
          title="App Settings & Backend"
          aria-label="Settings"
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
