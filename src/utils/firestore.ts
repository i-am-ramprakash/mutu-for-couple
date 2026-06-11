import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocFromServer,
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load config
import { 
  User, Couple, Message, Memory, CalendarEvent, 
  DailyAnswer, JournalEntry, BucketItem 
} from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAlXFc0vJXUk33woh89I5AjxaM_BA9tuQc",
  authDomain: "mutu-forcouple.firebaseapp.com",
  projectId: "mutu-forcouple",
  storageBucket: "mutu-forcouple.firebasestorage.app",
  messagingSenderId: "765750689556",
  appId: "1:765750689556:web:8152c02878f80da8040c01",
  measurementId: "G-K9QFV1Q0QB"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
});

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Successfully verified connection to Firestore database server.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.log('[Firestore] Connection verification completed (expected due to default permissions/empty db):', error instanceof Error ? error.message : String(error));
    }
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
      userId: null,
      email: null
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Core Firestore CRUD Helpers
// -------------------------------------------------------------

export async function getCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function addRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const docRef = doc(db, collectionName, item.id);
    const { id, ...data } = item;
    await setDoc(docRef, data);
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${item.id}`);
  }
}

export async function updateRecord<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
  try {
    const docRef = doc(db, collectionName, item.id);
    const { id, ...data } = item;
    await setDoc(docRef, data, { merge: true });
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${item.id}`);
  }
}

export async function deleteRecord(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// -------------------------------------------------------------
// Seeding & Synchronization logic
// -------------------------------------------------------------

export async function migrateLocalDbToFirestore() {
  console.log('[Migration] Checking if Firestore database requires local sync...');
  const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(DB_FILE)) {
    console.log('[Migration] No local db.json file detected to sync.');
    return;
  }

  try {
    const localData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    
    // Check if remote users collection has data. If it has data, don't overwrite blindly
    const remoteUsers = await getCollection<User>('users');
    const INIT_MARKER = path.join(process.cwd(), 'data', '.initialized');

    if (remoteUsers.length > 0) {
      console.log('[Migration] Remote Firestore database has current data. Skipping seeding.');
      if (!fs.existsSync(INIT_MARKER)) {
        fs.writeFileSync(INIT_MARKER, 'true', 'utf-8');
      }
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
