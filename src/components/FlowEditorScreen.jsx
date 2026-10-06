import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Dumbbell,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';

const DRAFT_KEY = 'apextrack_flow_editor_draft_v1';
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const blankExercise = () => ({
  id: makeId(),
  name: '',
  sets: 3,
  reps: 10,
  workoutTimeMin: 2,
  restTimeSec: 60
});

const NAME_SUGGESTIONS = [
  'Upper Body Power',
  'Lower Body Strength',
  'Full Body Circuit',
  'Core & Cardio Blast',
  'HIIT Conditioning',
  'Push Day Routine',
  'Pull Day Routine',
  'Mobility & Stretch'
];

export default function FlowEditorScreen({
  editingFlow,
  initialTemplate,
  commonWorkouts = [],
  onSave,
  onCancel
}) {
  // Initialize state with draft recovery support (refresh proof!)
  const [flowName, setFlowName] = useState(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (savedDraft && (!editingFlow || savedDraft.editingId === editingFlow.id)) {
        return savedDraft.flowName || '';
      }
    } catch {
      /* ignore storage errors */
    }
    if (editingFlow) return editingFlow.name || '';
    if (initialTemplate) return initialTemplate.name || '';
    return '';
  });

  const [exercises, setExercises] = useState(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (
        savedDraft &&
        Array.isArray(savedDraft.exercises) &&
        savedDraft.exercises.length > 0 &&
        (!editingFlow || savedDraft.editingId === editingFlow.id)
      ) {
        return savedDraft.exercises;
      }
    } catch {
      /* ignore storage errors */
    }
    if (editingFlow?.exercises?.length) {
      return editingFlow.exercises.map((item) => ({
        ...item,
        id: item.id || makeId(),
        sets: Number(item.sets) || 3,
        reps: Number(item.reps) || 10,
        workoutTimeMin: Number(item.workoutTimeMin) || 2,
        restTimeSec: Number(item.restTimeSec) || 60
      }));
    }
    if (initialTemplate?.exercises?.length) {
      return initialTemplate.exercises.map((item) => ({
        ...item,
        id: makeId(),
        sets: Number(item.sets) || 3,
        reps: Number(item.reps) || 10,
        workoutTimeMin: Number(item.workoutTimeMin) || 2,
        restTimeSec: Number(item.restTimeSec) || 60
      }));
    }
    return [blankExercise()];
  });

  const [hasRestoredDraft, setHasRestoredDraft] = useState(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return Boolean(savedDraft && (!editingFlow || savedDraft.editingId === editingFlow?.id));
    } catch {
      return false;
    }
  });

  // Automatically persist draft on every keystroke (refresh-proof!)
  useEffect(() => {
    try {
      const draftData = {
        editingId: editingFlow ? editingFlow.id : null,
        flowName,
        exercises,
        updatedAt: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    } catch {
      /* ignore storage failures */
    }
  }, [flowName, exercises, editingFlow]);

  // Clear draft
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setHasRestoredDraft(false);
    if (editingFlow) {
      setFlowName(editingFlow.name || '');
      setExercises(
        editingFlow.exercises?.length
          ? editingFlow.exercises.map((item) => ({ ...item, id: item.id || makeId() }))
          : [blankExercise()]
      );
    } else {
      setFlowName('');
      setExercises([blankExercise()]);
    }
  };

  const handleUpdateExercise = (id, field, value) => {
    setExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExercise = () => {
    setExercises((prev) => [...prev, blankExercise()]);
  };

  const handleRemoveExercise = (id) => {
    if (exercises.length <= 1) return;
    setExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDuplicateExercise = (exercise) => {
    const copy = {
      ...exercise,
      id: makeId(),
      name: `${exercise.name} (Copy)`
    };
    setExercises((prev) => {
      const idx = prev.findIndex((item) => item.id === exercise.id);
      if (idx === -1) return [...prev, copy];
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handleMoveExercise = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    setExercises((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleQuickAddCommon = (name) => {
    setExercises((prev) => {
      // If the last exercise is blank, populate it
      const last = prev[prev.length - 1];
      if (last && !last.name.trim()) {
        return prev.map((item, idx) =>
          idx === prev.length - 1 ? { ...item, name } : item
        );
      }
      return [
        ...prev,
        {
          id: makeId(),
          name,
          sets: 3,
          reps: 10,
          workoutTimeMin: 2,
          restTimeSec: 60
        }
      ];
    });
  };

  const totalEstimatedMin = useMemo(() => {
    return exercises.reduce((sum, item) => sum + (Number(item.workoutTimeMin) || 0), 0);
  }, [exercises]);

  const isValid = useMemo(() => {
    return (
      Boolean(flowName.trim()) &&
      exercises.some((item) => Boolean(item.name.trim()))
    );
  }, [flowName, exercises]);

  const handleSave = () => {
    const trimmedName = flowName.trim();
    const validExercises = exercises
      .map((item, idx) => ({
        ...item,
        name: item.name.trim(),
        sets: Math.max(1, Number(item.sets) || 1),
        reps: Math.max(1, Number(item.reps) || 1),
        workoutTimeMin: Math.max(0, Number(item.workoutTimeMin) || 0),
        restTimeSec: Math.max(0, Number(item.restTimeSec) || 0),
        order: idx
      }))
      .filter((item) => item.name);

    if (!trimmedName || !validExercises.length) return;

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }

    onSave({
      id: editingFlow ? editingFlow.id : makeId(),
      name: trimmedName,
      exercises: validExercises,
      createdAt: editingFlow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const handleCancel = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    onCancel();
  };

  return (
    <section className="flows-screen flow-editor-screen">
      {/* Top Navigation Bar */}
      <div className="flow-editor-header glass-panel">
        <button
          type="button"
          className="flow-back-btn"
          onClick={handleCancel}
          aria-label="Back to Flows"
        >
          <ArrowLeft size={18} />
          <span>Back to Flows</span>
        </button>

        <div className="flow-editor-title-group">
          <span className="flow-eyebrow">
            {editingFlow ? 'EDITING ROUTINE' : 'NEW ROUTINE BUILDER'}
          </span>
          <h1 className="flow-editor-title">
            {editingFlow ? editingFlow.name || 'Edit Routine' : 'Create Routine'}
          </h1>
        </div>

        <button
          type="button"
          className="flow-primary-btn flow-save-top-btn"
          onClick={handleSave}
          disabled={!isValid}
        >
          <Save size={16} />
          <span>Save flow</span>
        </button>
      </div>

      {/* Restored Draft Banner */}
      {hasRestoredDraft && (
        <aside
          className="flow-draft-banner glass-panel"
          aria-label="Draft restored notification"
        >
          <div className="flow-draft-info">
            <Sparkles size={16} className="flow-accent-icon" />
            <span>
              Restored your unsaved draft. All changes are refresh-safe.
            </span>
          </div>
          <button
            type="button"
            className="flow-draft-reset-btn"
            onClick={clearDraft}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </aside>
      )}

      {/* Routine Metadata Card */}
      <div className="flow-card glass-panel flow-routine-card">
        <div className="flow-field-group">
          <label className="flow-field-label" htmlFor="flow-name">
            Flow name <span className="flow-required">*</span>
          </label>
          <input
            id="flow-name"
            className="flow-input flow-input-lg"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="e.g. Upper Body Hypertrophy"
            maxLength={70}
            autoFocus={!editingFlow}
          />
        </div>

        {/* Name suggestions */}
        <div className="flow-suggestions-wrap">
          <span className="flow-suggestions-label">Quick Ideas:</span>
          <div className="flow-pill-chips">
            {NAME_SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                className="flow-pill-chip"
                onClick={() => setFlowName(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exercise Sequence Builder */}
      <div className="flow-sequence-section">
        <div className="flow-section-header">
          <div>
            <h2 className="flow-section-title">Exercise Sequence</h2>
            <p className="flow-section-desc">
              Organize each movement in order. Users train through this exact progression.
            </p>
          </div>
          <div className="flow-sequence-meta">
            <span className="flow-meta-pill">
              <Dumbbell size={14} /> {exercises.length}{' '}
              {exercises.length === 1 ? 'Exercise' : 'Exercises'}
            </span>
            <span className="flow-meta-pill">
              <Clock size={14} /> ~{totalEstimatedMin} min total
            </span>
          </div>
        </div>

        {/* Datalist for exercise autocomplete */}
        <datalist id="flow-common-workouts">
          {commonWorkouts.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {/* Exercise Cards */}
        <div className="flow-exercise-cards-list">
          {exercises.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === exercises.length - 1;

            return (
              <article
                key={item.id}
                className="flow-exercise-card glass-panel"
                data-testid={`exercise-card-${index + 1}`}
              >
                <div className="flow-exercise-header">
                  <div className="flow-exercise-order-badge">
                    <GripVertical size={14} className="flow-muted-icon" />
                    <span>Workout {index + 1}</span>
                  </div>

                  <div className="flow-exercise-actions">
                    <button
                      type="button"
                      className="flow-icon-btn"
                      onClick={() => handleMoveExercise(index, -1)}
                      disabled={isFirst}
                      title="Move Up"
                      aria-label={`Move Workout ${index + 1} Up`}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="flow-icon-btn"
                      onClick={() => handleMoveExercise(index, 1)}
                      disabled={isLast}
                      title="Move Down"
                      aria-label={`Move Workout ${index + 1} Down`}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="flow-icon-btn"
                      onClick={() => handleDuplicateExercise(item)}
                      title="Duplicate Exercise"
                      aria-label={`Duplicate Workout ${index + 1}`}
                    >
                      <Copy size={15} />
                    </button>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        className="flow-icon-btn flow-icon-danger"
                        onClick={() => handleRemoveExercise(item.id)}
                        title="Remove Exercise"
                        aria-label={`Remove Workout ${index + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercise inputs */}
                <div className="flow-exercise-body">
                  <div className="flow-field-group">
                    <label
                      className="flow-field-label"
                      htmlFor={`ex-name-${item.id}`}
                    >
                      Exercise Name
                    </label>
                    <input
                      id={`ex-name-${item.id}`}
                      className="flow-input"
                      list="flow-common-workouts"
                      placeholder="e.g. Barbell Squat, Push-ups..."
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateExercise(item.id, 'name', e.target.value)
                      }
                      aria-label={`Workout ${index + 1} name`}
                      maxLength={80}
                    />
                  </div>

                  <div className="flow-grid-metrics">
                    <div className="flow-field-group">
                      <label
                        className="flow-field-label"
                        htmlFor={`ex-sets-${item.id}`}
                      >
                        Sets
                      </label>
                      <input
                        id={`ex-sets-${item.id}`}
                        type="number"
                        min="1"
                        max="99"
                        className="flow-input flow-input-num"
                        value={item.sets}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, 'sets', e.target.value)
                        }
                      />
                    </div>

                    <div className="flow-field-group">
                      <label
                        className="flow-field-label"
                        htmlFor={`ex-reps-${item.id}`}
                      >
                        Reps / Set
                      </label>
                      <input
                        id={`ex-reps-${item.id}`}
                        type="number"
                        min="1"
                        max="999"
                        className="flow-input flow-input-num"
                        value={item.reps}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, 'reps', e.target.value)
                        }
                      />
                    </div>

                    <div className="flow-field-group">
                      <label
                        className="flow-field-label"
                        htmlFor={`ex-dur-${item.id}`}
                      >
                        Est. Time (min)
                      </label>
                      <input
                        id={`ex-dur-${item.id}`}
                        type="number"
                        min="0"
                        step="0.5"
                        className="flow-input flow-input-num"
                        value={item.workoutTimeMin}
                        onChange={(e) =>
                          handleUpdateExercise(
                            item.id,
                            'workoutTimeMin',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Add Exercise CTA Button */}
        <div className="flow-add-exercise-bar">
          <button
            type="button"
            className="flow-add-btn"
            onClick={handleAddExercise}
          >
            <Plus size={18} />
            <span>Add Workout</span>
          </button>
        </div>

        {/* Quick Common Exercises Helper */}
        {commonWorkouts.length > 0 && (
          <div className="flow-common-suggestions glass-panel">
            <span className="flow-common-title">
              <Sparkles size={14} className="flow-accent-icon" /> Quick Add From
              History:
            </span>
            <div className="flow-pill-chips">
              {commonWorkouts.slice(0, 8).map((name) => (
                <button
                  type="button"
                  key={name}
                  className="flow-pill-chip"
                  onClick={() => handleQuickAddCommon(name)}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="flow-editor-bottom-bar glass-panel">
        <div className="flow-bottom-summary">
          <strong>{exercises.filter((item) => item.name.trim()).length}</strong>{' '}
          Valid Workouts <span>·</span> ~{totalEstimatedMin} min
        </div>
        <div className="flow-bottom-actions">
          <button
            type="button"
            className="flow-secondary-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flow-primary-btn"
            onClick={handleSave}
            disabled={!isValid}
          >
            <Save size={16} />
            <span>Save flow</span>
          </button>
        </div>
      </div>
    </section>
  );
}
