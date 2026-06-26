/**
 * Shared Type Definitions for MuTu - For Couples
 */

export interface User {
  id: string;
  name: string;
  email: string;
  birthday: string; // YYYY-MM-DD
  profilePhoto?: string; // base64
  coupleId?: string;
  inviteCode?: string;
  partnerId?: string;
  partnerName?: string;
  partnerBirthday?: string;
  partnerPhoto?: string;
  loveKey?: string;
  anniversaryDate?: string; // YYYY-MM-DD
  
  // Pastel extensions for locations, check-ins, love counters
  locationCity?: string;
  locationWeather?: string;
  locationTimezone?: string;
  checkInMood?: string;
  checkInLoveLanguage?: string;
  customLoveCounterTitle?: string;
  
  partnerCity?: string;
  partnerTimezone?: string;
  partnerWeather?: string;
  partnerMood?: string;
  partnerLoveLanguage?: string;
  partnerLoveCounterTitle?: string;
  
  appTheme?: 'light' | 'dark' | 'auto';
  chatBackground?: string;

  // Emotional Presence, Streaks, Customizations
  currentPresenceStatus?: string; // e.g. "Thinking about you 🌙"
  lastSleepTime?: string;
  lastHeartbeat?: number;
  streakCurrent?: number;
  streakMax?: number;
  lovePoints?: number;
  lastActiveDate?: string; // YYYY-MM-DD
  lastActiveTime?: number; // Epoch timestamp
  online?: boolean; // Live status
  lastSeen?: number; // Epoch timestamp
  unlockedDecorations?: string[]; // IDs of unlocked room items

  partnerPresenceStatus?: string;
  partnerSleepTime?: string;
  partnerHeartbeat?: number;
  partnerStreakCurrent?: number;
  partnerLastActiveTime?: number; // Epoch timestamp representing when they were last active/online
  partnerOnline?: boolean; // Live websocket connection status

  // Dedicated Rich Profile Fields
  coverPhoto?: string;
  coverRepositionY?: number;
  nickname?: string;
  personalNote?: string;
  favFood?: string;
  favMovie?: string;
  favSong?: string;
  favColor?: string;
  dreamDestination?: string;
  reunionDate?: string;
  distance?: string;
  wakeTime?: string;
  sleepTime?: string;
  workSchedule?: string;
  bestTimeToCall?: string;
  favPhoto?: string;
  favVoiceNoteText?: string;
  favLetterTitle?: string;
  favMemoryText?: string;
  sharedGoals?: string;
  plannedTrips?: string;
  lifeMilestones?: string;
}

export interface LockedLetter {
  id: string;
  coupleId: string;
  senderId: string;
  senderName: string;
  title: string;
  contentEncrypted: string;
  iv: string;
  unlockDate: string; // YYYY-MM-DDTHH:mm
  isOpened: boolean;
  openedAt?: number;
  timestamp: number;
}

export interface Couple {
  id: string;
  inviteCode: string;
  partner1Id: string;
  partner2Id?: string;
  loveKey: string;
  anniversaryDate?: string; // YYYY-MM-DD
  createdAt: number;
  settings?: any;
  
  chatBackground?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  coupleId: string;
  senderId: string;
  textEncrypted: string;
  iv: string; // initialization vector in hex/base64 for Private encryption
  timestamp: number;
  read: boolean;
  reactions: MessageReaction[];
  status?: 'sent' | 'delivered' | 'seen' | 'failed' | 'sending';
  isVoice?: boolean;
  isMovie?: boolean;
  replyToId?: string;
  replyToText?: string;
}

export interface Memory {
  id: string;
  coupleId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  caption: string;
  imageBase64: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  coupleId: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: 'birthday' | 'anniversary' | 'date' | 'custom';
  description?: string;
  createdBy: string;
}

export interface DailyQuestion {
  id: string;
  questionText: string;
  choices?: string[]; // optional quick multiple choices
}

export interface DailyAnswer {
  id: string;
  coupleId: string;
  questionId: string;
  userId: string;
  answerText: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  coupleId: string;
  userId: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  imageBase64?: string;
  mood?: string;
}

export interface MovieState {
  videoUrl: string;
  videoTitle: string;
  isPlaying: boolean;
  currentTime: number;
  senderId: string;
  timestamp: number;
}

export interface CallState {
  status: 'idle' | 'ringing' | 'active';
  type: 'voice' | 'video';
  callerId: string;
  calleeId: string;
}

export interface BucketItem {
  id: string;
  coupleId: string;
  title: string;
  category: 'travel' | 'adventure' | 'food' | 'cozy' | 'growth';
  completed: boolean;
  completedDate?: string;
  createdBy: string;
  suggested?: boolean;
}

export interface HomeDecoration {
  id: string;
  coupleId: string;
  room: string;
  name: string;
  type: string;
  itemType?: string;
  emojiIcon?: string;
  photoUrl?: string;
  coordinatesX?: number;
  coordinatesY?: number;
  placedAt?: string;
  isSystemUnlocked?: boolean;
}

export interface SecurityLog {
  id: string;
  userId: string;
  eventType?: string;
  deviceAgent?: string;
  deviceInfo?: string;
  actionDescription?: string;
  ipAddress: string;
  timestamp: number;
}

export interface TimelineEvent {
  id: string;
  coupleId: string;
  milestoneType?: string;
  category?: 'anniversary' | 'firsts' | 'trip' | 'chat' | 'gift' | 'custom';
  title: string;
  description: string;
  date?: string;
  eventDate?: string;
  autoGenerated?: boolean;
  timestamp: number;
}

// WebSocket Communication Protocol Event definition
export type WSEvent =
  | { type: 'connection:init'; userId: string; coupleId?: string }
  | { type: 'chat:message'; message: Message }
  | { type: 'chat:delivered'; messageId: string; userId: string }
  | { type: 'chat:typing'; userId: string; isTyping: boolean }
  | { type: 'chat:reaction'; messageId: string; reaction: MessageReaction; action: 'add' | 'remove' }
  | { type: 'chat:thumb-kiss-start'; userId: string }
  | { type: 'chat:thumb-kiss-end'; userId: string }
  | { type: 'chat:join'; userId: string }
  | { type: 'chat:leave'; userId: string }
  | { type: 'chat:seen-update'; userId: string }
  | { type: 'movie:sync'; state: MovieState }
  | { type: 'call:dial'; mode: 'voice' | 'video'; callerId: string }
  | { type: 'call:response'; action: 'accept' | 'decline' | 'busy'; calleeId: string }
  | { type: 'call:hangup'; userId: string }
  | { type: 'call:ice-candidate'; candidate: any; targetId: string }
  | { type: 'call:sdp-offer'; sdp: any; targetId: string }
  | { type: 'call:sdp-answer'; sdp: any; targetId: string }
  | { type: 'presence:update'; userId: string; status: string; sleepTime?: string; heartbeat?: number }
  | { type: 'state:update'; section: 'memories' | 'calendar' | 'journal' | 'daily' | 'stats' | 'profile' | 'sleep_on' | 'sleep_off' | 'bucket' | 'locked-letters' | 'decorations' | 'timeline' | 'music' | 'presence' }
  | { type: 'partner:status'; userId: string; online: boolean };
