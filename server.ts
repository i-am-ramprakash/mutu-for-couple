import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { 
  User, Couple, Message, Memory, CalendarEvent, 
  DailyQuestion, DailyAnswer, JournalEntry, WSEvent, BucketItem, LockedLetter,
  HomeDecoration, SecurityLog, TimelineEvent
} from './src/types';
import { 
  getCollection, 
  addRecord, 
  updateRecord, 
  deleteRecord, 
  migrateLocalDbToFirestore 
} from './src/utils/firestore';

const app = express();
const PORT = 3000;

// Boost body size limits to permit profile custom base64 avatars and journal/memory photos and movies
app.use(express.json({ limit: '3000mb' }));
app.use(express.urlencoded({ limit: '3000mb', extended: true }));

// Ensure /data exists for persistent JSON-based db storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Database Schema backing up to db.json
interface DBStore {
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

let db: DBStore = {
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

// Seed Daily Questions list
const dailyQuestions: DailyQuestion[] = [
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

// Load Db from Firestore and fall back to local disk
async function loadDB() {
  try {
    // 1. Unconditionally sync local JSON DB to Firestore if Firestore is empty
    await migrateLocalDbToFirestore();

    // 2. Hydrate from Firestore
    console.log('[Firestore] Hydrating server database state from Cloud Firestore...');
    const [
      users, 
      couples, 
      messages, 
      memories, 
      calendarEvents, 
      dailyAnswers, 
      journalEntries, 
      bucketList, 
      movies, 
      moviesHistory,
      lockedLetters,
      decorations,
      securityLogs,
      timelineEvents,
      sharedTracks
    ] = await Promise.all([
      getCollection<User>('users'),
      getCollection<Couple>('couples'),
      getCollection<Message>('messages'),
      getCollection<Memory>('memories'),
      getCollection<CalendarEvent>('calendarEvents'),
      getCollection<DailyAnswer>('dailyAnswers'),
      getCollection<JournalEntry>('journalEntries'),
      getCollection<BucketItem>('bucketItems'),
      getCollection<any>('movies'),
      getCollection<any>('moviesHistory'),
      getCollection<LockedLetter>('lockedLetters'),
      getCollection<HomeDecoration>('homeDecorations'),
      getCollection<SecurityLog>('securityLogs'),
      getCollection<TimelineEvent>('timelineEvents'),
      getCollection<any>('sharedTracks')
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

    console.log('[Firestore] Database loaded from live Firestore successfully. Records count: ', {
      users: db.users.length,
      couples: db.couples.length,
      memories: db.memories.length,
      messages: db.messages.length,
      calendar: db.calendarEvents.length,
      bucketList: db.bucketList.length,
      movies: db.movies.length,
      lockedLetters: db.lockedLetters.length,
      decorations: db.decorations?.length || 0,
      timelineEvents: db.timelineEvents?.length || 0
    });

    // Save local backup file
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

  } catch (err) {
    console.error('[Firestore] Failing to load live Firestore DB, using physical disk fallback:', err);
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      db = {
        users: parsed.users || [],
        couples: parsed.coupleS || parsed.couples || [],
        messages: parsed.messages || [],
        memories: parsed.memories || [],
        calendarEvents: parsed.calendarEvents || [],
        dailyAnswers: parsed.dailyAnswers || [],
        journalEntries: parsed.journalEntries || [],
        movies: parsed.movies || [],
        moviesHistory: parsed.moviesHistory || [],
        bucketList: parsed.bucketList || [],
        lockedLetters: parsed.lockedLetters || [],
        decorations: parsed.decorations || [],
        securityLogs: parsed.securityLogs || [],
        timelineEvents: parsed.timelineEvents || [],
        sharedTracks: parsed.sharedTracks || [],
        callLogs: parsed.callLogs || []
      };
    }
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveDB() {
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

// Initial DB pull asynchronously
loadDB();

// Setup WebSocket Client Storage: mapping userId -> WebSocket
const clientSockets = new Map<string, WebSocket>();
const activeChatUsers = new Set<string>();

// Helper to send a WS payload to a specific user
function sendToUser(userId: string, event: WSEvent) {
  const ws = clientSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

// Standard helper to find partner ID
function getPartnerId(userId: string): string | undefined {
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.coupleId) return undefined;
  const couple = db.couples.find(c => c.id === user.coupleId);
  if (!couple) return undefined;
  return couple.partner1Id === userId ? couple.partner2Id : couple.partner1Id;
}

// Helper to keep local database synchronized with live Firestore on critical actions
async function syncAuthDatabaseWithFirestore() {
  try {
    const [users, couples] = await Promise.all([
      getCollection<User>('users'),
      getCollection<Couple>('couples')
    ]);
    db.users = users || [];
    db.couples = couples || [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log('[Firestore] Synced users and couples state from live Firestore.', {
      usersCount: db.users.length,
      couplesCount: db.couples.length
    });
  } catch (err) {
    console.error('[Firestore] Failed to sync users and couples from Firestore:', err);
  }
}

// -------------------------------------------------------------
// HTTP REST ENDPOINTS (API Router)
// -------------------------------------------------------------

app.post('/api/auth/google', async (req, res) => {
  await syncAuthDatabaseWithFirestore();
  const { uid, name, email, profilePhoto } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing Google authentication details.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = db.users.find(u => u.email === normalizedEmail);

  if (!user) {
    // Register new user via Google
    user = {
      id: uid, // Use Firebase UID securely
      name: name || email.split('@')[0],
      email: normalizedEmail,
      birthday: '', // can be filled later
      profilePhoto: profilePhoto || '💖',
    };
    db.users.push(user);
    saveDB();

    try {
      await addRecord('users', user);
    } catch (err) {
      console.error('Failed to sync google user to Firestore:', err);
    }
  } else {
    // If user already exists but might have a different ID, we can just return existing user
    // Optionally update profile photo if it was absent
  }

  await updateStreakAndActivity(user.id, req);
  const hydrated = hydrateUser(user.id) || user;
  res.json(hydrated);
});

// 1. Auth: User Register
app.post('/api/auth/register', async (req, res) => {
  await syncAuthDatabaseWithFirestore();
  const { uid, name, email, password, birthday, profilePhoto } = req.body;
  if (!name || !email || !birthday) {
    return res.status(400).json({ error: 'Missing registration details.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.users.find(u => u.email === normalizedEmail || u.id === uid);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const newUser: User = {
    id: uid || 'usr_' + Math.random().toString(36).substring(2, 11),
    name,
    email: normalizedEmail,
    birthday,
    profilePhoto: profilePhoto || '', // fallback
  };

  db.users.push(newUser);
  saveDB();

  try {
    await addRecord('users', newUser);
  } catch (err) {
    console.error('Failed to sync newUser to Firestore:', err);
  }

  res.status(201).json(newUser);
});

// 2. Auth: User Login
app.post('/api/auth/login', async (req, res) => {
  await syncAuthDatabaseWithFirestore();
  const { uid, email } = req.body;
  if (!email && !uid) {
    return res.status(400).json({ error: 'Account credentials required.' });
  }

  let user = null;
  if (uid) {
    user = db.users.find(u => u.id === uid);
  }
  if (!user && email) {
    user = db.users.find(u => u.email === email.toLowerCase().trim());
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found. Please register first!' });
  }

  await updateStreakAndActivity(user.id, req);

  // Hydrate user with partner details if coupled
  const hydratedUser = hydrateUser(user.id) || user;
  res.json(hydratedUser);
});

// Hydrate user profiles with partner data dynamically
function hydrateUser(userId: string): User | undefined {
  const user = db.users.find(u => u.id === userId);
  if (!user) return undefined;

  if (user.coupleId) {
    const couple = db.couples.find(c => c.id === user.coupleId);
    if (couple) {
      const partnerId = couple.partner1Id === userId ? couple.partner2Id : couple.partner1Id;
      if (partnerId) {
        const partner = db.users.find(u => u.id === partnerId);
        if (partner) {
          return {
            ...user,
            loveKey: couple.loveKey,
            inviteCode: couple.inviteCode,
            anniversaryDate: couple.anniversaryDate,
            partnerId: partner.id,
            partnerName: partner.name,
            partnerBirthday: partner.birthday,
            partnerPhoto: partner.profilePhoto,
            partnerCity: partner.locationCity,
            partnerWeather: partner.locationWeather,
            partnerTimezone: partner.locationTimezone,
            partnerMood: partner.checkInMood,
            partnerLoveLanguage: partner.checkInLoveLanguage,
            partnerLoveCounterTitle: partner.customLoveCounterTitle,
            chatBackground: couple.chatBackground,
            
            // Hydrate partner's physical indicators & streaks
            partnerPresenceStatus: partner.currentPresenceStatus,
            partnerSleepTime: partner.lastSleepTime,
            partnerHeartbeat: partner.lastHeartbeat,
            partnerStreakCurrent: partner.streakCurrent
          };
        }
      } else {
        // Partner hasn't joined yet
        return {
          ...user,
          inviteCode: couple.inviteCode
        };
      }
    }
  }
  return user;
}

// 3. Couple: Generate Invite Code
app.post('/api/couple/generate-invite', async (req, res) => {
  const { userId, anniversaryDate } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Generate Invite Code format: LOVE-XXXX-XXXX
  const randSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const inviteCode = `LOVE-${randSegment()}-${randSegment()}`;
  
  // Generate a random unique Love Verification Key as well
  const loveKey = `KEY-${randSegment()}-${randSegment()}`;

  // If user already had a couple and is sole member, reuse it, or create a new couple
  let couple = db.couples.find(c => c.partner1Id === userId && !c.partner2Id);
  if (couple) {
    couple.inviteCode = inviteCode;
    couple.anniversaryDate = anniversaryDate || couple.anniversaryDate;
  } else {
    couple = {
      id: 'cpl_' + Math.random().toString(36).substring(2, 11),
      inviteCode,
      partner1Id: userId,
      loveKey,
      anniversaryDate: anniversaryDate || '',
      createdAt: Date.now()
    };
    db.couples.push(couple);
  }

  user.coupleId = couple.id;
  user.inviteCode = inviteCode;
  saveDB();

  try {
    await Promise.all([
      addRecord('couples', couple),
      addRecord('users', user)
    ]);
  } catch (err) {
    console.error('Failed to sync generate-invite data to Firestore:', err);
  }

  res.json({ inviteCode, couple, hydratedUser: hydrateUser(userId) });
});

// 4. Couple: Join with Invite Code
app.post('/api/couple/join', async (req, res) => {
  const { userId, inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: 'Code is required.' });

  const seeker = db.users.find(u => u.id === userId);
  if (!seeker) return res.status(404).json({ error: 'User not found.' });

  const targetCode = inviteCode.trim().toUpperCase();
  let couple = db.couples.find(c => c.inviteCode === targetCode);
  
  if (!couple) {
    try {
      const allCouples = await getCollection<Couple>('couples');
      couple = allCouples.find(c => c.inviteCode === targetCode);
      if (couple) {
        db.couples.push(couple);
      }
    } catch (err) {
      console.error('Failed to fetch from Firestore:', err);
    }
  }

  if (!couple) {
    return res.status(404).json({ error: 'Invalid invite code. Ask your partner for their code!' });
  }

  if (couple.partner1Id === userId) {
    return res.status(400).json({ error: 'This is your own code! Send it to your partner.' });
  }

  if (couple.partner2Id && couple.partner2Id !== userId) {
    return res.status(400).json({ error: 'This invite code has already been linked to a partner.' });
  }

  // Link partners
  couple.partner2Id = userId;
  seeker.coupleId = couple.id;

  const addedEvents: CalendarEvent[] = [];

  // Add automatic birthdays to the shared calendar
  let p1 = db.users.find(u => u.id === couple!.partner1Id);
  if (!p1) {
    try {
      const allUsers = await getCollection<User>('users');
      p1 = allUsers.find(u => u.id === couple!.partner1Id);
      if (p1) db.users.push(p1);
    } catch (err) {}
  }
  
  if (p1) {
    const e1: CalendarEvent = {
      id: 'cal_' + Math.random().toString(36).substring(2, 11),
      coupleId: couple.id,
      title: `${p1.name}'s Birthday 🎂`,
      date: p1.birthday,
      category: 'birthday',
      createdBy: 'system'
    };
    db.calendarEvents.push(e1);
    addedEvents.push(e1);

    const e2: CalendarEvent = {
      id: 'cal_' + Math.random().toString(36).substring(2, 11),
      coupleId: couple.id,
      title: `${seeker.name}'s Birthday 🎂`,
      date: seeker.birthday,
      category: 'birthday',
      createdBy: 'system'
    };
    db.calendarEvents.push(e2);
    addedEvents.push(e2);
  }

  if (couple.anniversaryDate) {
    const e3: CalendarEvent = {
      id: 'cal_' + Math.random().toString(36).substring(2, 11),
      coupleId: couple.id,
      title: `Our Love Anniversary 💞`,
      date: couple.anniversaryDate,
      category: 'anniversary',
      createdBy: 'system'
    };
    db.calendarEvents.push(e3);
    addedEvents.push(e3);
  }

  saveDB();

  try {
    const promises: Promise<any>[] = [
      addRecord('couples', couple),
      addRecord('users', seeker)
    ];
    for (const val of addedEvents) {
      promises.push(addRecord('calendarEvents', val));
    }
    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to sync join relationship to Firestore:', err);
  }

  // Notify the partner over websocket that they are now linked!
  sendToUser(couple.partner1Id, { type: 'state:update', section: 'profile' });

  res.json({
    success: true,
    couple,
    hydratedUser: hydrateUser(userId)
  });
});

// Update Anniversary Date
app.post('/api/couple/update-anniversary', async (req, res) => {
  const { coupleId, userId, anniversaryDate } = req.body;
  const couple = db.couples.find(c => c.id === coupleId);
  if (!couple) return res.status(404).json({ error: 'Couple not found.' });

  couple.anniversaryDate = anniversaryDate;

  // Clean old system anniversary dates and insert updated one
  const newAnniversaryEvent: CalendarEvent = {
    id: 'cal_' + Math.random().toString(36).substring(2, 11),
    coupleId: coupleId,
    title: `Our Love Anniversary 💞`,
    date: anniversaryDate,
    category: 'anniversary',
    createdBy: 'system'
  };

  db.calendarEvents = db.calendarEvents.filter(e => !(e.coupleId === coupleId && e.category === 'anniversary' && e.createdBy === 'system'));
  db.calendarEvents.push(newAnniversaryEvent);

  saveDB();

  try {
    await Promise.all([
      addRecord('couples', couple),
      addRecord('calendarEvents', newAnniversaryEvent)
    ]);
  } catch (err) {
    console.error('Failed to sync update-anniversary to Firestore:', err);
  }

  // Notify other partner
  const opponent = getPartnerId(userId);
  if (opponent) {
    sendToUser(opponent, { type: 'state:update', section: 'calendar' });
    sendToUser(opponent, { type: 'state:update', section: 'profile' });
  }

  res.json({ success: true, couple, hydratedUser: hydrateUser(userId) });
});

// Update User profile (location, check-in mood, love language, love timer customization, appTheme)
app.post('/api/couple/update-profile', async (req, res) => {
  const { userId, locationCity, locationTimezone, locationWeather, checkInMood, checkInLoveLanguage, customLoveCounterTitle, appTheme } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required.' });

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (locationCity !== undefined) user.locationCity = locationCity;
  if (locationTimezone !== undefined) user.locationTimezone = locationTimezone;
  if (locationWeather !== undefined) user.locationWeather = locationWeather;
  if (checkInMood !== undefined) user.checkInMood = checkInMood;
  if (checkInLoveLanguage !== undefined) user.checkInLoveLanguage = checkInLoveLanguage;
  if (customLoveCounterTitle !== undefined) user.customLoveCounterTitle = customLoveCounterTitle;
  if (appTheme !== undefined) user.appTheme = appTheme;

  saveDB();

  try {
    await updateRecord('users', user);
  } catch (err) {
    console.error('Failed to update user profile in Firestore:', err);
  }

  // Notify partner over websocket
  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'profile' });
  }

  res.json({ success: true, hydratedUser: hydrateUser(userId) });
});

// Update Couple Settings (chatBackground)
app.post('/api/couple/update-settings', async (req, res) => {
  const { coupleId, userId, chatBackground } = req.body;
  if (!coupleId || !userId) return res.status(400).json({ error: 'coupleId and userId required.' });

  const couple = db.couples.find(c => c.id === coupleId);
  if (!couple) return res.status(404).json({ error: 'Couple not found.' });

  if (chatBackground !== undefined) couple.chatBackground = chatBackground;

  saveDB();

  try {
    await updateRecord('couples', couple);
  } catch (err) {
    console.error('Failed to update couple settings in Firestore:', err);
  }

  // Notify partner over websocket
  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'profile' });
  }

  res.json({ success: true, couple, hydratedUser: hydrateUser(userId) });
});

// Locked Letters: List for Couple
app.get('/api/couple/locked-letters', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  const filtered = (db.lockedLetters || [])
    .filter(l => l.coupleId === coupleId)
    .sort((a, b) => b.timestamp - a.timestamp);

  res.json(filtered);
});

// Locked Letters: Write a Locked letter
app.post('/api/couple/locked-letters', async (req, res) => {
  const { coupleId, senderId, senderName, title, contentEncrypted, iv, unlockDate } = req.body;
  
  if (!coupleId || !senderId || !title || !contentEncrypted || !iv || !unlockDate) {
    return res.status(400).json({ error: 'Missing locked letter fields.' });
  }

  const newLetter: LockedLetter = {
    id: 'let_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    senderId,
    senderName,
    title,
    contentEncrypted,
    iv,
    unlockDate,
    isOpened: false,
    timestamp: Date.now()
  };

  if (!db.lockedLetters) db.lockedLetters = [];
  db.lockedLetters.push(newLetter);
  saveDB();

  try {
    await addRecord('lockedLetters', newLetter);
  } catch (err) {
    console.error('Failed to save locked letter in Firestore:', err);
  }

  // Alert partner
  const partnerId = getPartnerId(senderId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'locked-letters' });
  }

  res.json({ success: true, letter: newLetter });
});

