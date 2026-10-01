/**
 * Synchronization Engine
 * Manages background sync between local storage queue and Google Apps Script API.
 * Broadcasts states: 'online', 'offline', 'syncing', 'synced', 'pending'
 */

import { api } from './api';
import { storage } from './storage';

class SyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.listeners = new Set();
    this.syncTimer = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineStatus(true));
      window.addEventListener('offline', () => this.handleOnlineStatus(false));
      window.addEventListener('workout_tracker_queue_changed', () => this.onQueueChanged());
    }
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Call immediately with current state
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        console.error('Error notifying sync listener:', e);
      }
    });
  }

  getState() {
    const queue = storage.getSyncQueue();
    let status = 'online';

    if (!this.isOnline) {
      status = 'offline';
    } else if (this.isSyncing) {
      status = 'syncing';
    } else if (queue.length > 0) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    return {
      status, // 'online' | 'offline' | 'syncing' | 'synced' | 'pending'
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: queue.length,
      lastSyncTime: this.lastSyncTime,
      hasBackendUrl: Boolean(api.getScriptUrl())
    };
  }

  handleOnlineStatus(online) {
    this.isOnline = online;
    this.notify();
    if (online) {
      // Trigger sync upon returning online
      this.triggerSync();
    }
  }

  onQueueChanged() {
    this.notify();
    // If online and not already syncing, schedule a debounced sync
    if (this.isOnline && !this.isSyncing) {
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => {
        this.triggerSync();
      }, 1000);
    }
  }

  /**
   * Trigger synchronization process
   */
  async triggerSync() {
    if (this.isSyncing) return;
    if (!this.isOnline) {
      this.notify();
      return;
    }

    const scriptUrl = api.getScriptUrl();
    const queue = storage.getSyncQueue();

    // If no backend configured, simulate sync for pending local items
    if (!scriptUrl) {
      if (queue.length > 0) {
        this.isSyncing = true;
        this.notify();
        // Simulate quick optimistic sync completion for local mode
        await new Promise(r => setTimeout(r, 600));
        queue.forEach(item => {
          if (item.action === 'create' && item.tempId) {
            storage.resolveCreatedItem(item.tempId, Date.now());
          } else if (item.targetId) {
            storage.markRecordSynced(item.targetId);
          }
        });
        storage.clearSyncQueue();
        this.lastSyncTime = new Date();
        this.isSyncing = false;
        this.notify();
      }
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      // 1. Process pending outgoing queue items in order
      for (const item of [...queue]) {
        try {
          if (item.action === 'create') {
            const res = await api.create(item.data);
            const assignedId = res.id || res.rowId || Date.now();
            storage.resolveCreatedItem(item.tempId, assignedId);
            storage.removeFromSyncQueue(item.queueId);
          } else if (item.action === 'update') {
            await api.update(item.targetId, item.data);
            storage.markRecordSynced(item.targetId);
            storage.removeFromSyncQueue(item.queueId);
          } else if (item.action === 'delete') {
            if (item.targetId && !String(item.targetId).startsWith('local_')) {
              await api.delete(item.targetId);
            }
            storage.removeFromSyncQueue(item.queueId);
          }
        } catch (itemErr) {
          console.warn(`Failed to sync item ${item.queueId}:`, itemErr);
          // Stop sequential queue on critical network error to avoid out-of-order execution
          break;
        }
      }

      // 2. Fetch latest data from backend to ensure local parity
      try {
        const backendRecords = await api.readAll();
        if (Array.isArray(backendRecords)) {
          storage.replaceWithBackendRecords(backendRecords);
        }
      } catch (fetchErr) {
        console.warn('Could not refresh backend records during sync:', fetchErr);
      }

      this.lastSyncTime = new Date();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();
