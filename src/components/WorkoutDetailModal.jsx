import { X, Dumbbell, FileText, CheckCircle2, Clock3, Edit3, Trash2 } from 'lucide-react';

export default function WorkoutDetailModal({ workout, isOpen, onClose, onEdit, onDelete }) {
  if (!isOpen || !workout) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-detail-heading"
      aria-describedby="workout-detail-notes"
      id="workout-detail-modal-overlay"
    >
      <div 
        className="modal-sheet glass-panel animate-slide-up" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <header className="modal-header">
          <div className="flex-align-center">
            <div className="modal-icon-badge" aria-hidden="true">
              <Dumbbell size={18} className="text-accent-primary" />
            </div>
            <div>
              <h2 id="workout-detail-heading" className="modal-title">{workout.Exercise}</h2>
              <time dateTime={workout.Date} className="modal-subtitle block">{workout.Date}</time>
            </div>
          </div>
          <button 
            id="btn-close-workout-detail"
            className="modal-close-btn" 
            onClick={onClose} 
            aria-label="Close workout details modal"
            title="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Details Section */}
        <section className="modal-body p-4" aria-label="Workout Performance Details">
          <div className="detail-status-pill mb-3">
            {workout.syncStatus === 'pending' ? (
              <span className="sync-chip sync-chip-pending">
                <Clock3 size={13} className="inline mr-1" aria-hidden="true" /> Pending synchronization with Google Sheets
              </span>
            ) : (
              <span className="sync-chip sync-chip-synced">
                <CheckCircle2 size={13} className="inline mr-1" aria-hidden="true" /> Synchronized with Google Sheets (Row #{workout.id})
              </span>
            )}
          </div>

          <div className="stats-grid-4 mb-4" role="region" aria-label="Workout Metrics">
            <div className="stat-metric-box">
              <div className="metric-label">Sets</div>
              <div className="metric-val text-accent-green">{workout.Sets}</div>
            </div>

            <div className="stat-metric-box">
              <div className="metric-label">Reps</div>
              <div className="metric-val text-accent-amber">{workout.Reps}</div>
            </div>

            <div className="stat-metric-box">
              <div className="metric-label">Load</div>
              <div className="metric-val text-accent-cyan text-sm">{workout['Weight/Intensity'] || '—'}</div>
            </div>

            <div className="stat-metric-box">
              <div className="metric-label">Duration</div>
              <div className="metric-val text-accent-purple">{workout['Duration (min)'] || 0}m</div>
            </div>
          </div>

          {/* Notes Section */}
          <article className="detail-notes-card glass-panel mb-4">
            <div className="text-xs text-muted mb-1 flex-align-center">
              <FileText size={13} className="mr-1 text-accent-primary" aria-hidden="true" /> Workout Notes
            </div>
            <p id="workout-detail-notes" className="detail-notes-content">
              {workout.Notes ? workout.Notes : <span className="text-muted italic">No notes recorded for this set.</span>}
            </p>
          </article>

          {/* Actions */}
          <footer className="modal-actions-row">
            <button 
              id="btn-delete-workout-detail"
              className="btn-danger flex-1"
              aria-label={`Delete ${workout.Exercise} log`}
              onClick={() => {
                onDelete(workout.id);
                onClose();
              }}
            >
              <Trash2 size={16} className="mr-1" aria-hidden="true" /> Delete
            </button>
            <button 
              id="btn-edit-workout-detail"
              className="btn-primary flex-1"
              aria-label={`Edit ${workout.Exercise} log`}
              onClick={() => {
                onEdit(workout);
                onClose();
              }}
            >
              <Edit3 size={16} className="mr-1" aria-hidden="true" /> Edit Workout
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