// Locked Letters: Open locked letter
app.post('/api/couple/locked-letters/open', async (req, res) => {
  const { letterId, userId } = req.body;
  if (!letterId) return res.status(400).json({ error: 'letterId is required.' });

  if (!db.lockedLetters) db.lockedLetters = [];
  const letter = db.lockedLetters.find(l => l.id === letterId);
  if (!letter) return res.status(404).json({ error: 'Letter not found.' });

  // Mark open
  letter.isOpened = true;
  saveDB();

  try {
    await updateRecord('lockedLetters', letter);
  } catch (err) {
    console.error('Failed to sync opened letter to Firestore:', err);
  }

  // Notify partner
  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'locked-letters' });
  }

  res.json({ success: true, letter });
});

// 5. Messages: Query for Couple
app.get('/api/messages', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId is required.' });

  const filtered = db.messages
    .filter(m => m.coupleId === coupleId)
    .sort((a, b) => a.timestamp - b.timestamp);

  res.json(filtered);
});

// 6. Memories Wall: Read/Write
app.get('/api/memories', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  const filtered = db.memories
    .filter(m => m.coupleId === coupleId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  res.json(filtered);
});

app.post('/api/memories2', (req, res) => {
  // Simple check for memory additions
  res.json({ message: 'Memory created' });
});

