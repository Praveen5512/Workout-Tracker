/**
 * Google Apps Script Web App API client
 * Handles communication with Google Sheets backend
 * Conforms to requirements in README.md:
 * - GET ?action=readAll
 * - GET ?action=common_workouts
 * - GET ?action=readOne&id={rowId}
 * - POST { "action": "create", "data": { ... } }
 * - POST { "action": "update", "id": {rowId}, "data": { ... } }
 * - POST { "action": "delete", "id": {rowId} }
 * - POST requests use text/plain;charset=utf-8 to avoid CORS preflight issues
 */

const STORAGE_KEY_URL = 'workout_tracker_script_url';

export const getScriptUrl = () => {
  return localStorage.getItem(STORAGE_KEY_URL) || '';
};

export const setScriptUrl = (url) => {
  if (url) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }
};

/**
 * Normalizes keys from backend if needed
 */
export const normalizeRecord = (record, index) => {
  if (!record) return null;
  return {
    id: record.id || record.rowId || record.RowId || (index !== undefined ? index + 2 : Date.now()),
    Date: record.Date || record.date || new Date().toISOString().split('T')[0],
    Exercise: record.Exercise || record.exercise || '',
    Sets: Number(record.Sets ?? record.sets ?? 0),
    Reps: Number(record.Reps ?? record.reps ?? 0),
    'Weight/Intensity': record['Weight/Intensity'] || record.weight || record.Weight || '',
    'Duration (min)': Number(record['Duration (min)'] ?? record.duration ?? record.Duration ?? 0),
    Notes: record.Notes || record.notes || '',
    syncStatus: record.syncStatus || 'synced'
  };
};

/**
 * Helper to execute a fetch request with timeout
 */
async function fetchWithTimeout(resource, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const api = {
  getScriptUrl,
  setScriptUrl,

  /**
   * Test connection to Google Apps Script endpoint
   */
  async testConnection(url) {
    const targetUrl = (url || getScriptUrl()).trim();
    if (!targetUrl) throw new Error('No Google Apps Script URL configured.');

    const separator = targetUrl.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${targetUrl}${separator}action=readAll`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, 10000);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, count: Array.isArray(data) ? data.length : (data.records ? data.records.length : 0) };
  },

  /**
   * Fetch all workout records
   */
  async readAll() {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return null; // local demo mode

    const separator = scriptUrl.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${scriptUrl}${separator}action=readAll`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }

    const json = await response.json();
    const records = Array.isArray(json) ? json : (json.records || json.data || []);
    return records.map(normalizeRecord);
  },
  async syncCommonWorkouts() {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return null; // local demo mode

    const separator = scriptUrl.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${scriptUrl}${separator}action=common_workouts`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }

    const json = await response.json();

    return json.data;

  }
  ,

  /**
   * Fetch one workout record by row ID
   */
  async readOne(rowId) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return null;

    const separator = scriptUrl.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${scriptUrl}${separator}action=readOne&id=${encodeURIComponent(rowId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch record ${rowId}: ${response.statusText}`);
    }

    const json = await response.json();
    return normalizeRecord(json.record || json.data || json);
  },

  /**
   * Create a workout record in Google Sheets
   * POST text/plain;charset=utf-8 with { action: "create", data: { ... } }
   */
  async create(recordData) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) {
      // Mock creation for offline/demo mode
      return { success: true, id: Date.now() };
    }

    const payload = {
      action: 'create',
      data: {
        Date: recordData.Date,
        Exercise: recordData.Exercise,
        Sets: Number(recordData.Sets) || 0,
        Reps: Number(recordData.Reps) || 0,
        'Weight/Intensity': recordData['Weight/Intensity'] || '',
        'Duration (min)': Number(recordData['Duration (min)']) || 0,
        Notes: recordData.Notes || ''
      }
    };

    const response = await fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create record: ${response.statusText}`);
    }

    const resJson = await response.json();
    return resJson;
  },

  /**
   * Update an existing workout record in Google Sheets
   * POST text/plain;charset=utf-8 with { action: "update", id: rowId, data: { ... } }
   */
  async update(rowId, recordData) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) {
      return { success: true, id: rowId };
    }

    const payload = {
      action: 'update',
      id: rowId,
      data: {
        Date: recordData.Date,
        Exercise: recordData.Exercise,
        Sets: Number(recordData.Sets) || 0,
        Reps: Number(recordData.Reps) || 0,
        'Weight/Intensity': recordData['Weight/Intensity'] || '',
        'Duration (min)': Number(recordData['Duration (min)']) || 0,
        Notes: recordData.Notes || ''
      }
    };

    const response = await fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to update record ${rowId}: ${response.statusText}`);
    }

    const resJson = await response.json();
    return resJson;
  },

  /**
   * Delete a record in Google Sheets
   * POST text/plain;charset=utf-8 with { action: "delete", id: rowId }
   */
  async delete(rowId) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) {
      return { success: true, id: rowId };
    }

    const payload = {
      action: 'delete',
      id: rowId
    };

    const response = await fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to delete record ${rowId}: ${response.statusText}`);
    }

    const resJson = await response.json();
    return resJson;
  },



};
