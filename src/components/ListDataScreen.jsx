import { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  X, 
  CheckCircle2, 
  Clock3, 
  Edit3, 
  Trash2,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { parseWeight } from '../utils/workoutAnalytics';

export default function ListDataScreen({ 
  workouts, 
  onSelectWorkout, 
  onEditWorkout, 
  onDeleteWorkout 
}) {
  const today = new Date();
  // 10.1 Default to current year & month
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [dateFilterPreset, setDateFilterPreset] = useState('current_month'); // 'current_month' | 'last_month' | 'all'

  // Search & Field-based filters (10.2)
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [minSets, setMinSets] = useState('');
  const [minReps, setMinReps] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [minDuration, setMinDuration] = useState('');

  // Extract distinct exercises for filter dropdown
  const allExercises = useMemo(() => {
    return Array.from(new Set(workouts.map(w => w.Exercise).filter(Boolean))).sort();
  }, [workouts]);

  // Handle month navigation (10.3)
  const handlePrevMonth = () => {
    setDateFilterPreset('custom');
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    setDateFilterPreset('custom');
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handlePresetChange = (preset) => {
    setDateFilterPreset(preset);
    const now = new Date();
    if (preset === 'current_month') {
      setSelectedYear(now.getFullYear());
      setSelectedMonth(now.getMonth());
    } else if (preset === 'last_month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setSelectedYear(lastMonthDate.getFullYear());
      setSelectedMonth(lastMonthDate.getMonth());
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setExerciseFilter('');
    setMinSets('');
    setMinReps('');
    setMinWeight('');
    setMinDuration('');
    setDateFilterPreset('current_month');
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const hasActiveFilters = Boolean(
    searchQuery || exerciseFilter || minSets || minReps || minWeight || minDuration || dateFilterPreset !== 'current_month'
  );

  // Month title display string
  const monthDisplayName = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth, 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth]);

  // Filter workouts based on all criteria
  const filteredWorkouts = useMemo(() => {
    return workouts.filter(w => {
      // 1. Date / Month filtering
      if (w.Date) {
        const itemDate = new Date(w.Date);
        if (dateFilterPreset === 'current_month' || dateFilterPreset === 'last_month' || dateFilterPreset === 'custom') {
          if (itemDate.getFullYear() !== selectedYear || itemDate.getMonth() !== selectedMonth) {
            return false;
          }
        }
      }

      // 2. Search query (matches Exercise or Notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesExercise = w.Exercise && w.Exercise.toLowerCase().includes(q);
        const matchesNotes = w.Notes && w.Notes.toLowerCase().includes(q);
        if (!matchesExercise && !matchesNotes) return false;
      }

      // 3. Exercise dropdown filter
      if (exerciseFilter && w.Exercise !== exerciseFilter) {
        return false;
      }

      // 4. Numeric filters
      if (minSets && (Number(w.Sets) || 0) < Number(minSets)) return false;
      if (minReps && (Number(w.Reps) || 0) < Number(minReps)) return false;
      if (minDuration && (Number(w['Duration (min)']) || 0) < Number(minDuration)) return false;
      if (minWeight) {
        const wVal = parseWeight(w['Weight/Intensity']);
        if (wVal < Number(minWeight)) return false;
      }

      return true;
    });
  }, [
    workouts, 
    dateFilterPreset, 
    selectedYear, 
    selectedMonth, 
    searchQuery, 
    exerciseFilter, 
    minSets, 
    minReps, 
    minWeight, 
    minDuration
  ]);

  // Group workouts by Date descending
  const groupedWorkouts = useMemo(() => {
    const groups = {};
    filteredWorkouts.forEach(w => {
      const d = w.Date ? w.Date.split('T')[0] : 'Unknown Date';
      if (!groups[d]) groups[d] = [];
      groups[d].push(w);
    });

    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredWorkouts]);

  // Date Header formatter (e.g. "Today - Thursday, Oct 1")
  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (isToday) return `Today • ${formatted}`;
    if (isYesterday) return `Yesterday • ${formatted}`;
    return formatted;
  };

  return (
    <div className="screen-container list-screen">
      {/* Screen Title & Month Navigation (10.1 & 10.3) */}
      <div className="list-top-bar mb-3">
        <div>
          <h2 className="section-title">Workout History</h2>
          <p className="section-subtitle">Browsing records with field filters & date controls</p>
        </div>
      </div>

      {/* Date Presets Row */}
      <div className="presets-scroll-row mb-3">
        <button
          className={`filter-preset-pill ${dateFilterPreset === 'current_month' ? 'preset-active' : ''}`}
          onClick={() => handlePresetChange('current_month')}
        >
          This Month
        </button>
        <button
          className={`filter-preset-pill ${dateFilterPreset === 'last_month' ? 'preset-active' : ''}`}
          onClick={() => handlePresetChange('last_month')}
        >
          Last Month
        </button>
        <button
          className={`filter-preset-pill ${dateFilterPreset === 'all' ? 'preset-active' : ''}`}
          onClick={() => handlePresetChange('all')}
        >
          All Records
        </button>
      </div>

      {/* Month Navigator Controls (when viewing monthly) */}
      {dateFilterPreset !== 'all' && (
        <div className="month-navigator-card glass-panel mb-3">
          <button 
            className="month-nav-btn" 
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="month-nav-label">
            <Calendar size={16} className="text-accent-primary mr-1" />
            <span>{monthDisplayName}</span>
          </div>

          <button 
            className="month-nav-btn" 
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Search Bar & Filter Toggle Button (10.2) */}
      <div className="search-filter-row mb-3">
        <div className="search-input-wrapper glass-panel">
          <Search size={16} className="text-muted mr-2" />
          <input
            type="text"
            placeholder="Search exercise or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search-btn">
              <X size={15} />
            </button>
          )}
        </div>

        <button 
          className={`filter-drawer-btn glass-panel ${hasActiveFilters ? 'active-filter' : ''}`}
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          title="Filter by fields"
        >
          <SlidersHorizontal size={17} />
          {hasActiveFilters && <span className="filter-active-dot" />}
        </button>
      </div>

      {/* Expandable Field-Based Filter Drawer (10.2) */}
      {showFilterDrawer && (
        <div className="filter-drawer glass-panel mb-4 animate-fade-in">
          <div className="filter-drawer-header">
            <span className="font-semibold text-sm">Advanced Field Filters</span>
            <button onClick={resetAllFilters} className="reset-filter-link">
              <RotateCcw size={12} className="inline mr-1" /> Reset All
            </button>
          </div>

          <div className="filter-grid">
            {/* Exercise dropdown */}
            <div className="filter-field-col">
              <label className="field-label">Exercise</label>
              <select
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
                className="input-select"
              >
                <option value="">All Exercises</option>
                {allExercises.map((ex, i) => (
                  <option key={i} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            {/* Min Sets */}
            <div className="filter-field-col">
              <label className="field-label">Min Sets</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 3"
                value={minSets}
                onChange={(e) => setMinSets(e.target.value)}
                className="input-text"
              />
            </div>

            {/* Min Reps */}
            <div className="filter-field-col">
              <label className="field-label">Min Reps</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 8"
                value={minReps}
                onChange={(e) => setMinReps(e.target.value)}
                className="input-text"
              />
            </div>

            {/* Min Weight (kg) */}
            <div className="filter-field-col">
              <label className="field-label">Min Weight (kg)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 60"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                className="input-text"
              />
            </div>

            {/* Min Duration */}
            <div className="filter-field-col">
              <label className="field-label">Min Duration (min)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
                className="input-text"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="results-summary-row mb-2">
        <span className="results-count">
          Showing <strong>{filteredWorkouts.length}</strong> {filteredWorkouts.length === 1 ? 'record' : 'records'}
        </span>
        {hasActiveFilters && (
          <button onClick={resetAllFilters} className="clear-all-link">
            Clear filters
          </button>
        )}
      </div>

      {/* Grouped Workouts List */}
      {groupedWorkouts.length === 0 ? (
        <div className="empty-state-box glass-panel mt-3">
          <Calendar size={36} className="text-muted mb-2" />
          <p className="empty-title">No matching workout records</p>
          <p className="empty-subtitle">
            {hasActiveFilters 
              ? 'Try adjusting your search criteria or resetting filters' 
              : 'No entries recorded for this period'}
          </p>
          {hasActiveFilters && (
            <button onClick={resetAllFilters} className="btn-secondary mt-3">
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="date-grouped-container">
          {groupedWorkouts.map(([dateKey, items]) => (
            <div key={dateKey} className="date-group-block mb-3">
              <div className="date-group-header">
                <span className="date-group-title">{formatDateHeader(dateKey)}</span>
                <span className="date-group-badge">{items.length} {items.length === 1 ? 'set' : 'sets'}</span>
              </div>

              <div className="group-items-stack">
                {items.map(w => (
                  <div 
                    key={w.id} 
                    className="workout-record-card glass-panel hover-card"
                    onClick={() => onSelectWorkout(w)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="record-top-row">
                      <span className="record-exercise-name">{w.Exercise}</span>
                      <div className="record-badges">
                        {w.syncStatus === 'pending' ? (
                          <span className="sync-chip sync-chip-pending" title="Sync pending">
                            Pending
                          </span>
                        ) : (
                          <span className="sync-chip sync-chip-synced" title="Synced with Sheets">
                            <CheckCircle2 size={11} /> Synced
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="record-metrics-row">
                      <div className="metric-pill">
                        <strong className="text-accent-primary">{w.Sets}</strong> sets × <strong>{w.Reps}</strong> reps
                      </div>
                      {w['Weight/Intensity'] && (
                        <div className="metric-pill metric-pill-weight">
                          {w['Weight/Intensity']}
                        </div>
                      )}
                      {w['Duration (min)'] > 0 && (
                        <div className="metric-pill metric-pill-time">
                          <Clock3 size={11} className="inline mr-1" />
                          {w['Duration (min)']} min
                        </div>
                      )}
                    </div>

                    {w.Notes && (
                      <div className="record-notes-preview text-truncate">
                        "{w.Notes}"
                      </div>
                    )}

                    {/* Quick action buttons on mobile */}
                    <div className="record-actions-bar" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="record-action-btn action-edit"
                        onClick={() => onEditWorkout(w)}
                        title="Edit record"
                        aria-label="Edit"
                      >
                        <Edit3 size={14} className="mr-1" /> Edit
                      </button>
                      <button 
                        className="record-action-btn action-delete"
                        onClick={() => onDeleteWorkout(w.id)}
                        title="Delete record"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} className="mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
