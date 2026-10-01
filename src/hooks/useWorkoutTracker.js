import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { syncEngine } from '../services/syncEngine';

export function useWorkoutTracker() {
  const [workouts, setWorkouts] = useState(() => storage.getWorkouts());
  const [syncState, setSyncState] = useState(() => syncEngine.getState());

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubSync = syncEngine.subscribe(newSyncState => {
      setSyncState(newSyncState);
    });

    // Listen for local storage updates
    const handleDataChanged = (e) => {
      if (e.detail) {
        setWorkouts([...e.detail]);
      } else {
        setWorkouts(storage.getWorkouts());
      }
    };

    window.addEventListener('workout_tracker_data_changed', handleDataChanged);

    return () => {
      unsubSync();
      window.removeEventListener('workout_tracker_data_changed', handleDataChanged);
    };
  }, []);

  const addWorkout = useCallback((data) => {
    return storage.addWorkout(data);
  }, []);

  const updateWorkout = useCallback((id, data) => {
    return storage.updateWorkout(id, data);
  }, []);

  const deleteWorkout = useCallback((id) => {
    return storage.deleteWorkout(id);
  }, []);

  const triggerSync = useCallback(() => {
    return syncEngine.triggerSync();
  }, []);

  const resetSampleData = useCallback(() => {
    const fresh = storage.resetToSampleData();
    setWorkouts(fresh);
  }, []);

  return {
    workouts,
    syncState,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    triggerSync,
    resetSampleData
  };
}
