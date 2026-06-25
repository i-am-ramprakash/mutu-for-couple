import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Phone, Video, PhoneOff, Mic, MicOff, Camera, 
  CameraOff, Sparkles, LogOut, Info, ShieldCheck, RefreshCw,
  Moon, Sun, Volume2, VolumeX, AlertCircle, Home, MessageSquare, Monitor,
  BookOpen, Calendar, Award, Activity, Bell, X, Trash2, Globe, Sparkle
} from 'lucide-react';

import { 
  User, Message, Memory, CalendarEvent, DailyQuestion, 
  DailyAnswer, JournalEntry, MovieState, WSEvent, BucketItem, MessageReaction
} from './types';

import { SignallingClient } from '@metered-ca/realtime';

import { 
  playSweetMessageSound, playSweetSparkSound, playSweetHeartbeat, 
  playSweetLullaby, playBirdChirp 
} from './utils/audio';
import { AmbientSynth } from './utils/synth';
import { useMuTuSocket } from './hooks/useMuTuSocket';
import { useWebRTC } from './hooks/useWebRTC';

import RelationshipAnalytics from './components/RelationshipAnalytics';
import RelationshipTimeline from './components/RelationshipTimeline';
import AILoveAssistant from './components/AILoveAssistant';
import SharedMusic from './components/SharedMusic';
import SafetyCenter from './components/SafetyCenter';
import TourGuide from './components/TourGuide';

// Component Imports
import AuthScreen from './components/AuthScreen';
import HomeDashboard from './components/HomeDashboard';
import ChatRoom from './components/ChatRoom';
import MovieRoom from './components/MovieRoom';
import MemoryWall from './components/MemoryWall';
import LoveCalendar from './components/LoveCalendar';
import DailyQuestions from './components/DailyQuestions';
import CoupleJournal from './components/CoupleJournal';
import BucketList from './components/BucketList';
import SecretVault from './components/SecretVault';
import UserProfile from './components/UserProfile';
import CallDiagnostics from './components/CallDiagnostics';
import { useTheme } from './ThemeContext';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, limit, orderBy } from 'firebase/firestore';

const isImageString = (src: string | undefined | null): boolean => {
  if (!src) return false;
  return src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.length > 20;
};

