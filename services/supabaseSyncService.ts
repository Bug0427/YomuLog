// services/supabaseSyncService.ts
// Premium Supabase Sync Engine — thin re-export FACADE.
//
// H-4 (WS4) decomposed this module into services/sync/*:
//   - services/sync/types.ts      — shared types, storage keys, low-level helpers
//   - services/sync/syncCore.ts   — sync-state orchestration + scope engines
//   - services/sync/cloudPrefs.ts — preferences scope push/pull
//   - services/sync/statsPush.ts  — retention / reading-stats / funnel-event pushes
//
// This file now only re-exports the ORIGINAL public API surface, so every
// existing import keeps working unchanged (behavior-preserving split).
import {
  getSyncState,
  getSyncQueue,
  setSyncEnabled,
  isSyncEnabled,
  performFullSync,
  queueSync,
  processQueue,
  migrateLocalToSupabase,
  pushLocalToCloud,
  pullCloudToLocal,
  resetSync,
  checkConnectivity,
  formatSyncTimestamp,
} from './sync/syncCore';
import {
  pushRetentionToCloud,
  pushStatsToCloud,
  pushFunnelEventsToCloud,
} from './sync/statsPush';

export {
  getSyncState,
  getSyncQueue,
  setSyncEnabled,
  isSyncEnabled,
  performFullSync,
  queueSync,
  processQueue,
  migrateLocalToSupabase,
  pushLocalToCloud,
  pullCloudToLocal,
  resetSync,
  checkConnectivity,
  formatSyncTimestamp,
  pushRetentionToCloud,
  pushStatsToCloud,
  pushFunnelEventsToCloud,
};

export type {
  SyncStatus,
  SyncScope,
  SyncState,
  SyncQueueItem,
  ConflictResolution,
  SyncPayloadDownloads,
} from './sync/types';