import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Query } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load config
import { 
  User, Couple, Message, Memory, CalendarEvent, 
  DailyAnswer, JournalEntry, BucketItem 
} from '../types';

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const app = getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await db.collection('test').doc('connection').get();
    console.log('[Firestore Admin] Successfully verified connection to Firestore database server.');
  } catch (error) {
    console.error('[Firestore Admin] Connection verification completed (expected due to permissions):', error instanceof Error ? error.message : String(error));
  }
}
testConnection();

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
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'server-admin',
      email: 'server-admin@serviceaccount.gserviceaccount.com'
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Core Firestore CRUD Helpers using Firebase Admin SDK
// -------------------------------------------------------------

export async function getRecord<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = db.collection(collectionName).doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      return { id: snap.id, ...snap.data() } as unknown as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
}

export async function collectionExists(collectionName: string): Promise<boolean> {
  try {
    const colRef = db.collection(collectionName);
    const snap = await colRef.limit(1).get();
    return !snap.empty;
  } catch (error) {
    console.error(`[Firestore] Failed to check existence of ${collectionName}:`, error);
    return false;
  }
}

export async function getCollection<T>(collectionName: string, limitConstraint?: number, orderField?: string): Promise<T[]> {
  try {
    let colRef: Query = db.collection(collectionName);
    
    if (orderField) {
      colRef = colRef.orderBy(orderField, 'desc');
    }
    
    if (limitConstraint) {
      colRef = colRef.limit(limitConstraint);
    }
    
    const snap = await colRef.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export const increment = (val: number) => FieldValue.increment(val);

export async function addRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const docRef = db.collection(collectionName).doc(item.id);
    const { id, ...data } = item;
    await docRef.set(data);
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${item.id}`);
  }
}

export async function updateRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const docRef = db.collection(collectionName).doc(item.id);
    const { id, ...data } = item;
    await docRef.set(data, { merge: true });
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${item.id}`);
  }
}

export async function deleteRecord(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = db.collection(collectionName).doc(id);
    await docRef.delete();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// -------------------------------------------------------------
// Seeding & Synchronization logic
// -------------------------------------------------------------

export async function migrateLocalDbToFirestore() {
  console.log('[Migration] Checking if Firestore database requires local sync...');
  const DATA_DIR = path.join(process.cwd(), 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');
  const INIT_MARKER = path.join(DATA_DIR, '.initialized');

  if (!fs.existsSync(DB_FILE)) {
    console.log('[Migration] No local db.json file detected to sync.');
    return;
  }

  try {
    // 1. Check if the database has already been initialized via marker
    if (fs.existsSync(INIT_MARKER)) {
      console.log('[Migration] Initialization marker exists. Skipping full migration check.');
      return;
    }

    const localData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    
    // 2. Efficiently check if Firestore has data (don't read the whole collection)
    const hasData = await collectionExists('users');

    if (hasData) {
      console.log('[Migration] Remote Firestore database already has data. Skipping seeding.');
      fs.writeFileSync(INIT_MARKER, 'true', 'utf-8');
      return;
    }

    if (fs.existsSync(INIT_MARKER)) {
      console.log('[Migration] Checked Firestore and found 0 users, and initialization marker exists. This implies a manual database reset/deletion in the Firebase console. Clearing local db.json to match Firestore.');
      const clearedDb = {
        users: [],
        couples: [],
        messages: [],
        memories: [],
        calendarEvents: [],
        dailyAnswers: [],
        journalEntries: [],
        movies: [],
        moviesHistory: [],
        bucketList: [],
        lockedLetters: [],
        decorations: [],
        securityLogs: [],
        timelineEvents: [],
        sharedTracks: [],
        callLogs: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(clearedDb, null, 2), 'utf-8');
      return;
    }

    console.log('[Migration] Database is empty on Firestore. Seeding started...');

    // Seed Users
    if (Array.isArray(localData.users)) {
      for (const u of localData.users) {
        await addRecord('users', u);
      }
      console.log(`[Migration] Synced ${localData.users.length} users to Firestore.`);
    }

    // Seed Couples
    if (Array.isArray(localData.couples)) {
      for (const c of localData.couples) {
        await addRecord('couples', c);
      }
      console.log(`[Migration] Synced ${localData.couples.length} couples to Firestore.`);
    }

    // Seed Messages
    if (Array.isArray(localData.messages)) {
      for (const m of localData.messages) {
        await addRecord('messages', m);
      }
      console.log(`[Migration] Synced ${localData.messages.length} messages to Firestore.`);
    }

    // Seed Memories
    if (Array.isArray(localData.memories)) {
      for (const m of localData.memories) {
        await addRecord('memories', m);
      }
      console.log(`[Migration] Synced ${localData.memories.length} memories to Firestore.`);
    }

    // Seed Calendar Events
    if (Array.isArray(localData.calendarEvents)) {
      for (const e of localData.calendarEvents) {
        await addRecord('calendarEvents', e);
      }
      console.log(`[Migration] Synced ${localData.calendarEvents.length} calendarEvents to Firestore.`);
    }

    // Seed Daily Answers
    if (Array.isArray(localData.dailyAnswers)) {
      for (const a of localData.dailyAnswers) {
        await addRecord('dailyAnswers', a);
      }
      console.log(`[Migration] Synced ${localData.dailyAnswers.length} dailyAnswers to Firestore.`);
    }

    // Seed Journal Entries
    if (Array.isArray(localData.journalEntries)) {
      for (const j of localData.journalEntries) {
        await addRecord('journalEntries', j);
      }
      console.log(`[Migration] Synced ${localData.journalEntries.length} journalEntries to Firestore.`);
    }

    // Seed Bucket List
    if (Array.isArray(localData.bucketList)) {
      for (const b of localData.bucketList) {
        await addRecord('bucketItems', b);
      }
      console.log(`[Migration] Synced ${localData.bucketList.length} bucket items to Firestore.`);
    }

    // Seed Movies & MoviesHistory
    if (Array.isArray(localData.movies)) {
      for (const m of localData.movies) {
        await addRecord('movies', m);
      }
    }
    if (Array.isArray(localData.moviesHistory)) {
      for (const h of localData.moviesHistory) {
        await addRecord('moviesHistory', h);
      }
    }

    console.log('[Migration] Local DB to Firestore migration complete. ✨');
    fs.writeFileSync(INIT_MARKER, 'true', 'utf-8');

  } catch (error) {
    console.error('[Migration] Failed to migrate/seed database:', error);
  }
}