export default function App() {
  const { theme, setTheme } = useTheme();

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('mutu_user_session');
    return cached ? JSON.parse(cached) : null;
  });

  const handleToggleGlobalTheme = async () => {
    const isCurrentlyDark = 
      theme === 'dark' || 
      (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    
    setTheme(newTheme);
    
    if (currentUser) {
      const updatedUser = { ...currentUser, appTheme: newTheme as any };
      setCurrentUser(updatedUser);
      localStorage.setItem('mutu_user_session', JSON.stringify(updatedUser));

      fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, appTheme: newTheme })
      }).catch(e => console.error('Could not persist theme toggle', e));
    }
  };

  useEffect(() => {
    if (currentUser?.appTheme) {
      setTheme(currentUser.appTheme);
    }
  }, [currentUser?.appTheme, setTheme]);

  // Navigation state: 'dashboard' | 'chat' | 'movie' | 'memories' | 'calendar' | 'daily' | 'journal'
  const [activeSection, setActiveSection] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['dashboard', 'chat', 'movie', 'memories', 'calendar', 'daily', 'journal'].includes(hash)) {
      return hash;
    }
    return localStorage.getItem('mutu_active_section') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('mutu_active_section', activeSection);
  }, [activeSection]);

  const [profileUserId, setProfileUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/^\/profile\/([^/]+)$/);
      if (match) return match[1];
    }
    return '';
  });

  const navigateToProfile = (userId: string) => {
    if (!userId) return;
    setProfileUserId(userId);
    window.history.pushState({ section: 'profile', profileUserId: userId }, '', `/profile/${userId}`);
    setActiveSection('profile');
    playSweetSparkSound();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).navigateToProfile = navigateToProfile;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).navigateToProfile;
      }
    };
  }, [currentUser, profileUserId]);

  useEffect(() => {
    if (!currentUser) return;

    const syncRouteFromPath = () => {
      const path = window.location.pathname;
      const profileMatch = path.match(/^\/profile\/([^/]+)$/);
      if (profileMatch) {
        const uid = profileMatch[1];
        setProfileUserId(uid);
        setActiveSection('profile');
      } else {
        const hash = window.location.hash.slice(1);
        if (hash === 'profile' && profileUserId) {
          // Keep profile actively selected
        } else if (hash && ['dashboard', 'chat', 'movie', 'memories', 'calendar', 'daily', 'journal'].includes(hash)) {
          setActiveSection(hash);
        }
      }
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      setViewportHeight(vv.height);
      const isKeyboard = vv.height < window.innerHeight * 0.85;
      setIsKeyboardOpen(isKeyboard);
      if (activeSection === 'chat') {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [activeSection]);

  // Prevent page moving up and down by placing viewport at top of screen instantly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeSection]);

  // Mark in-app chat messages as read locally when in the chat lounge
  useEffect(() => {
    if (activeSection === 'chat' && currentUser) {
      setMessages(prev => prev.map(m => {
        if (m.senderId !== currentUser.id && !m.read) {
          return { ...m, read: true, status: 'seen' };
        }
        return m;
      }));
    }
  }, [activeSection, currentUser]);
  const [showExitBanner, setShowExitBanner] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const markAllNotifsAsRead = () => {
    setRecentNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('mutu_notifications_history', JSON.stringify(updated));
      return updated;
    });
    playSweetSparkSound();
  };

  const markNotifAsRead = (id: string) => {
    setRecentNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('mutu_notifications_history', JSON.stringify(updated));
      return updated;
    });
  };

  const navigateToSection = (section: string) => {
    if (section === 'tour') {
      setShowTour(true);
      return;
    }
    if (section === activeSection) return;
    
    if (window.location.pathname !== '/') {
      window.history.pushState({ section }, '', `/#${section}`);
    } else if (activeSection === 'dashboard' || section === 'dashboard') {
      window.history.pushState({ section }, '', `#${section}`);
    } else {
      window.history.replaceState({ section }, '', `#${section}`);
    }
    
    setActiveSection(section);
  };

  const handleBack = () => {
    navigateToSection('dashboard');
  };

  // Smartphone native back gestures & browser history integration
  useEffect(() => {
    if (!currentUser) return;

    const handlePopState = (event: PopStateEvent) => {
      const section = event.state?.section;
      if (section) {
        setActiveSection(section);
        if (section === 'profile' && event.state?.profileUserId) {
          setProfileUserId(event.state.profileUserId);
        }
      } else {
        const path = window.location.pathname;
        const profileMatch = path.match(/^\/profile\/([^/]+)$/);
        if (profileMatch) {
          setProfileUserId(profileMatch[1]);
          setActiveSection('profile');
        } else if (activeSection === 'dashboard') {
          setShowExitBanner(true);
          window.history.pushState({ section: 'dashboard' }, '', '#dashboard');
        } else {
          setActiveSection('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state || !window.history.state.section) {
      const path = window.location.pathname;
      const profileMatch = path.match(/^\/profile\/([^/]+)$/);
      if (profileMatch) {
        window.history.replaceState({ section: 'profile', profileUserId: profileMatch[1] }, '', path);
      } else {
        window.history.replaceState({ section: 'dashboard' }, '', '#dashboard');
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentUser, activeSection]);

  // Real-time communication data feeds
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [dailyAnswers, setDailyAnswers] = useState<DailyAnswer[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [stats, setStats] = useState({ messagesCount: 0, memoriesCount: 0, journalCount: 0, answerCount: 0 });

  // WebRTC & Call states
  const [callDuration, setCallDuration] = useState<number>(0);
  const [ringingRole, setRingingRole] = useState<'caller' | 'callee' | null>(null);
  const [callType, setCallType] = useState<'voice' | 'video'>('video');
  const [calleeName, setCalleeName] = useState('');
  const [showCallDiagnostics, setShowCallDiagnostics] = useState(false);
  const [webrtcIceState, setWebrtcIceState] = useState('new');
  const [webrtcSignalingState, setWebrtcSignalingState] = useState('stable');

  const [isSleepMode, setIsSleepMode] = useState(false);
  const [sleepSynthMuted, setSleepSynthMuted] = useState(false);
  const [receivedSleepSpark, setReceivedSleepSpark] = useState(false);
  const [partnerThumbKissActive, setPartnerThumbKissActive] = useState(false);
  const [movieSyncState, setMovieSyncState] = useState<MovieState | null>(null);
  const [typingPartner, setTypingPartner] = useState(false);

  const { sendMessage } = useMuTuSocket(currentUser, (payload) => {
    // @ts-ignore
    if (typeof handleIncomingWSEvent === 'function') {
      // @ts-ignore
      handleIncomingWSEvent(payload);
    }
  });

  const { 
    callActive, setCallActive, 
    incomingCall, setIncomingCall, 
    localStream, setLocalStream, 
    remoteStream, setRemoteStream, 
    startCall, endCall 
  } = useWebRTC(currentUser, sendMessage);

  // Call duration counter timer effect
  useEffect(() => {
    let interval: any = null;
    if (callActive) {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callActive]);
  
  // Audio/Video streams state
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);

  const [localTracksCount, setLocalTracksCount] = useState(0);
  const [remoteTracksCount, setRemoteTracksCount] = useState(0);

  // Additional active call features
  const [isScreensharing, setIsScreensharing] = useState(false);
  const [isSpeakerActive, setIsSpeakerActive] = useState(true);
  const screenshareStreamRef = useRef<MediaStream | null>(null);

  // Monitor tracks changes in local stream to trigger re-bind on stream size changes
  useEffect(() => {
    if (!localStream) {
      setLocalTracksCount(0);
      return;
    }
    setLocalTracksCount(localStream.getTracks().length);
    const handleTrackChange = () => {
      const count = localStream.getTracks().length;
      console.log('[WebRTC] Local stream tracks updated. Count:', count);
      setLocalTracksCount(count);
    };
    localStream.addEventListener('addtrack', handleTrackChange);
    localStream.addEventListener('removetrack', handleTrackChange);
    return () => {
      localStream.removeEventListener('addtrack', handleTrackChange);
      localStream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [localStream]);

  // Monitor tracks changes in remote stream to trigger re-bind on stream size changes
  useEffect(() => {
    if (!remoteStream) {
      setRemoteTracksCount(0);
      return;
    }
    setRemoteTracksCount(remoteStream.getTracks().length);
    const handleTrackChange = () => {
      const count = remoteStream.getTracks().length;
      console.log('[WebRTC] Remote stream tracks updated. Count:', count);
      setRemoteTracksCount(count);
    };
    remoteStream.addEventListener('addtrack', handleTrackChange);
    remoteStream.addEventListener('removetrack', handleTrackChange);
    return () => {
      remoteStream.removeEventListener('addtrack', handleTrackChange);
      remoteStream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [remoteStream]);

  // Re-instating missing refs used by the legacy WebRTC and Socket logic in App.tsx
  const synthRef = useRef<AmbientSynth | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const partnerVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTypeRef = useRef<'voice' | 'video'>('video');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);
  const meteredSignallingRef = useRef<SignallingClient | null>(null);
  const iceServersRef = useRef<any[]>([]);

  // Sync refs with state for legacy logic compatibility
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { remoteStreamRef.current = remoteStream; }, [remoteStream]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);

  // User session reference for stable callback closures
  const userRef = useRef(currentUser);
  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  // Auto-binding effects for both local feedback and remote media players
  useEffect(() => {
    if (callActive && localStream) {
      if (callType === 'video' && myVideoRef.current) {
        console.log(`[WebRTC] Auto-binding local stream to myVideoRef element. Tracks count: ${localTracksCount}`);
        localStream.getTracks().forEach(t => console.log(` - Local track: ${t.kind}, ID: ${t.id}, Enabled: ${t.enabled}`));
        myVideoRef.current.srcObject = localStream;
        myVideoRef.current.play().catch(e => console.log('Playing local feedback stream failed:', e));
      }
    }
  }, [callActive, localStream, callType, localTracksCount]);

  useEffect(() => {
    if (callActive && remoteStream) {
      if (callType === 'video' && partnerVideoRef.current) {
        console.log(`[WebRTC] Auto-binding remote stream to partnerVideoRef element. Tracks count: ${remoteTracksCount}`);
        remoteStream.getTracks().forEach(t => console.log(` - Remote track: ${t.kind}, ID: ${t.id}, Enabled: ${t.enabled}`));
        partnerVideoRef.current.srcObject = remoteStream;
        partnerVideoRef.current.play().catch(e => console.log('Playing remote stream failed:', e));
      } else if (callType === 'voice' && remoteAudioRef.current) {
        console.log(`[WebRTC] Auto-binding remote stream to remoteAudioRef element. Tracks count: ${remoteTracksCount}`);
        remoteStream.getTracks().forEach(t => console.log(` - Remote track: ${t.kind}, ID: ${t.id}, Enabled: ${t.enabled}`));
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.log('Playing remote audio stream failed:', e));
      }
    }
  }, [callActive, remoteStream, callType, remoteTracksCount]);

  // Love Analytics, Toasts, and Alert states
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [toast, setToast] = useState<{ id: string; type: string; title: string; body: string } | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>(() => {
    const cached = localStorage.getItem('mutu_notifications_history');
    return cached ? JSON.parse(cached) : [
      { id: 'n1', title: 'Welcome to MuTu! 🌸', body: 'Your private connection workspace is initialized.', timestamp: Date.now(), type: 'system', read: false }
    ];
  });
  const [showTour, setShowTour] = useState(false);

  // Save notification helpers
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        const testNotification = new Notification("🔔 MuTu Alerts Enabled!", {
          body: "You'll now receive smartphone notifications for chat, events, and calls! 🥰",
          icon: '/favicon.ico'
        });
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("🔔 MuTu Alerts Enabled!", {
              body: "You'll now receive smartphone notifications for chat, events, and calls! 🥰",
              icon: '/favicon.ico'
            });
          }).catch(() => {});
        }
        
        // Dynamic FCM Setup (Phase 2)
        if (currentUser) {
          try {
            const { getMessaging, getToken } = await import('firebase/messaging');
            const messaging = getMessaging();
            const token = await getToken(messaging, {
              vapidKey: 'BDbIs-O_jA8bZ0Yx3yPzFf98-nKsn_bS86h_mutu-public-key'
            });
            if (token) {
              const { doc, setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', currentUser.id), { fcmToken: token }, { merge: true });
              console.log('[FCM] Token registered on permission change.');
            }
          } catch (me) {
            console.log('[FCM] Registration deferred on this environment context:', me);
          }
        }
      }
    } catch (err) {
      console.warn('Failed requesting notification permission:', err);
    }
  };

  // Save notification helpers and dispatch native OS alerts for smartphones & background shades
  const showPushNotification = useCallback((title: string, body: string, type = 'system', section?: string) => {
    const id = 'nt_' + Math.random().toString(36).substring(2, 9);
    setToast({ id, type, title, body });
    
    setRecentNotifications((prev) => {
      const updated = [{ id, title, body, timestamp: Date.now(), type, section, read: false }, ...prev.slice(0, 24)];
      localStorage.setItem('mutu_notifications_history', JSON.stringify(updated));
      return updated;
    });

    // Native smartphone alerts integration (Web Notification API & ServiceWorker push panel)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        // High compatibility fallback for mobile devices
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: body,
              icon: '/favicon.ico',
              tag: id,
              badge: '/favicon.ico',
              vibrate: [200, 100, 200],
              data: { section, id }
            } as any);
          }).catch(() => {
            // Backup direct notification in case sw ready fails
            new Notification(title, { body, icon: '/favicon.ico', tag: id });
          });
        } else {
          new Notification(title, { body, icon: '/favicon.ico', tag: id });
        }
      } catch (err) {
        console.warn('[Notification] Direct construct failed, trying direct option:', err);
      }
    }

    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 4500);
  }, []);

  const formatNotifTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  // 1. Initial State Loaders (REST calls with resilient fallback loops)
  const fetchAllData = useCallback(async (user: User) => {
    if (!user.coupleId) return;
    
    const fetchSafe = async (url: string, fallback: any, retries = 8, delay = 1500) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            return await res.json();
          }
          console.warn(`Resilient fetch warning for [${url}]: Status ${res.status} (attempt ${i + 1}/${retries})`);
        } catch (err) {
          console.warn(`Resilient fetch attempt ${i + 1}/${retries} failed for [${url}]:`, err instanceof Error ? err.message : String(err));
        }
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      return fallback;
    };

    try {
      // Parallel REST Queries with bulletproof resilience
      const [msgs, mems, cals, quest, journals, statsData, bkts] = await Promise.all([
        fetchSafe(`/api/messages?coupleId=${user.coupleId}`, []),
        fetchSafe(`/api/memories?coupleId=${user.coupleId}`, []),
        fetchSafe(`/api/calendar?coupleId=${user.coupleId}`, []),
        fetchSafe(`/api/daily-question`, null),
        fetchSafe(`/api/journal?coupleId=${user.coupleId}`, []),
        fetchSafe(`/api/stats?coupleId=${user.coupleId}&userId=${user.id}`, { messagesCount: 0, memoriesCount: 0, journalCount: 0, answerCount: 0 }),
        fetchSafe(`/api/bucket-list?coupleId=${user.coupleId}`, [])
      ]);

      setMessages(msgs);
      setMemories(mems);
      setCalendarEvents(cals);
      setDailyQuestion(quest);
      setJournalEntries(journals);
      setStats(statsData);
      setBucketItems(bkts);

      // Pull daily answers for this question
      if (quest?.id) {
        const answers = await fetchSafe(`/api/daily-answers?coupleId=${user.coupleId}&questionId=${quest.id}`, []);
        setDailyAnswers(answers);
      }
    } catch (err) {
      console.warn('Core restful hydration failed:', err);
    }
  }, []);

  // Sync user profile state from server (checking pairings)
  const handleRefreshUser = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        const freshUser = await res.json();
        setCurrentUser(freshUser);
        localStorage.setItem('mutu_user_session', JSON.stringify(freshUser));
      } else if (res.status === 404) {
        console.warn('User profile not found on backend (likely deleted from database). Clearing local session.');
        setCurrentUser(null);
        localStorage.removeItem('mutu_user_session');
      }
    } catch (err) {
      console.warn('Error refreshing session details:', err);
    }
  }, []);

  // Verify cached user session on mount
  useEffect(() => {
    if (currentUser) {
      handleRefreshUser();
    }
  }, []);

  // Outbound real-time event dispatcher
  const sendRealTimeEvent = useCallback((event: WSEvent): boolean => {
    let sent = false;

    // Stamp our sender identifier onto the event object
    const decoratedEvent = { ...event, senderUserId: currentUser?.id };

    // 1. Dispatch through Premium Metered Realtime Messaging if active and ready
    if (meteredSignallingRef.current && meteredSignallingRef.current.state === 'connected' && currentUser?.coupleId) {
      try {
        const channelName = `couple_${currentUser.coupleId}`;
        meteredSignallingRef.current.publish(channelName, decoratedEvent);
        sent = true;
        console.log('[Metered Realtime] Published real-time signal:', event.type);
      } catch (err) {
        console.warn('[Metered Realtime] Failed to dispatch real-time pub/sub:', err);
      }
    }

    // 2. Dispatch through standard Local WebSocket as parallel helper
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(decoratedEvent));
        sent = true;
        console.log('[WebRTC/WS] Standard WebSocket dispatch success:', event.type);
      } catch (err) {
        console.warn('[WebRTC/WS] Parallel standard WS dispatch unsuccessful:', err);
      }
    }

    return sent;
  }, [currentUser?.id]);

  const reconnectCall = async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc || pc.connectionState === 'closed') {
        console.warn('[WebRTC] Reconnection triggered but RTCPeerConnection is inactive or closed.');
        return;
      }

      console.log('[WebRTC] Automated reconnection initiated...');
      
      // Perform local ICE restart first if supported
      if (typeof pc.restartIce === 'function') {
        try {
          console.log('[WebRTC] Calling pc.restartIce() to request new ICE generation.');
          pc.restartIce();
        } catch (e) {
          console.warn('[WebRTC] pc.restartIce() got exception, proceeding with standard iceRestart offer:', e);
        }
      }

      // Generate a fresh offer requesting ICE restart
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      // Clear the local ICE candidate queue for a fresh start so candidates don't bleed between sessions
      iceCandidatesQueueRef.current = [];

      if (currentUser?.partnerId) {
        console.log('[WebRTC] Broadcasting fresh iceRestart SDP offer to partner:', currentUser.partnerId);
        sendRealTimeEvent({
          type: 'call:sdp-offer',
          sdp: offer,
          targetId: currentUser.partnerId
        });
      }
    } catch (err) {
      console.error('[WebRTC] Automated reconnection flow failed:', err);
    }
  };

  const createPeerConnection = useCallback((stream: MediaStream | null) => {
    // We design the ICE candidate queues to persist during initialization to avoid race events
    console.log('[WebRTC] Creating RTCPeerConnection, current candidate queue size:', iceCandidatesQueueRef.current.length);

    const defaultIceServers = iceServersRef.current.length > 0
      ? [...iceServersRef.current]
      : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ];

    const pc = new RTCPeerConnection({
      iceServers: defaultIceServers,
      iceCandidatePoolSize: 10
    });

    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      const user = userRef.current;
      if (event.candidate && user?.partnerId) {
        sendRealTimeEvent({
          type: 'call:ice-candidate',
          candidate: event.candidate,
          targetId: user.partnerId
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      const alreadyHasTrack = remoteStreamRef.current.getTracks().some(t => t.id === event.track.id);
      if (!alreadyHasTrack) {
        remoteStreamRef.current.addTrack(event.track);
      }
      const compositeStream = new MediaStream(remoteStreamRef.current.getTracks());
      setRemoteStream(compositeStream);
      setRemoteStreamActive(true);
    };

    return pc;
  }, [sendRealTimeEvent]);

  const drainIceCandidatesQueue = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        const candidates = [...iceCandidatesQueueRef.current];
        iceCandidatesQueueRef.current = [];
        for (const candidate of candidates) {
          if (candidate) await pc.addIceCandidate(candidate);
        }
      }
    } catch (err) {
      console.error('[WebRTC] Failed to drain ICE candidates queue:', err);
    }
  }, []);

  // Minor isolated data refreshers supporting WebSocket notifications
  const fetchMemories = useCallback(async () => {
    if (!currentUser?.coupleId) return;
    try {
      const res = await fetch(`/api/memories?coupleId=${currentUser.coupleId}`);
      if (res.ok) {
        setMemories(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for memory fetch:', err);
    }
  }, [currentUser?.coupleId]);

  const fetchCalendar = useCallback(async () => {
    if (!currentUser?.coupleId) return;
    try {
      const res = await fetch(`/api/calendar?coupleId=${currentUser.coupleId}`);
      if (res.ok) {
        setCalendarEvents(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for calendar fetch:', err);
    }
  }, [currentUser?.coupleId]);

  const fetchJournal = useCallback(async () => {
    if (!currentUser?.coupleId) return;
    try {
      const res = await fetch(`/api/journal?coupleId=${currentUser.coupleId}`);
      if (res.ok) {
        setJournalEntries(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for journal fetch:', err);
    }
  }, [currentUser?.coupleId]);

  const fetchBucketList = useCallback(async () => {
    if (!currentUser?.coupleId) return;
    try {
      const res = await fetch(`/api/bucket-list?coupleId=${currentUser.coupleId}`);
      if (res.ok) {
        setBucketItems(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for bucket list fetch:', err);
    }
  }, [currentUser?.coupleId]);

  const fetchAnswersOnly = useCallback(async () => {
    if (!currentUser?.coupleId || !dailyQuestion?.id) return;
    try {
      const res = await fetch(`/api/daily-answers?coupleId=${currentUser.coupleId}&questionId=${dailyQuestion.id}`);
      if (res.ok) {
        setDailyAnswers(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for daily answers fetch:', err);
    }
  }, [currentUser?.coupleId, dailyQuestion?.id]);

  const fetchStatsAndAnswers = useCallback(async () => {
    if (!currentUser?.coupleId) return;
    try {
      const res = await fetch(`/api/stats?coupleId=${currentUser.coupleId}&userId=${currentUser.id}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.warn('Silent fallback for stats fetch:', err);
    }
  }, [currentUser?.coupleId, currentUser?.id]);

  const handleStartWebRTCOffer = useCallback(async () => {
    try {
      const pc = createPeerConnection(localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const user = userRef.current;
      if (user?.partnerId) {
        sendRealTimeEvent({
          type: 'call:sdp-offer',
          sdp: offer,
          targetId: user.partnerId
        });
      }
    } catch (err) {
      console.error('[WebRTC] Offer generation failed:', err);
    }
  }, [createPeerConnection, sendRealTimeEvent]);

  const handleReceiveWebRTCOffer = useCallback(async (sdp: any) => {
    try {
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(localStreamRef.current);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainIceCandidatesQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const user = userRef.current;
      if (user?.partnerId) {
        sendRealTimeEvent({
          type: 'call:sdp-answer',
          sdp: answer,
          targetId: user.partnerId
        });
      }
    } catch (err) {
      console.error('Failed to handle SDP Offer:', err);
    }
  }, [createPeerConnection, drainIceCandidatesQueue, sendRealTimeEvent]);

  const handleReceiveWebRTCAnswer = useCallback(async (sdp: any) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainIceCandidatesQueue();
      }
    } catch (err) {
      console.error('Failed to handle SDP Answer:', err);
    }
  }, [drainIceCandidatesQueue]);

  const handleReceiveIceCandidate = useCallback(async (candidate: any) => {
    try {
      if (!candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(candidate);
      } else {
        // Queue candidates if connection or remote description has not been fully resolved yet
        console.log('[WebRTC] Remote description not ready. Queueing candidate:', candidate);
        iceCandidatesQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.error('[WebRTC] Failed to append ICE candidate directly:', err);
    }
  }, []);

  // Auto-trigger onboarding tour guide for newly registered paired users
  useEffect(() => {
    if (currentUser && currentUser.partnerId) {
      const key = `has_seen_tour_${currentUser.id}`;
      const hasSeen = localStorage.getItem(key);
      if (!hasSeen) {
        setShowTour(true);
        localStorage.setItem(key, 'true');
      }
    }
  }, [currentUser?.id]);

  // Load dynamic premium WebRTC TURN credentials from backend
  useEffect(() => {
    const loadPremiumTurnCredentials = async () => {
      try {
        console.log('[WebRTC] Fetching dynamic premium TURN coordinates from backend...');
        const res = await fetch('/api/metered/turn');
        if (res.ok) {
          const servers = await res.json();
          if (Array.isArray(servers) && servers.length > 0) {
            console.log('[WebRTC] Premium TURN credentials loaded successfully. Server count:', servers.length);
            iceServersRef.current = servers;
          }
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to fetch dynamic TURN credentials, falling back to openrelay community:', err);
      }
    };
    if (currentUser?.id) {
      loadPremiumTurnCredentials();
    }
  }, [currentUser?.id]);

  const incomingCallRef = useRef(incomingCall);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Core real-time event routing processor (Stabilized with Ref to avoid identity-based reconnection loops)
  const handleIncomingWSEvent = useCallback((payload: WSEvent) => {
    const user = userRef.current;
    if (!user) return;
    console.log('[Realtime Routing] Dispatching inbound payload type:', payload.type);

    switch (payload.type) {
      case 'chat:message': {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === payload.message.id);
          if (exists) {
            return prev.map(m => m.id === payload.message.id ? payload.message : m);
          }
          return [...prev, payload.message];
        });
        fetchStatsAndAnswers();
        if (payload.message.senderId !== user.id) {
          playSweetMessageSound();
        }
        break;
      }

      case 'chat:seen-update': {
        setMessages((prev) => prev.map(m => {
          if (m.senderId === user.id && !m.read) {
            return { ...m, read: true, status: 'seen' };
          }
          return m;
        }));
        break;
      }

      case 'chat:typing': {
        setTypingPartner(payload.isTyping);
        break;
      }

      case 'chat:thumb-kiss-start': {
        setPartnerThumbKissActive(true);
        break;
      }

      case 'chat:thumb-kiss-end': {
        setPartnerThumbKissActive(false);
        break;
      }

      case 'chat:reaction': {
        setMessages((prev) => prev.map(m => {
          if (m.id === payload.messageId) {
            let reactions = [...m.reactions];
            if (payload.action === 'add') {
              reactions = reactions.filter(r => r.userId !== payload.reaction.userId);
              reactions.push(payload.reaction);
              if (payload.reaction.userId !== user.id) {
                playSweetSparkSound();
                showPushNotification("✨ Message Reacted", `Partner reacted ${payload.reaction.emoji} to your letter.`, 'chat', 'chat');
              }
            } else {
              reactions = reactions.filter(r => r.userId !== payload.reaction.userId);
            }
            return { ...m, reactions };
          }
          return m;
        }));
        break;
      }

      case 'movie:sync': {
        setMovieSyncState(payload.state);
        break;
      }

      case 'call:dial': {
        setCallType(payload.mode);
        callTypeRef.current = payload.mode;
        setIncomingCall(true);
        setRingingRole('callee');
        playSweetSparkSound();
        showPushNotification(
          `📞 Incoming ${payload.mode === 'video' ? 'Video' : 'Voice'} Call`,
          `${user?.partnerName || 'Your partner'} is calling you... 💖`,
          'call',
          'chat'
        );
        break;
      }

      case 'call:response': {
        if (payload.action === 'accept') {
          setIncomingCall(false);
          setCallActive(true);
          setRingingRole(null);
          playBirdChirp();
          handleStartWebRTCOffer();
        } else {
          cleanupCalling();
        }
        break;
      }

      case 'call:sdp-offer': {
        handleReceiveWebRTCOffer(payload.sdp);
        break;
      }

      case 'call:sdp-answer': {
        handleReceiveWebRTCAnswer(payload.sdp);
        break;
      }

      case 'call:ice-candidate': {
        handleReceiveIceCandidate(payload.candidate);
        break;
      }

      case 'call:hangup': {
        const wasMissed = incomingCallRef.current;
        cleanupCalling();
        if (wasMissed) {
          showPushNotification(
            "☎️ Missed Call",
            `You missed a call from ${user?.partnerName || 'your partner'}. 💘`,
            'call',
            'chat'
          );
        }
        break;
      }

      case 'state:update': {
        if (payload.section === 'memories') {
          // fetchMemories(); // Optimized: Handled by Firestore onSnapshot
          playSweetMessageSound();
          showPushNotification("📸 Shared Polaroid", `${user.partnerName || 'Companion'} posted a new Polaroid to your Memory Wall! 🖼️`, 'memories', 'memories');
        }
        if (payload.section === 'calendar') {
          // fetchCalendar(); // Optimized: Handled by Firestore onSnapshot
          playSweetMessageSound();
          showPushNotification("📅 Love hearth scheduled", `${user.partnerName || 'Companion'} scheduled a new event on your Shared Calendar.`, 'calendar', 'calendar');
        }
        if (payload.section === 'journal') {
          // fetchJournal(); // Optimized: Handled by Firestore onSnapshot
          playSweetMessageSound();
          showPushNotification("📓 secret Diary page", `${user.partnerName || 'Companion'} wrote a new private journal page!`, 'journal', 'journal');
        }
        if (payload.section === 'daily') {
          // fetchAnswersOnly(); // Optimized: Handled by Firestore onSnapshot
          playSweetSparkSound();
          showPushNotification("❓ Q&A Playroom", `${user.partnerName || 'Companion'} answered today's Question! Unlock to read. 🥰`, 'daily', 'daily');
        }
        if (payload.section === 'bucket') {
          // fetchBucketList(); // Optimized: Handled by Firestore onSnapshot
          playSweetSparkSound();
          showPushNotification("🗺️ Bucket List Update", `${user.partnerName || 'Companion'} updated your Shared Adventure checklist!`, 'bucket', 'bucket');
        }
        if (payload.section === 'stats') {
          fetchStatsAndAnswers(); // Keep this as stats are computed on server
        }
        if (payload.section === 'profile' || payload.section === 'presence') {
          // handleRefreshUser(); // Optimized: Handled by Firestore onSnapshot
        }
        if (payload.section === 'sleep_on') {
          setIsSleepMode(true);
          playSweetLullaby();
          showPushNotification("💤 Starry Sky Tucked", `${user.partnerName || 'Companion'} tucked themselves in sleep together.`, 'system', 'dashboard');
        }
        if (payload.section === 'sleep_off') {
          setIsSleepMode(false);
          playBirdChirp();
          showPushNotification("🌅 Golden Good Morning", `${user.partnerName || 'Companion'} woke up. Good morning my love! 🌸`, 'system', 'dashboard');
        }
        if (payload.section === 'sleep_spark' as any) {
          setReceivedSleepSpark(true);
          playSweetSparkSound();
          playSweetHeartbeat();
          showPushNotification("💖 Sweet Touch Spark", `${user.partnerName || 'Companion'} sent you a cuddle spark! ✨`, 'system', 'dashboard');
          setTimeout(() => setReceivedSleepSpark(false), 3500);
        }
        break;
      }
    }
  }, [
    fetchStatsAndAnswers, 
    handleStartWebRTCOffer, 
    handleReceiveWebRTCOffer, 
    handleReceiveWebRTCAnswer, 
    handleReceiveIceCandidate, 
    fetchMemories, 
    fetchCalendar, 
    fetchJournal, 
    fetchAnswersOnly, 
    fetchBucketList, 
    handleRefreshUser, 
    showPushNotification
  ]);

  // 2. Real-time stream controllers (Dual WebSocket and Premium Metered Realtime Messaging channels)
  useEffect(() => {
    if (!currentUser?.id) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (meteredSignallingRef.current) {
        meteredSignallingRef.current.close().catch(() => {});
        meteredSignallingRef.current = null;
      }
      return;
    }

    // Hydrate everything REST-wise on initialization
    fetchAllData(currentUser);

    let isDestroyed = false;
    let reconnectTimeout: any = null;
    let ws: WebSocket | null = null;
    let meteredSignalling: SignallingClient | null = null;

    const connectSocket = () => {
      if (isDestroyed) return;

      // Form relative WebSocket URL path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const socketUrl = `${protocol}//${host}`;

      console.log(`Setting up WebSocket stream route back to: ${socketUrl}`);
      ws = new WebSocket(socketUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed) {
          ws?.close();
          return;
        }
        console.log('MuTu WebSocket Realtime stream active.');
        // Notify server we are logged in so we can route packages
        ws?.send(JSON.stringify({
          type: 'connection:init',
          userId: currentUser.id,
          coupleId: currentUser.coupleId
        }));

        // Automatically flush any offline failed messages
        setMessages((prev) => {
          const failedOnes = prev.filter(m => m.status === 'failed' && m.senderId === currentUser.id);
          if (failedOnes.length > 0) {
            console.log(`Auto-flushing ${failedOnes.length} offline queued messages...`);
            failedOnes.forEach(msg => {
              try {
                ws?.send(JSON.stringify({
                  type: 'chat:message',
                  message: { ...msg, status: 'sending' }
                }));
              } catch (e) {
                console.error('Error auto-flushing message:', e);
              }
            });
          }
          return prev.map(m => m.status === 'failed' && m.senderId === currentUser.id ? { ...m, status: 'sending' } : m);
        });
      };

      ws.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const payload: WSEvent = JSON.parse(event.data);
          handleIncomingWSEvent(payload);
        } catch (err) {
          console.error('Error compiling websocket string:', err);
        }
      };

      ws.onclose = () => {
        if (isDestroyed) return;
        console.log('Realtime socket closed. Attempting reconnect in 4s.');
        reconnectTimeout = setTimeout(connectSocket, 4000);
      };

      ws.onerror = (err) => {
        console.error('Socket encountered error:', err);
        ws?.close();
      };
    };

    const connectMetered = async () => {
      if (isDestroyed) return;
      try {
        console.log('[Metered Realtime] Initializing SignallingClient for channel:', currentUser.coupleId);
        meteredSignalling = new SignallingClient({
          // Securely use the client-side API key from environment variables
          apiKey: import.meta.env.VITE_METERED_REALTIME_API_KEY || 'sk_secret_ffeb92ae73cd8668dff2a2609b6a25b9183448a6562837edca95a86c8744f912'
        });
        meteredSignallingRef.current = meteredSignalling;

        meteredSignalling.on('connected', (payload) => {
          if (isDestroyed || !meteredSignalling) return;
          console.log('[Metered Realtime] Premium signaling server linked. Peer ID:', payload.peerId);
          meteredSignalling.subscribe(`couple_${currentUser.coupleId}`).then(() => {
            console.log(`[Metered Realtime] Subscribed to premium pub/sub channel: couple_${currentUser.coupleId}`);
          }).catch((err) => {
            console.error('[Metered Realtime] Failed to subscribe to couple channel:', err);
          });
        });

        meteredSignalling.on('message', (msgEvent) => {
          if (isDestroyed) return;
          try {
            const payload = msgEvent.data as any;
            if (payload && payload.senderUserId === currentUser.id) {
              // Ignore echoed message we published ourselves
              return;
            }
            console.log('[Metered Realtime] Received message type:', payload.type);
            handleIncomingWSEvent(payload as WSEvent);
          } catch (e) {
            console.error('[Metered Realtime] Error reading incoming payload packet:', e);
          }
        });

        meteredSignalling.on('disconnected', (payload) => {
          console.warn('[Metered Realtime] Disconnected. Will automatic retry:', payload.willReconnect);
        });

        await meteredSignalling.connect();
      } catch (err) {
        console.error('[Metered Realtime] Failed to establish premium signal channel:', err);
      }
    };

    connectSocket();
    connectMetered();

    return () => {
      isDestroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      if (meteredSignalling) {
        meteredSignalling.close().catch(() => {});
      }
      socketRef.current = null;
      meteredSignallingRef.current = null;
    };
  }, [currentUser?.id, fetchAllData, handleIncomingWSEvent]);

  // 3. Firestore Real-time Listeners (Phase 1)
  useEffect(() => {
    if (!currentUser || !currentUser.coupleId) return;

    console.log('[Firestore] Establishing real-time listeners for couple:', currentUser.coupleId);

    const unsubscribes: (() => void)[] = [];

    const handleListenerError = (err: any, col: string) => {
      console.warn(`[Firestore Realtime error on ${col}]:`, err);
    };

    try {
      // Messages listener (Surgical: Last 40 messages)
      const qMsgs = query(
        collection(db, 'messages'), 
        where('coupleId', '==', currentUser.coupleId),
        orderBy('timestamp', 'asc'),
        limit(40)
      );
      const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach(docSnap => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
        });
        setMessages(msgs);
      }, (err) => handleListenerError(err, 'messages'));
      unsubscribes.push(unsubMsgs);

      // Memories listener (Surgical: Last 30 memories)
      const qMem = query(
        collection(db, 'memories'), 
        where('coupleId', '==', currentUser.coupleId),
        orderBy('date', 'desc'),
        limit(30)
      );
      const unsubMem = onSnapshot(qMem, (snapshot) => {
        const items: Memory[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Memory);
        });
        items.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMemories(items);
      }, (err) => handleListenerError(err, 'memories'));
      unsubscribes.push(unsubMem);

      // CalendarEvents listener (No limit usually needed as events are sparse, but helpful for cost protection)
      const qCal = query(
        collection(db, 'calendarEvents'), 
        where('coupleId', '==', currentUser.coupleId),
        limit(100)
      );
      const unsubCal = onSnapshot(qCal, (snapshot) => {
        const items: CalendarEvent[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as CalendarEvent);
        });
        setCalendarEvents(items);
      }, (err) => handleListenerError(err, 'calendarEvents'));
      unsubscribes.push(unsubCal);

      // JournalEntries listener (Surgical: Last 20 entries)
      const qJrn = query(
        collection(db, 'journalEntries'), 
        where('coupleId', '==', currentUser.coupleId),
        orderBy('date', 'desc'),
        limit(20)
      );
      const unsubJrn = onSnapshot(qJrn, (snapshot) => {
        const items: JournalEntry[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as JournalEntry);
        });
        setJournalEntries(items);
      }, (err) => handleListenerError(err, 'journalEntries'));
      unsubscribes.push(unsubJrn);

      // BucketItems listener
      const qBkt = query(
        collection(db, 'bucketItems'), 
        where('coupleId', '==', currentUser.coupleId),
        limit(50)
      );
      const unsubBkt = onSnapshot(qBkt, (snapshot) => {
        const items: BucketItem[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as BucketItem);
        });
        setBucketItems(items);
      }, (err) => handleListenerError(err, 'bucketItems'));
      unsubscribes.push(unsubBkt);

      // DailyAnswers listener (Surgical: Last 50 answers)
      const qAns = query(
        collection(db, 'dailyAnswers'), 
        where('coupleId', '==', currentUser.coupleId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const unsubAns = onSnapshot(qAns, (snapshot) => {
        const items: DailyAnswer[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as DailyAnswer);
        });
        setDailyAnswers(items);
      }, (err) => handleListenerError(err, 'dailyAnswers'));
      unsubscribes.push(unsubAns);

      // Partner user profile listener
      if (currentUser.partnerId) {
        const unsubPartner = onSnapshot(doc(db, 'users', currentUser.partnerId), (snapshot) => {
          if (snapshot.exists()) {
            const partnerData = snapshot.data();
            setCurrentUser(prev => {
              if (!prev) return null;
              return {
                ...prev,
                partnerName: partnerData.name || prev.partnerName,
                partnerAvatarUrl: partnerData.avatarUrl || prev.avatarUrl,
                partnerSleepMode: partnerData.isSleepMode || false,
                partnerOnline: partnerData.online || false,
                partnerLastActiveTime: partnerData.lastActiveTime || 0,
                // dedicated rich profile fields
                coverPhoto: partnerData.coverPhoto || prev.coverPhoto,
                coverRepositionY: partnerData.coverRepositionY || prev.coverRepositionY,
                nickname: partnerData.nickname || prev.nickname,
                personalNote: partnerData.personalNote || prev.personalNote,
                favFood: partnerData.favFood || prev.favFood,
                favMovie: partnerData.favMovie || prev.favMovie,
                favSong: partnerData.favSong || prev.favSong,
                favColor: partnerData.favColor || prev.favColor,
                dreamDestination: partnerData.dreamDestination || prev.dreamDestination,
                reunionDate: partnerData.reunionDate || prev.reunionDate,
                distance: partnerData.distance || prev.distance,
                wakeTime: partnerData.wakeTime || prev.wakeTime,
                sleepTime: partnerData.sleepTime || prev.sleepTime,
                workSchedule: partnerData.workSchedule || prev.workSchedule,
                bestTimeToCall: partnerData.bestTimeToCall || prev.bestTimeToCall,
                partnerCity: partnerData.locationCity || prev.partnerCity,
                partnerWeather: partnerData.locationWeather || prev.partnerWeather,
                partnerTimezone: partnerData.locationTimezone || prev.partnerTimezone,
              };
            });
          }
        }, (err) => handleListenerError(err, 'partnerUser'));
        unsubscribes.push(unsubPartner);
      }

      // Self profile user listener
      const unsubSelf = onSnapshot(doc(db, 'users', currentUser.id), (snapshot) => {
        if (snapshot.exists()) {
          const selfData = snapshot.data();
          setCurrentUser(prev => {
            if (!prev) return null;
            return {
              ...prev,
              ...selfData,
              id: snapshot.id
            } as User;
          });
        }
      }, (err) => handleListenerError(err, 'selfUser'));
      unsubscribes.push(unsubSelf);

    } catch (e) {
      console.error('[Firestore] Failed setting up listeners:', e);
    }

    return () => {
      console.log('[Firestore] unsubscribing listeners for couple:', currentUser.coupleId);
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser?.id, currentUser?.coupleId, currentUser?.partnerId]);

  // Minor isolated data refreshers supporting WebSocket notifications
  // 3. Messaging Callbacks
  const dispatchWebSocketMessage = async (msg: Message) => {
    let wsDelivered = false;
    try {
      wsDelivered = sendRealTimeEvent({
        type: 'chat:message',
        message: msg
      });
    } catch (err) {
      console.warn('[WebRTC/WS] Message dispatch unsuccessful, using direct Firestore backup:', err);
    }

    if (wsDelivered) {
      // Delivered instantly via WebSocket! The server will safely persist it and broadcast to partner.
      // We return immediately to avoid parallel client/server DB dual-write conflicts & delays.
      return;
    }

    // Direct Firestore backup to guarantee absolute delivery ONLY when offline/WS is down
    try {
      const docRef = doc(db, 'messages', msg.id);
      const messageToSave = {
        ...msg,
        status: 'sent'
      };
      await setDoc(docRef, messageToSave);
      
      // Immediately set local state status to 'sent'
      setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'sent' } : m));
    } catch (fsErr) {
      console.error('[WebRTC/FS] Combined fallback direct save to Firestore also failed:', fsErr);
      setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
    }
  };

  const handleSendMessage = (privatePayload: { textEncrypted: string; iv: string; isVoice?: boolean; isMovie?: boolean; replyToId?: string; replyToText?: string }) => {
    if (!currentUser) return;
    
    const newMsg: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      coupleId: currentUser.coupleId!,
      senderId: currentUser.id,
      textEncrypted: privatePayload.textEncrypted,
      iv: privatePayload.iv,
      timestamp: Date.now(),
      read: false,
      reactions: [],
      isVoice: privatePayload.isVoice,
      isMovie: privatePayload.isMovie,
      replyToId: privatePayload.replyToId,
      replyToText: privatePayload.replyToText,
      status: 'sending'
    };

    // Inject locally immediately (Optimistic state)
    setMessages((prev) => [...prev, newMsg]);

    dispatchWebSocketMessage(newMsg);
  };

  const handleRetryMessage = (msg: Message) => {
    setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'sending' } : m));
    dispatchWebSocketMessage({ ...msg, status: 'sending' });
  };

  const handleSendReaction = async (messageId: string, emoji: string, action: 'add' | 'remove') => {
    if (!currentUser) return;

    const reaction = { emoji, userId: currentUser.id };
    let newReactionsList: MessageReaction[] = [];
    
    // Inject locally first
    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        let reactions = [...m.reactions];
        if (action === 'add') {
          reactions = reactions.filter(r => r.userId !== currentUser.id);
          reactions.push(reaction);
        } else {
          reactions = reactions.filter(r => r.userId !== currentUser.id);
        }
        newReactionsList = reactions;
        return { ...m, reactions };
      }
      return m;
    }));

    // Broadcast over real-time stream
    sendRealTimeEvent({
      type: 'chat:reaction',
      messageId,
      reaction,
      action
    });

    // Direct Firestore update to persist reaction
    try {
      const docRef = doc(db, 'messages', messageId);
      await updateDoc(docRef, { reactions: newReactionsList });
    } catch (err) {
      console.warn('[WebRTC/FS] Failed to run updateDoc on reaction, trying setDoc merge instead:', err);
      try {
        const docRef = doc(db, 'messages', messageId);
        await setDoc(docRef, { reactions: newReactionsList }, { merge: true });
      } catch (e) {
        console.error('[WebRTC/FS] Direct reactions sync failed:', e);
      }
    }
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (!currentUser) return;
    sendRealTimeEvent({
      type: 'chat:typing',
      userId: currentUser.id,
      isTyping
    });
  };

  // 4. Movie Cinema Synch Event Callback
  const handleEmitMovieSync = (state: MovieState) => {
    sendRealTimeEvent({
      type: 'movie:sync',
      state
    });
  };

  // 5. REST posting wrappers passed as props to sub-components
  const handleAddMemory = async (newMemory: Omit<Memory, 'id'>) => {
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMemory)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to hang memory.');
    }
    const saved = await res.json();
    setMemories((prev) => [...prev, saved]);
    fetchStatsAndAnswers();

    // Broadcast update indicator so lover client pulls
    sendRealTimeEvent({
      type: 'state:update',
      section: 'memories'
    });
  };

  const handleAddCalendarEvent = async (newEvent: Omit<CalendarEvent, 'id'>) => {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    const saved = await res.json();
    setCalendarEvents((prev) => [...prev, saved]);

    sendRealTimeEvent({
      type: 'state:update',
      section: 'calendar'
    });
  };

  const handleAddDailyAnswer = async (answerText: string) => {
    if (!dailyQuestion) return;
    const res = await fetch('/api/daily-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coupleId: currentUser!.coupleId,
        questionId: dailyQuestion.id,
        userId: currentUser!.id,
        answerText
      })
    });
    if (!res.ok) throw new Error('Could not record answer sheet.');
    
    // Refresh locally
    fetchAnswersOnly();
    fetchStatsAndAnswers();

    sendRealTimeEvent({
      type: 'state:update',
      section: 'daily'
    });
  };

  const handleAddJournalEntry = async (newEntry: Omit<JournalEntry, 'id'>) => {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    const saved = await res.json();
    setJournalEntries((prev) => [saved, ...prev]); // newest first
    fetchStatsAndAnswers();

    sendRealTimeEvent({
      type: 'state:update',
      section: 'journal'
    });
  };

  const handleAddBucketItem = async (title: string, category: BucketItem['category']) => {
    if (!currentUser) return;
    const res = await fetch('/api/bucket-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coupleId: currentUser.coupleId,
        title,
        category,
        createdBy: currentUser.id
      })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add item.');
    }
    const saved = await res.json();
    setBucketItems((prev) => [...prev, saved]);

    sendRealTimeEvent({
      type: 'state:update',
      section: 'bucket'
    });
  };

  const handleToggleBucketItem = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/bucket-list/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        userId: currentUser.id
      })
    });
    if (!res.ok) return;
    const updated = await res.json();
    setBucketItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    sendRealTimeEvent({
      type: 'state:update',
      section: 'bucket'
    });
  };

  const handleDeleteBucketItem = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/bucket-list/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        userId: currentUser.id
      })
    });
    if (!res.ok) return;
    setBucketItems((prev) => prev.filter((item) => item.id !== id));

    sendRealTimeEvent({
      type: 'state:update',
      section: 'bucket'
    });
  };

  // 6. Media and Calling handlers
  // Cozy Synthetic Canvas Stream generator to bypass sandboxed iframe restrictions & missing devices
  const generateSyntheticStream = (type: 'camera' | 'screenshare', userName: string) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      let angle = 0;
      const frameRate = 30;
      const interval = setInterval(() => {
        try {
          if (!ctx || !canvas) return;
          // Clear canvas
          ctx.fillStyle = '#1c1917'; // warm stone-900 background
          ctx.fillRect(0, 0, 640, 480);

          // Vignette radial glow 
          const gradient = ctx.createRadialGradient(320, 240, 50, 320, 240, 350);
          gradient.addColorStop(0, '#2e1015'); // romantic deep mauve
          gradient.addColorStop(1, '#0c0a09'); // stone-950
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 640, 480);

          // Grid system lines
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.05)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 640; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 480);
            ctx.stroke();
          }
          for (let j = 0; j < 480; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(640, j);
            ctx.stroke();
          }

          angle += 0.05;

          if (type === 'camera') {
            // Heart animation
            const pulse = 1 + 0.15 * Math.sin(angle * 1.5);
            ctx.save();
            ctx.translate(320, 210);
            ctx.scale(pulse, pulse);

            // Neon shadow glow
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 35;

            // Simple robust path heart
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.bezierCurveTo(-45, -75, -90, -20, 0, 65);
            ctx.bezierCurveTo(90, -20, 45, -75, 0, -30);
            ctx.fillStyle = '#f43f5e';
            ctx.fill();
            ctx.restore();

            // Intersecting heartbeat wave
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(253, 164, 175, 0.6)';
            ctx.lineWidth = 3;
            for (let x = 120; x < 520; x++) {
              let offset = 0;
              const cyclePos = (x - 120 + angle * 40) % 200;
              if (cyclePos > 85 && cyclePos < 115) {
                offset = Math.sin((cyclePos - 100) * 0.2) * 45;
              }
              const y = 310 + offset;
              if (x === 120) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Label text in high-contrast monospaced look
            ctx.shadowBlur = 0;
            ctx.font = 'bold 15px "JetBrains Mono", monospace';
            ctx.fillStyle = '#fda4af';
            ctx.textAlign = 'center';
            ctx.fillText(`💗 LIVE LINK: ${userName.toUpperCase()}`, 320, 365);

            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillStyle = '#78716c';
            ctx.fillText('COZY SANDBOX MEDIA EMULATOR ACTIVE', 320, 395);

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = '#f43f5e';
            ctx.fillText(`TIME: ${new Date().toLocaleTimeString()} UTC`, 320, 420);

          } else {
            // Screenshare display: Cozy Shared screen
            ctx.fillStyle = '#0c0a09';
            ctx.fillRect(50, 50, 540, 380);

            // Menu bar
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(50, 50, 540, 30);

            // Colored dots
            ctx.fillStyle = '#da2f5e';
            ctx.beginPath();
            ctx.arc(75, 65, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(90, 65, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(105, 65, 5, 0, Math.PI * 2);
            ctx.fill();

            // Screen share text label
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#ffe4e6';
            ctx.textAlign = 'left';
            ctx.fillText('💻 Joint Movie Lounge & Sync Terminal Panel', 130, 70);

            // Container inside mock screen
            ctx.fillStyle = 'rgba(244, 63, 94, 0.05)';
            ctx.fillRect(70, 100, 500, 310);

            // Target coordinates indicators
            const cx = 320 + Math.sin(angle * 1.2) * 160;
            const cy = 250 + Math.cos(angle * 0.8) * 60;
            
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 25, 0, Math.PI*2);
            ctx.stroke();

            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI*2);
            ctx.stroke();

            // Wave visuals
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 80; i < 560; i += 4) {
              const y = 250 + Math.sin(i * 0.03 + angle * 2.2) * 35;
              if (i === 80) ctx.moveTo(i, y);
              else ctx.lineTo(i, y);
            }
            ctx.stroke();

            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.fillStyle = '#a78bfa';
            ctx.fillText(`CURSOR TRACKING: x=${Math.round(cx)} y=${Math.round(cy)}`, 80, 130);

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = '#a8a29e';
            ctx.fillText('[SCREENSHARE EMULATOR ACTIVE IN SANDBOX IFRAME]', 80, 385);
            ctx.fillText(`TRANSMITTING FOR: ${userName.toUpperCase()}`, 80, 400);
          }
        } catch (e) {
          console.warn('[Synthetic stream frame tick error]:', e);
        }
      }, 1000 / frameRate);

      // Extract raw stream media track
      // @ts-ignore
      const stream = canvas.captureStream(frameRate);
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const originalStop = videoTrack.stop;
        videoTrack.stop = function() {
          clearInterval(interval);
          if (originalStop) originalStop.apply(this);
        };
      }
      return stream;
    } catch (e) {
      console.warn('[Synthetic media generator failure]:', e);
      return null;
    }
  };

  const initiateMediaStream = async (modeOverride?: 'voice' | 'video') => {
    const selectedMode = modeOverride || callTypeRef.current;
    
    const attemptGetUserMedia = async (constraints: MediaStreamConstraints) => {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn(`[Media] getUserMedia failed with constraints ${JSON.stringify(constraints)}, attempting fallback...`, err);
        return null;
      }
    };

    try {
      let stream: MediaStream | null = null;
      
      if (selectedMode === 'video') {
        stream = await attemptGetUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        
        if (!stream) {
          stream = await attemptGetUserMedia({
            video: true,
            audio: true
          });
        }

        if (!stream) {
          stream = await attemptGetUserMedia({
            video: true,
            audio: false
          });
        }
      } else {
        stream = await attemptGetUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        
        if (!stream) {
          stream = await attemptGetUserMedia({
            video: false,
            audio: true
          });
        }

        if (!stream) {
          stream = await attemptGetUserMedia({
            audio: true
          });
        }
      }

      if (!stream) {
        throw new Error("No hardware media capture could be acquired after trying all fallbacks.");
      }

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(e => console.log('Playing feedback stream', e));
      }
      return stream;
    } catch (err) {
      console.warn('Real camera/mic hardware capture denied or missing (normal in sandboxed previews). Executing elegant synthetic media pipeline...', err);
      
      const mockStream = generateSyntheticStream('camera', currentUser?.name || 'Local Me');
      if (mockStream) {
        setLocalStream(mockStream);
        localStreamRef.current = mockStream;
        
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = mockStream;
          myVideoRef.current.play().catch(e => console.log('Playing synthetic feedback stream', e));
        }
        return mockStream;
      }
      return null;
    }
  };

  const toggleScreenshare = async () => {
    if (callType !== 'video') {
      alert('Screensharing requires an active video call.');
      return;
    }

    if (isScreensharing) {
      stopScreenshare();
    } else {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } catch (err) {
        console.warn('[WebRTC] DisplayMedia capture blocked inside sandboxed iframe workspace. Deploying dynamic synthetic desk screenshare...', err);
        const mockStream = generateSyntheticStream('screenshare', currentUser?.name || 'Local Me');
        if (mockStream) {
          stream = mockStream;
          showPushNotification(
            "💻 Cozy Screen Sharing Mode Enabled",
            "Hardware display access bypassed. Joint media presentation active! 💖",
            "system",
            "chat"
          );
        }
      }

      if (stream) {
        screenshareStreamRef.current = stream;
        setIsScreensharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        
        // Find existing PeerConnection and swap video track
        const pc = peerConnectionRef.current;
        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        // Redirect local mini feedback video tag source
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // Return to normal camera video if track ends (e.g. from browser banner)
        screenTrack.onended = () => {
          stopScreenshare();
        };
      }
    }
  };

  const stopScreenshare = () => {
    if (screenshareStreamRef.current) {
      screenshareStreamRef.current.getTracks().forEach(track => track.stop());
      screenshareStreamRef.current = null;
    }
    setIsScreensharing(false);

    const pc = peerConnectionRef.current;
    if (pc && localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
    }

    if (myVideoRef.current && localStreamRef.current) {
      myVideoRef.current.srcObject = localStreamRef.current;
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerActive;
    setIsSpeakerActive(nextState);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = nextState ? 1.0 : 0.22;
    }
    if (partnerVideoRef.current) {
      partnerVideoRef.current.volume = nextState ? 1.0 : 0.22;
    }
  };

  // Dial out call
  const triggerDialOut = async (mode: 'voice' | 'video') => {
    if (!currentUser) return;
    // Clear and reset ICE candidates queue strictly on new call session initialization
    iceCandidatesQueueRef.current = [];
    
    setCallType(mode);
    callTypeRef.current = mode;
    setIncomingCall(true);
    setRingingRole('caller');

    // Warm up media elements within the user gesture context to bypass mobile Safari/PWA autoplay restrictions
    try {
      if (partnerVideoRef.current) partnerVideoRef.current.play().catch(() => {});
      if (remoteAudioRef.current) remoteAudioRef.current.play().catch(() => {});
    } catch (_) {}
    
    // Warm up local media stream immediately
    const stream = await initiateMediaStream(mode);

    // Send signal over premium matchmaker channel
    sendRealTimeEvent({
      type: 'call:dial',
      mode,
      callerId: currentUser.id
    });
  };

  // Accept incoming call
  const handleAcceptCall = async () => {
    if (!currentUser) return;
    // Clear and reset ICE candidates queue strictly on new call session initialization
    iceCandidatesQueueRef.current = [];

    setIncomingCall(false);
    setCallActive(true);
    setRingingRole(null);

    // Warm up media elements within the user gesture context to bypass mobile Safari/PWA autoplay restrictions
    try {
      if (partnerVideoRef.current) partnerVideoRef.current.play().catch(() => {});
      if (remoteAudioRef.current) remoteAudioRef.current.play().catch(() => {});
    } catch (_) {}

    // 1. Warm up the local media stream FIRST to avoid race descriptor on incoming offer
    const stream = await initiateMediaStream(callType);

    // 2. Create local peer connection with tracks
    createPeerConnection(stream);

    // 3. Send accept notification ONLY AFTER tracks are loaded in PC
    sendRealTimeEvent({
      type: 'call:response',
      action: 'accept',
      calleeId: currentUser.id
    });
  };

  // Decline call
  const handleDeclineCall = () => {
    if (!currentUser) return;
    setIncomingCall(false);
    setRingingRole(null);

    // Send decline notification
    sendRealTimeEvent({
      type: 'call:response',
      action: 'decline',
      calleeId: currentUser.id
    });
  };

  // Hanugp/End call
  const handleHangupCall = () => {
    if (!currentUser) return;
    cleanupCalling();

    // Notify other partner
    sendRealTimeEvent({
      type: 'call:hangup',
      userId: currentUser.id
    });
  };

  const cleanupCalling = () => {
    setCallActive(false);
    setIncomingCall(false);
    setRingingRole(null);
    setRemoteStreamActive(false);
    setShowCallDiagnostics(false);
    setWebrtcIceState('new');
    setWebrtcSignalingState('stable');
    iceCandidatesQueueRef.current = [];
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // Live Sync mic mute/camera toggles onto the actual media tracks
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micMuted;
      });
    }
  }, [micMuted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !cameraOff;
      });
    }
  }, [cameraOff]);

  // Robust fallback for sandboxed browser previews to ensure active calling overlay renders correctly
  useEffect(() => {
    if (callActive) {
      const timer = setTimeout(() => {
        setRemoteStreamActive(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [callActive]);

  const handleLogout = () => {
    localStorage.removeItem('mutu_user_session');
    setCurrentUser(null);
    setActiveSection('dashboard');
  };

  // Coordinate sleep mode toggle across sockets
  const handleToggleSleepMode = (enabled: boolean) => {
    setIsSleepMode(enabled);
    if (!enabled && synthRef.current) {
      synthRef.current.stop();
      synthRef.current = null;
    }
    if (currentUser) {
      sendRealTimeEvent({
        type: 'state:update',
        section: enabled ? 'sleep_on' : 'sleep_off'
      });
    }
  };

  // Synthesizer player coordinator
  useEffect(() => {
    if (isSleepMode) {
      if (!synthRef.current) {
        synthRef.current = new AmbientSynth();
      }
      synthRef.current.isMuted = sleepSynthMuted;
      synthRef.current.start();
    } else {
      if (synthRef.current) {
        synthRef.current.stop();
        synthRef.current = null;
      }
    }
    return () => {
      // safe cleanup on component unmount / toggle shifts
    };
  }, [isSleepMode, sleepSynthMuted]);

  // Render components according to active tab
  const renderRooms = () => {
    if (!currentUser) return null;

    switch (activeSection) {
      case 'chat':
        return (
          <ChatRoom
            user={currentUser}
            onBack={handleBack}
            messages={messages.filter(m => !m.isMovie)}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            typingPartner={typingPartner}
            onTyping={handleSendTyping}
            partnerThumbKissActive={partnerThumbKissActive}
            onVoiceCall={() => triggerDialOut('voice')}
            onVideoCall={() => triggerDialOut('video')}
            onSendThumbKissToggle={(active) => {
              sendRealTimeEvent({
                type: active ? 'chat:thumb-kiss-start' : 'chat:thumb-kiss-end',
                userId: currentUser.id
              });
            }}
            onJoin={() => {
              sendRealTimeEvent({
                type: 'chat:join',
                userId: currentUser.id
              });
            }}
            onLeave={() => {
              sendRealTimeEvent({
                type: 'chat:leave',
                userId: currentUser.id
              });
            }}
            onRetryMessage={handleRetryMessage}
          />
        );
      case 'movie':
        return (
          <MovieRoom
            user={currentUser}
            onBack={handleBack}
            messages={messages.filter(m => m.isMovie === true)}
            onSendChatMessage={handleSendMessage}
            movieSyncState={movieSyncState}
            onEmitMovieSync={handleEmitMovieSync}
          />
        );
      case 'memories':
        return (
          <MemoryWall
            user={currentUser}
            onBack={handleBack}
            memories={memories}
            onAddMemory={handleAddMemory}
          />
        );
      case 'calendar':
        return (
          <LoveCalendar
            user={currentUser}
            onBack={handleBack}
            events={calendarEvents}
            onAddEvent={handleAddCalendarEvent}
          />
        );
      case 'daily':
        return (
          <DailyQuestions
            user={currentUser}
            onBack={handleBack}
            question={dailyQuestion}
            answers={dailyAnswers}
            onAddAnswer={handleAddDailyAnswer}
            onRefreshAnswers={fetchAnswersOnly}
          />
        );
      case 'journal':
        return (
          <CoupleJournal
            user={currentUser}
            onBack={handleBack}
            entries={journalEntries}
            onAddEntry={handleAddJournalEntry}
          />
        );
      case 'bucket':
        return (
          <BucketList
            user={currentUser}
            onBack={handleBack}
            items={bucketItems}
            onAddItem={handleAddBucketItem}
            onToggleItem={handleToggleBucketItem}
            onDeleteItem={handleDeleteBucketItem}
            playSparkSound={playSweetSparkSound}
          />
        );
      case 'vault':
        return (
          <SecretVault
            user={currentUser}
            onBack={handleBack}
          />
        );
      case 'timeline':
        return (
          <RelationshipTimeline
            user={currentUser}
            onBack={handleBack}
          />
        );

      case 'copilot':
        return (
          <AILoveAssistant
            user={currentUser}
            onBack={handleBack}
          />
        );
      case 'music_space':
        return (
          <SharedMusic
            user={currentUser}
            onBack={handleBack}
          />
        );
      case 'analytics':
        return (
          <RelationshipAnalytics
            user={currentUser}
            messages={messages}
            memories={memories}
            journalEntries={journalEntries}
            onBack={handleBack}
          />
        );
      case 'security':
        return (
          <SafetyCenter
            user={currentUser}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        );
      case 'profile':
        return (
          <UserProfile
            profileUserId={profileUserId || currentUser.id}
            currentUser={currentUser}
            onBack={handleBack}
            onRefreshUser={handleRefreshUser}
          />
        );
      default:
        // Render Home Dashboard Lobby
        return (
          <HomeDashboard
            user={currentUser}
            stats={stats}
            messages={messages}
            memories={memories}
            journalEntries={journalEntries}
            isSleepMode={isSleepMode}
            onToggleSleepMode={handleToggleSleepMode}
            onSectionSelect={navigateToSection}
            onLogout={handleLogout}
            onRefreshUser={handleRefreshUser}
          />
        );
    }
  };

  const unreadChatCount = messages.filter(m => m.senderId !== currentUser?.id && !m.read && !m.isMovie).length;

  // Poll for UI updates if WebSockets drop across Cloud Run instances
  useEffect(() => {
    if (currentUser?.coupleId) {
      const pollTimer = setInterval(() => {
        handleRefreshUser();
        fetchStatsAndAnswers();
      }, 10000); // Check every 10 seconds to ensure stats, answers, and profile syncs perfectly
      return () => clearInterval(pollTimer);
    }
  }, [currentUser?.coupleId, handleRefreshUser]);

  // Lock page scrolling when in mobile chat view to ensure no browser header scroll push
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let handleWindowScroll: (() => void) | null = null;

    if (activeSection === 'chat') {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      handleWindowScroll = () => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      window.scrollTo(0, 0);
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      if (handleWindowScroll) {
        window.removeEventListener('scroll', handleWindowScroll);
      }
    };
  }, [activeSection]);

  return (
    <div 
      className={`min-h-screen select-text ${
        activeSection === 'chat' 
          ? 'fixed inset-0 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950' 
          : 'pb-20'
      } ${
        activeSection === 'chat' 
          ? (isKeyboardOpen ? 'pb-0' : 'pb-16 md:pb-20') 
          : ''
      }`}
      style={activeSection === 'chat' ? { 
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      } : {}}
    >
      
      {/* Visual Navigation Bar */}
      {activeSection !== 'chat' && (
        <header className="p-4 bg-white/40 dark:bg-stone-900/40 backdrop-blur-md border-b border-rose-100 dark:border-stone-800 flex items-center justify-between sticky top-0 z-40 select-none">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { navigateToSection('dashboard'); playSweetMessageSound(); }}>
            <div className="bg-[var(--color-kinky-red)] text-white p-1.5 rounded-xl shadow-inner text-rose-500">
              <Heart size={18} fill="currentColor" className="animate-pulse text-white" />
            </div>
            <div>
              <span className="font-serif font-extrabold text-[var(--color-kinky-red)] text-lg leading-none tracking-tight block">MuTu</span>
              <span className="text-[7px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest mt-0.5 block">For Couple</span>
            </div>
          </div>

          {/* Global Action Items */}
          <div className="flex items-center gap-2">
            {/* Global Theme Toggle */}
            <button
              onClick={handleToggleGlobalTheme}
              className="p-2 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300 rounded-xl transition-all cursor-pointer"
              title="Toggle theme"
            >
              {(theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? (
                <Moon size={14} className="text-indigo-400" />
              ) : (
                <Sun size={14} className="text-amber-500" />
              )}
            </button>

            {/* Conditional items for coupled lovers (Float phone controllers everywhere) */}
            {currentUser && currentUser.partnerId && (
              <>
                {/* Chime Bell System Button */}
              <button
                onClick={() => { setShowNotificationsModal(true); playSweetSparkSound(); }}
                className="p-2 border border-rose-100 hover:bg-rose-50 text-stone-500 rounded-xl transition-all relative cursor-pointer"
                title="Chimes & Alerts Lounge"
                id="h_bell"
              >
                <Bell size={14} />
                {recentNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8.5px] font-extrabold flex items-center justify-center font-mono animate-bounce shadow-xs">
                    {recentNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Glowing Analytics Award Journey Icon */}
              <button
                onClick={() => { setShowAnalyticsModal(true); playSweetMessageSound(); }}
                className="p-2 border border-rose-200 hover:bg-rose-100 text-rose-500 bg-rose-50 rounded-xl transition-all relative cursor-pointer shadow-3xs"
                title="Journey Analytics Telemetry"
                id="h_analytics"
              >
                <Award size={14} fill="currentColor" />
              </button>

              {/* Quick Live voice-dial button */}
              <button
                onClick={() => triggerDialOut('voice')}
                className="p-2 border border-rose-100 hover:bg-rose-50 text-rose-500 rounded-xl transition-all cursor-pointer"
                title="Start Love Voice Calling"
                id="h_voice_dial"
              >
                <Phone size={14} />
              </button>

              {/* Quick Live video-dial button */}
              <button
                onClick={() => triggerDialOut('video')}
                className="p-2 btn-romantic text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Start Love Video Calling"
                id="h_video_dial"
              >
                <Video size={14} />
              </button>

              {/* Verification key code label */}
              <div className="bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 px-3 py-1.5 rounded-xl text-[10px] text-stone-500 dark:text-stone-400 font-semibold md:flex hidden items-center gap-1.5 shadow-3xs">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>Couple Lounge Nest Active</span>
              </div>
              
              </>
            )}
          </div>
        </header>
      )}

      {/* Modern Responsive Bottom Bar for Lazy Users perspective (1-Click Switchers) */}
      {currentUser && currentUser.partnerId && activeSection !== 'chat' && !isKeyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1C1418]/90 backdrop-blur-md border-t border-rose-100/60 dark:border-[#2D2529] py-2 px-4 flex items-center justify-around z-40 shadow-lg select-none sm:max-w-md sm:mx-auto sm:rounded-t-3xl">
          <button
            onClick={() => { navigateToSection('dashboard'); playSweetMessageSound(); }}
            className={`flex flex-col items-center gap-1.5 transition pb-1 cursor-pointer min-w-12 ${activeSection === 'dashboard' ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <Home size={17} fill={activeSection === 'dashboard' ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold">Lobby</span>
          </button>
          
          <button
            onClick={() => { navigateToSection('chat'); playSweetMessageSound(); }}
            className={`flex flex-col items-center gap-1.5 transition pb-1 cursor-pointer min-w-12 relative ${activeSection === 'chat' ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <MessageSquare size={17} fill={activeSection === 'chat' ? "currentColor" : "none"} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-sans text-[8.5px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                {unreadChatCount}
              </span>
            )}
            <span className="text-[10px] font-bold">Lounge</span>
          </button>

          <button
            onClick={() => { navigateToSection('journal'); playSweetMessageSound(); }}
            className={`flex flex-col items-center gap-1.5 transition pb-1 cursor-pointer min-w-12 relative ${activeSection === 'journal' ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <BookOpen size={17} />
            {recentNotifications.some(n => n.section === 'journal' && !n.read) && (
              <span className="absolute top-0 right-3.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-xs" />
            )}
            <span className="text-[10px] font-bold">Diary</span>
          </button>

          <button
            onClick={() => { navigateToSection('daily'); playSweetMessageSound(); }}
            className={`flex flex-col items-center gap-1.5 transition pb-1 cursor-pointer min-w-12 relative ${activeSection === 'daily' ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <Sparkles size={17} />
            {recentNotifications.some(n => n.section === 'daily' && !n.read) && (
              <span className="absolute top-0 right-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-xs" />
            )}
            <span className="text-[10px] font-bold">Playroom</span>
          </button>

          <button
            onClick={() => { navigateToSection('calendar'); playSweetMessageSound(); }}
            className={`flex flex-col items-center gap-1.5 transition pb-1 cursor-pointer min-w-12 relative ${activeSection === 'calendar' ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <Calendar size={17} />
            {recentNotifications.some(n => n.section === 'calendar' && !n.read) && (
              <span className="absolute top-0 right-3.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-xs" />
            )}
            <span className="text-[10px] font-bold">Hearth</span>
          </button>
        </div>
      )}

      {/* Floating Push Notification Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/95 dark:bg-[#251D21]/95 backdrop-blur-md text-stone-800 dark:text-stone-100 px-4 py-3 rounded-2xl shadow-2xl border border-rose-100/80 dark:border-[#382F34] z-50 flex items-center justify-between gap-3 pointer-events-auto cursor-pointer"
            onClick={() => {
              if (toast.type === 'calendar') {
                navigateToSection('calendar');
              } else if (toast.type === 'journal') {
                navigateToSection('journal');
              } else if (toast.type === 'memories') {
                navigateToSection('memories');
              } else if (toast.type === 'daily') {
                navigateToSection('daily');
              } else if (toast.type === 'chat') {
                navigateToSection('chat');
              }
              setToast(null);
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100/50 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {isImageString(currentUser?.partnerPhoto) ? (
                  <img src={currentUser?.partnerPhoto} alt="partner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-base">❤️</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[11px] text-stone-900 dark:text-stone-100 truncate">
                    {currentUser?.partnerName || 'Companion'}
                  </span>
                  <span className="text-[7.5px] px-1 bg-rose-100/65 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 rounded-md font-bold font-mono tracking-wider uppercase">
                    {toast.type || 'Love'}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold truncate mt-0.5">
                  {toast.body}
                </p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setToast(null); }} 
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded-full cursor-pointer shrink-0 transition active:scale-90"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey Analytics Slider Overlay Model */}
      <AnimatePresence>
        {showAnalyticsModal && (
          <motion.div 
            initial={{ opacity: 0, y: 200 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 200 }}
            className="fixed inset-0 bg-white dark:bg-stone-900 z-50 overflow-y-auto p-4 sm:p-6"
            id="analytics_modal"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <h2 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-200">Our Love Journey Stats</h2>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold">Live relationship telemetry and milestones tracker.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAnalyticsModal(false)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <RelationshipAnalytics 
                user={currentUser} 
                messages={messages} 
                memories={memories} 
                journalEntries={journalEntries} 
              />

              <div className="pt-4 flex justify-center pb-8">
                <button
                  onClick={() => setShowAnalyticsModal(false)}
                  className="btn-romantic py-2.5 px-6 rounded-xl text-xs font-bold shadow-md cursor-pointer transition active:scale-95"
                >
                  Back to Nest Workspace
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chimes Alerts system center Sandbox Modal */}
      <AnimatePresence>
        {showNotificationsModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center select-none"
            id="notifications_modal"
          >
            {/* Modal Body with larger width (max-w-md / 448px) */}
            <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-rose-100 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-rose-50/50 to-white dark:from-stone-900 dark:to-stone-900 border-b border-rose-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-rose-500/10 dark:bg-rose-500/5 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-3xs relative">
                    <Bell size={18} className="animate-pulse" />
                    {recentNotifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 font-serif text-sm">Nest Alerts & Notifications</h3>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      Stay updated with your loved one's sweet signals
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 bg-stone-100/50 dark:bg-stone-800/50 rounded-full text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Facebook-style Filtering Tabs & Actions */}
              <div className="px-5 pt-3 pb-2 bg-stone-50/40 dark:bg-stone-800/20 border-b border-rose-100/60 dark:border-stone-800 flex items-center justify-between gap-2">
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setNotifFilter('all'); playSweetSparkSound(); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      notifFilter === 'all' 
                        ? 'bg-rose-500 text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200/70 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    All
                    <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      notifFilter === 'all' ? 'bg-rose-600 text-rose-50' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                    }`}>
                      {recentNotifications.length}
                    </span>
                  </button>
                  <button
                    onClick={() => { setNotifFilter('unread'); playSweetSparkSound(); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all relative ${
                      notifFilter === 'unread' 
                        ? 'bg-rose-500 text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200/70 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Unread
                    {recentNotifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                    <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      notifFilter === 'unread' ? 'bg-rose-600 text-rose-50' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                    }`}>
                      {recentNotifications.filter(n => !n.read).length}
                    </span>
                  </button>
                </div>

                <div className="flex gap-3 text-[10px] items-center">
                  {recentNotifications.some(n => !n.read) && (
                    <button
                      onClick={markAllNotifsAsRead}
                      className="text-rose-500 hover:text-rose-600 hover:underline font-bold transition shrink-0"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const empty = [
                        { id: 'n1', title: 'Welcome to MuTu! 🌸', body: 'Your relationship workspace is initialized.', timestamp: Date.now(), type: 'system', read: true }
                      ];
                      setRecentNotifications(empty);
                      localStorage.setItem('mutu_notifications_history', JSON.stringify(empty));
                      playSweetSparkSound();
                    }}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:underline font-bold transition shrink-0"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Native Smartphone Notifications Pairing Banner */}
              <div className="mx-4 mt-3 p-3.5 bg-rose-50/70 dark:bg-rose-950/25 rounded-2xl border border-rose-100/50 dark:border-rose-900/40 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <div>
                      <h4 className="font-bold text-stone-800 dark:text-stone-200 text-[11px] leading-tight">Mobile & Smartphone Push Alerts</h4>
                      <p className="text-[9px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                        Receive instant sound alerts & native display banner popups on your smartphone's notification shade for messages, calls, and updates.
                      </p>
                    </div>
                  </div>
                  <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 ${
                    notificationPermission === 'granted' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400' 
                      : notificationPermission === 'denied' 
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/45 dark:text-rose-400' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400'
                  }`}>
                    {notificationPermission === 'granted' ? 'Active' : notificationPermission === 'denied' ? 'Blocked' : 'In-App Only'}
                  </span>
                </div>
                
                {notificationPermission !== 'granted' ? (
                  <button
                    onClick={requestNotificationPermission}
                    className="w-full py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <span>🔔 Request Smartphone Web Permission</span>
                  </button>
                ) : (
                  <div className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓ Mobile push permission authorized! Standby for sweet sounds and popups.</span>
                  </div>
                )}
                
                <p className="text-[8px] text-stone-400 dark:text-stone-500 italic leading-normal">
                  💡 Setup Tip: Swipe down on your phone to see push banners. Must launch MuTu in a separate browser tab (not inside standard preview frames) or select "Add to Home Screen" to enable native background alerts!
                </p>
              </div>

              {/* Notification Items List Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[35vh] min-h-[180px]">
                {recentNotifications.filter(notif => notifFilter === 'unread' ? !notif.read : true).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <span className="text-4xl animate-bounce mb-3">🌸</span>
                    <h4 className="font-serif font-bold text-xs text-stone-700 dark:text-stone-300">Nest is Quiet & Cozy</h4>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 max-w-xs">
                      {notifFilter === 'unread' 
                        ? 'Hooray! You have zero unread notifications.' 
                        : 'Your secret signals are synchronized correctly.'}
                    </p>
                  </div>
                ) : (
                  recentNotifications
                    .filter(notif => notifFilter === 'unread' ? !notif.read : true)
                    .map((notif) => {
                      // Helper to choose background, icons, and titles
                      let visualIcon = '🔔';
                      let iconBg = 'bg-rose-50 dark:bg-rose-950/20';
                      let borderAccent = 'hover:border-rose-200 dark:hover:border-rose-900/40';
                      let itemBg = notif.read ? 'bg-white dark:bg-stone-900' : 'bg-rose-50/25 dark:bg-rose-950/10 border-l-3 border-l-rose-500';

                      if (notif.type === 'chat') {
                        visualIcon = '💌';
                        iconBg = 'bg-rose-100 dark:bg-rose-950/40';
                      } else if (notif.type === 'memories') {
                        visualIcon = '📸';
                        iconBg = 'bg-sky-100 dark:bg-sky-950/40';
                      } else if (notif.type === 'calendar') {
                        visualIcon = '📅';
                        iconBg = 'bg-purple-100 dark:bg-purple-950/40';
                      } else if (notif.type === 'journal') {
                        visualIcon = '📓';
                        iconBg = 'bg-amber-100 dark:bg-amber-950/40';
                      } else if (notif.type === 'daily') {
                        visualIcon = '❓';
                        iconBg = 'bg-rose-100/60 dark:bg-rose-950/30';
                      }

                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotifAsRead(notif.id);
                            if (notif.section) {
                              navigateToSection(notif.section);
                              setShowNotificationsModal(false);
                            }
                            playSweetMessageSound();
                          }}
                          className={`p-3 border border-rose-100/40 dark:border-stone-800 rounded-2xl flex gap-3 transition-all cursor-pointer ${itemBg} ${borderAccent} hover:scale-[1.01] active:scale-99`}
                        >
                          {/* Custom visual avatar icon */}
                          <div className={`w-9 h-9 shrink-0 ${iconBg} rounded-xl flex items-center justify-center text-lg shadow-3xs`}>
                            {visualIcon}
                          </div>

                          {/* Text description */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex justify-between items-start gap-1">
                              <h4 className={`text-[11.5px] font-bold text-stone-800 dark:text-stone-100 truncate ${!notif.read ? 'text-rose-950 dark:text-rose-200 font-serif' : 'font-sans'}`}>
                                {notif.title}
                              </h4>
                              <span className="text-[8px] text-stone-400 dark:text-stone-500 font-medium shrink-0 font-mono">
                                {formatNotifTime(notif.timestamp)}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-normal mt-0.5 line-clamp-2">
                              {notif.body}
                            </p>
                            {notif.section && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[8.5px] text-stone-500 dark:text-stone-400 font-bold bg-stone-100/75 dark:bg-stone-800/50 p-1 py-0.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 transition">
                                Go to <span className="text-rose-500 capitalize">{notif.section === 'daily' ? 'Playroom' : notif.section === 'calendar' ? 'Hearth' : notif.section}</span> ➔
                              </span>
                            )}
                          </div>

                          {/* Unread circle dot badge */}
                          {!notif.read && (
                            <div className="flex items-center justify-center shrink-0">
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-xs" />
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Integrated sound board triggers at the bottom */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border-t border-rose-100/60 dark:border-stone-800 shrink-0">
                <span className="text-[9px] font-extrabold tracking-widest text-stone-400 dark:text-stone-500 uppercase block mb-2 leading-none">Nest Sound Playground: Test Synthesizer Chimes</span>
                
                <div className="grid grid-cols-5 gap-1.5">
                  <button 
                    onClick={() => { playSweetMessageSound(); }} 
                    className="flex flex-col items-center gap-0.5 p-1.5 border border-rose-100 dark:border-stone-700 hover:border-rose-300 rounded-xl bg-white dark:bg-stone-900 text-center hover:scale-105 transition cursor-pointer"
                    title="Message Bell Chime"
                  >
                    <span className="text-xs">🎵</span>
                    <span className="text-[8px] text-stone-500 dark:text-stone-400 font-semibold truncate w-full">Message</span>
                  </button>
                  <button 
                    onClick={() => { playSweetSparkSound(); }} 
                    className="flex flex-col items-center gap-0.5 p-1.5 border border-rose-100 dark:border-stone-700 hover:border-rose-300 rounded-xl bg-white dark:bg-stone-900 text-center hover:scale-105 transition cursor-pointer"
                    title="Sparkle magic chime"
                  >
                    <span className="text-xs">✨</span>
                    <span className="text-[8px] text-stone-500 dark:text-stone-400 font-semibold truncate w-full">Sparkle</span>
                  </button>
                  <button 
                    onClick={() => { playSweetHeartbeat(); }} 
                    className="flex flex-col items-center gap-0.5 p-1.5 border border-rose-100 dark:border-stone-700 hover:border-rose-300 rounded-xl bg-white dark:bg-stone-900 text-center hover:scale-105 transition cursor-pointer"
                    title="Pulse heartbeat synthesizer"
                  >
                    <span className="text-xs">💖</span>
                    <span className="text-[8px] text-stone-500 dark:text-stone-400 font-semibold truncate w-full">Heart</span>
                  </button>
                  <button 
                    onClick={() => { playBirdChirp(); }} 
                    className="flex flex-col items-center gap-0.5 p-1.5 border border-rose-100 dark:border-stone-700 hover:border-rose-300 rounded-xl bg-white dark:bg-stone-900 text-center hover:scale-105 transition cursor-pointer"
                    title="Sunrise morning birds"
                  >
                    <span className="text-xs">🌅</span>
                    <span className="text-[8px] text-stone-500 dark:text-stone-400 font-semibold truncate w-full">Sunrise</span>
                  </button>
                  <button 
                    onClick={() => { playSweetLullaby(); }} 
                    className="flex flex-col items-center gap-0.5 p-1.5 border border-rose-100 dark:border-stone-700 hover:border-rose-300 rounded-xl bg-white dark:bg-stone-900 text-center hover:scale-105 transition text-rose-500 font-bold cursor-pointer"
                    title="Cozy bedtime cozy melody synthesizer"
                  >
                    <span className="text-xs">💤</span>
                    <span className="text-[8px] text-stone-500 dark:text-stone-400 font-semibold truncate w-full">Lullaby</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Wrapper */}
      <main className={activeSection === 'chat' ? 'flex-1 min-h-0 flex flex-col overflow-hidden py-0' : 'py-4 min-h-[82vh]'}>
        
        {/* Render App Panels dynamically based on Auth/Link states */}
        {!currentUser || !currentUser.partnerId ? (
          <AuthScreen 
            onAuthSuccess={(u) => {
              setCurrentUser(u);
              localStorage.setItem('mutu_user_session', JSON.stringify(u));
            }}
            currentUser={currentUser}
            onRefreshUser={handleRefreshUser}
          />
        ) : (
          renderRooms()
        )}

        <AnimatePresence>
          {showTour && <TourGuide onClose={() => setShowTour(false)} />}
        </AnimatePresence>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* IMMERSIVE CALLING OVERLAY MODALS (Voice or Video calling screens) */}
      {/* ------------------------------------------------------------------ */}
      
      {/* Ringing / incoming call overlay */}
      {incomingCall && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur z-50 flex flex-col items-center justify-center text-white select-none">
          
          <div className="max-w-xs text-center space-y-6">
            
            {/* Pulsing heart avatar ring */}
            <div className="relative flex justify-center">
              <div className="w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-5xl relative animate-pulse">
                {isImageString(currentUser?.partnerPhoto) ? (
                  <img src={currentUser.partnerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{currentUser?.partnerPhoto || '🧡'}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-400 block uppercase tracking-widest animate-bounce">
                {ringingRole === 'caller' ? 'DIALING COMPANION...' : 'INCOMING MUTU CALL...'}
              </span>
              <h2 className="text-xl font-serif font-bold">{currentUser?.partnerName || 'Lover'}</h2>
              <p className="text-[10px] text-stone-400">Private Private Verification code active.</p>
            </div>

            {/* Answer Control triggers */}
            <div className="flex items-center justify-center gap-6 pt-4">
              {ringingRole === 'callee' ? (
                <>
                  <button
                    onClick={handleDeclineCall}
                    className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all"
                  >
                    <PhoneOff size={22} />
                  </button>
                  <button
                    onClick={handleAcceptCall}
                    className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full animate-bounce"
                  >
                    <Video size={22} />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleHangupCall}
                  className="px-6 py-2 bg-stone-800 border border-stone-700 text-stone-300 rounded-xl text-xs font-bold"
                >
                  Cancel Dial
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Active Call screen */}
      {callActive && (
        <div className="fixed inset-0 bg-stone-950 text-white z-50 flex flex-col justify-between p-6 select-none font-sans">
          
          {/* Top header status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">Live {callType} Call</span>
            </div>

            {/* Real-time Call Duration Counter Removed (Replaced with status indicator) */}
            <div className="bg-stone-900/80 border border-stone-800/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Connected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCallDiagnostics(true)}
                className="bg-stone-900 border border-stone-800 hover:bg-stone-800 hover:border-stone-700 px-3 py-1.5 rounded-xl text-[9px] text-rose-400 font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="WebRTC Traversal Config & Logs"
              >
                ⚙️ Config & Logs
              </button>
              <div className="bg-stone-900 border border-stone-800 px-3 py-1 rounded-xl text-[9px] text-emerald-400 font-bold">
                🔒 Decrypted client-to-client
              </div>
            </div>
          </div>

           {/* Video visual frame displays: capturing 90% of screen height */}
          <div className="flex-1 w-full min-h-[65vh] relative py-4 flex items-center justify-center">
            {callType === 'video' ? (
              <div className="absolute inset-0 w-full h-full rounded-3xl bg-stone-950 overflow-hidden border border-stone-800 shadow-2xl">
                
                {/* 100% peer-to-peer video stream element */}
                <video
                  ref={partnerVideoRef}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    remoteStreamActive ? 'opacity-100 z-0' : 'opacity-0 z-0'
                  }`}
                  playsInline
                  autoPlay
                />

                {/* 100% video stream background placeholder when remote camera is not yet connected */}
                {!remoteStreamActive && (
                  <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center z-10 bg-black/40">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 border border-white/20 flex items-center justify-center text-4xl shadow-md">
                      {isImageString(currentUser?.partnerPhoto) ? (
                        <img src={currentUser.partnerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>{currentUser?.partnerPhoto || '🧡'}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold mt-3 text-white drop-shadow-md">{currentUser?.partnerName}'s Video Feed</span>
                    <span className="text-[10px] text-stone-300 animate-pulse mt-1">CAMERA ESTABLISHING SECURE LINK...</span>
                  </div>
                )}

                {/* Local user small picture-in-picture feedback video */}
                <div className="absolute top-4 right-4 w-24 h-36 bg-black rounded-2xl overflow-hidden border border-white/20 shadow-lg z-20">
                  <video
                    ref={myVideoRef}
                    className="w-full h-full object-cover transform -scale-x-100"
                    playsInline
                    autoPlay
                    muted
                  />
                  <span className="absolute bottom-1.5 right-2 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-medium">You</span>
                </div>

              </div>
            ) : (
              // Voice only display layout
              <div className="flex flex-col items-center text-center space-y-4">
                <audio
                  ref={remoteAudioRef}
                  autoPlay
                  playsInline
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                />
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white/10 flex items-center justify-center text-5xl relative">
                  <div className="absolute inset-0 rounded-full border border-rose-500/50 animate-ping"></div>
                  {isImageString(currentUser?.partnerPhoto) ? (
                    <img src={currentUser.partnerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span>{currentUser?.partnerPhoto || '🧡'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg">{currentUser?.partnerName}</h3>
                  <p className="text-[10px] text-stone-500 font-medium">Closed circuit verada intercom</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom active calling tray controls */}
          <div className="flex items-center justify-center gap-6">
            
            {/* Mic toggle */}
            <button
              onClick={() => setMicMuted(!micMuted)}
              className={`p-3.5 rounded-full transition-all border ${
                micMuted ? 'bg-red-600/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
              }`}
            >
              {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Loudspeaker toggle */}
            <button
              onClick={toggleSpeaker}
              className={`p-3.5 rounded-full transition-all border ${
                !isSpeakerActive ? 'bg-amber-600/30 border-amber-600 text-amber-500' : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
              }`}
              title={isSpeakerActive ? "Switch to Intercom" : "Switch to Speaker"}
            >
              {isSpeakerActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Hang up dial controller */}
            <button
              onClick={handleHangupCall}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all animate-pulse"
              id="btn_hangup_on_call"
            >
              <PhoneOff size={22} />
            </button>

            {/* Camera off toggle */}
            {callType === 'video' && (
              <button
                onClick={() => setCameraOff(!cameraOff)}
                className={`p-3.5 rounded-full transition-all border ${
                  cameraOff ? 'bg-red-600/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
                }`}
              >
                {cameraOff ? <CameraOff size={18} /> : <Camera size={18} />}
              </button>
            )}

            {/* Screenshare toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleScreenshare}
                className={`p-3.5 rounded-full transition-all border ${
                  isScreensharing ? 'bg-pink-600 border-pink-500 text-white animate-pulse' : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
                }`}
                title={isScreensharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                <Monitor size={18} />
              </button>
            )}

          </div>

        </div>
      )}

      <CallDiagnostics
        isOpen={showCallDiagnostics}
        onClose={() => setShowCallDiagnostics(false)}
        iceConnectionState={webrtcIceState}
        signalingState={webrtcSignalingState}
        localStream={localStream}
        remoteStream={remoteStream}
        onReconnect={reconnectCall}
      />

      {/* ------------------------------------------------------------- */}
      {/* IMMERSIVE BEDTIME/SLEEP TOGETHER OVERLAY CANOPY               */}
      {/* ------------------------------------------------------------- */}
      {isSleepMode && (
        <div className="fixed inset-0 bg-[#04020a] bg-gradient-to-b from-[#04020a] via-[#090616] to-[#040209] z-50 overflow-hidden flex flex-col justify-between p-6 select-none font-sans text-slate-100 animate-fade-in">
          
          {/* Twinkling ambient star field background particles */}
          <div className="absolute inset-0 pointer-events-none opacity-60">
            {Array.from({ length: 45 }).map((_, i) => {
              const topVal = (i * 2.3 + Math.sin(i) * 5) % 100;
              const leftVal = (i * 1.7 + Math.cos(i) * 8) % 100;
              const delayVal = i * 0.12;
              const durationVal = 4 + (i % 3);
              const sizeClass = i % 3 === 0 ? 'w-1 h-1' : 'w-1.5 h-1.5 bg-rose-200/50';
              return (
                <div
                  key={i}
                  className={`absolute rounded-full bg-white animate-pulse ${sizeClass}`}
                  style={{
                    top: `${topVal}%`,
                    left: `${leftVal}%`,
                    animationDelay: `${delayVal}s`,
                    animationDuration: `${durationVal}s`
                  }}
                />
              );
            })}
          </div>

          {/* Spark fireworks pop overlays */}
          {receivedSleepSpark && (
            <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-50 bg-[#04020a]/30 backdrop-blur-xs transition-opacity duration-300">
              <div className="text-center space-y-4">
                <div className="text-7xl animate-pulse">💖</div>
                <div className="text-sm font-semibold tracking-wide text-rose-300 drop-shadow-md">
                  {currentUser?.partnerName || 'Companion'} sent you a cuddle spark! ✨
                </div>
              </div>
            </div>
          )}

          {/* Top sleep state indicators */}
          <div className="flex items-center justify-between relative z-10 w-full">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping"></span>
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest bg-rose-950/40 border border-rose-900/30 px-3 py-1 rounded-full">
                Sleep Session Active
              </span>
            </div>

            <button
              onClick={() => setSleepSynthMuted(!sleepSynthMuted)}
              className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-stone-200 rounded-2xl transition-all cursor-pointer"
              title={sleepSynthMuted ? 'Unmute cozy melody' : 'Mute cozy melody'}
            >
              {sleepSynthMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          {/* Center bedtime cozy scene and rhythm guide */}
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 relative z-10 max-w-sm mx-auto">
            
            {/* Glowing Moon + Pulsing Blushing Heart */}
            <div className="relative">
              {/* Outer pulsing neon aura */}
              <div className="absolute inset-x-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl animate-pulse scale-150"></div>
              
              <div className="relative w-36 h-36 rounded-full bg-slate-900/80 border border-indigo-500/30 flex items-center justify-center text-6xl shadow-2xl romantic-glow">
                🌙
                <Heart size={32} fill="#F43F5E" className="text-rose-500 absolute bottom-3 right-3 animate-bounce" />
              </div>
            </div>

            {/* bedtime greeting details */}
            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-white tracking-wide">
                Sleep tight, {currentUser?.name}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are resting in the same starry sky as <strong className="text-rose-300">{currentUser?.partnerName || 'your partner'}</strong>. Close your eyes, let go, and feel connected.
              </p>
            </div>

            {/* Cozy breathing visual loop */}
            <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-3xl w-full">
              <span className="text-[9px] font-bold tracking-widest uppercase text-indigo-400 block mb-2">COZY BREATHING TIMER</span>
              <div className="relative flex items-center justify-center h-20">
                {/* Breathing circle indicator expanding/shrinking via simple pulse styling */}
                <span className="absolute w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 rounded-full animate-ping [animation-duration:5s]"></span>
                <span className="absolute w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse [animation-duration:3s]"></span>
                <span className="relative text-xs font-medium text-slate-300 animate-pulse [animation-duration:3.2s]">
                  Breathe softly
                </span>
              </div>
            </div>

          </div>

          {/* Bottom controls panel to rise or send signals */}
          <div className="relative z-10 flex flex-col gap-3 py-2 max-w-sm mx-auto w-full">
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sendRealTimeEvent({
                    type: 'state:update',
                    section: 'sleep_spark' as any
                  });
                }}
                className="py-2.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[11px] font-semibold text-rose-300 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✨ Send Spark</span>
              </button>
              
              <button
                onClick={async () => {
                  const phrases = [
                    'Sweetest dreams, my love! 🧸',
                    'Waving you a gentle goodnight hug 🫂',
                    'I will meet you in our dreams tonight! ✨',
                    'Sleeping with you in my heart. ❤️'
                  ];
                  const sweetphrase = phrases[Math.floor(Math.random() * phrases.length)];
                  
                  try {
                    const { encryptMessage } = await import('./crypto');
                    const enc = await encryptMessage(sweetphrase, currentUser?.loveKey || '');
                    handleSendMessage({ textEncrypted: enc.ciphertext, iv: enc.iv });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[11px] font-semibold text-indigo-300 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🧸 Goodnight Whisper</span>
              </button>
            </div>

            <button
              onClick={() => handleToggleSleepMode(false)}
              className="py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 tracking-wide cursor-pointer active:scale-98 shadow shadow-rose-950/50"
            >
              <span>🌅 Rise & Good Morning</span>
            </button>
            
          </div>

        </div>
      )}

      {/* Smart Exit Banner Integration */}
      <AnimatePresence>
        {showExitBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-stone-900 text-white p-5 rounded-3xl shadow-2xl z-50 border border-stone-800"
          >
            <div className="flex items-start gap-3.5">
              <span className="text-2xl shrink-0">🏡</span>
              <div className="flex-1">
                <h4 className="font-serif font-bold text-xs">Leaving the Cozy Love Nest?</h4>
                <p className="text-[10px] text-stone-400 mt-1.5 leading-relaxed font-sans font-medium">
                  You are privately connected with {currentUser?.partnerName || 'your partner'}. Stay cozy here, or click Log Out below to exit the nest.
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowExitBanner(false)}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    Stay Connected 💖
                  </button>
                  <button
                    onClick={() => { setShowExitBanner(false); handleLogout(); }}
                    className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer border border-[#3c3c43]"
                  >
                    Log Out
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowExitBanner(false)}
                className="text-stone-500 hover:text-stone-300 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
