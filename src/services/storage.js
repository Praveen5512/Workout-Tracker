/**
 * Local Storage and Persistence Service
 * Provides offline-first data management and realistic initial seed data.
 */

const STORAGE_KEY_WORKOUTS = 'workout_tracker_records';
const STORAGE_KEY_QUEUE = 'workout_tracker_sync_queue';


export const storage = {
  /**
   * Get all workouts from local storage
   */
  getWorkouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WORKOUTS);
      if (!data) {
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch (e) {
      console.error('Error reading workouts from local storage:', e);
      return [];
    }
  },

  /**
   * Save workouts array to local storage
   */
  saveWorkouts(workouts) {
    try {
      localStorage.setItem(STORAGE_KEY_WORKOUTS, JSON.stringify(workouts));
      // Dispatch custom event so all reactive components can refresh immediately
      window.dispatchEvent(new CustomEvent('workout_tracker_data_changed', { detail: workouts }));
    } catch (e) {
      console.error('Error saving workouts to local storage:', e);
    }
  },

  /**
   * Add a new workout locally (optimistic)
   */
  addWorkout(workoutData) {
    const workouts = this.getWorkouts();
    const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newRecord = {
      ...workoutData,
      id: tempId,
      Sets: Number(workoutData.Sets) || 0,
      Reps: Number(workoutData.Reps) || 0,
      'Duration (min)': Number(workoutData['Duration (min)']) || 0,
      syncStatus: 'pending'
    };

    const updated = [newRecord, ...workouts];
    this.saveWorkouts(updated);

    // Add create operation to sync queue
    this.addToSyncQueue({
      action: 'create',
      tempId: tempId,
      data: {
        Date: newRecord.Date,
        Exercise: newRecord.Exercise,
        Sets: newRecord.Sets,
        Reps: newRecord.Reps,
        'Weight/Intensity': newRecord['Weight/Intensity'],
        'Duration (min)': newRecord['Duration (min)'],
        Notes: newRecord.Notes
      }
    });

    return newRecord;
  },

  /**
   * Update an existing workout locally (optimistic)
   */
  updateWorkout(id, updatedFields) {
    const workouts = this.getWorkouts();
    let updatedRecord = null;

    const updated = workouts.map(item => {
      if (String(item.id) === String(id)) {
        updatedRecord = {
          ...item,
          ...updatedFields,
          Sets: Number(updatedFields.Sets ?? item.Sets) || 0,
          Reps: Number(updatedFields.Reps ?? item.Reps) || 0,
          'Duration (min)': Number(updatedFields['Duration (min)'] ?? item['Duration (min)']) || 0,
          syncStatus: 'pending'
        };
        return updatedRecord;
      }
      return item;
    });

    this.saveWorkouts(updated);

    // Add update operation to sync queue
    if (updatedRecord) {
      this.addToSyncQueue({
        action: 'update',
        targetId: id,
        data: {
          Date: updatedRecord.Date,
          Exercise: updatedRecord.Exercise,
          Sets: updatedRecord.Sets,
          Reps: updatedRecord.Reps,
          'Weight/Intensity': updatedRecord['Weight/Intensity'],
          'Duration (min)': updatedRecord['Duration (min)'],
          Notes: updatedRecord.Notes
        }
      });
    }

    return updatedRecord;
  },

  /**
   * Delete a workout locally (optimistic)
   */
  deleteWorkout(id) {
    const workouts = this.getWorkouts();
    const target = workouts.find(item => String(item.id) === String(id));
    const filtered = workouts.filter(item => String(item.id) !== String(id));

    this.saveWorkouts(filtered);

    // Add delete operation to sync queue
    this.addToSyncQueue({
      action: 'delete',
      targetId: id,
      tempId: String(id).startsWith('local_') ? id : null
    });

    return target;
  },

  /**
   * Replace local records with data freshly pulled from backend
   */
  replaceWithBackendRecords(backendRecords) {
    const currentWorkouts = this.getWorkouts();
    // Preserve local unsynced pending records
    const pendingLocal = currentWorkouts.filter(w => w.syncStatus === 'pending');

    // Merge: backend records (marked synced) + local pending records
    const combined = [...pendingLocal];
    const pendingIds = new Set(pendingLocal.map(p => String(p.id)));

    backendRecords.forEach(br => {
      if (!pendingIds.has(String(br.id))) {
        combined.push({
          ...br,
          syncStatus: 'synced'
        });
      }
    });

    // Sort by Date descending
    combined.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    this.saveWorkouts(combined);
  },

  /**
   * Updates an item's ID when created on backend and marks it synced
   */
  resolveCreatedItem(tempId, backendRowId) {
    const workouts = this.getWorkouts();
    const updated = workouts.map(item => {
      if (String(item.id) === String(tempId)) {
        return {
          ...item,
          id: backendRowId || item.id,
          syncStatus: 'synced'
        };
      }
      return item;
    });
    this.saveWorkouts(updated);
  },

  /**
   * Mark a workout record as synced
   */
  markRecordSynced(id) {
    const workouts = this.getWorkouts();
    const updated = workouts.map(item => {
      if (String(item.id) === String(id)) {
        return { ...item, syncStatus: 'synced' };
      }
      return item;
    });
    this.saveWorkouts(updated);
  },

  /**
   * Sync Queue Management
   */
  getSyncQueue() {
    try {
      const q = localStorage.getItem(STORAGE_KEY_QUEUE);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  },

  saveSyncQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent('workout_tracker_queue_changed', { detail: queue }));
    } catch (e) {
      console.error('Error saving sync queue:', e);
    }
  },

  addToSyncQueue(item) {
    const queue = this.getSyncQueue();
    const queueItem = {
      queueId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      attempts: 0,
      ...item
    };
    queue.push(queueItem);
    this.saveSyncQueue(queue);
    return queueItem;
  },

  removeFromSyncQueue(queueId) {
    const queue = this.getSyncQueue();
    const filtered = queue.filter(item => item.queueId !== queueId);
    this.saveSyncQueue(filtered);
  },

  clearSyncQueue() {
    this.saveSyncQueue([]);
  },

  clearAllData() {
    this.saveWorkouts([]);
    this.clearSyncQueue();
  }
};
