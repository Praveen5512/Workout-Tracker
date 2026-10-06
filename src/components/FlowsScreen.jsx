import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart2,
  Clock3,
  Copy,
  Dumbbell,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Workflow
} from 'lucide-react';
import FlowEditorScreen from './FlowEditorScreen';
import FlowPlayerScreen, {
  ACTIVE_SESSION_KEY,
  computeElapsedSeconds,
  formatTime
} from './FlowPlayerScreen';
import { api, getScriptUrl } from '../services/api';
import './FlowsScreen.css';

const FLOWS_KEY = 'apextrack_flows_v1';
const HISTORY_KEY = 'apextrack_flow_session_history_v1';
const VIEW_KEY = 'apextrack_flows_current_view_v1';
const DRAFT_KEY = 'apextrack_flow_editor_draft_v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const STARTER_TEMPLATES = [
  {
    name: 'Upper Body Blast',
    exercises: [
      { name: 'Push-ups', sets: 3, reps: 12, workoutTimeMin: 2 },
      { name: 'Pull-ups', sets: 3, reps: 8, workoutTimeMin: 3 },
      { name: 'Dips', sets: 3, reps: 10, workoutTimeMin: 2 }
    ]
  },
  {
    name: 'Core & Mobility Flow',
    exercises: [
      { name: 'Plank', sets: 3, reps: 1, workoutTimeMin: 2 },
      { name: 'Russian Twists', sets: 3, reps: 20, workoutTimeMin: 2 },
      { name: 'Mountain Climbers', sets: 3, reps: 25, workoutTimeMin: 2 }
    ]
  },
  {
    name: 'Leg Day Primer',
    exercises: [
      { name: 'Bodyweight Squats', sets: 4, reps: 15, workoutTimeMin: 3 },
      { name: 'Walking Lunges', sets: 3, reps: 12, workoutTimeMin: 3 },
      { name: 'Calf Raises', sets: 3, reps: 20, workoutTimeMin: 2 }
    ]
  }
];

function readArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readFlows() {
  return readArray(FLOWS_KEY)
    .filter(
      (flow) =>
        flow &&
        typeof flow.id === 'string' &&
        typeof flow.name === 'string' &&
        Array.isArray(flow.exercises)
    )
    .map((flow) => ({
      ...flow,
      exercises: flow.exercises
        .filter((item) => item && typeof item.name === 'string')
        .map((item) => ({
          id: item.id || makeId(),
          name: item.name,
          sets: Math.max(1, Number(item.sets) || 1),
          reps: Math.max(1, Number(item.reps) || 1),
          workoutTimeMin: Math.max(0, Number(item.workoutTimeMin) || 0),
          restTimeSec: Math.max(0, Number(item.restTimeSec) || 0)
        }))
    }))
    .filter((flow) => flow.exercises.length > 0);
}

function cleanHistory() {
  const cutoff = Date.now() - RETENTION_MS;
  const valid = readArray(HISTORY_KEY)
    .filter((item) => {
      const time = new Date(item.completedAt).getTime();
      return (
        Number.isFinite(time) &&
        time >= cutoff &&
        Number.isFinite(Number(item.durationSeconds))
      );
    })
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(valid));
  } catch {
    /* ignore */
  }
  return valid;
}

