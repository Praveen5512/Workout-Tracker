import { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Dumbbell, Calendar, Layers, RotateCcw, Clock, FileText } from 'lucide-react';
import { api } from '../services/api';

const getTodayString = () => new Date().toISOString().split('T')[0];

export default function WorkoutModal({ isOpen, onClose, onSave, initialData }) {
  const isEditing = Boolean(initialData && initialData.id);

  const [date, setDate] = useState(getTodayString());
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [commonExercises, setCommonExercises] = useState([]);

  // Fetch common workout names from backend when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    api.syncCommonWorkouts()
      .then((records) => {
        if (cancelled || !records) return;
        // Extract unique exercise names from the returned records

        setCommonExercises(records);
      })
      .catch((err) => {
        console.warn('Could not fetch common workouts:', err);
      });

    return () => { cancelled = true; };
  }, [isOpen]);

  // Populate data when editing
  useEffect(() => {
    if (initialData) {
      setDate(initialData.Date || getTodayString());
      setExercise(initialData.Exercise || '');
      setSets(Number(initialData.Sets) || 0);
      setReps(Number(initialData.Reps) || 0);
      setWeight(initialData['Weight/Intensity'] || '');
      setDuration(Number(initialData['Duration (min)']) || 0);
      setNotes(initialData.Notes || '');
    } else {
      setDate(getTodayString());
      setExercise('');
      setSets(0);
      setReps(0);
      setWeight('');
      setDuration(0);
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!exercise.trim()) {
      alert('Please enter or select an exercise name');
      return;
    }

    const payload = {
      Date: date,
      Exercise: exercise.trim(),
      Sets: Number(sets) || 0,
      Reps: Number(reps) || 0,
      'Weight/Intensity': weight.trim(),
      'Duration (min)': Number(duration) || 0,
      Notes: notes.trim()
    };

    onSave(payload, initialData?.id);
    onClose();
  };

  const adjustNumber = (setter, val, delta, min = 0) => {
    setter(Math.max(min, (Number(val) || 0) + delta));
  };

  const appendWeightSuffix = (suffix) => {
    if (suffix === 'Bodyweight') {
      setWeight('Bodyweight');
    } else {
      const match = weight.match(/[0-9]+(?:\.[0-9]+)?/);
      const num = match ? match[0] : '';
      setWeight(num ? `${num} ${suffix}` : suffix);
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-modal-title"
      id="modal-workout-entry"
    >
      <div className="modal-sheet glass-panel animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <header className="modal-header">
          <div className="flex-align-center">
            <div className="modal-icon-badge" aria-hidden="true">
              <Dumbbell size={18} className="text-accent-primary" />
            </div>
            <div>
              <h2 id="workout-modal-title" className="modal-title">{isEditing ? 'Edit Workout Log' : 'Record Workout'}</h2>
              <p className="modal-subtitle">Conforms with Google Sheets Schema</p>
            </div>
          </div>
          <button 
            id="btn-close-workout-modal"
            className="modal-close-btn" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* 1. Date */}
          <div className="form-group">
            <label className="input-label">
              <Calendar size={14} className="inline mr-1 text-accent-cyan" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="form-input date-input"
            />
          </div>

          {/* 2. Exercise & Common Suggestions */}
          <div className="form-group">
            <label className="input-label">
              <Dumbbell size={14} className="inline mr-1 text-accent-primary" /> Exercise Name
            </label>
            <input
              type="text"
              placeholder="e.g. Barbell Bench Press"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              required
              className="form-input"
            />

            {/* Quick chips for fast mobile selection */}
            <div className="exercise-chips-scroll">

              {commonExercises.slice(0, 8).map((name, i) => (
                <button
                  type="button"
                  key={i}
                  className={`exercise-chip ${exercise === name ? 'chip-selected' : ''}`}
                  onClick={() => setExercise(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 3 & 4. Sets & Reps Steppers */}
          <div className="" >
            {/* Sets Stepper */}
            <div className="form-group">
              <label className="input-label">
                <Layers size={14} className="inline mr-1 text-accent-green" /> Sets
              </label>
              <div className="stepper-control">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => adjustNumber(setSets, sets, -1, 1)}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                  className="stepper-input"
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => adjustNumber(setSets, sets, 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Reps Stepper */}
            <div className="form-group d-block">
              <label className="input-label">
                <RotateCcw size={14} className="inline mr-1 text-accent-amber" /> Reps
              </label>
              <div className="stepper-control">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => adjustNumber(setReps, reps, -1, 1)}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={reps}
                  onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                  className="stepper-input"
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => adjustNumber(setReps, reps, 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* 5. Weight / Intensity */}
          <div className="form-group">
            <label className="input-label">
              <span className="text-accent-primary">⚡</span> Weight / Intensity
            </label>
            <input
              type="text"
              placeholder="e.g. 80 kg, Bodyweight, 45 lbs"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="form-input"
            />
            {/* Quick Suffix Buttons */}
            <div className="weight-presets-row">
              <button type="button" onClick={() => appendWeightSuffix('kg')} className="weight-preset-btn">
                + kg
              </button>
              <button type="button" onClick={() => appendWeightSuffix('lbs')} className="weight-preset-btn">
                + lbs
              </button>
              <button type="button" onClick={() => appendWeightSuffix('Bodyweight')} className="weight-preset-btn">
                Bodyweight
              </button>
            </div>
          </div>

          {/* 6. Duration (min) */}
          <div className="form-group">
            <label className="input-label">
              <Clock size={14} className="inline mr-1 text-accent-cyan" /> Duration (minutes)
            </label>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => adjustNumber(setDuration, duration, -5, 0)}
              >
                -5
              </button>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value) || 0))}
                className="stepper-input"
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => adjustNumber(setDuration, duration, 5)}
              >
                +5
              </button>
            </div>
          </div>

          {/* 7. Notes */}
          <div className="form-group">
            <label className="input-label">
              <FileText size={14} className="inline mr-1 text-muted" /> Notes
            </label>
            <textarea
              rows="2"
              placeholder="RPE, tempo, warmup details, or how you felt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
            />
          </div>

          {/* Form Actions */}
          <div className="modal-actions-row">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              <Check size={18} className="mr-1" />
              {isEditing ? 'Save Changes' : 'Log Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