app.post('/api/memories', async (req, res) => {
  const { coupleId, userId, date, caption, imageBase64, location } = req.body;
  if (!coupleId || !userId || !date || !caption || !imageBase64) {
    return res.status(400).json({ error: 'Missing memory details.' });
  }

  const memory: Memory = {
    id: 'mem_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    userId,
    date,
    caption,
    imageBase64,
    location: location || ''
  };

  db.memories.push(memory);
  saveDB();

  try {
    await addRecord('memories', memory);
  } catch (err) {
    console.error('Failed to sync memory to Firestore:', err);
  }

  // Socket notification
  const opponent = getPartnerId(userId);
  if (opponent) {
    sendToUser(opponent, { type: 'state:update', section: 'memories' });
  }

  res.status(201).json(memory);
});

// 7. Love Calendar Check/Add
app.get('/api/calendar', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  const events = db.calendarEvents.filter(e => e.coupleId === coupleId);
  res.json(events);
});

app.post('/api/calendar', async (req, res) => {
  const { coupleId, userId, title, date, category, description } = req.body;
  if (!coupleId || !title || !date || !category) {
    return res.status(400).json({ error: 'Missing details.' });
  }

  const event: CalendarEvent = {
    id: 'cal_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    title,
    date,
    category,
    description: description || '',
    createdBy: userId
  };

  db.calendarEvents.push(event);
  saveDB();

  try {
    await addRecord('calendarEvents', event);
  } catch (err) {
    console.error('Failed to sync calendarEvent to Firestore:', err);
  }

  const opponent = getPartnerId(userId);
  if (opponent) {
    sendToUser(opponent, { type: 'state:update', section: 'calendar' });
  }

  res.status(201).json(event);
});

// 8. Daily Questions
app.get('/api/daily-question', (req, res) => {
  // Distribute daily question cyclically based on calendar day index
  const dayIndex = new Date().getDate() % dailyQuestions.length;
  const question = dailyQuestions[dayIndex];
  res.json(question);
});

app.get('/api/daily-answers', (req, res) => {
  const { coupleId, questionId } = req.query;
  if (!coupleId || !questionId) return res.status(400).json({ error: 'Required params missing.' });

  const answers = db.dailyAnswers.filter(a => a.coupleId === coupleId && a.questionId === questionId);
  res.json(answers);
});

app.post('/api/daily-answers', async (req, res) => {
  const { coupleId, questionId, userId, answerText } = req.body;
  if (!coupleId || !questionId || !userId || !answerText) {
    return res.status(400).json({ error: 'Required parameters missing.' });
  }

  // Remove existing answer for this question by the same client to avoid dupes
  db.dailyAnswers = db.dailyAnswers.filter(
    a => !(a.coupleId === coupleId && a.questionId === questionId && a.userId === userId)
  );

  const answer: DailyAnswer = {
    id: 'ans_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    questionId,
    userId,
    answerText,
    timestamp: Date.now()
  };

  db.dailyAnswers.push(answer);
  saveDB();

  try {
    await addRecord('dailyAnswers', answer);
  } catch (err) {
    console.error('Failed to sync dailyAnswer to Firestore:', err);
  }

  const opponent = getPartnerId(userId);
  if (opponent) {
    sendToUser(opponent, { type: 'state:update', section: 'daily' });
  }

  res.status(201).json(answer);
});

// 9. Couple Shared Journal (Diary)
app.get('/api/journal', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  const entries = db.journalEntries
    .filter(j => j.coupleId === coupleId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first

  res.json(entries);
});

app.post('/api/journal', async (req, res) => {
  const { coupleId, userId, title, content, date, imageBase64, mood } = req.body;
  if (!coupleId || !userId || !title || !content || !date) {
    return res.status(400).json({ error: 'Missing entry details.' });
  }

  const entry: JournalEntry = {
    id: 'jrn_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    userId,
    title,
    content,
    date,
    imageBase64: imageBase64 || '',
    mood: mood || ''
  };

  db.journalEntries.push(entry);
  saveDB();

  try {
    await addRecord('journalEntries', entry);
  } catch (err) {
    console.error('Failed to sync journal entry to Firestore:', err);
  }

  const opponent = getPartnerId(userId);
  if (opponent) {
    sendToUser(opponent, { type: 'state:update', section: 'journal' });
  }

  res.status(201).json(entry);
});

