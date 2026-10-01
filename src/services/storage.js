/**
 * Local Storage and Persistence Service
 * Provides offline-first data management and realistic initial seed data.
 */

const STORAGE_KEY_WORKOUTS = 'workout_tracker_records';
const STORAGE_KEY_QUEUE = 'workout_tracker_sync_queue';

// Dynamically generate realistic sample data around today's date
const generateSeedData = () => {
  const now = new Date();
  
  const formatDate = (daysAgo) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 101,
      Date: formatDate(0), // Today
      Exercise: 'Barbell Bench Press',
      Sets: 4,
      Reps: 8,
      'Weight/Intensity': '82.5 kg',
      'Duration (min)': 45,
      Notes: 'Felt strong, good bar path on last set',
      syncStatus: 'synced'
    },
    {
      id: 102,
      Date: formatDate(0), // Today
      Exercise: 'Incline Dumbbell Press',
      Sets: 3,
      Reps: 10,
      'Weight/Intensity': '28 kg',
      'Duration (min)': 25,
      Notes: 'Controlled negative, 2 RIR',
      syncStatus: 'synced'
    },
    {
      id: 103,
      Date: formatDate(1), // Yesterday
      Exercise: 'Barbell Squat',
      Sets: 5,
      Reps: 5,
      'Weight/Intensity': '110 kg',
      'Duration (min)': 50,
      Notes: 'Hit depth comfortably, focused on knee tracking',
      syncStatus: 'synced'
    },
    {
      id: 104,
      Date: formatDate(1), // Yesterday
      Exercise: 'Romanian Deadlift',
      Sets: 3,
      Reps: 8,
      'Weight/Intensity': '95 kg',
      'Duration (min)': 30,
      Notes: 'Great hamstring stretch, kept lats locked',
      syncStatus: 'synced'
    },
    {
      id: 105,
      Date: formatDate(3), // 3 days ago
      Exercise: 'Pull-ups',
      Sets: 4,
      Reps: 10,
      'Weight/Intensity': '+10 kg',
      'Duration (min)': 35,
      Notes: 'Used dip belt, full chest-to-bar contact',
      syncStatus: 'synced'
    },
    {
      id: 106,
      Date: formatDate(3),
      Exercise: 'Barbell Bent Over Row',
      Sets: 4,
      Reps: 8,
      'Weight/Intensity': '75 kg',
      'Duration (min)': 30,
      Notes: 'Torso at 45 degrees, paused at torso',
      syncStatus: 'synced'
    },
    {
      id: 107,
      Date: formatDate(5), // 5 days ago
      Exercise: 'Overhead Press',
      Sets: 4,
      Reps: 6,
      'Weight/Intensity': '52.5 kg',
      'Duration (min)': 40,
      Notes: 'Strict military press, core braced',
      syncStatus: 'synced'
    },
    {
      id: 108,
      Date: formatDate(6), // 6 days ago
      Exercise: 'Barbell Deadlift',
      Sets: 3,
      Reps: 5,
      'Weight/Intensity': '140 kg',
      'Duration (min)': 45,
      Notes: 'Solid lockout on all reps',
      syncStatus: 'synced'
    },
    {
      id: 109,
      Date: formatDate(8),
      Exercise: 'Barbell Bench Press',
      Sets: 4,
      Reps: 8,
      'Weight/Intensity': '80 kg',
      'Duration (min)': 45,
      Notes: 'Previous week baseline',
      syncStatus: 'synced'
    },
    {
      id: 110,
      Date: formatDate(9),
      Exercise: 'Barbell Squat',
      Sets: 4,
      Reps: 6,
      'Weight/Intensity': '105 kg',
      'Duration (min)': 45,
      Notes: 'Felt smooth',
      syncStatus: 'synced'
    },
    {
      id: 111,
      Date: formatDate(12),
      Exercise: 'Barbell Deadlift',
      Sets: 3,
      Reps: 5,
      'Weight/Intensity': '135 kg',
      'Duration (min)': 50,
      Notes: 'Smooth pulls',
      syncStatus: 'synced'
    },
    {
      id: 112,
      Date: formatDate(14),
      Exercise: 'Overhead Press',
      Sets: 4,
      Reps: 6,
      'Weight/Intensity': '50 kg',
      'Duration (min)': 35,
      Notes: 'Shoulder stability good',
      syncStatus: 'synced'
    },
    {
      id: 113,
      Date: formatDate(16),
      Exercise: 'Pull-ups',
      Sets: 4,
      Reps: 9,
      'Weight/Intensity': '+5 kg',
      'Duration (min)': 30,
      Notes: 'Solid form',
      syncStatus: 'synced'
    }
  ];
};

export const storage = {
  /**
   * Get all workouts from local storage
   */
  getWorkouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WORKOUTS);
      if (!data) {
        const seed = generateSeedData();
        this.saveWorkouts(seed);
        return seed;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seed = generateSeedData();
        this.saveWorkouts(seed);
        return seed;
      }
      return parsed;
    } catch (e) {
      console.error('Error reading workouts from local storage:', e);
      return generateSeedData();
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

  resetToSampleData() {
    const seed = generateSeedData();
    this.saveWorkouts(seed);
    this.clearSyncQueue();
    return seed;
  }
};
