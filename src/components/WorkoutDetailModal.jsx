import { X, Dumbbell, FileText, CheckCircle2, Clock3, Edit3, Trash2 } from 'lucide-react';

export default function WorkoutDetailModal({ workout, isOpen, onClose, onEdit, onDelete }) {
  if (!isOpen || !workout) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet glass-panel animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align-center">
            <div className="modal-icon-badge">
              <Dumbbell size={18} className="text-accent-primary" />
            </div>
            <div>
              <h3 className="modal-title">{workout.Exercise}</h3>
              <p className="modal-subtitle">{workout.Date}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Details Grid */}
        <div className="modal-body p-4">
          <div className="detail-status-pill mb-3">
            {workout.syncStatus === 'pending' ? (
              <span className="sync-chip sync-chip-pending">
                <Clock3 size={13} className="inline mr-1" /> Pending synchronization with Google Sheets
              </span>
            ) : (
              <span className="sync-chip sync-chip-synced">
                <CheckCircle2 size={13} className="inline mr-1" /> Synchronized with Google Sheets (Row #{workout.id})
              </span>
            )}
          </div>

          <div className="stats-grid-4 mb-4">
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
          <div className="detail-notes-card glass-panel mb-4">
            <div className="text-xs text-muted mb-1 flex-align-center">
              <FileText size={13} className="mr-1 text-accent-primary" /> Workout Notes
            </div>
            <p className="detail-notes-content">
              {workout.Notes ? workout.Notes : <span className="text-muted italic">No notes recorded for this set.</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="modal-actions-row">
            <button 
              className="btn-danger flex-1"
              onClick={() => {
                onDelete(workout.id);
                onClose();
              }}
            >
              <Trash2 size={16} className="mr-1" /> Delete
            </button>
            <button 
              className="btn-primary flex-1"
              onClick={() => {
                onEdit(workout);
                onClose();
              }}
            >
              <Edit3 size={16} className="mr-1" /> Edit Workout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