// 10. Couple Relationship Statistics
app.get('/api/stats', (req, res) => {
  const { coupleId} = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  const messagesCount = db.messages.filter(m => m.coupleId === coupleId).length;
  const memoriesCount = db.memories.filter(m => m.coupleId === coupleId).length;
  const journalCount = db.journalEntries.filter(j => j.coupleId === coupleId).length;
  const answerCount = db.dailyAnswers.filter(a => a.coupleId === coupleId).length;

  res.json({
    messagesCount,
    memoriesCount,
    journalCount,
    answerCount
  });
});

// 10.5. Shared Bucket List (Love Checklist)
app.get('/api/bucket-list', async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required.' });

  db.bucketList = db.bucketList || [];
  let list = db.bucketList.filter(b => b.coupleId === coupleId);

  // If new couple has no items yet, seed nice starter suggestions
  if (list.length === 0) {
    const starters: BucketItem[] = [
      {
        id: 'b_s1',
        coupleId: coupleId as string,
        title: '📸 Take a silly screenshot laughing on a video call',
        category: 'adventure',
        completed: false,
        createdBy: 'system',
        suggested: true
      },
      {
        id: 'b_s2',
        coupleId: coupleId as string,
        title: '🌌 Stargaze together during a late night call',
        category: 'cozy',
        completed: false,
        createdBy: 'system',
        suggested: true
      },
      {
        id: 'b_s3',
        coupleId: coupleId as string,
        title: '🍜 Cook the exact same meal and dine together over video',
        category: 'food',
        completed: false,
        createdBy: 'system',
        suggested: true
      },
      {
        id: 'b_s4',
        coupleId: coupleId as string,
        title: '✈️ Plan our entire next physical reunion trip itinerary',
        category: 'travel',
        completed: false,
        createdBy: 'system',
        suggested: true
      }
    ];
    db.bucketList.push(...starters);
    saveDB();

    try {
      await Promise.all(starters.map(s => addRecord('bucketItems', s)));
    } catch (err) {
      console.error('Failed to seed starter bucketItems onto Firestore:', err);
    }

    list = starters;
  }

  res.json(list);
});

app.post('/api/bucket-list', async (req, res) => {
  const { coupleId, title, category, createdBy } = req.body;
  if (!coupleId || !title || !category || !createdBy) {
    return res.status(400).json({ error: 'Missing bucket item params.' });
  }

  db.bucketList = db.bucketList || [];
  const newItem: BucketItem = {
    id: 'b_' + Math.random().toString(36).substring(2, 9),
    coupleId,
    title: title.trim(),
    category,
    completed: false,
    createdBy
  };

  db.bucketList.push(newItem);
  saveDB();

  try {
    await addRecord('bucketItems', newItem);
  } catch (err) {
    console.error('Failed to sync bucket item to Firestore:', err);
  }

  const partnerId = getPartnerId(createdBy);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'bucket' });
  }

  res.status(201).json(newItem);
});

app.post('/api/bucket-list/toggle', async (req, res) => {
  const { id, userId } = req.body;
  if (!id || !userId) {
    return res.status(400).json({ error: 'id and userId required.' });
  }

  db.bucketList = db.bucketList || [];
  const item = db.bucketList.find(b => b.id === id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  item.completed = !item.completed;
  item.completedDate = item.completed ? new Date().toISOString().split('T')[0] : undefined;
  saveDB();

  try {
    await updateRecord('bucketItems', item);
  } catch (err) {
    console.error('Failed to sync bucket toggling to Firestore:', err);
  }

  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'bucket' });
  }

  res.json(item);
});

app.post('/api/bucket-list/delete', async (req, res) => {
  const { id, userId } = req.body;
  if (!id || !userId) {
    return res.status(400).json({ error: 'id and userId required.' });
  }

  db.bucketList = db.bucketList || [];
  db.bucketList = db.bucketList.filter(b => b.id !== id);
  saveDB();

  try {
    await deleteRecord('bucketItems', id);
  } catch (err) {
    console.error('Failed to delete bucket item from Firestore:', err);
  }

  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'bucket' });
  }

  res.json({ success: true });
});

