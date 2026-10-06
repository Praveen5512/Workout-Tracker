import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, Check, ChevronRight, Clock3, Dumbbell, GripVertical, Pause, Play, Plus, Save, Trash2, X } from 'lucide-react';
import './FlowsScreen.css';
import { api, getScriptUrl } from '../services/api';

const FLOWS_KEY = 'apextrack_flows_v1';
const HISTORY_KEY = 'apextrack_flow_session_history_v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const blankExercise = () => ({ id: makeId(), name: '', sets: 3, reps: 10, workoutTimeMin: 2 });

function readArray(key) {
  try { const parsed = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function readFlows() {
  return readArray(FLOWS_KEY).filter(flow => flow && typeof flow.id === 'string' && typeof flow.name === 'string' && Array.isArray(flow.exercises)).map(flow => ({ ...flow, exercises: flow.exercises.filter(item => item && typeof item.name === 'string').map(item => ({ id: item.id || makeId(), name: item.name, sets: Math.max(1, Number(item.sets) || 1), reps: Math.max(1, Number(item.reps) || 1), workoutTimeMin: Math.max(0, Number(item.workoutTimeMin) || 0) })) })).filter(flow => flow.exercises.length > 0);
}
function cleanHistory() {
  const cutoff = Date.now() - RETENTION_MS;
  const valid = readArray(HISTORY_KEY).filter(item => {
    const time = new Date(item.completedAt).getTime();
    return Number.isFinite(time) && time >= cutoff && Number.isFinite(Number(item.durationSeconds));
  }).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(valid)); } catch { /* Storage may be unavailable. */ }
  return valid;
}
const formatTime = seconds => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function FlowsScreen() {
  const [flows, setFlows] = useState(() => readFlows());
  const [history, setHistory] = useState(() => cleanHistory());
  const [editing, setEditing] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [exercises, setExercises] = useState([blankExercise()]);
  const [activeFlow, setActiveFlow] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [commonWorkouts, setCommonWorkouts] = useState([]);
  const [backendMessage, setBackendMessage] = useState('');
  const [backendError, setBackendError] = useState('');
  const [savingWorkout, setSavingWorkout] = useState(false);
  const sessionRef = useRef({ accumulatedMs: 0, startedAt: null });
  const savedSessionRef = useRef(false);

  useEffect(() => { try { localStorage.setItem(FLOWS_KEY, JSON.stringify(flows)); } catch { /* Storage may be unavailable. */ } }, [flows]);
  useEffect(() => {
    let cancelled = false;
    if (!getScriptUrl()) { setBackendMessage('Connect your Google Apps Script URL in Settings to save completed flow workouts to Google Sheets.'); return () => { cancelled = true; }; }
    api.syncCommonWorkouts().then(items => {
      if (cancelled) return;
      const list = Array.isArray(items) ? items : [];
      setCommonWorkouts(list.map(item => typeof item === 'string' ? item : item?.Exercise || item?.exercise || item?.name).filter(Boolean));
      setBackendMessage('Google Sheets connected. Completed workouts will be logged to your backend.');
    }).catch(() => { if (!cancelled) setBackendMessage('Backend configured. Common workout suggestions could not be loaded.'); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { const refresh = () => setHistory(cleanHistory()); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, []);
  useEffect(() => {
    if (sessionStatus !== 'running') return undefined;
    const tick = () => setElapsed(Math.floor((sessionRef.current.accumulatedMs + (Date.now() - sessionRef.current.startedAt)) / 1000));
    tick(); const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [sessionStatus]);

  const saveFlow = () => {
    const name = flowName.trim();
    const valid = exercises.map((exercise, i) => ({ ...exercise, name: exercise.name.trim(), sets: Math.max(1, Number(exercise.sets) || 1), reps: Math.max(1, Number(exercise.reps) || 1), workoutTimeMin: Math.max(0, Number(exercise.workoutTimeMin) || 0), order: i })).filter(exercise => exercise.name);
    if (!name || !valid.length) return;
    if (editing) setFlows(previous => previous.map(flow => flow.id === editing ? { ...flow, name, exercises: valid, updatedAt: new Date().toISOString() } : flow));
    else setFlows(previous => [...previous, { id: makeId(), name, exercises: valid, createdAt: new Date().toISOString() }]);
    setEditing(null); setFlowName(''); setExercises([blankExercise()]);
  };
  const startEdit = flow => { setEditing(flow.id); setFlowName(flow.name); setExercises(flow.exercises.map(item => ({ ...item, id: item.id || makeId() }))); };
  const cancelEdit = () => { setEditing(null); setFlowName(''); setExercises([blankExercise()]); };
  const updateExercise = (id, field, value) => setExercises(previous => previous.map(item => item.id === id ? { ...item, [field]: value } : item));
  const startFlow = flow => {
    if (!flow.exercises?.length) return;
    sessionRef.current = { accumulatedMs: 0, startedAt: Date.now() }; savedSessionRef.current = false;
    setActiveFlow(flow); setCurrentIndex(0); setElapsed(0); setSessionStatus('running');
  };
  const pauseSession = () => {
    if (sessionStatus === 'running') {
      sessionRef.current.accumulatedMs += Date.now() - sessionRef.current.startedAt;
      sessionRef.current.startedAt = null; setElapsed(Math.floor(sessionRef.current.accumulatedMs / 1000)); setSessionStatus('paused');
    } else if (sessionStatus === 'paused') {
      sessionRef.current.startedAt = Date.now(); setSessionStatus('running');
    }
  };
  const completeCurrent = useCallback(async () => {
    if (!activeFlow || sessionStatus === 'finished' || sessionStatus === 'idle' || savingWorkout) return;
    const current = activeFlow.exercises[currentIndex];
    const scriptUrl = getScriptUrl();
    setBackendError('');
    setSavingWorkout(true);
    try {
      if (scriptUrl) {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const response = await api.create({
          Date: localDate,
          Exercise: current.name,
          Sets: Number(current.sets) || 1,
          Reps: Number(current.reps) || 1,
          'Weight/Intensity': 'Bodyweight',
          'Duration (min)': Number(current.workoutTimeMin) || 0,
          Notes: `Completed via flow: ${activeFlow.name}`
        });
        if (response?.success === false) throw new Error(response.error || 'The backend rejected this workout.');
        setBackendMessage(`Saved “${current.name}” to Google Sheets.`);
      } else {
        setBackendMessage('Workout completed locally. Add the Google Apps Script URL in Settings to sync workout logs to Google Sheets.');
      }
      const last = currentIndex >= activeFlow.exercises.length - 1;
      if (!last) { setCurrentIndex(index => index + 1); return; }
      const totalMs = sessionRef.current.accumulatedMs + (sessionStatus === 'running' && sessionRef.current.startedAt ? Date.now() - sessionRef.current.startedAt : 0);
      const record = { id: makeId(), flowId: activeFlow.id, flowName: activeFlow.name, completedAt: new Date().toISOString(), durationSeconds: Math.floor(totalMs / 1000), workoutCount: activeFlow.exercises.length };
      if (!savedSessionRef.current) {
        savedSessionRef.current = true;
        const next = [...cleanHistory(), record].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
        setHistory(next);
      }
      sessionRef.current = { accumulatedMs: totalMs, startedAt: null };
      setElapsed(Math.floor(totalMs / 1000)); setSessionStatus('finished');
    } catch (error) {
      setBackendError(`Could not save “${current.name}” to Google Sheets. ${error.message || 'Check your connection and try again.'}`);
    } finally {
      setSavingWorkout(false);
    }
  }, [activeFlow, currentIndex, sessionStatus, savingWorkout]);

  const graph = useMemo(() => {
    if (!history.length) return null;
    const width = 640, height = 210, pad = { top: 18, right: 20, bottom: 36, left: 48 };
    const values = history.map(item => Number(item.durationSeconds));
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
    const points = history.map((item, index) => ({ ...item, x: pad.left + (history.length === 1 ? (width - pad.left - pad.right) / 2 : index * (width - pad.left - pad.right) / (history.length - 1)), y: pad.top + (height - pad.top - pad.bottom) * (1 - (item.durationSeconds - min) / range) }));
    return { width, height, pad, points, min, max, path: points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') };
  }, [history]);

  if (activeFlow) {
    const current = activeFlow.exercises[currentIndex];
    const next = activeFlow.exercises[currentIndex + 1];
    return <section className="flows-screen flow-player">
      <button className="flow-back-btn" onClick={() => { setActiveFlow(null); setSessionStatus('idle'); }}><ArrowLeft size={17} /> Back to Flows</button>
      <div className="flow-player-header"><div><div className="flow-eyebrow">GUIDED SESSION</div><h2>{activeFlow.name}</h2></div><div className="flow-session-clock"><Clock3 size={17} /><span>{formatTime(elapsed)}</span><small>SESSION TIME</small></div></div>{backendMessage && <p className="flow-backend-status" role="status">{backendMessage}</p>}
      {sessionStatus === 'finished' ? <div className="flow-finished glass-panel"><div className="flow-finished-icon"><Check size={30} /></div><h2>Flow completed</h2><p>{activeFlow.name} · {activeFlow.exercises.length} workouts</p><div className="flow-finished-time">{formatTime(elapsed)}</div><span className="flow-muted">Total active session time</span><button className="flow-primary-btn" onClick={() => { setActiveFlow(null); setSessionStatus('idle'); setHistory(cleanHistory()); }}>Done</button></div> : <>
        <div className="flow-progress-row"><span>WORKOUT {currentIndex + 1} OF {activeFlow.exercises.length}</span><span>{Math.round(((currentIndex + 1) / activeFlow.exercises.length) * 100)}%</span></div><div className="flow-progress-track"><div style={{ width: `${((currentIndex + 1) / activeFlow.exercises.length) * 100}%` }} /></div>
        <article className="flow-current-card glass-panel"><div className="flow-current-icon"><Dumbbell size={25} /></div><span className="flow-eyebrow">CURRENT WORKOUT</span><h1>{current.name}</h1><div className="flow-metrics"><div><strong>{current.sets}</strong><span>SETS</span></div><div><strong>{current.reps}</strong><span>REPS</span></div><div><strong>{Number(current.workoutTimeMin) || 0}<small> min</small></strong><span>WORKOUT TIME</span></div></div><div className="flow-player-actions"><button className="flow-secondary-btn" onClick={pauseSession}>{sessionStatus === 'paused' ? <Play size={17} /> : <Pause size={17} />}{sessionStatus === 'paused' ? 'Resume timer' : 'Pause timer'}</button><button className="flow-primary-btn" onClick={completeCurrent} disabled={savingWorkout || sessionStatus === 'paused'}><Check size={17} /> {savingWorkout ? 'Saving…' : 'Completed'} <ChevronRight size={17} /></button></div>{sessionStatus === 'paused' && <p className="flow-paused-note">Timer paused. Paused time is excluded from Session Time.</p>}{backendError && <p className="flow-backend-error" role="alert">{backendError}</p>}</article>
        <div className="flow-next-card"><span className="flow-eyebrow">UP NEXT</span>{next ? <><strong>{next.name}</strong><span>{next.sets} sets · {next.reps} reps · {next.workoutTimeMin} min</span></> : <><strong>Final workout</strong><span>Complete this workout to finish the flow.</span></>}</div>
      </>}
    </section>;
  }

  return <section className="flows-screen">
    <div className="flows-heading"><div><div className="flow-eyebrow">TRAIN WITH INTENTION</div><h1 className="section-title">Flows</h1><p className="section-subtitle">Build a sequence. Stay in rhythm. Track your sessions.</p></div><div className="flows-heading-icon"><Activity size={23} /></div></div>
    <div className="flow-backend-status" role="status">{backendMessage || (getScriptUrl() ? 'Google Sheets backend configured.' : 'Flows are stored locally; completed workout logs can sync to Google Sheets when configured.')}</div>
    <div className="flows-layout">
      <div className="flows-main-column">
        <div className="flow-section-heading"><div><h2>Your flows</h2><p>Reusable workout sequences, saved on this device.</p></div><span className="flow-count">{flows.length} {flows.length === 1 ? 'FLOW' : 'FLOWS'}</span></div>
        {flows.length ? <div className="flow-list">{flows.map(flow => <article className="flow-list-card glass-panel" key={flow.id}><div className="flow-list-top"><div className="flow-list-icon"><Dumbbell size={19} /></div><div className="flow-list-title"><h3>{flow.name}</h3><p>{flow.exercises.length} workouts <span>·</span> {flow.exercises.reduce((sum, item) => sum + (Number(item.workoutTimeMin) || 0), 0)} min estimated workout time</p></div></div><div className="flow-exercise-chips">{flow.exercises.slice(0, 3).map((item, index) => <span key={item.id || index}>{index + 1}. {item.name}</span>)}{flow.exercises.length > 3 && <span>+{flow.exercises.length - 3} more</span>}</div><div className="flow-card-actions"><button className="flow-primary-btn" onClick={() => startFlow(flow)}><Play size={16} /> Play flow</button><button className="flow-text-btn" onClick={() => startEdit(flow)}>Edit</button><button className="flow-icon-delete" aria-label={`Delete ${flow.name}`} title="Delete flow" onClick={() => { if (window.confirm(`Delete the flow “${flow.name}”?`)) setFlows(items => items.filter(item => item.id !== flow.id)); }}><Trash2 size={16} /></button></div></article>)}</div> : <div className="flow-empty glass-panel"><div className="flow-empty-icon"><Dumbbell size={24} /></div><h3>No flows yet</h3><p>Create a sequence of workouts you can play whenever you train.</p></div>}
        <section className="flow-history-panel glass-panel"><div className="flow-section-heading"><div><h2>Session duration</h2><p>Completed sessions from the last 30 days</p></div><span className="flow-count">{history.length} SESSIONS</span></div>
          {graph ? <><div className="flow-chart-wrap"><svg viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="Session duration over time" className="flow-chart"><line x1={graph.pad.left} y1={graph.pad.top} x2={graph.pad.left} y2={graph.height - graph.pad.bottom} /><line x1={graph.pad.left} y1={graph.height - graph.pad.bottom} x2={graph.width - graph.pad.right} y2={graph.height - graph.pad.bottom} /><path d={graph.path} className="flow-chart-line" />{graph.points.map((point, i) => <g key={point.id}><circle cx={point.x} cy={point.y} r="4" className="flow-chart-point"><title>{point.flowName}: {formatTime(point.durationSeconds)}</title></circle>{(i === 0 || i === graph.points.length - 1 || graph.points.length <= 5) && <text x={point.x} y={graph.height - 12} textAnchor="middle">{new Date(point.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>}</g>)}</svg></div><div className="flow-chart-summary"><span>Shortest <strong>{formatTime(graph.min)}</strong></span><span>Longest <strong>{formatTime(graph.max)}</strong></span></div>{history.length < 3 ? <p className="flow-muted flow-chart-note">Complete at least 3 sessions to begin comparing duration patterns. Session duration alone does not measure workout quality.</p> : <p className="flow-muted flow-chart-note">Each point is one completed session. Compare durations over time; shorter sessions do not necessarily mean better performance.</p>}</> : <div className="flow-chart-empty"><Clock3 size={22} /><p>No completed sessions in the last 30 days.</p><span>Your session-duration graph will appear here after you finish a flow.</span></div>}
        </section>
      </div>
      <aside className="flow-builder glass-panel"><div className="flow-builder-heading"><div className="flow-builder-icon"><Plus size={19} /></div><div><h2>{editing ? 'Edit flow' : 'Create a flow'}</h2><p>Set up your workout sequence.</p></div></div><label className="flow-field-label" htmlFor="flow-name">Flow name</label><input id="flow-name" className="flow-input" value={flowName} onChange={event => setFlowName(event.target.value)} placeholder="e.g. Upper body day" maxLength={70} />
        <div className="flow-builder-subheading"><span>WORKOUTS</span><button className="flow-add-workout" onClick={() => setExercises(items => [...items, blankExercise()])}><Plus size={15} /> Add</button></div>
        <datalist id="flow-common-workouts">{commonWorkouts.map(name => <option key={name} value={name} />)}</datalist><div className="flow-builder-exercises">{exercises.map((item, index) => <div className="flow-exercise-editor" key={item.id}><div className="flow-exercise-editor-title"><GripVertical size={15} /><strong>Workout {index + 1}</strong>{exercises.length > 1 && <button aria-label={`Remove workout ${index + 1}`} onClick={() => setExercises(items => items.filter(ex => ex.id !== item.id))}><X size={15} /></button>}</div><input className="flow-input" aria-label={`Workout ${index + 1} name`} list="flow-common-workouts" placeholder="Exercise name" value={item.name} onChange={event => updateExercise(item.id, 'name', event.target.value)} maxLength={80} /><div className="flow-number-grid"><label>Sets<input className="flow-input" type="number" min="1" max="99" value={item.sets} onChange={event => updateExercise(item.id, 'sets', event.target.value)} /></label><label>Reps<input className="flow-input" type="number" min="1" max="999" value={item.reps} onChange={event => updateExercise(item.id, 'reps', event.target.value)} /></label></div><label className="flow-field-label">Workout time (min)<input className="flow-input" type="number" min="0" step="0.5" value={item.workoutTimeMin} onChange={event => updateExercise(item.id, 'workoutTimeMin', event.target.value)} /></label></div>)}</div>
        <button className="flow-primary-btn flow-save-btn" onClick={saveFlow} disabled={!flowName.trim() || !exercises.some(item => item.name.trim())}><Save size={16} /> {editing ? 'Save changes' : 'Save flow'}</button>{editing && <button className="flow-cancel-edit" onClick={cancelEdit}>Cancel editing</button>}<p className="flow-local-note">Flow definitions and session history stay in this browser. When you mark a workout Completed, its exercise, sets, reps, duration, and flow name are saved as a workout log in Google Sheets. The provided API does not include an endpoint for saving flow definitions themselves. History older than 30 days is automatically removed.</p>
      </aside>
    </div>
  </section>;
}
