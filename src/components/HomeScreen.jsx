import { 
  Flame, 
  Dumbbell, 
  Clock, 
  Layers, 
  TrendingUp, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock3,
  Award,
  Sparkles,
  Calendar
} from 'lucide-react';
import { 
  getThisWeekWorkouts, 
  getLastWeekWorkouts, 
  calculateTotals, 
  getWeekDaysActivity, 
  calculateStreaks,
  getWeekBounds 
} from '../utils/workoutAnalytics';

export default function HomeScreen({ 
  workouts, 
  onOpenCreateModal, 
  onSelectWorkout,
  onNavigateToTab 
}) {
  const thisWeekWorkouts = getThisWeekWorkouts(workouts);
  const lastWeekWorkouts = getLastWeekWorkouts(workouts);
  
  const currentTotals = calculateTotals(thisWeekWorkouts);
  const prevTotals = calculateTotals(lastWeekWorkouts);
  const weekDays = getWeekDaysActivity(workouts);
  const streaks = calculateStreaks(workouts);
  const { monday, sunday } = getWeekBounds();

  // Volume change calculation
  const volumeDiff = prevTotals.totalVolume > 0
    ? Math.round(((currentTotals.totalVolume - prevTotals.totalVolume) / prevTotals.totalVolume) * 100)
    : 0;

  // Format date range string e.g. "Sep 28 – Oct 4"
  const formatDateRange = () => {
    const opts = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`;
  };

  // Identify top exercise this week
  const topExercises = Object.entries(currentTotals.exerciseCounts || {})
    .sort((a, b) => b[1] - a[1]);
  const primaryFocus = topExercises.length > 0 ? topExercises[0][0] : 'Balanced Training';

  return (
    <div className="screen-container home-screen">
      {/* Welcome & Week Header */}
      <div className="home-top-bar">
        <div>
          <span className="subtle-badge">
            <Sparkles size={12} className="text-accent-primary" /> Active Training Block
          </span>
          <h2 className="section-title">Weekly Overview</h2>
          <p className="section-subtitle">{formatDateRange()}</p>
        </div>
      </div>

      {/* Main Weekly Performance Card */}
      <div className="performance-card glass-panel">
        <div className="card-header-row">
          <div className="performance-card-title">
            <TrendingUp size={18} className="text-accent-primary" />
            <span>Weekly Performance</span>
          </div>
          {volumeDiff !== 0 && (
            <span className={`trend-badge ${volumeDiff > 0 ? 'trend-positive' : 'trend-neutral'}`}>
              {volumeDiff > 0 ? `+${volumeDiff}% Volume` : `${volumeDiff}% Volume`}
            </span>
          )}
        </div>

        {/* 4 Core Stat Metrics */}
        <div className="stats-grid-4">
          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-cyan">
              <Dumbbell size={16} />
            </div>
            <div className="metric-val">{currentTotals.count}</div>
            <div className="metric-label">Workouts</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-green">
              <Layers size={16} />
            </div>
            <div className="metric-val">{currentTotals.totalSets}</div>
            <div className="metric-label">Sets</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-amber">
              <Clock size={16} />
            </div>
            <div className="metric-val">{currentTotals.totalDuration}m</div>
            <div className="metric-label">Duration</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-purple">
              <Award size={16} />
            </div>
            <div className="metric-val">
              {currentTotals.totalVolume > 999 
                ? `${(currentTotals.totalVolume / 1000).toFixed(1)}k` 
                : currentTotals.totalVolume}
            </div>
            <div className="metric-label">Vol (kg)</div>
          </div>
        </div>

        {/* 7-Day Activity Week Tracker */}
        <div className="week-activity-strip">
          <div className="activity-strip-title">Activity This Week</div>
          <div className="activity-days-row">
            {weekDays.map((day, idx) => (
              <div 
                key={idx} 
                className={`activity-day-pill ${day.hasWorkout ? 'day-active' : ''} ${day.isToday ? 'day-is-today' : ''}`}
              >
                <span className="day-name">{day.dayName}</span>
                <div className="day-indicator">
                  {day.hasWorkout ? (
                    <CheckCircle2 size={13} className="indicator-check" />
                  ) : (
                    <span className="indicator-dot" />
                  )}
                </div>
                <span className="day-num">{day.dateNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metric Cards (Section 8.3) */}
      <div className="secondary-metrics-row">
        {/* Streak & Consistency Card */}
        <div 
          className="metric-card-interactive glass-panel" 
          onClick={() => onNavigateToTab('analytics')}
          role="button"
          tabIndex={0}
        >
          <div className="card-top-icon">
            <Flame size={20} className="text-accent-amber animate-pulse" />
          </div>
          <div className="metric-number-large text-accent-amber">
            {streaks.currentStreak} <span className="metric-unit">Days</span>
          </div>
          <div className="metric-card-title">Current Streak</div>
          <div className="metric-card-footer">
            <span>{streaks.consistencyRate}% consistency rate</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Primary Training Focus Card */}
        <div 
          className="metric-card-interactive glass-panel" 
          onClick={() => onNavigateToTab('list')}
          role="button"
          tabIndex={0}
        >
          <div className="card-top-icon">
            <Dumbbell size={20} className="text-accent-cyan" />
          </div>
          <div className="metric-focus-name text-truncate">
            {primaryFocus}
          </div>
          <div className="metric-card-title">Top Focus This Week</div>
          <div className="metric-card-footer">
            <span>{currentTotals.count} total sessions</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* Weekly Workout List (Section 8.4) */}
      <div className="weekly-workouts-section">
        <div className="section-header-flex">
          <div>
            <h3 className="section-heading">Completed This Week</h3>
            <span className="section-count-tag">{thisWeekWorkouts.length} logs</span>
          </div>
          <button 
            className="view-all-link"
            onClick={() => onNavigateToTab('list')}
          >
            All Workouts <ChevronRight size={14} />
          </button>
        </div>

        {thisWeekWorkouts.length === 0 ? (
          <div className="empty-state-box glass-panel">
            <Calendar size={36} className="text-muted mb-2" />
            <p className="empty-title">No workouts logged yet this week</p>
            <p className="empty-subtitle">Tap the + button to record today's session</p>
            <button className="btn-primary mt-3" onClick={onOpenCreateModal}>
              <Plus size={16} /> Log Today's Workout
            </button>
          </div>
        ) : (
          <div className="workouts-compact-list">
            {thisWeekWorkouts.map(workout => (
              <div 
                key={workout.id} 
                className="compact-workout-item glass-panel hover-card"
                onClick={() => onSelectWorkout(workout)}
                role="button"
                tabIndex={0}
              >
                <div className="compact-item-main">
                  <div className="compact-item-header">
                    <span className="compact-exercise-name">{workout.Exercise}</span>
                    <span className="compact-date-pill">{workout.Date}</span>
                  </div>
                  <div className="compact-specs-row">
                    <span className="spec-badge">
                      <strong>{workout.Sets}</strong> sets × <strong>{workout.Reps}</strong> reps
                    </span>
                    {workout['Weight/Intensity'] && (
                      <span className="spec-badge highlight-spec">
                        {workout['Weight/Intensity']}
                      </span>
                    )}
                    {workout['Duration (min)'] > 0 && (
                      <span className="spec-badge text-muted">
                        <Clock3 size={11} className="inline mr-1" />
                        {workout['Duration (min)']}m
                      </span>
                    )}
                  </div>
                </div>

                <div className="compact-item-side">
                  {workout.syncStatus === 'pending' ? (
                    <span className="sync-chip sync-chip-pending" title="Pending synchronization">
                      Pending
                    </span>
                  ) : (
                    <span className="sync-chip sync-chip-synced" title="Synced">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) (Section 8.5) */}
      <button 
        className="fab-button"
        onClick={onOpenCreateModal}
        aria-label="Create Workout Log"
        title="Record New Workout"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