// Helper: Clean movies older than 24 hours
function cleanExpiredMovies() {
  const MOVIES_DIR = path.join(process.cwd(), 'data/movies');
  if (!fs.existsSync(MOVIES_DIR)) return;
  
  const now = Date.now();
  const activeMovies: any[] = [];
  const expiredMovies: any[] = [];
  
  db.movies = db.movies || [];
  db.movies.forEach((movie: any) => {
    const age = now - movie.uploadedAt;
    if (age > 24 * 60 * 60 * 1000) {
      expiredMovies.push(movie);
    } else {
      activeMovies.push(movie);
    }
  });

  expiredMovies.forEach((movie: any) => {
    const filename = path.basename(movie.url);
    const filePath = path.join(MOVIES_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Auto-Deleted expired 24h movie: ${filename}`);
      } catch (err) {
        console.error(`Failed to delete expired movie file: ${filePath}`, err);
      }
    }
  });

  db.movies = activeMovies;
  saveDB();
}

// 11. Movie Room List & Clean Up
app.get('/api/movies', (req, res) => {
  cleanExpiredMovies();
  res.json(db.movies || []);
});

app.get('/api/movies/history', (req, res) => {
  res.json(db.moviesHistory || []);
});

app.post('/api/movies/history', async (req, res) => {
  const { title, coupleId } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  db.moviesHistory = db.moviesHistory || [];
  const record = {
    id: 'h_' + Math.random().toString(36).substring(2, 9),
    title,
    watchedAt: Date.now(),
    coupleId: coupleId || ''
  };
  db.moviesHistory.push(record);
  saveDB();

  try {
    await addRecord('moviesHistory', record);
  } catch (err) {
    console.error('Failed to sync movie history to Firestore:', err);
  }

  res.status(201).json(record);
});

// Large file pipe endpoint for uploading movie streams (lasts up to 24 hours only)
app.post('/api/movies/upload', (req, res) => {
  const filename = req.headers['x-filename'] as string || 'movie.mp4';
  const fileExt = path.extname(filename).toLowerCase();
  
  if (!['.mp4', '.webm', '.mov', '.mkv'].includes(fileExt)) {
    return res.status(400).json({ error: 'Only MP4, WEBM, MOV or MKV movies are permitted.' });
  }

  const MOVIES_DIR = path.join(process.cwd(), 'data/movies');
  if (!fs.existsSync(MOVIES_DIR)) {
    fs.mkdirSync(MOVIES_DIR, { recursive: true });
  }

  const uniqueName = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;
  const targetPath = path.join(MOVIES_DIR, uniqueName);

  const writeStream = fs.createWriteStream(targetPath);
  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    const movieUrl = `/uploads/movies/${uniqueName}`;
    const newMovie = {
      id: 'mov_' + Math.random().toString(36).substring(2, 9),
      filename: filename,
      url: movieUrl,
      uploadedAt: Date.now()
    };

    const historyRecord = {
      id: 'h_' + Math.random().toString(36).substring(2, 9),
      title: filename,
      watchedAt: Date.now(),
      coupleId: ''
    };

    db.movies = db.movies || [];
    db.movies.push(newMovie);
    
    // Auto insert into watched history as well
    db.moviesHistory = db.moviesHistory || [];
    db.moviesHistory.push(historyRecord);

    saveDB();

    try {
      await Promise.all([
        addRecord('movies', newMovie),
        addRecord('moviesHistory', historyRecord)
      ]);
    } catch (err) {
      console.error('Failed to sync newly uploaded movie metadata to Firestore:', err);
    }

    res.json(newMovie);
  });

  writeStream.on('error', (err) => {
    console.error('Movie upload pipe failed:', err);
    res.status(500).json({ error: 'Failed writing file to disk storage.' });
  });
});

// Mount Static directory for movie room uploads
app.use('/uploads/movies', express.static(path.join(process.cwd(), 'data/movies')));

// Mount Static directory for HD audio uploads
app.use('/uploads/audio', express.static(path.join(process.cwd(), 'data/audio')));

app.post('/api/audio/upload', (req, res) => {
  const rawFilename = req.headers['x-filename'] as string || 'audio.mp3';
  const filename = decodeURIComponent(rawFilename);
  const fileExt = path.extname(filename).toLowerCase();
  
  if (!['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'].includes(fileExt)) {
    return res.status(400).json({ error: 'Only MP3, WAV, M4A, AAC, OGG or WEBM audio formats are permitted.' });
  }

  const AUDIO_DIR = path.join(process.cwd(), 'data/audio');
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const uniqueName = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;
  const targetPath = path.join(AUDIO_DIR, uniqueName);

  const writeStream = fs.createWriteStream(targetPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    const audioUrl = `/uploads/audio/${uniqueName}`;
    res.json({ url: audioUrl, filename: filename });
  });

  writeStream.on('error', (err) => {
    console.error('Audio upload failed:', err);
    res.status(500).json({ error: 'Audio upload failed' });
  });
});

// -------------------------------------------------------------
// PREMIUM MUTU LDR SERVICE ROADMAP ENDPOINTS
// -------------------------------------------------------------

import { GoogleGenAI } from '@google/genai';

// Safe, lazy initialization of Gemini API SDK
let aiInstance: GoogleGenAI | null = null;
function getGeminiAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment secrets.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

// Helper: Securely log login/activity history and update daily streak
async function updateStreakAndActivity(userId: string, req: express.Request) {
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  try {
    // 1. IP and Device security logging
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
    const deviceAgent = req.headers['user-agent'] || 'Unknown Device';
    const newLog: SecurityLog = {
      id: 'sec_' + Math.random().toString(36).substring(2, 11),
      userId,
      eventType: 'login',
      ipAddress,
      deviceAgent,
      timestamp: Date.now()
    };
    if (!db.securityLogs) db.securityLogs = [];
    db.securityLogs.push(newLog);
    addRecord('securityLogs', newLog).catch(e => console.error('Failed to save security log:', e));

    // 2. Continuous Streak Calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const lastActive = user.lastActiveDate;

    user.streakCurrent = user.streakCurrent || 0;
    user.streakMax = user.streakMax || 0;

    if (!lastActive) {
      user.streakCurrent = 1;
      user.streakMax = Math.max(user.streakMax, 1);
    } else {
      const last = new Date(lastActive);
      const today = new Date(todayStr);
      const diffTime = today.getTime() - last.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.streakCurrent += 1;
        user.streakMax = Math.max(user.streakMax, user.streakCurrent);
      } else if (diffDays > 1) {
        user.streakCurrent = 1; // reset broke streak
      }
    }

    user.lastActiveDate = todayStr;
    await updateRecord('users', user);
    
    // 3. Compile timeline check automatically
    if (user.coupleId) {
      await runTimelineEngine(user.coupleId);
    }
  } catch (err) {
    console.error('Failed processing streak updates:', err);
  }
}

// Relationship Timeline automated generator
async function runTimelineEngine(coupleId: string | undefined): Promise<TimelineEvent[]> {
  if (!coupleId) return [];
  if (!db.timelineEvents) db.timelineEvents = [];

  const couple = db.couples.find(c => c.id === coupleId);
  if (!couple) return [];

  const existingTimeline = db.timelineEvents.filter(t => t.coupleId === coupleId);
  const createdEvents: TimelineEvent[] = [];

  const createEvent = async (
    type: string,
    category: 'anniversary' | 'firsts' | 'trip' | 'chat' | 'gift' | 'custom',
    title: string,
    desc: string,
    date: string
  ) => {
    const isDup = existingTimeline.some(t => t.milestoneType === type);
    if (isDup) return;

    const newEv: TimelineEvent = {
      id: 'time_' + Math.random().toString(36).substring(2, 11),
      coupleId,
      milestoneType: type,
      category,
      title,
      description: desc,
      date,
      timestamp: new Date(date).getTime() || Date.now()
    };
    db.timelineEvents!.push(newEv);
    createdEvents.push(newEv);
    await addRecord('timelineEvents', newEv).catch(e => console.error('Failed to save timeline:', e));
  };

  // 1. Anniversary Date
  if (couple.anniversaryDate) {
    await createEvent(
      'first_anniversary',
      'anniversary',
      'The Start of Forever 💞',
      'The beautiful day your long-distance hearts officially intertwined!',
      couple.anniversaryDate
    );
  }

  // 2. First Message (oldest message)
  const coupleMsgs = db.messages.filter(m => m.coupleId === coupleId).sort((a,b) => a.timestamp - b.timestamp);
  if (coupleMsgs.length > 0) {
    const dStr = new Date(coupleMsgs[0].timestamp).toISOString().split('T')[0];
    await createEvent(
      'first_message',
      'chat',
      'First Transmitted Connection 💬',
      'You registered on MuTu and exchanged your very first whispers!',
      dStr
    );
  }

  // 3. First Vault Letter
  const coupleLetters = (db.lockedLetters || []).filter(l => l.coupleId === coupleId).sort((a,b) => a.timestamp - b.timestamp);
  if (coupleLetters.length > 0) {
    const dStr = new Date(coupleLetters[0].timestamp).toISOString().split('T')[0];
    await createEvent(
      'first_letter',
      'gift',
      'First Time Capsule Vault Locked 🔐',
      'You locked your first encrypted letter, building beautiful anticipation.',
      dStr
    );
  }

  // 4. First Memory
  const coupleMems = db.memories.filter(m => m.coupleId === coupleId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (coupleMems.length > 0) {
    await createEvent(
      'first_memory',
      'firsts',
      'First Polaroid Hung 📸',
      `You uploaded your first physical memory: "${coupleMems[0].caption}"!`,
      coupleMems[0].date
    );
  }

  // 5. First Movie
  const coupleMovies = (db.moviesHistory || []).filter(h => h.coupleId === coupleId).sort((a,b) => a.watchedAt - b.watchedAt);
  if (coupleMovies.length > 0) {
    const dStr = new Date(coupleMovies[0].watchedAt).toISOString().split('T')[0];
    await createEvent(
      'first_movie',
      'firsts',
      'First Theater Sync Night 🍿',
      `You pressed play together and synced: "${coupleMovies[0].title}"!`,
      dStr
    );
  }

  // 6. First Bucket Completions
  const completedBucket = (db.bucketList || []).filter(item => item.coupleId === coupleId && item.completed && item.completedDate).sort((a,b) => String(a.completedDate).localeCompare(String(b.completedDate)));
  if (completedBucket.length > 0 && completedBucket[0].completedDate) {
    await createEvent(
      'first_bucket_item',
      'trip',
      'First Shared Adventure Achieved 🏆',
      `You crossed off your first intimate list goal: "${completedBucket[0].title}"!`,
      completedBucket[0].completedDate
    );
  }

  // 7. First Voice Note (E2E Message decorated with isVoice)
  const coupleVoices = db.messages.filter(m => m.coupleId === coupleId && m.isVoice).sort((a,b) => a.timestamp - b.timestamp);
  if (coupleVoices.length > 0) {
    const dStr = new Date(coupleVoices[0].timestamp).toISOString().split('T')[0];
    await createEvent(
      'first_voice_note',
      'chat',
      'First Whisper Captured 🎙️',
      'You recorded and sent your very first encrypted voice letter to each other!',
      dStr
    );
  }

  // 8. First Journal
  db.journalEntries = db.journalEntries || [];
  const coupleJournals = db.journalEntries.filter(j => j.coupleId === coupleId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (coupleJournals.length > 0) {
    await createEvent(
      'first_journal',
      'firsts',
      'First Private Diary Penned 📖',
      `You co-authored your very first beautiful private journal page: "${coupleJournals[0].title}"!`,
      coupleJournals[0].date
    );
  }

  // 9. First Voice Call
  db.callLogs = db.callLogs || [];
  const voiceCalls = db.callLogs.filter(c => c.coupleId === coupleId && c.type === 'voice').sort((a,b) => a.timestamp - b.timestamp);
  if (voiceCalls.length > 0) {
    const dStr = new Date(voiceCalls[0].timestamp).toISOString().split('T')[0];
    await createEvent(
      'first_call_voice',
      'chat',
      'First Real-Time Voice Connection 📞',
      'You heard each other across the miles with your first real-time MuTu call!',
      dStr
    );
  }

  // 10. First Video Call
  const videoCalls = db.callLogs.filter(c => c.coupleId === coupleId && c.type === 'video').sort((a,b) => a.timestamp - b.timestamp);
  if (videoCalls.length > 0) {
    const dStr = new Date(videoCalls[0].timestamp).toISOString().split('T')[0];
    await createEvent(
      'first_call_video',
      'chat',
      'First Live Face-to-Face Encounter 📹',
      'You looked into each other’s eyes with your first immersive video call!',
      dStr
    );
  }

  if (createdEvents.length > 0) {
    const partnerId = getPartnerId(couple.partner1Id);
    if (couple.partner1Id) sendToUser(couple.partner1Id, { type: 'state:update', section: 'timeline' });
    if (partnerId) sendToUser(partnerId, { type: 'state:update', section: 'timeline' });
  }

  return db.timelineEvents.filter(t => t.coupleId === coupleId);
}

// -------------------------------------------------------------
// REST ENDPOINTS IMPLEMENTATION
// -------------------------------------------------------------

// Presence Updates
app.post('/api/user/presence', async (req, res) => {
  const { userId, presenceStatus, isSleeping } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.currentPresenceStatus = presenceStatus;
  if (isSleeping) {
    user.lastSleepTime = new Date().toISOString();
  }

  saveDB();
  try {
    await updateRecord('users', user);
  } catch (err) {
    console.error('Failed to sync presence status:', err);
  }

  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'profile' });
  }

  res.json({ success: true, hydratedUser: hydrateUser(userId) });
});

// Heartbeat indicator
app.post('/api/user/heartbeat', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.lastHeartbeat = Date.now();
  saveDB();

  try {
    await updateRecord('users', user);
  } catch (err) {}

  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'profile' });
  }

  res.json({ success: true });
});

// Fetch Timeline
app.get('/api/couple/timeline', async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  const list = await runTimelineEngine(coupleId as string);
  res.json(list.sort((a,b) => b.timestamp - a.timestamp));
});

// Custom timeline entry
app.post('/api/couple/timeline', async (req, res) => {
  const { coupleId, milestoneType, title, description, date } = req.body;
  if (!coupleId || !title || !date) {
    return res.status(400).json({ error: 'Missing milestone parameters' });
  }

  db.timelineEvents = db.timelineEvents || [];
  const newEv: TimelineEvent = {
    id: 'time_cust_' + Math.random().toString(36).substring(2, 11),
    coupleId,
    milestoneType: milestoneType || 'first_visit',
    title,
    description: description || 'A beautiful customized memory milestone added together!',
    date,
    timestamp: new Date(date).getTime()
  };

  db.timelineEvents.push(newEv);
  saveDB();

  try {
    await addRecord('timelineEvents', newEv);
  } catch (err) {
    console.error(err);
  }

  const partnerId = getPartnerId(coupleId as string);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'timeline' });
  }

  res.status(201).json(newEv);
});

// Get decorations - automatically seed standard items if none exist
app.get('/api/couple/decorations', async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  db.decorations = db.decorations || [];
  let coupleDecs = db.decorations.filter(d => d.coupleId === coupleId);

  if (coupleDecs.length === 0) {
    const starters: HomeDecoration[] = [
      {
        id: 'dec_s1',
        coupleId: coupleId as string,
        room: 'living_room',
        name: 'Cozy Dream Couch 🛋️',
        type: 'couch',
        placedAt: new Date().toISOString().split('T')[0],
        isSystemUnlocked: true
      },
      {
        id: 'dec_s2',
        coupleId: coupleId as string,
        room: 'bedroom',
        name: 'Anniversary Flower Vase 🌸',
        type: 'plant',
        placedAt: new Date().toISOString().split('T')[0],
        isSystemUnlocked: true
      }
    ];
    db.decorations.push(...starters);
    saveDB();
    try {
      await Promise.all(starters.map(s => addRecord('homeDecorations', s)));
    } catch (err) {}
    coupleDecs = starters;
  }

  res.json(coupleDecs);
});

// Place decoration
app.post('/api/couple/decorations/place', async (req, res) => {
  const { id, room, placedAt } = req.body;
  db.decorations = db.decorations || [];
  const dec = db.decorations.find(d => d.id === id);
  if (!dec) return res.status(404).json({ error: 'Decoration not found' });

  dec.room = room;
  dec.placedAt = placedAt || new Date().toISOString().split('T')[0];
  saveDB();

  try {
    await updateRecord('homeDecorations', dec);
  } catch (err) {}

  res.json(dec);
});

// Unlock decoration
app.post('/api/couple/decorations/unlock', async (req, res) => {
  const { coupleId, name, room, type } = req.body;
  if (!coupleId || !name || !room) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  db.decorations = db.decorations || [];
  const count = db.decorations.filter(d => d.coupleId === coupleId && d.name === name).length;
  if (count > 0) {
    return res.status(400).json({ error: 'You already unlocked this gorgeous item!' });
  }

  const dec: HomeDecoration = {
    id: 'dec_' + Math.random().toString(36).substring(2, 9),
    coupleId,
    room,
    name,
    type,
    placedAt: new Date().toISOString().split('T')[0],
    isSystemUnlocked: true
  };

  db.decorations.push(dec);
  saveDB();

  try {
    await addRecord('homeDecorations', dec);
  } catch (err) {}

  res.status(201).json(dec);
});

app.get('/api/couple/call-logs', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
  db.callLogs = db.callLogs || [];
  const logs = db.callLogs.filter(c => c.coupleId === coupleId);
  res.json(logs);
});

// GET Shared music space
app.get('/api/couple/music', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  db.sharedTracks = db.sharedTracks || [];
  let tracks = db.sharedTracks.filter(t => t.coupleId === coupleId);

  if (tracks.length === 0) {
    // Seed some lovely romantic starters
    const starters = [
      { id: 'mus_1', coupleId, title: 'Warm Bedtime Lullaby Duet', artist: 'MuTu Ambient', url: 'lullaby', addedBy: 'system' },
      { id: 'mus_2', coupleId, title: 'Late Night Rain & Stargaze', artist: 'Cosmic Rain', url: 'rain', addedBy: 'system' }
    ];
    db.sharedTracks.push(...starters);
    tracks = starters;
  }

  res.json(tracks);
});

app.post('/api/couple/music/add', async (req, res) => {
  const { coupleId, title, artist, url, addedBy } = req.body;
  if (!coupleId || !title || !url) {
    return res.status(400).json({ error: 'Missing track parameters' });
  }

  db.sharedTracks = db.sharedTracks || [];
  const track = {
    id: 'mus_' + Math.random().toString(36).substring(2, 9),
    coupleId,
    title,
    artist: artist || 'Unknown Lover',
    url,
    addedBy
  };

  db.sharedTracks.push(track);
  saveDB();

  try {
    await addRecord('sharedTracks', track);
  } catch (err) {}

  const partnerId = getPartnerId(addedBy);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'music' });
  }

  res.status(201).json(track);
});

app.post('/api/couple/music/delete', async (req, res) => {
  const { id, userId } = req.body;
  db.sharedTracks = db.sharedTracks || [];
  db.sharedTracks = db.sharedTracks.filter(t => t.id !== id);
  saveDB();

  try {
    await deleteRecord('sharedTracks', id);
  } catch (e) {}

  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, { type: 'state:update', section: 'music' });
  }

  res.json({ success: true });
});

// Dynamic AI Love Assistant Ideas Endpoint
app.post('/api/gemini/ideas', async (req, res) => {
  const { prompt, mood, userId } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  try {
    const ai = getGeminiAI();
    const systemPrompt = `You are a warm, sweet, romantic AI Love Assistant for a long-distance relationship app called MuTu.
    The user is feeling a ${mood || 'romantic'} mood today.
    The user's query or draft request is: "${prompt}".

    Please reply with highly creative, caring, and actionable romantic advice, suggestions, or drafts as requested.
    Present your suggestions in direct, clear, beautifully formatted markdown. Keep the response compact and incredibly heartwarming.
    Do NOT include any container ports, telemetry stats, mock console lines, or metadata. Be direct, sweet, and highly supportive!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt
    });

    res.json({ ideas: response.text });
  } catch (err) {
    console.error('AI Love Ideas generator failure:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to consult dynamic love ideas.', ideas: 'The companion had a tiny error dreaming that up. Please retry!' });
  }
});

