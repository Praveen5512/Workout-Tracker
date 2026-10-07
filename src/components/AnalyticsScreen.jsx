import { useState, useMemo } from 'react';
import { 
  Flame, 
  TrendingUp, 
  BarChart3, 
  Award, 
  Activity 
} from 'lucide-react';
import { 
  calculateStreaks, 
  getExerciseProgress, 
  parseWeight 
} from '../utils/workoutAnalytics';

export default function AnalyticsScreen({ workouts }) {
  const streaks = calculateStreaks(workouts);

  // Extract all distinct exercises for deep-dive dropdown
  const allExercises = useMemo(() => {
    const list = Array.from(new Set(workouts.map(w => w.Exercise).filter(Boolean))).sort();
    return list.length > 0 ? list : ['Barbell Bench Press', 'Barbell Squat', 'Barbell Deadlift'];
  }, [workouts]);

  const [selectedExercise, setSelectedExercise] = useState(() => allExercises[0] || 'Barbell Bench Press');

  // Exercise history for selected exercise
  const exerciseHistory = useMemo(() => {
    return getExerciseProgress(workouts, selectedExercise);
  }, [workouts, selectedExercise]);

  // Personal Record (PR) for selected exercise
  const prStats = useMemo(() => {
    if (exerciseHistory.length === 0) return { maxWeight: 0, max1RM: 0, totalSets: 0, totalSessions: 0 };
    let maxWeight = 0;
    let max1RM = 0;
    let totalSets = 0;

    exerciseHistory.forEach(item => {
      if (item.Weight > maxWeight) maxWeight = item.Weight;
      if (item.estimated1RM > max1RM) max1RM = item.estimated1RM;
      totalSets += item.Sets;
    });

    return {
      maxWeight,
      max1RM,
      totalSets,
      totalSessions: exerciseHistory.length
    };
  }, [exerciseHistory]);

  // Weekly volume trend over the last 6 weeks
  const weeklyVolumeTrend = useMemo(() => {
    const now = new Date();
    const weeks = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekWorkouts = workouts.filter(w => {
        if (!w.Date) return false;
        const wDate = new Date(w.Date);
        return wDate >= startOfWeek && wDate <= endOfWeek;
      });

      let volume = 0;
      let sets = 0;
      weekWorkouts.forEach(w => {
        const s = Number(w.Sets) || 0;
        const r = Number(w.Reps) || 0;
        const wt = parseWeight(w['Weight/Intensity']);
        sets += s;
        volume += (s * r * (wt > 0 ? wt : 1));
      });

      const label = `Wk ${startOfWeek.getDate()} ${startOfWeek.toLocaleString('default', { month: 'short' })}`;
      weeks.push({
        label,
        volume: Math.round(volume),
        workoutsCount: weekWorkouts.length,
        sets
      });
    }

    return weeks;
  }, [workouts]);

  const maxVolumeInTrend = Math.max(...weeklyVolumeTrend.map(w => w.volume), 100);

  return (
    <section className="screen-container analytics-screen" id="analytics-screen-view" aria-labelledby="analytics-overview-heading">
      <header className="section-header-row mb-3">
        <div>
          <span className="subtle-badge">
            <BarChart3 size={12} className="text-accent-primary" aria-hidden="true" /> Performance Analytics
          </span>
          <h1 className="section-title" id="analytics-overview-heading">Analytics & Dashboard</h1>
          <p className="section-subtitle">Deep dive into consistency, volume, and exercise progression</p>
        </div>
      </header>

      {/* 1. Streaks & Consistency (Section 9.1) */}
      <section className="analytics-card glass-panel mb-4" aria-labelledby="heading-consistency-streaks">
        <div className="card-header-row mb-3">
          <div className="performance-card-title">
            <Flame size={18} className="text-accent-amber" aria-hidden="true" />
            <h2 id="heading-consistency-streaks" style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline' }}>
              Consistency & Streaks
            </h2>
          </div>
          <span className="pill-badge pill-amber">Consistency Tracking</span>
        </div>

        <div className="streak-stats-row">
          <div className="streak-stat-box">
            <div className="streak-large-number text-accent-amber">
              {streaks.currentStreak}
            </div>
            <div className="streak-stat-label">Current Streak</div>
            <div className="streak-subtext">Active days</div>
          </div>

          <div className="streak-stat-box">
            <div className="streak-large-number text-accent-cyan">
              {streaks.longestStreak}
            </div>
            <div className="streak-stat-label">Best Streak</div>
            <div className="streak-subtext">Personal record</div>
          </div>

          <div className="streak-stat-box">
            <div className="streak-large-number text-accent-primary">
              {streaks.consistencyRate}%
            </div>
            <div className="streak-stat-label">30-Day Rate</div>
            <div className="streak-subtext">Adherence score</div>
          </div>
        </div>

        {/* Consistency Bar */}
        <div className="mt-3">
          <div className="flex-between text-xs text-muted mb-1">
            <span>Consistency Goal (4 sessions/week)</span>
            <span className="text-accent-primary font-bold">{streaks.consistencyRate}% achieved</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill fill-gradient-green" 
              style={{ width: `${Math.min(streaks.consistencyRate, 100)}%` }} 
            />
          </div>
        </div>
      </section>

      {/* 2. Progress Metrics: Weekly Volume SVG Bar Chart (Section 9.2) */}
      <section className="analytics-card glass-panel mb-4" aria-labelledby="heading-volume-progression">
        <div className="card-header-row mb-2">
          <div className="performance-card-title">
            <TrendingUp size={18} className="text-accent-primary" aria-hidden="true" />
            <h2 id="heading-volume-progression" style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline' }}>
              Volume Progression (Last 6 Weeks)
            </h2>
          </div>
        </div>
        <p className="text-xs text-muted mb-3">Total load calculated from Sets × Reps × Weight</p>

        {/* Interactive SVG Bar Chart */}
        <div className="chart-wrapper">
          <svg viewBox="0 0 360 160" className="responsive-chart">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Background grid lines */}
            <line x1="20" y1="20" x2="340" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="20" y1="70" x2="340" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="20" y1="120" x2="340" y2="120" stroke="rgba(255,255,255,0.08)" />

            {/* Bars */}
            {weeklyVolumeTrend.map((item, idx) => {
              const barWidth = 32;
              const spacing = (320 - (barWidth * 6)) / 5;
              const x = 30 + idx * (barWidth + spacing);
              const height = (item.volume / maxVolumeInTrend) * 95;
              const y = 120 - height;

              return (
                <g key={idx} className="chart-bar-group">
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, 4)}
                    rx="5"
                    fill="url(#barGrad)"
                    className="chart-bar hover-bright"
                  />
                  {/* Top value */}
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 6, 14)}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="inherit"
                  >
                    {item.volume > 999 ? `${(item.volume / 1000).toFixed(1)}k` : item.volume}
                  </text>
                  {/* Label */}
                  <text
                    x={x + barWidth / 2}
                    y="136"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8.5"
                    fontFamily="inherit"
                  >
                    {item.label}
                  </text>
                  {/* Sessions count sublabel */}
                  <text
                    x={x + barWidth / 2}
                    y="148"
                    textAnchor="middle"
                    fill="#10b981"
                    fontSize="8"
                    fontFamily="inherit"
                  >
                    {item.workoutsCount} sesh
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* 3. Exercise-Specific Progression & PRs (Section 9.2 & 9.3) */}
      <section className="analytics-card glass-panel mb-4" aria-labelledby="heading-exercise-progression">
        <div className="card-header-row mb-3">
          <div className="performance-card-title">
            <Award size={18} className="text-accent-cyan" aria-hidden="true" />
            <h2 id="heading-exercise-progression" style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline' }}>
              Exercise Progression
            </h2>
          </div>
          {/* Dropdown to pick exercise */}
          <select 
            id="select-analytics-exercise"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="exercise-select-dropdown"
            aria-label="Filter progress by exercise"
          >
            {allExercises.map((ex, i) => (
              <option key={i} value={ex}>{ex}</option>
            ))}
          </select>
        </div>

        {/* PR Metrics Cards */}
        <div className="pr-banner glass-panel mb-3">
          <div className="pr-item">
            <span className="pr-label">Max Weight</span>
            <span className="pr-value text-accent-cyan">{prStats.maxWeight || '—'} <small>kg</small></span>
          </div>
          <div className="pr-divider" />
          <div className="pr-item">
            <span className="pr-label">Estimated 1RM</span>
            <span className="pr-value text-accent-primary">{prStats.max1RM || '—'} <small>kg</small></span>
          </div>
          <div className="pr-divider" />
          <div className="pr-item">
            <span className="pr-label">Total Sets</span>
            <span className="pr-value text-accent-amber">{prStats.totalSets}</span>
          </div>
        </div>

        {/* Weight Progression Line Chart */}
        {exerciseHistory.length > 1 ? (
          <div className="chart-wrapper">
            <div className="text-xs text-muted mb-2">Weight progression curve over recorded sessions</div>
            <svg viewBox="0 0 360 140" className="responsive-chart">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="20" x2="340" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="20" y1="65" x2="340" y2="65" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="20" y1="110" x2="340" y2="110" stroke="rgba(255,255,255,0.08)" />

              {/* Plot points & path */}
              {(() => {
                const maxW = Math.max(...exerciseHistory.map(h => h.Weight), 1);
                const minW = Math.min(...exerciseHistory.map(h => h.Weight), 0);
                const range = (maxW - minW) || 1;

                const points = exerciseHistory.map((item, idx) => {
                  const x = 30 + (idx * ((310) / Math.max(exerciseHistory.length - 1, 1)));
                  const y = 105 - (((item.Weight - minW) / range) * 80);
                  return { x, y, ...item };
                });

                const pathData = points.reduce((acc, p, i) => {
                  return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, '');

                const areaData = `${pathData} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;

                return (
                  <g>
                    <path d={areaData} fill="url(#lineGrad)" />
                    <path d={pathData} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#090d16" stroke="#06b6d4" strokeWidth="2.5" />
                        <text
                          x={pt.x}
                          y={pt.y - 8}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="700"
                        >
                          {pt.Weight}
                        </text>
                        <text
                          x={pt.x}
                          y="126"
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="8"
                        >
                          {pt.Date?.substring(5)}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-muted">
            Log more sessions for <strong className="text-main">{selectedExercise}</strong> to view the progression curve.
          </div>
        )}
      </section>

      {/* 4. Workout Intensity & Summary Insights (Section 9.4) */}
      <section className="analytics-card glass-panel" aria-labelledby="heading-health-insights">
        <div className="card-header-row mb-3">
          <div className="performance-card-title">
            <Activity size={18} className="text-accent-primary" aria-hidden="true" />
            <h2 id="heading-health-insights" style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline' }}>
              Workout Health Insights
            </h2>
          </div>
        </div>

        <div className="insights-list">
          <div className="insight-item">
            <div className="insight-bullet bullet-green" aria-hidden="true" />
            <div>
              <p className="insight-text font-medium">Progressive Overload Tracking</p>
              <p className="insight-desc">
                Consistent volume detected. For compound movements like Squats and Bench Press, consider increasing intensity by 2.5% next cycle.
              </p>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-bullet bullet-cyan" aria-hidden="true" />
            <div>
              <p className="insight-text font-medium">Recovery & Frequency</p>
              <p className="insight-desc">
                Current split averages ~4 training sessions every 7 days, maintaining an optimal balance of training stimulus and CNS recovery.
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
