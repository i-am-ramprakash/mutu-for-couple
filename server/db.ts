import fs from 'fs';
import path from 'path';
import { User, Couple, Message, Memory, CalendarEvent, DailyAnswer, JournalEntry, BucketItem, LockedLetter, HomeDecoration, SecurityLog, TimelineEvent } from '../src/types';
import { 
  getCollection, 
  migrateLocalDbToFirestore,
} from '../src/utils/firestore';

export interface DBStore {
  users: User[];
  couples: Couple[];
  messages: Message[];
  memories: Memory[];
  calendarEvents: CalendarEvent[];
  dailyAnswers: DailyAnswer[];
  journalEntries: JournalEntry[];
  movies?: any[];
  moviesHistory?: any[];
  bucketList?: BucketItem[];
  lockedLetters: LockedLetter[];
  decorations?: HomeDecoration[];
  securityLogs?: SecurityLog[];
  timelineEvents?: TimelineEvent[];
  sharedTracks?: any[];
  callLogs?: any[];
}

export let db: DBStore = {
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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let saveTimeout: NodeJS.Timeout | null = null;
export function saveDB() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8', (err) => {
      if (err) {
        console.error('Error writing local DB backup to disk:', err);
      }
    });
  }, 100);
}

export async function loadDB() {
  try {
    await migrateLocalDbToFirestore();
    console.log('[Firestore] Hydrating server database state...');
    
    const [
      users, couples, messages, memories, calendarEvents, 
      dailyAnswers, journalEntries, bucketList, movies, 
      moviesHistory, lockedLetters, decorations, securityLogs, 
      timelineEvents, sharedTracks
    ] = await Promise.all([
      getCollection<User>('users'),
      getCollection<Couple>('couples'),
      getCollection<Message>('messages', 30, 'timestamp'), 
      getCollection<Memory>('memories', 30, 'date'),      
      getCollection<CalendarEvent>('calendarEvents', 100),
      getCollection<DailyAnswer>('dailyAnswers', 50, 'timestamp'),
      getCollection<JournalEntry>('journalEntries', 20, 'date'),
      getCollection<BucketItem>('bucketItems', 100),
      getCollection<any>('movies'),
      getCollection<any>('moviesHistory', 20, 'watchedAt'),
      getCollection<LockedLetter>('lockedLetters', 50),
      getCollection<HomeDecoration>('homeDecorations', 100),
      getCollection<SecurityLog>('securityLogs', 20, 'timestamp'),
      getCollection<TimelineEvent>('timelineEvents', 30, 'timestamp'),
      getCollection<any>('sharedTracks', 100)
    ]);

    db = {
      users: users || [],
      couples: couples || [],
      messages: messages || [],
      memories: memories || [],
      calendarEvents: calendarEvents || [],
      dailyAnswers: dailyAnswers || [],
      journalEntries: journalEntries || [],
      bucketList: bucketList || [],
      movies: movies || [],
      moviesHistory: moviesHistory || [],
      lockedLetters: lockedLetters || [],
      decorations: decorations || [],
      securityLogs: securityLogs || [],
      timelineEvents: timelineEvents || [],
      sharedTracks: sharedTracks || []
    };

    console.log('[Firestore] Database loaded successfully.');
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

  } catch (err) {
    console.error('[Firestore] Fallback to disk:', err);
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  }
}

export const dailyQuestions = [
  { id: 'q1', questionText: 'What is a little habit of mine that secretly makes you smile?' },
  { id: 'q2', questionText: 'What was your very first impression of me, and how has it changed?' },
  { id: 'q3', questionText: 'Where would you want to travel together on our next physical trip?' },
  { id: 'q4', questionText: 'If we could cuddle and watch any movie today, what would it be?' },
  { id: 'q5', questionText: 'What makes you feel most securely connected when we are miles apart?' },
  { id: 'q6', questionText: 'Which song or melody always makes you stop and think of me?' },
  { id: 'q7', questionText: 'If you could send me any comforting care package right now, what is inside?' },
  { id: 'q8', questionText: 'What are three words you would use to describe our future together?' },
  { id: 'q9', questionText: 'What is your favorite memory of us on a call or together?' },
  { id: 'q10', questionText: 'What food would we order and cook together if we woke up in the same house today?' }
];
