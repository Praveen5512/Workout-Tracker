import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X
} from 'lucide-react';
import { api, getScriptUrl } from '../services/api';

export const ACTIVE_SESSION_KEY = 'apextrack_active_flow_session_v1';
const HISTORY_KEY = 'apextrack_flow_session_history_v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const computeElapsedSeconds = (session) => {
  if (!session) return 0;
  let total = session.accumulatedMs || 0;
  if (session.sessionStatus === 'running' && session.startedAt) {
    total += Math.max(0, Date.now() - session.startedAt);
  }
  return Math.max(0, Math.floor(total / 1000));
};

export default function FlowPlayerScreen({
  flow,
  initialSession,
  onFinishSession,
  onExit
}) {
  // Use initialSession or construct fresh session
  const [session, setSession] = useState(() => {
    if (initialSession) return initialSession;
    try {
      const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
      if (stored && stored.flowId === flow.id && Array.isArray(stored.exercises)) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return {
      flowId: flow.id,
      flowName: flow.name,
      exercises: flow.exercises || [],
      currentIndex: 0,
      sessionStatus: 'running',
      startedAt: Date.now(),
      accumulatedMs: 0,
      completedIndices: [],
      restoredFromRefresh: false
    };
  });

  const [elapsed, setElapsed] = useState(() => computeElapsedSeconds(session));
  const [isRestoredBadgeVisible, setIsRestoredBadgeVisible] = useState(() => {
    return Boolean(session.restoredFromRefresh || initialSession);
  });
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [backendMessage, setBackendMessage] = useState('');
  const [backendError, setBackendError] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSequenceDrawer, setShowSequenceDrawer] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const isSavedHistoryRef = useRef(false);

  // Sync session state to localStorage on every change (refresh-proof!)
  useEffect(() => {
    try {
      if (session.sessionStatus === 'finished') {
        // finished session is cleaned from active key once dismissed
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      }
    } catch {
      /* ignore storage errors */
    }
  }, [session]);

  // Handle timer tick based on true wall-clock time
  useEffect(() => {
    if (session.sessionStatus !== 'running') return undefined;

    const tick = () => {
      setElapsed(computeElapsedSeconds(sessionRef.current));
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [session.sessionStatus]);

  // Hide the restored badge after 4 seconds
  useEffect(() => {
    if (isRestoredBadgeVisible) {
      const timeout = setTimeout(() => setIsRestoredBadgeVisible(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [isRestoredBadgeVisible]);

  // Pause / Resume Session
  const togglePause = () => {
    setSession((prev) => {
      if (prev.sessionStatus === 'running') {
        const addedMs = prev.startedAt ? Date.now() - prev.startedAt : 0;
        const newAccum = (prev.accumulatedMs || 0) + addedMs;
        return {
          ...prev,
          sessionStatus: 'paused',
          startedAt: null,
          accumulatedMs: newAccum
        };
      } else if (prev.sessionStatus === 'paused') {
        return {
          ...prev,
          sessionStatus: 'running',
          startedAt: Date.now()
        };
      }
      return prev;
    });
  };

  // Complete current exercise and move to next
  const completeCurrentExercise = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (
      !currentSession ||
      currentSession.sessionStatus === 'finished' ||
      savingWorkout
    ) {
      return;
    }

    const { exercises, currentIndex } = currentSession;
    const currentExercise = exercises[currentIndex];
    if (!currentExercise) return;

    setBackendError('');
    setSavingWorkout(true);

    try {
      const scriptUrl = getScriptUrl();
      if (scriptUrl) {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const response = await api.create({
          Date: localDate,
          Exercise: currentExercise.name,
          Sets: Number(currentExercise.sets) || 1,
          Reps: Number(currentExercise.reps) || 1,
          'Weight/Intensity': 'Bodyweight',
          'Duration (min)': Number(currentExercise.workoutTimeMin) || 0,
          Notes: `Completed via flow: ${currentSession.flowName}`
        });

        if (response?.success === false) {
          throw new Error(response.error || 'The backend rejected this workout.');
        }
        setBackendMessage(`Saved “${currentExercise.name}” to Google Sheets.`);
      } else {
        setBackendMessage(
          'Workout logged locally. Add your Google Apps Script URL in Settings to sync with Google Sheets.'
        );
      }

      // Check if this was the last exercise in the flow
      const isLast = currentIndex >= exercises.length - 1;
      const completedIndices = [
        ...new Set([...currentSession.completedIndices, currentIndex])
      ];

      if (!isLast) {
        setSession((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          completedIndices
        }));
      } else {
        // Complete the entire flow!
        const totalMs =
          (currentSession.accumulatedMs || 0) +
          (currentSession.sessionStatus === 'running' && currentSession.startedAt
            ? Date.now() - currentSession.startedAt
            : 0);

        const durationSeconds = Math.max(1, Math.floor(totalMs / 1000));

        const historyRecord = {
          id: makeId(),
          flowId: currentSession.flowId,
          flowName: currentSession.flowName,
          completedAt: new Date().toISOString(),
          durationSeconds,
          workoutCount: exercises.length
        };

        if (!isSavedHistoryRef.current) {
          isSavedHistoryRef.current = true;
          try {
            const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            const cutoff = Date.now() - RETENTION_MS;
            const valid = (Array.isArray(raw) ? raw : [])
              .filter((item) => {
                const time = new Date(item.completedAt).getTime();
                return (
                  Number.isFinite(time) &&
                  time >= cutoff &&
                  Number.isFinite(Number(item.durationSeconds))
                );
              });
            const updated = [...valid, historyRecord].sort(
              (a, b) => new Date(a.completedAt) - new Date(b.completedAt)
            );
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          } catch {
            /* ignore storage errors */
          }

          if (onFinishSession) {
            onFinishSession(historyRecord);
          }
        }

        setSession((prev) => ({
          ...prev,
          sessionStatus: 'finished',
          startedAt: null,
          accumulatedMs: totalMs,
          completedIndices
        }));
        setElapsed(durationSeconds);
      }
    } catch (error) {
      setBackendError(
        `Notice: Could not sync “${currentExercise.name}” to Google Sheets (${
          error.message || 'Network error'
        }). Workout progressed locally.`
      );
      // Still advance workout locally so user isn't stuck
      const isLast = currentIndex >= exercises.length - 1;
      const completedIndices = [
        ...new Set([...currentSession.completedIndices, currentIndex])
      ];

      if (!isLast) {
        setSession((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          completedIndices
        }));
      } else {
        const totalMs =
          (currentSession.accumulatedMs || 0) +
          (currentSession.sessionStatus === 'running' && currentSession.startedAt
            ? Date.now() - currentSession.startedAt
            : 0);
        setSession((prev) => ({
          ...prev,
          sessionStatus: 'finished',
          startedAt: null,
          accumulatedMs: totalMs,
          completedIndices
        }));
      }
    } finally {
      setSavingWorkout(false);
    }
  }, [savingWorkout, onFinishSession]);

  // Navigate to previous exercise
  const goToPreviousExercise = () => {
    if (session.currentIndex > 0) {
      setSession((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1
      }));
    }
  };

  // Jump directly to an exercise from drawer
  const jumpToExercise = (index) => {
    if (index >= 0 && index < session.exercises.length) {
      setSession((prev) => ({
        ...prev,
        currentIndex: index
      }));
      setShowSequenceDrawer(false);
    }
  };

  // Finish session and return to flows list
  const handleDoneFinished = () => {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* ignore */
    }
    onExit();
  };

  // Pause and return to flows list (leaves session in localStorage!)
  const handlePauseAndExit = () => {
    setSession((prev) => {
      const addedMs =
        prev.sessionStatus === 'running' && prev.startedAt
          ? Date.now() - prev.startedAt
          : 0;
      return {
        ...prev,
        sessionStatus: 'paused',
        startedAt: null,
        accumulatedMs: (prev.accumulatedMs || 0) + addedMs
      };
    });
    setShowExitModal(false);
    onExit();
  };

  // Discard active session
  const handleDiscardSession = () => {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setShowExitModal(false);
    onExit();
  };

  const { exercises, currentIndex, sessionStatus } = session;
  const current = exercises[currentIndex] || exercises[0] || { name: 'Workout' };
  const next = exercises[currentIndex + 1];
  const progressPercent = Math.round(
    ((currentIndex + 1) / Math.max(1, exercises.length)) * 100
  );

  return (
    <section className="flows-screen flow-player-screen">
      {/* Restored from Refresh Toast Banner */}
      {isRestoredBadgeVisible && (
        <aside
          className="flow-restored-pill glass-panel animate-fade"
          role="status"
          aria-live="polite"
        >
          <Sparkles size={15} className="flow-accent-icon" />
          <span>Workout session resumed • Refresh proof</span>
        </aside>
      )}

      {/* Top Header */}
      <div className="flow-player-header glass-panel">
        <button
          type="button"
          className="flow-back-btn"
          onClick={() => setShowExitModal(true)}
          aria-label="Exit Session"
        >
          <ArrowLeft size={18} />
          <span>Exit</span>
        </button>

        <div className="flow-player-title-box">
          <span className="flow-eyebrow">GUIDED FLOW</span>
          <h2 className="flow-player-routine-name">{session.flowName}</h2>
        </div>

        {/* Live Active Clock */}
        <div
          className={`flow-session-clock glass-panel ${
            sessionStatus === 'paused' ? 'clock-paused' : 'clock-running'
          }`}
        >
          <div className="clock-time-row">
            <span
              className={`clock-dot ${
                sessionStatus === 'running'
                  ? 'pulse-dot-online'
                  : 'pulse-dot-pending'
              }`}
            />
            <span className="clock-digits">{formatTime(elapsed)}</span>
          </div>
          <small className="clock-label">
            {sessionStatus === 'paused' ? 'PAUSED' : 'SESSION TIME'}
          </small>
        </div>
      </div>

      {backendMessage && (
        <p className="flow-backend-status" role="status">
          {backendMessage}
        </p>
      )}

      {/* Finished Screen View */}
      {sessionStatus === 'finished' ? (
        <div className="flow-finished-card glass-panel animate-fade">
          <div className="flow-finished-trophy">
            <Trophy size={42} />
          </div>
          <span className="flow-eyebrow">EXCELLENT WORK!</span>
          <h1 className="flow-finished-title">Flow completed</h1>
          <p className="flow-finished-subtitle">
            {session.flowName} · {exercises.length} exercises logged
          </p>

          <div className="flow-finished-time-box">
            <span className="flow-finished-time-val">{formatTime(elapsed)}</span>
            <span className="flow-finished-time-label">Total Active Time</span>
          </div>

          <div className="flow-finished-recap-list">
            {exercises.map((item, idx) => (
              <div key={item.id || idx} className="flow-finished-recap-item">
                <Check size={16} className="flow-accent-icon" />
                <span>{item.name}</span>
                <span className="flow-finished-recap-metrics">
                  {item.sets} sets × {item.reps} reps
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="flow-primary-btn flow-finished-cta"
            onClick={handleDoneFinished}
          >
            <Check size={18} />
            <span>Done</span>
          </button>
        </div>
      ) : (
        <>
          {/* Segmented Progress Track */}
          <div className="flow-progress-section">
            <div className="flow-progress-meta">
              <span className="flow-progress-step-text">
                WORKOUT {currentIndex + 1} OF {exercises.length}
              </span>
              <button
                type="button"
                className="flow-progress-list-toggle"
                onClick={() => setShowSequenceDrawer(!showSequenceDrawer)}
              >
                <ListOrdered size={14} />
                <span>{showSequenceDrawer ? 'Hide sequence' : 'View all'}</span>
              </button>
              <span className="flow-progress-percent">{progressPercent}%</span>
            </div>

            <div className="flow-segmented-bar">
              {exercises.map((_, idx) => {
                const isCompleted = session.completedIndices.includes(idx);
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={idx}
                    className={`flow-segment-pill ${
                      isCurrent
                        ? 'segment-current'
                        : isCompleted
                        ? 'segment-done'
                        : 'segment-pending'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Collapsible Sequence Drawer */}
          {showSequenceDrawer && (
            <div className="flow-sequence-drawer glass-panel animate-fade">
              <div className="flow-drawer-header">
                <h3>Flow Sequence Checklist</h3>
                <button
                  type="button"
                  className="flow-icon-btn"
                  onClick={() => setShowSequenceDrawer(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flow-drawer-items">
                {exercises.map((item, idx) => (
                  <button
                    type="button"
                    key={item.id || idx}
                    className={`flow-drawer-item ${
                      idx === currentIndex
                        ? 'drawer-item-active'
                        : session.completedIndices.includes(idx)
                        ? 'drawer-item-done'
                        : ''
                    }`}
                    onClick={() => jumpToExercise(idx)}
                  >
                    <div className="drawer-item-left">
                      <span className="drawer-item-num">{idx + 1}</span>
                      <span className="drawer-item-name">{item.name}</span>
                    </div>
                    <span className="drawer-item-metrics">
                      {item.sets} × {item.reps}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hero Current Exercise Card */}
          <article className="flow-current-exercise-card glass-panel">
            <div className="flow-current-card-badge">
              <Dumbbell size={20} className="flow-accent-icon" />
              <span>CURRENT WORKOUT</span>
            </div>

            <h1 className="flow-current-title">{current.name}</h1>

            <div className="flow-metrics-display">
              <div className="flow-metric-box">
                <strong className="flow-metric-value">{current.sets}</strong>
                <span className="flow-metric-label">SETS</span>
              </div>
              <div className="flow-metric-box">
                <strong className="flow-metric-value">{current.reps}</strong>
                <span className="flow-metric-label">REPS / SET</span>
              </div>
              <div className="flow-metric-box">
                <strong className="flow-metric-value">
                  {Number(current.workoutTimeMin) || 0}
                  <small> min</small>
                </strong>
                <span className="flow-metric-label">WORKOUT TIME</span>
              </div>
            </div>

            {sessionStatus === 'paused' && (
              <div className="flow-paused-callout">
                <Pause size={16} />
                <span>Timer paused. Resuming continues tracking seamlessly.</span>
              </div>
            )}

            {backendError && (
              <p className="flow-backend-error" role="alert">
                {backendError}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flow-player-controls">
              <button
                type="button"
                className="flow-secondary-btn flow-btn-control"
                onClick={togglePause}
              >
                {sessionStatus === 'paused' ? (
                  <>
                    <Play size={18} />
                    <span>Resume timer</span>
                  </>
                ) : (
                  <>
                    <Pause size={18} />
                    <span>Pause timer</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="flow-primary-btn flow-btn-complete"
                onClick={completeCurrentExercise}
                disabled={savingWorkout || sessionStatus === 'paused'}
              >
                <Check size={18} />
                <span>{savingWorkout ? 'Saving…' : 'Completed'}</span>
                <ChevronRight size={18} />
              </button>
            </div>

            {currentIndex > 0 && (
              <button
                type="button"
                className="flow-prev-exercise-btn"
                onClick={goToPreviousExercise}
              >
                <ChevronLeft size={16} /> Previous workout
              </button>
            )}
          </article>

          {/* Up Next Preview Card */}
          <div className="flow-next-preview-card glass-panel">
            <span className="flow-eyebrow">UP NEXT</span>
            {next ? (
              <div className="flow-next-info">
                <strong>{next.name}</strong>
                <p>
                  {next.sets} sets · {next.reps} reps · {next.workoutTimeMin} min
                </p>
              </div>
            ) : (
              <div className="flow-next-info">
                <strong>Final workout</strong>
                <p>Complete this workout to finish the routine.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitModal && (
        <div
          className="flow-modal-overlay animate-fade"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-modal-title"
        >
          <div className="flow-modal-card glass-panel">
            <h3 id="exit-modal-title">Leave Active Workout?</h3>
            <p className="flow-modal-desc">
              Your workout timer and current exercise are refresh-safe. You can pause
              and return to this session anytime.
            </p>

            <div className="flow-modal-actions">
              <button
                type="button"
                className="flow-primary-btn"
                onClick={handlePauseAndExit}
              >
                <Pause size={16} /> Pause & Exit to Routines
              </button>
              <button
                type="button"
                className="flow-secondary-btn"
                onClick={() => setShowExitModal(false)}
              >
                Resume Workout
              </button>
              <button
                type="button"
                className="flow-text-btn flow-danger-text"
                onClick={handleDiscardSession}
              >
                Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