// Dynamic AI Love Assistant
app.post('/api/gemini/love-assistant', async (req, res) => {
  const { category, promptText } = req.body;
  try {
    const ai = getGeminiAI();
    let promptPrefix = '';

    switch (category) {
      case 'date_night':
        promptPrefix = 'Suggest 3 unique, charming, LDR-friendly date night ideas that couples can do together online (e.g. streaming, shared games, co-cooking). Keep the ideas practical but incredibly intimate, cozy, and heartfelt. ';
        break;
      case 'conversations':
        promptPrefix = 'Generate 3 deep, interesting conversational prompts to help long-distance couples understand each other more intimately and spark warm discussions. ';
        break;
      case 'ldr_games':
        promptPrefix = 'Suggest 3 fun, lighthearted digital games, quizzes, or interactive activities designed specifically to keep LDR couples laughing and feeling present with each other. ';
        break;
      case 'reminders':
        promptPrefix = 'Suggest 3 sweet surprise gestures, online gifts, care Package ideas, or cute reminder messages a lover can send to make their partner feel incredibly special today. ';
        break;
      default:
        promptPrefix = 'Provide warm, encouraging advice and customized coaching ideas for a long-distance couple dealing with distance. ';
    }

    const fullPrompt = `${promptPrefix} ${promptText ? `Additional customization from user: "${promptText}".` : ''} Please present suggestions in a concise, beautifully formatted markdown list. Keep the tone completely human, supportive, and romantic yet down-to-earth. Do NOT use fake telemetry, technical meta, or flowery marketing speak.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: fullPrompt
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error('AI Love Assistant failure:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate companion insights.' });
  }
});

// Relationship Health AI (insights counselor based on activity stats!)
app.post('/api/gemini/relationship-health', async (req, res) => {
  const { coupleId: bodyCoupleId, userId } = req.body || {};
  let coupleId = bodyCoupleId;
  if (!coupleId && userId) {
    const user = db.users.find(u => u.id === userId);
    if (user) coupleId = user.coupleId;
  }
  if (!coupleId) {
    return res.status(400).json({ error: 'coupleId or userId required' });
  }

  try {
    // 1. Gather live statistics
    const messagesCount = db.messages.filter(m => m.coupleId === coupleId).length;
    const memoriesCount = db.memories.filter(m => m.coupleId === coupleId).length;
    const journalCount = db.journalEntries.filter(j => j.coupleId === coupleId).length;
    const answerCount = db.dailyAnswers.filter(a => a.coupleId === coupleId).length;
    const bucketCount = (db.bucketList || []).filter(b => b.coupleId === coupleId && b.completed).length;

    const systemPrompt = `You are an empathetic, world-class relationship mentor specializing in supporting long-distance couples.
    Based on the following active relationship metrics, write a supportive LDR status assessment report:
    - Messages typed is: ${messagesCount} messages
    - Polaroids uploaded to Memory Wall is: ${memoriesCount} memories
    - Diaries written in Shared Journal: ${journalCount} entries
    - Daily Questions replied: ${answerCount} answers
    - Shared Bucket List completed: ${bucketCount} items

    Please structure your reply in a cozy, beautiful markdown design containing:
    1. **Love Connection Assessment**: A balanced, warm interpretation of these figures (e.g., highlighting great consistency in blogging or chatting, or gently noting if they haven't uploaded a memory in a while). Cite percentage estimates or funny metaphors to make the stats feel human.
    2. **Customized LDR Action Plan**: Provide 2 physical reunion planning or online co-active ideas to enrich their connection further.
    3. **A Heartfelt Reminder**: A supportive, encouraging signoff reminder of why distance is only a test of strength that makes connections deeper.

    Do NOT include any container, port, telemetry, or backend logging lines. Keep the tone completely authentic, supportive, and human-crafted!`;

    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt
    });

    res.json({ result: response.text, report: response.text });
  } catch (err) {
    console.error('Relationship Health AI failure:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to consult relationship health API.' });
  }
});

app.get('/api/gemini/relationship-health', async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    // 1. Gather live statistics
    const messagesCount = db.messages.filter(m => m.coupleId === coupleId).length;
    const memoriesCount = db.memories.filter(m => m.coupleId === coupleId).length;
    const journalCount = db.journalEntries.filter(j => j.coupleId === coupleId).length;
    const answerCount = db.dailyAnswers.filter(a => a.coupleId === coupleId).length;
    const bucketCount = (db.bucketList || []).filter(b => b.coupleId === coupleId && b.completed).length;

    const systemPrompt = `You are an empathetic, world-class relationship mentor specializing in supporting long-distance couples.
    Based on the following active relationship metrics, write a supportive LDR status assessment report:
    - Messages typed is: ${messagesCount} messages
    - Polaroids uploaded to Memory Wall is: ${memoriesCount} memories
    - Diaries written in Shared Journal: ${journalCount} entries
    - Daily Questions replied: ${answerCount} answers
    - Shared Bucket List completed: ${bucketCount} items

    Please structure your reply in a cozy, beautiful markdown design containing:
    1. **Love Connection Assessment**: A balanced, warm interpretation of these figures (e.g., highlighting great consistency in blogging or chatting, or gently noting if they haven't uploaded a memory in a while). Cite percentage estimates or funny metaphors to make the stats feel human.
    2. **Customized LDR Action Plan**: Provide 2 physical reunion planning or online co-active ideas to enrich their connection further.
    3. **A Heartfelt Reminder**: A supportive, encouraging signoff reminder of why distance is only a test of strength that makes connections deeper.

    Do NOT include any container, port, telemetry, or backend logging lines. Keep the tone completely authentic, supportive, and human-crafted!`;

    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt
    });

    res.json({ result: response.text, report: response.text });
  } catch (err) {
    console.error('Relationship Health AI failure:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to consult relationship health API.' });
  }
});

// Security & Trust Layer: Fetch activity Logs
app.get('/api/user/security-logs', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.securityLogs = db.securityLogs || [];
  const logs = db.securityLogs
    .filter(log => log.userId === userId)
    .sort((a,b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  res.json(logs);
});

// GDPR Data Export bundle
app.get('/api/user/export-data', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const coupleId = user.coupleId;

  // Compile package
  const userMessages = db.messages.filter(m => m.senderId === userId);
  const userJournals = db.journalEntries.filter(j => j.userId === userId);
  const userMemories = db.memories.filter(m => m.userId === userId);
  const userAnswers = db.dailyAnswers.filter(a => a.userId === userId);

  const exportBundle = {
    disclaimer: 'This package contains all personal text data stored on MuTu - For Couples servers. E2E encrypted messages here are exported in ciphertext status for security.',
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      birthday: user.birthday,
      city: user.locationCity,
      streakMax: user.streakMax
    },
    activitySummary: {
      messagesSent: userMessages.length,
      journalEntriesWritten: userJournals.length,
      memoriesPosted: userMemories.length,
      answersReplied: userAnswers.length
    },
    data: {
      messagesCiphertext: userMessages.map(m => ({ textEncrypted: m.textEncrypted, iv: m.iv, timestamp: m.timestamp })),
      journals: userJournals.map(j => ({ title: j.title, date: j.date, content: j.content, mood: j.mood })),
      memories: userMemories.map(m => ({ date: m.date, caption: m.caption, location: m.location })),
      dailyAnswers: userAnswers.map(a => ({ questionId: a.questionId, text: a.answerText, timestamp: a.timestamp }))
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=mutu_data_export_${userId}.json`);
  res.json(exportBundle);
});

// GDPR Data Deletion: Delete Account
app.post('/api/user/delete-account', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const coupleId = user.coupleId;

    // Remove user records
    db.users = db.users.filter(u => u.id !== userId);
    await deleteRecord('users', userId).catch(() => {});

    if (coupleId) {
      // Clean letters, bucket lists, memories, calendar events
      db.messages = db.messages.filter(m => m.coupleId !== coupleId);
      db.memories = db.memories.filter(m => m.coupleId !== coupleId);
      db.calendarEvents = db.calendarEvents.filter(c => c.coupleId !== coupleId);
      db.dailyAnswers = db.dailyAnswers.filter(a => a.coupleId !== coupleId);
      db.journalEntries = db.journalEntries.filter(j => j.coupleId !== coupleId);
      if (db.lockedLetters) db.lockedLetters = db.lockedLetters.filter(l => l.coupleId !== coupleId);
      if (db.decorations) db.decorations = db.decorations.filter(d => d.coupleId !== coupleId);
      if (db.timelineEvents) db.timelineEvents = db.timelineEvents.filter(t => t.coupleId !== coupleId);
      if (db.sharedTracks) db.sharedTracks = db.sharedTracks.filter(t => t.coupleId !== coupleId);

      // Delete couple link
      db.couples = db.couples.filter(c => c.id !== coupleId);
      await deleteRecord('couples', coupleId).catch(() => {});
    }

    saveDB();
    res.json({ success: true, message: 'All personal metadata permanently purged according to privacy guidelines.' });
  } catch (err) {
    console.error('Failed processing GDPR deletion request:', err);
    res.status(500).json({ error: 'Failed permanently deleting records.' });
  }
});

