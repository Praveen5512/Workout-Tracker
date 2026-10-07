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
    <section className="screen-container home-screen" id="home-screen-view" aria-labelledby="home-overview-heading">
      {/* Welcome & Week Header */}
      <header className="home-top-bar">
        <div>
          <span className="subtle-badge">
            <Sparkles size={12} className="text-accent-primary" aria-hidden="true" /> Active Training Block
          </span>
          <h1 className="section-title" id="home-overview-heading">Weekly Overview</h1>
          <p className="section-subtitle">{formatDateRange()}</p>
        </div>
      </header>

      {/* Main Weekly Performance Card */}
      <section className="performance-card glass-panel" id="card-weekly-performance" aria-labelledby="heading-weekly-performance">
        <div className="card-header-row">
          <div className="performance-card-title">
            <TrendingUp size={18} className="text-accent-primary" aria-hidden="true" />
            <h2 id="heading-weekly-performance" style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline' }}>
              Weekly Performance
            </h2>
          </div>
          {volumeDiff !== 0 && (
            <span className={`trend-badge ${volumeDiff > 0 ? 'trend-positive' : 'trend-neutral'}`}>
              {volumeDiff > 0 ? `+${volumeDiff}% Volume` : `${volumeDiff}% Volume`}
            </span>
          )}
        </div>

        {/* 4 Core Stat Metrics */}
        <div className="stats-grid-4" role="region" aria-label="Weekly Total Metrics">
          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-cyan" aria-hidden="true">
              <Dumbbell size={16} />
            </div>
            <div className="metric-val">{currentTotals.count}</div>
            <div className="metric-label">Workouts</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-green" aria-hidden="true">
              <Layers size={16} />
            </div>
            <div className="metric-val">{currentTotals.totalSets}</div>
            <div className="metric-label">Sets</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-amber" aria-hidden="true">
              <Clock size={16} />
            </div>
            <div className="metric-val">{currentTotals.totalDuration}m</div>
            <div className="metric-label">Duration</div>
          </div>

          <div className="stat-metric-box">
            <div className="metric-icon-wrap metric-accent-purple" aria-hidden="true">
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
        <div className="week-activity-strip" role="region" aria-label="7-Day Activity Strip">
          <div className="activity-strip-title">Activity This Week</div>
          <div className="activity-days-row">
            {weekDays.map((day, idx) => (
              <div 
                key={idx} 
                className={`activity-day-pill ${day.hasWorkout ? 'day-active' : ''} ${day.isToday ? 'day-is-today' : ''}`}
                title={`${day.dayName}: ${day.hasWorkout ? 'Workout Completed' : 'Rest Day'}`}
              >
                <span className="day-name">{day.dayName}</span>
                <div className="day-indicator">
                  {day.hasWorkout ? (
                    <CheckCircle2 size={13} className="indicator-check" aria-hidden="true" />
                  ) : (
                    <span className="indicator-dot" />
                  )}
                </div>
                <span className="day-num">{day.dateNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Metric Cards */}
      <section className="secondary-metrics-row" aria-label="Streak and Top Focus Cards">
        {/* Streak & Consistency Card */}
        <div 
          id="card-current-streak"
          className="metric-card-interactive glass-panel" 
          onClick={() => onNavigateToTab('analytics')}
          role="button"
          tabIndex={0}
          aria-label={`Current Streak: ${streaks.currentStreak} Days with ${streaks.consistencyRate}% consistency rate`}
        >
          <div className="card-top-icon">
            <Flame size={20} className="text-accent-amber animate-pulse" aria-hidden="true" />
          </div>
          <div className="metric-number-large text-accent-amber">
            {streaks.currentStreak} <span className="metric-unit">Days</span>
          </div>
          <div className="metric-card-title">Current Streak</div>
          <div className="metric-card-footer">
            <span>{streaks.consistencyRate}% consistency rate</span>
            <ChevronRight size={14} aria-hidden="true" />
          </div>
        </div>

        {/* Primary Training Focus Card */}
        <div 
          id="card-top-focus"
          className="metric-card-interactive glass-panel" 
          onClick={() => onNavigateToTab('list')}
          role="button"
          tabIndex={0}
          aria-label={`Top Focus This Week: ${primaryFocus} with ${currentTotals.count} total sessions`}
        >
          <div className="card-top-icon">
            <Dumbbell size={20} className="text-accent-cyan" aria-hidden="true" />
          </div>
          <div className="metric-focus-name text-truncate">
            {primaryFocus}
          </div>
          <div className="metric-card-title">Top Focus This Week</div>
          <div className="metric-card-footer">
            <span>{currentTotals.count} total sessions</span>
            <ChevronRight size={14} aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Weekly Workout List */}
      <section className="weekly-workouts-section" aria-labelledby="heading-completed-week">
        <div className="section-header-flex">
          <div>
            <h2 className="section-heading" id="heading-completed-week">Completed This Week</h2>
            <span className="section-count-tag">{thisWeekWorkouts.length} logs</span>
          </div>
          <button 
            id="btn-view-all-workouts"
            className="view-all-link"
            onClick={() => onNavigateToTab('list')}
            aria-label="View all logged workouts in history"
          >
            All Workouts <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        {thisWeekWorkouts.length === 0 ? (
          <div className="empty-state-box glass-panel">
            <Calendar size={36} className="text-muted mb-2" aria-hidden="true" />
            <p className="empty-title">No workouts logged yet this week</p>
            <p className="empty-subtitle">Tap the + button to record today's session</p>
            <button id="btn-empty-log-workout" className="btn-primary mt-3" onClick={onOpenCreateModal}>
              <Plus size={16} aria-hidden="true" /> Log Today's Workout
            </button>
          </div>
        ) : (
          <div className="workouts-compact-list" role="feed" aria-label="This week's workouts">
            {thisWeekWorkouts.map(workout => (
              <article 
                key={workout.id} 
                className="compact-workout-item glass-panel hover-card"
                onClick={() => onSelectWorkout(workout)}
                role="button"
                tabIndex={0}
                aria-label={`${workout.Exercise} on ${workout.Date}, ${workout.Sets} sets of ${workout.Reps} reps`}
              >
                <div className="compact-item-main">
                  <div className="compact-item-header">
                    <span className="compact-exercise-name">{workout.Exercise}</span>
                    <time dateTime={workout.Date} className="compact-date-pill">{workout.Date}</time>
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
                        <Clock3 size={11} className="inline mr-1" aria-hidden="true" />
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
                      <CheckCircle2 size={12} aria-hidden="true" />
                    </span>
                  )}
                  <ChevronRight size={16} className="text-muted" aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Button (FAB) */}
      <button 
        id="fab-log-workout"
        className="fab-button"
        onClick={onOpenCreateModal}
        aria-label="Record New Workout Log"
        title="Record New Workout"
      >
        <Plus size={26} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </section>
  );
}
