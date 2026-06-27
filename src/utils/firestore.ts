import { createClient } from '@supabase/supabase-js';

// Supabase Credentials (reads from env vars, falls back to project defaults)
const SUPABASE_URL = "https://uaxorqcetvntmgdqqlvu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheG9ycWNldHZudG1nZHFxbHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NjY1MzIsImV4cCI6MjA5ODE0MjUzMn0.k4GzwTadWoSpM9Eql6J8rV4uu9xb9rsrJLnKbkr6ql4";

function resolveSupabaseConfig() {
  // On Node.js (server CJS bundle), use process.env. On the browser (Vite), use hardcoded
  // client-safe anon key — import.meta.env is intentionally avoided to suppress esbuild warnings.
  if (typeof window === 'undefined') {
    return {
      url: process.env.VITE_SUPABASE_URL || SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
    };
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

const config = resolveSupabaseConfig();

export const supabase = createClient(config.url, config.anonKey, {
  auth: { persistSession: false }
});

// Re-export supabase as db for backwards compat with any future usage
export const db = supabase;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('[Supabase Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Tables that store a couple_id helper column for efficient couple-scoped lookups
const TABLES_WITH_COUPLE_ID = new Set([
  'messages', 'memories', 'calendarEvents', 'dailyAnswers', 'journalEntries',
  'bucketItems', 'lockedLetters', 'homeDecorations', 'securityLogs',
  'timelineEvents', 'sharedTracks', 'callLogs', 'moviesHistory'
]);

function buildInsertRow(collectionName: string, item: any) {
  const { id, ...data } = item;
  const row: any = { id, data };

  if (TABLES_WITH_COUPLE_ID.has(collectionName)) {
    if (item.coupleId) row.couple_id = item.coupleId;
    if (item.timestamp) row.timestamp = item.timestamp;
    else if (item.date) row.timestamp = new Date(item.date).getTime() || null;
    if (item.date) row.date = item.date;
  }

  if (collectionName === 'moviesHistory' && item.watchedAt) {
    row.watchedAt = item.watchedAt;
  }

  return row;
}

// -------------------------------------------------------------
// Core CRUD Helpers backed by Supabase
// -------------------------------------------------------------

export async function getRecord<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(collectionName)
      .select('id, data')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (data) return { id: data.id, ...(data.data as object) } as unknown as T;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
}

export async function collectionExists(collectionName: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from(collectionName)
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return (count || 0) > 0;
  } catch {
    return false;
  }
}

export async function getCollection<T>(collectionName: string, limitConstraint?: number, orderField?: string): Promise<T[]> {
  try {
    let query = supabase.from(collectionName).select('id, data');
    if (limitConstraint) query = query.limit(limitConstraint);

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []).map(row => ({ id: row.id, ...(row.data as object) })) as unknown as T[];

    // Sort in-memory to keep consistent ordering across environments
    if (orderField) {
      items.sort((a: any, b: any) => {
        const va = a[orderField], vb = b[orderField];
        if (typeof va === 'number' && typeof vb === 'number') return vb - va;
        return String(vb || '').localeCompare(String(va || ''));
      });
    }

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function addRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const row = buildInsertRow(collectionName, item);
    const { error } = await supabase.from(collectionName).upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${item.id}`);
  }
}

export async function updateRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const row = buildInsertRow(collectionName, item);
    const { error } = await supabase.from(collectionName).upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${item.id}`);
  }
}

export async function deleteRecord(collectionName: string, id: string): Promise<void> {
  try {
    const { error } = await supabase.from(collectionName).delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// No-op increment stub (Supabase uses JSONB merge, so numeric increments are handled manually)
export const increment = (val: number) => val;

// Migration stub — Supabase is the primary database, nothing to migrate
export async function migrateLocalDbToFirestore() {
  console.log('[Supabase] Primary database active. Migration step skipped.');
}