// -------------------------------------------------------------
// WEBSOCKET SERVER & REALTIME HANDLING
// -------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let boundUserId: string | null = null;
  let boundCoupleId: string | null = null;

  console.log('New WebSocket attachment connected.');

  ws.on('message', (messageRaw) => {
    try {
      const event: WSEvent = JSON.parse(messageRaw.toString());
      
      switch (event.type) {
        case 'connection:init': {
          boundUserId = event.userId;
          boundCoupleId = event.coupleId || null;
          clientSockets.set(event.userId, ws);
          console.log(`WebSocket fully bound for user: ${event.userId}, couple: ${event.coupleId}`);
          break;
        }

        case 'chat:message': {
          if (!boundCoupleId) return;
          const msg = event.message;

          // Deduce actual live E2E delivery status (WhatsApp ticks)
          const partnerId = getPartnerId(msg.senderId);
          if (partnerId) {
            const isPartnerInChat = activeChatUsers.has(partnerId);
            const isPartnerOnline = clientSockets.has(partnerId);
            
            if (isPartnerInChat) {
              msg.read = true;
              msg.status = 'seen';
            } else if (isPartnerOnline) {
              msg.read = false;
              msg.status = 'delivered';
            } else {
              msg.read = false;
              msg.status = 'sent';
            }
          } else {
            msg.status = 'sent';
          }

          db.messages.push(msg);
          saveDB();

          // Sync message document to live Firestore
          addRecord('messages', msg).catch(err => console.error('Failed to sync message to Firestore:', err));

          // Broadcast to partner if registered, and sync stats
          if (partnerId) {
            sendToUser(partnerId, { type: 'chat:message', message: msg });
            sendToUser(partnerId, { type: 'state:update', section: 'stats' });
            
            // Also notify sender client of the resolved status (so ticks update instantly on sender screen)
            sendToUser(msg.senderId, { type: 'chat:message', message: msg });
          }
          break;
        }

        case 'chat:join': {
          const { userId } = event;
          activeChatUsers.add(userId);
          console.log(`User join chat: ${userId}`);

          // Mark previous unread messages sent by partner to this user as seen/read
          const partnerId = getPartnerId(userId);
          if (partnerId) {
            let updated = false;
            db.messages.forEach(m => {
              if (m.senderId === partnerId && !m.read) {
                m.read = true;
                m.status = 'seen';
                updated = true;
                // Sync with Firestore asynchronously
                updateRecord('messages', m).catch(err => console.error('Failed to sync seen to Firestore:', err));
              }
            });
            if (updated) {
              saveDB();
              // Notify the partner that previous messages are read/seen
              sendToUser(partnerId, { type: 'chat:seen-update', userId });
            }
          }
          break;
        }

        case 'chat:leave': {
          const { userId } = event;
          activeChatUsers.delete(userId);
          console.log(`User left chat: ${userId}`);
          break;
        }

        case 'chat:typing': {
          if (!boundCoupleId || !boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            sendToUser(partnerId, { type: 'chat:typing', userId: boundUserId, isTyping: event.isTyping });
          }
          break;
        }

        case 'chat:thumb-kiss-start': {
          if (!boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            sendToUser(partnerId, { type: 'chat:thumb-kiss-start', userId: boundUserId });
          }
          break;
        }

        case 'chat:thumb-kiss-end': {
          if (!boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            sendToUser(partnerId, { type: 'chat:thumb-kiss-end', userId: boundUserId });
          }
          break;
        }

        case 'chat:reaction': {
          if (!boundCoupleId || !boundUserId) return;
          const { messageId, reaction, action } = event;
          const targetMsg = db.messages.find(m => m.id === messageId);
          if (targetMsg) {
            if (action === 'add') {
              // Ensure no duplicate reactions by same user
              targetMsg.reactions = targetMsg.reactions.filter(r => r.userId !== reaction.userId);
              targetMsg.reactions.push(reaction);
            } else {
              targetMsg.reactions = targetMsg.reactions.filter(r => r.userId !== reaction.userId);
            }
            saveDB();

            // Sync updated message reactions to live Firestore
            updateRecord('messages', targetMsg).catch(err => console.error('Failed to sync reactions to Firestore:', err));

            // Broadcast back to opponent to render real-time
            const partnerId = getPartnerId(boundUserId);
            if (partnerId) {
              sendToUser(partnerId, {
                type: 'chat:reaction',
                messageId,
                reaction,
                action
              });
            }
          }
          break;
        }

        case 'movie:sync': {
          // Playback pause seek coordinates update -> broadcast immediately to lover
          if (!boundCoupleId || !boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            sendToUser(partnerId, { type: 'movie:sync', state: event.state });
          }
          break;
        }

        case 'call:dial': {
          if (!boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            const wsPartner = clientSockets.get(partnerId);
            if (wsPartner && wsPartner.readyState === WebSocket.OPEN) {
              wsPartner.send(JSON.stringify(event));
            }
            
            // Log this real-time call to database
            db.callLogs = db.callLogs || [];
            const mode = event.mode || 'voice';
            const hasExisting = db.callLogs.some(c => c.coupleId === boundCoupleId && c.type === mode);
            
            db.callLogs.push({
              id: 'call_' + Math.random().toString(36).substring(2, 11),
              coupleId: boundCoupleId || '',
              userId: boundUserId,
              type: mode,
              timestamp: Date.now()
            });
            saveDB();
            
            if (!hasExisting) {
              // Trigger automated timeline generator asynchronously to unlock milestone
              runTimelineEngine(boundCoupleId || '').catch(err => console.error('Timeline call milestones sync failed:', err));
            }
          }
          break;
        }

        case 'call:response':
        case 'call:hangup':
        case 'call:ice-candidate':
        case 'call:sdp-offer':
        case 'call:sdp-answer': {
          // General real-time WebRTC dialing signals transparent pass-through
          if (!boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            // Relays whichever WebRTC payload is dispatched to partner
            const wsPartner = clientSockets.get(partnerId);
            if (wsPartner && wsPartner.readyState === WebSocket.OPEN) {
              wsPartner.send(JSON.stringify(event));
            }
          }
          break;
        }

        case 'state:update': {
          if (!boundUserId) return;
          const partnerId = getPartnerId(boundUserId);
          if (partnerId) {
            sendToUser(partnerId, event);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message package:', err);
    }
  });

  ws.on('close', () => {
    if (boundUserId) {
      clientSockets.delete(boundUserId);
      activeChatUsers.delete(boundUserId);
      console.log(`WebSocket socket closed for user: ${boundUserId}`);
    }
  });
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE / STATIC FILE WRAPPING
// -------------------------------------------------------------

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MuTu - For Couples backend up and running!`);
    console.log(`Local development url: http://localhost:${PORT}`);
  });
}

bootstrap();