export default function FlowsScreen() {
  const [flows, setFlows] = useState(() => readFlows());
  const [history, setHistory] = useState(() => cleanHistory());
  const [commonWorkouts, setCommonWorkouts] = useState([]);
  const [backendMessage, setBackendMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('routines'); // 'routines' | 'history'

  // Refresh-proof active session & view tracking
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
      if (
        stored &&
        (stored.sessionStatus === 'running' || stored.sessionStatus === 'paused') &&
        Array.isArray(stored.exercises) &&
        stored.exercises.length > 0
      ) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  // Current subscreen view: 'list' | 'create' | 'edit' | 'player'
  const [view, setView] = useState(() => {
    try {
      // 1. If an active session is running/paused, and saved view was player, resume player!
      const active = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
      const savedView = localStorage.getItem(VIEW_KEY);
      if (
        active &&
        (active.sessionStatus === 'running' || active.sessionStatus === 'paused')
      ) {
        if (savedView === 'player' || !savedView) return 'player';
      }
      // 2. If draft was active, resume editor
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && (savedView === 'create' || savedView === 'edit')) {
        return savedView;
      }
      return savedView === 'create' || savedView === 'edit' ? savedView : 'list';
    } catch {
      return 'list';
    }
  });

  const [editingFlow, setEditingFlow] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft?.editingId) {
        const found = readFlows().find((f) => f.id === draft.editingId);
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Sync flows to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FLOWS_KEY, JSON.stringify(flows));
    } catch {
      /* ignore */
    }
  }, [flows]);

  // Persist current view to localStorage for refresh-proof navigation
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // Fetch common workouts from Google Sheets API
  useEffect(() => {
    let cancelled = false;
    if (!getScriptUrl()) {
      setBackendMessage(
        'Connect your Google Apps Script URL in Settings to sync workout logs to Google Sheets.'
      );
      return () => {
        cancelled = true;
      };
    }
    api
      .syncCommonWorkouts()
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setCommonWorkouts(
          list
            .map((item) =>
              typeof item === 'string'
                ? item
                : item?.Exercise || item?.exercise || item?.name
            )
            .filter(Boolean)
        );
        setBackendMessage('Google Sheets connected. Ready to log flow sessions.');
      })
      .catch(() => {
        if (!cancelled)
          setBackendMessage(
            'Backend configured. Suggestions could not be fetched.'
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync history on focus
  useEffect(() => {
    const refresh = () => {
      setHistory(cleanHistory());
      try {
        const active = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
        setActiveSession(active);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  // Update activeSession state whenever localStorage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === ACTIVE_SESSION_KEY) {
        try {
          const updated = JSON.parse(e.newValue || 'null');
          setActiveSession(updated);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Navigation handlers
  const handleOpenCreate = (template = null) => {
    setEditingFlow(null);
    setSelectedTemplate(template);
    setView('create');
  };

  const handleOpenEdit = (flow) => {
    setEditingFlow(flow);
    setSelectedTemplate(null);
    setView('edit');
  };

  const handleSaveFlow = (flowData) => {
    if (editingFlow) {
      setFlows((prev) =>
        prev.map((f) => (f.id === flowData.id ? flowData : f))
      );
    } else {
      setFlows((prev) => [flowData, ...prev]);
    }
    setEditingFlow(null);
    setSelectedTemplate(null);
    setView('list');
  };

  const handleCancelEditor = () => {
    setEditingFlow(null);
    setSelectedTemplate(null);
    setView('list');
  };

  const handleStartFlow = (flow) => {
    if (!flow.exercises?.length) return;
    const newSession = {
      flowId: flow.id,
      flowName: flow.name,
      exercises: flow.exercises,
      currentIndex: 0,
      sessionStatus: 'running',
      startedAt: Date.now(),
      accumulatedMs: 0,
      completedIndices: [],
      restoredFromRefresh: false
    };
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newSession));
    } catch {
      /* ignore */
    }
    setActiveSession(newSession);
    setView('player');
  };

  const handleResumeActiveSession = () => {
    if (activeSession) {
      setView('player');
    }
  };

  const handleDiscardActiveSession = () => {
    if (
      window.confirm(
        `Discard in-progress session for “${activeSession?.flowName || 'routine'}”?`
      )
    ) {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } catch {
        /* ignore */
      }
      setActiveSession(null);
    }
  };

  const handleFinishFlowSession = (historyRecord) => {
    const updated = cleanHistory();
    setHistory(updated);
    setActiveSession(null);
  };

  const handleExitPlayer = () => {
    try {
      const active = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
      setActiveSession(active);
    } catch {
      /* ignore */
    }
    setView('list');
  };

  const handleDuplicateFlow = (flow) => {
    const duplicate = {
      ...flow,
      id: makeId(),
      name: `${flow.name} (Copy)`,
      createdAt: new Date().toISOString()
    };
    setFlows((prev) => [duplicate, ...prev]);
  };

  const handleDeleteFlow = (flow) => {
    if (window.confirm(`Delete the flow “${flow.name}”?`)) {
      setFlows((prev) => prev.filter((item) => item.id !== flow.id));
    }
  };

  // Filtered flows for search
  const filteredFlows = useMemo(() => {
    if (!searchQuery.trim()) return flows;
    const q = searchQuery.toLowerCase();
    return flows.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.exercises.some((ex) => ex.name.toLowerCase().includes(q))
    );
  }, [flows, searchQuery]);

  // Overall Statistics for KPI strip
  const stats = useMemo(() => {
    const totalFlows = flows.length;
    const totalSessions = history.length;
    const totalDurationSeconds = history.reduce(
      (sum, item) => sum + (Number(item.durationSeconds) || 0),
      0
    );
    const avgDurationSeconds =
      totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions) : 0;

    return {
      totalFlows,
      totalSessions,
      totalDurationSeconds,
      avgDurationSeconds
    };
  }, [flows, history]);

  // SVG Graph data for session duration over time
  const graph = useMemo(() => {
    if (!history.length) return null;
    const width = 640;
    const height = 210;
    const pad = { top: 22, right: 24, bottom: 38, left: 52 };
    const values = history.map((item) => Number(item.durationSeconds));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = history.map((item, index) => ({
      ...item,
      x:
        pad.left +
        (history.length === 1
          ? (width - pad.left - pad.right) / 2
          : (index * (width - pad.left - pad.right)) / (history.length - 1)),
      y:
        pad.top +
        (height - pad.top - pad.bottom) * (1 - (item.durationSeconds - min) / range)
    }));

    return {
      width,
      height,
      pad,
      points,
      min,
      max,
      path: points
        .map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`)
        .join(' ')
    };
  }, [history]);

  // If in 'create' or 'edit' view, render separate screen!
  if (view === 'create' || view === 'edit') {
    return (
      <FlowEditorScreen
        editingFlow={editingFlow}
        initialTemplate={selectedTemplate}
        commonWorkouts={commonWorkouts}
        onSave={handleSaveFlow}
        onCancel={handleCancelEditor}
      />
    );
  }

  // If in 'player' view, render separate screen!
  if (view === 'player') {
    const flowToPlay =
      activeSession?.exercises?.length
        ? {
            id: activeSession.flowId,
            name: activeSession.flowName,
            exercises: activeSession.exercises
          }
        : flows[0];

    if (!flowToPlay) {
      setView('list');
      return null;
    }

    return (
      <FlowPlayerScreen
        flow={flowToPlay}
        initialSession={activeSession}
        onFinishSession={handleFinishFlowSession}
        onExit={handleExitPlayer}
      />
    );
  }

  // Main Flows Hub / Dashboard UI
  return (
    <section className="flows-screen flow-hub">
      {/* Hero Header */}
      <div className="flow-hub-header">
        <div className="flow-hub-titles">
          <div className="flow-eyebrow-pill">
            <span className="pulse-dot-online" />
            <span>WORKOUT SEQUENCING</span>
          </div>
          <h1 className="section-title">Flows</h1>
          <p className="section-subtitle">
            Craft guided routines, train with seamless timers, and build steady momentum.
          </p>
        </div>

        <button
          type="button"
          className="flow-primary-btn flow-create-hero-btn"
          onClick={() => handleOpenCreate()}
        >
          <Plus size={18} />
          <span>Create flow</span>
        </button>
      </div>

      {/* Active Session in Progress Banner */}
      {activeSession &&
        (activeSession.sessionStatus === 'running' ||
          activeSession.sessionStatus === 'paused') && (
          <aside
            className="flow-active-session-banner glass-panel animate-fade"
            aria-label="Active Workout in Progress"
          >
            <div className="flow-active-banner-left">
              <span
                className={`banner-pulse-dot ${
                  activeSession.sessionStatus === 'running'
                    ? 'pulse-dot-online'
                    : 'pulse-dot-pending'
                }`}
              />
              <div className="flow-active-banner-info">
                <span className="flow-active-badge">
                  {activeSession.sessionStatus === 'paused'
                    ? 'PAUSED SESSION'
                    : 'SESSION IN PROGRESS'}
                </span>
                <strong className="flow-active-flow-name">
                  {activeSession.flowName}
                </strong>
                <span className="flow-active-step">
                  Workout {activeSession.currentIndex + 1} of{' '}
                  {activeSession.exercises.length} ·{' '}
                  {formatTime(computeElapsedSeconds(activeSession))}
                </span>
              </div>
            </div>

            <div className="flow-active-banner-actions">
              <button
                type="button"
                className="flow-primary-btn flow-banner-resume-btn"
                onClick={handleResumeActiveSession}
              >
                <Play size={16} />
                <span>Resume flow</span>
              </button>
              <button
                type="button"
                className="flow-icon-btn flow-icon-danger"
                onClick={handleDiscardActiveSession}
                title="Discard active session"
                aria-label="Discard active session"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </aside>
        )}

      {/* Quick KPI Stats Strip */}
      <div className="flow-stats-grid">
        <div className="flow-stat-card glass-panel">
          <div className="flow-stat-icon">
            <Workflow size={18} />
          </div>
          <div className="flow-stat-data">
            <strong>{stats.totalFlows}</strong>
            <span>Saved Flows</span>
          </div>
        </div>

        <div className="flow-stat-card glass-panel">
          <div className="flow-stat-icon">
            <Activity size={18} />
          </div>
          <div className="flow-stat-data">
            <strong>{stats.totalSessions}</strong>
            <span>Completed (30d)</span>
          </div>
        </div>

        <div className="flow-stat-card glass-panel">
          <div className="flow-stat-icon">
            <Clock3 size={18} />
          </div>
          <div className="flow-stat-data">
            <strong>{formatTime(stats.totalDurationSeconds)}</strong>
            <span>Active Time</span>
          </div>
        </div>

        <div className="flow-stat-card glass-panel">
          <div className="flow-stat-icon">
            <BarChart2 size={18} />
          </div>
          <div className="flow-stat-data">
            <strong>
              {stats.avgDurationSeconds > 0
                ? `${Math.round(stats.avgDurationSeconds / 60)} min`
                : '0 min'}
            </strong>
            <span>Avg Session</span>
          </div>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div className="flow-view-switcher glass-panel">
        <button
          type="button"
          className={`flow-switcher-btn ${
            activeTab === 'routines' ? 'switcher-active' : ''
          }`}
          onClick={() => setActiveTab('routines')}
        >
          <Layers size={16} />
          <span>Your flows ({flows.length})</span>
        </button>

        <button
          type="button"
          className={`flow-switcher-btn ${
            activeTab === 'history' ? 'switcher-active' : ''
          }`}
          onClick={() => setActiveTab('history')}
        >
          <BarChart2 size={16} />
          <span>Session duration ({history.length})</span>
        </button>
      </div>

      {/* Tab 1: Routines List */}
      {activeTab === 'routines' && (
        <div className="flow-routines-tab animate-fade">
          {/* Search bar when multiple flows exist */}
          {flows.length > 2 && (
            <div className="flow-search-bar glass-panel">
              <Search size={16} className="flow-muted-icon" />
              <input
                className="flow-search-input"
                type="text"
                placeholder="Search flows or exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={60}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="flow-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          {/* Flows Grid */}
          {filteredFlows.length > 0 ? (
            <div className="flow-cards-grid">
              {filteredFlows.map((flow) => {
                const totalMinutes = flow.exercises.reduce(
                  (sum, item) => sum + (Number(item.workoutTimeMin) || 0),
                  0
                );

                return (
                  <article
                    key={flow.id}
                    className="flow-routine-card-item glass-panel"
                  >
                    <div className="flow-routine-card-top">
                      <div className="flow-routine-badge-icon">
                        <Dumbbell size={20} />
                      </div>
                      <div className="flow-routine-card-title-group">
                        <h2 className="flow-routine-title">{flow.name}</h2>
                        <div className="flow-routine-meta-pills">
                          <span className="flow-badge-subtle">
                            {flow.exercises.length}{' '}
                            {flow.exercises.length === 1
                              ? 'workout'
                              : 'workouts'}
                          </span>
                          <span className="flow-badge-subtle">
                            <Clock3 size={12} /> ~{totalMinutes} min est.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Exercise sequence preview chips */}
                    <div className="flow-routine-chips">
                      {flow.exercises.slice(0, 4).map((item, idx) => (
                        <span
                          key={item.id || idx}
                          className="flow-routine-chip"
                        >
                          <span className="flow-chip-num">{idx + 1}</span>
                          <span className="flow-chip-name">{item.name}</span>
                          <span className="flow-chip-detail">
                            {item.sets}×{item.reps}
                          </span>
                        </span>
                      ))}
                      {flow.exercises.length > 4 && (
                        <span className="flow-routine-chip flow-chip-more">
                          +{flow.exercises.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flow-routine-card-actions">
                      <button
                        type="button"
                        className="flow-primary-btn flow-card-play-btn"
                        onClick={() => handleStartFlow(flow)}
                      >
                        <Play size={16} />
                        <span>Play flow</span>
                      </button>

                      <div className="flow-card-secondary-actions">
                        <button
                          type="button"
                          className="flow-text-btn"
                          onClick={() => handleOpenEdit(flow)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="flow-icon-btn"
                          onClick={() => handleDuplicateFlow(flow)}
                          title="Duplicate flow"
                          aria-label={`Duplicate ${flow.name}`}
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          type="button"
                          className="flow-icon-btn flow-icon-danger"
                          onClick={() => handleDeleteFlow(flow)}
                          title="Delete flow"
                          aria-label={`Delete ${flow.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : flows.length > 0 && searchQuery ? (
            <div className="flow-empty-state glass-panel">
              <Search size={32} className="flow-muted-icon" />
              <h3>No flows matched “{searchQuery}”</h3>
              <p>Try searching for a different routine or exercise name.</p>
              <button
                type="button"
                className="flow-secondary-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Empty State with Quick Starter Templates */
            <div className="flow-empty-state glass-panel">
              <div className="flow-empty-icon-wrap">
                <Dumbbell size={32} />
              </div>
              <h2 className="flow-empty-title">No flows yet</h2>
              <p className="flow-empty-desc">
                Build a sequence of exercises that you can launch as a guided,
                distraction-free workout session anytime.
              </p>

              <button
                type="button"
                className="flow-primary-btn flow-empty-cta"
                onClick={() => handleOpenCreate()}
              >
                <Plus size={18} />
                <span>Create a flow</span>
              </button>

              <div className="flow-starter-templates-box">
                <span className="flow-starter-label">
                  <Sparkles size={14} className="flow-accent-icon" /> Or start
                  with a template:
                </span>
                <div className="flow-template-cards">
                  {STARTER_TEMPLATES.map((tmpl) => (
                    <button
                      type="button"
                      key={tmpl.name}
                      className="flow-template-card glass-panel"
                      onClick={() => handleOpenCreate(tmpl)}
                    >
                      <strong>{tmpl.name}</strong>
                      <span>
                        {tmpl.exercises.length} workouts ·{' '}
                        {tmpl.exercises.map((e) => e.name).join(', ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Analytics & Session Duration */}
      {activeTab === 'history' && (
        <div className="flow-history-tab animate-fade">
          <section className="flow-history-panel glass-panel">
            <div className="flow-section-heading">
              <div>
                <h2>Session duration</h2>
                <p>Completed sessions from the last 30 days</p>
              </div>
              <span className="flow-count">{history.length} SESSIONS</span>
            </div>

            {graph ? (
              <>
                <div className="flow-chart-wrap">
                  <svg
                    viewBox={`0 0 ${graph.width} ${graph.height}`}
                    role="img"
                    aria-label="Session duration over time"
                    className="flow-chart"
                  >
                    <line
                      x1={graph.pad.left}
                      y1={graph.pad.top}
                      x2={graph.pad.left}
                      y2={graph.height - graph.pad.bottom}
                    />
                    <line
                      x1={graph.pad.left}
                      y1={graph.height - graph.pad.bottom}
                      x2={graph.width - graph.pad.right}
                      y2={graph.height - graph.pad.bottom}
                    />
                    <path d={graph.path} className="flow-chart-line" />
                    {graph.points.map((point, i) => (
                      <g key={point.id || i}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          className="flow-chart-point"
                        >
                          <title>
                            {point.flowName}: {formatTime(point.durationSeconds)}
                          </title>
                        </circle>
                        {(i === 0 ||
                          i === graph.points.length - 1 ||
                          graph.points.length <= 5) && (
                          <text
                            x={point.x}
                            y={graph.height - 12}
                            textAnchor="middle"
                          >
                            {new Date(point.completedAt).toLocaleDateString(
                              undefined,
                              { month: 'short', day: 'numeric' }
                            )}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="flow-chart-summary">
                  <span>
                    Shortest <strong>{formatTime(graph.min)}</strong>
                  </span>
                  <span>
                    Longest <strong>{formatTime(graph.max)}</strong>
                  </span>
                </div>

                {history.length < 3 ? (
                  <p className="flow-muted flow-chart-note">
                    Complete at least 3 sessions to compare duration patterns.
                    Session duration alone does not measure workout quality.
                  </p>
                ) : (
                  <p className="flow-muted flow-chart-note">
                    Each point is one completed session. Compare durations over
                    time; shorter sessions do not necessarily mean better
                    performance.
                  </p>
                )}
              </>
            ) : (
              <div className="flow-chart-empty">
                <Clock3 size={24} />
                <p>No completed sessions in the last 30 days.</p>
                <span>
                  Your session-duration graph will appear here after you finish a
                  flow.
                </span>
              </div>
            )}
          </section>

          {/* Session history list log */}
          {history.length > 0 && (
            <div className="flow-history-log-section">
              <h3 className="flow-history-log-title">Recent Session Logs</h3>
              <div className="flow-history-log-list">
                {[...history].reverse().map((item) => (
                  <div
                    key={item.id}
                    className="flow-history-log-card glass-panel"
                  >
                    <div className="flow-history-log-left">
                      <strong>{item.flowName}</strong>
                      <span className="flow-history-log-date">
                        {new Date(item.completedAt).toLocaleDateString(
                          undefined,
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </span>
                    </div>

                    <div className="flow-history-log-right">
                      <span className="flow-badge-subtle">
                        {item.workoutCount} workouts
                      </span>
                      <strong className="flow-history-log-time">
                        {formatTime(item.durationSeconds)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backend Status Footer Indicator */}
      <div className="flow-backend-status glass-panel" role="status">
        {backendMessage ||
          (getScriptUrl()
            ? 'Google Sheets backend configured.'
            : 'Flows are stored locally; completed workout logs can sync to Google Sheets when configured.')}
      </div>
    </section>
  );
}
