import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Phone, Video, PhoneOff, Mic, MicOff, Camera, 
  CameraOff, Sparkles, LogOut, Info, ShieldCheck, RefreshCw,
  Moon, Sun, Volume2, VolumeX, AlertCircle, Home, MessageSquare,
  BookOpen, Calendar, Award, Activity, Bell, X, Trash2, Globe, Sparkle
} from 'lucide-react';

import { 
  User, Message, Memory, CalendarEvent, DailyQuestion, 
  DailyAnswer, JournalEntry, MovieState, WSEvent, BucketItem 
} from './types';

import { 
  playSweetMessageSound, playSweetSparkSound, playSweetHeartbeat, 
  playSweetLullaby, playBirdChirp 
} from './utils/audio';

import RelationshipAnalytics from './components/RelationshipAnalytics';
import RelationshipTimeline from './components/RelationshipTimeline';
import HomeCustomizer from './components/HomeCustomizer';
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
import { useTheme } from './ThemeContext';

const isImageString = (src: string | undefined | null): boolean => {
  if (!src) return false;
  return src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.length > 20;
};

// Premium Web Audio API Polyphonic Sleep Synthesizer Drone
class AmbientSynth {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  public isMuted: boolean = false;

  start() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      this.ctx = new AudioContextClass();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      // Soft ambient loop fade in ramp
      this.gainNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime + 3);

      // Warm low-pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(4, this.ctx.currentTime);

      // Warm celestial drone chords (F# Major 9 / Bb maj chords notes)
      const droneFreqs = [116.54, 174.61, 233.08, 293.66, 349.23];
      droneFreqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Add slightly detuned warmth chorus
        osc.detune.setValueAtTime((idx % 2 === 0 ? 8 : -8), this.ctx.currentTime);
        osc.connect(filter);
        this.oscillators.push(osc);
        osc.start();
      });

      // Ultra slow breathing sweep LFO
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.06, this.ctx.currentTime); // 16 seconds complete cycle

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(70, this.ctx.currentTime);

      this.lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.lfo.start();

      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Synthesizer blocked by autoplay policy or browser lack: ', e);
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.gainNode && this.ctx) {
      try {
        const targetValue = mute ? 0 : 0.08;
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(targetValue, this.ctx.currentTime + 1.2);
      } catch (err) {}
    }
  }

  stop() {
    const list = this.oscillators;
    const l = this.lfo;
    const c = this.ctx;
    
    this.oscillators = [];
    this.lfo = null;
    this.ctx = null;
    this.gainNode = null;

    setTimeout(() => {
      list.forEach(o => {
        try { o.stop(); } catch (err) {}
      });
      if (l) {
        try { l.stop(); } catch (err) {}
      }
      if (c) {
        try { c.close(); } catch (err) {}
      }
    }, 1500);
  }
}

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
    
    if (activeSection === 'dashboard' || section === 'dashboard') {
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
      } else {
        if (activeSection === 'dashboard') {
          setShowExitBanner(true);
          window.history.pushState({ section: 'dashboard' }, '', '#dashboard');
        } else {
          setActiveSection('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state || !window.history.state.section) {
      window.history.replaceState({ section: 'dashboard' }, '', '#dashboard');
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
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [ringingRole, setRingingRole] = useState<'caller' | 'callee' | null>(null);
  const [callType, setCallType] = useState<'voice' | 'video'>('video');
  const [calleeName, setCalleeName] = useState('');
  
  // Audio/Video streams state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);

  const [localTracksCount, setLocalTracksCount] = useState(0);
  const [remoteTracksCount, setRemoteTracksCount] = useState(0);

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

  // Sleep mode states
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [sleepSynthMuted, setSleepSynthMuted] = useState(false);
  const [receivedSleepSpark, setReceivedSleepSpark] = useState(false);
  const synthRef = useRef<AmbientSynth | null>(null);

  // WebSocket reference
  const socketRef = useRef<WebSocket | null>(null);
  const [typingPartner, setTypingPartner] = useState(false);
  const [partnerThumbKissActive, setPartnerThumbKissActive] = useState(false);
  const [movieSyncState, setMovieSyncState] = useState<MovieState | null>(null);

  // Video stream elements reference
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const partnerVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTypeRef = useRef<'voice' | 'video'>('video');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);

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
  const showPushNotification = useCallback((title: string, body: string, type = 'system', section?: string) => {
    const id = 'nt_' + Math.random().toString(36).substring(2, 9);
    setToast({ id, type, title, body });
    
    setRecentNotifications((prev) => {
      const updated = [{ id, title, body, timestamp: Date.now(), type, section, read: false }, ...prev.slice(0, 24)];
      localStorage.setItem('mutu_notifications_history', JSON.stringify(updated));
      return updated;
    });

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

  // 1. Initial State Loaders (REST calls)
  const fetchAllData = useCallback(async (user: User) => {
    if (!user.coupleId) return;
    try {
      // Parallel REST Queries
      const [msgRes, memRes, calRes, qnrRes, jrnRes, statsRes, bktRes] = await Promise.all([
        fetch(`/api/messages?coupleId=${user.coupleId}`),
        fetch(`/api/memories?coupleId=${user.coupleId}`),
        fetch(`/api/calendar?coupleId=${user.coupleId}`),
        fetch(`/api/daily-question`),
        fetch(`/api/journal?coupleId=${user.coupleId}`),
        fetch(`/api/stats?coupleId=${user.coupleId}&userId=${user.id}`),
        fetch(`/api/bucket-list?coupleId=${user.coupleId}`)
      ]);

      const [msgs, mems, cals, quest, journals, statsData, bkts] = await Promise.all([
        msgRes.json(),
        memRes.json(),
        calRes.json(),
        qnrRes.json(),
        jrnRes.json(),
        statsRes.json(),
        bktRes.json()
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
        const ansRes = await fetch(`/api/daily-answers?coupleId=${user.coupleId}&questionId=${quest.id}`);
        const answers = await ansRes.json();
        setDailyAnswers(answers);
      }
    } catch (err) {
      console.error('Core restful hydration failed:', err);
    }
  }, []);

  // Sync user profile state from server (checking pairings)
  const handleRefreshUser = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email })
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
      console.error('Error refreshing session details:', err);
    }
  }, [currentUser?.email, currentUser]);

  // Verify cached user session on mount
  useEffect(() => {
    if (currentUser) {
      handleRefreshUser();
    }
  }, []);

  // 2. WebSocket setup handler (re-establishes on user or couple update)
  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    // Hydrate everything REST-wise on initialization
    fetchAllData(currentUser);

    let isDestroyed = false;
    let reconnectTimeout: any = null;
    let ws: WebSocket | null = null;

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
        console.log('MuTu Realtime channel fully open.');
        // Notify server we are logged in so we can route packages
        ws?.send(JSON.stringify({
          type: 'connection:init',
          userId: currentUser.id,
          coupleId: currentUser.coupleId
        }));

        // Automatically flush any offline failed messages!
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
          console.log('Incoming live payload event: ', payload.type);

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
              if (payload.message.senderId !== currentUser.id) {
                playSweetMessageSound();
                // Under client request guidelines, we do not trigger top banner popup warnings on regular text messages
                // Instead, the custom bottom bar and Lobby sections dynamically render numeric increasing indicators.
              }
              break;
            }

            case 'chat:seen-update': {
              setMessages((prev) => prev.map(m => {
                if (m.senderId === currentUser.id && !m.read) {
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
                    if (payload.reaction.userId !== currentUser.id) {
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
              cleanupCalling();
              break;
            }

            case 'state:update': {
              if (payload.section === 'memories') {
                fetchMemories();
                playSweetMessageSound();
                showPushNotification("📸 Shared Polaroid", `${currentUser.partnerName || 'Companion'} posted a new Polaroid to your Memory Wall! 🖼️`, 'memories', 'memories');
              }
              if (payload.section === 'calendar') {
                fetchCalendar();
                playSweetMessageSound();
                showPushNotification("📅 Love hearth scheduled", `${currentUser.partnerName || 'Companion'} scheduled a new event on your Shared Calendar.`, 'calendar', 'calendar');
              }
              if (payload.section === 'journal') {
                fetchJournal();
                playSweetMessageSound();
                showPushNotification("📓 secret Diary page", `${currentUser.partnerName || 'Companion'} wrote a new private journal page!`, 'journal', 'journal');
              }
              if (payload.section === 'daily') {
                fetchAnswersOnly();
                playSweetSparkSound();
                showPushNotification("❓ Q&A Playroom", `${currentUser.partnerName || 'Companion'} answered today's Question! Unlock to read. 🥰`, 'daily', 'daily');
              }
              if (payload.section === 'bucket') {
                fetchBucketList();
                playSweetSparkSound();
                showPushNotification("🗺️ Bucket List Update", `${currentUser.partnerName || 'Companion'} updated your Shared Adventure checklist!`, 'bucket', 'bucket');
              }
              if (payload.section === 'stats') {
                fetchStatsAndAnswers();
              }
              if (payload.section === 'profile') {
                handleRefreshUser();
              }
              if (payload.section === 'sleep_on') {
                setIsSleepMode(true);
                playSweetLullaby();
                showPushNotification("💤 Starry Sky Tucked", `${currentUser.partnerName || 'Companion'} tucked themselves in sleep together.`, 'system', 'dashboard');
              }
              if (payload.section === 'sleep_off') {
                setIsSleepMode(false);
                playBirdChirp();
                showPushNotification("🌅 Golden Good Morning", `${currentUser.partnerName || 'Companion'} woke up. Good morning my love! 🌸`, 'system', 'dashboard');
              }
              if (payload.section === 'sleep_spark' as any) {
                setReceivedSleepSpark(true);
                playSweetSparkSound();
                playSweetHeartbeat();
                showPushNotification("💖 Sweet Touch Spark", `${currentUser.partnerName || 'Companion'} sent you a cuddle spark! ✨`, 'system', 'dashboard');
                setTimeout(() => setReceivedSleepSpark(false), 3500);
              }
              break;
            }
          }
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

    connectSocket();

    return () => {
      isDestroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      socketRef.current = null;
    };
  }, [currentUser, fetchAllData]);

  // Minor isolated data refreshers supporting WebSocket notifications
  const fetchMemories = async () => {
    if (!currentUser?.coupleId) return;
    const res = await fetch(`/api/memories?coupleId=${currentUser.coupleId}`);
    setMemories(await res.json());
  };

  const fetchCalendar = async () => {
    if (!currentUser?.coupleId) return;
    const res = await fetch(`/api/calendar?coupleId=${currentUser.coupleId}`);
    setCalendarEvents(await res.json());
  };

  const fetchJournal = async () => {
    if (!currentUser?.coupleId) return;
    const res = await fetch(`/api/journal?coupleId=${currentUser.coupleId}`);
    setJournalEntries(await res.json());
  };

  const fetchBucketList = async () => {
    if (!currentUser?.coupleId) return;
    const res = await fetch(`/api/bucket-list?coupleId=${currentUser.coupleId}`);
    setBucketItems(await res.json());
  };

  const fetchAnswersOnly = async () => {
    if (!currentUser?.coupleId || !dailyQuestion?.id) return;
    const res = await fetch(`/api/daily-answers?coupleId=${currentUser.coupleId}&questionId=${dailyQuestion.id}`);
    setDailyAnswers(await res.json());
  };

  const fetchStatsAndAnswers = async () => {
    if (!currentUser?.coupleId) return;
    const [statsRes] = await Promise.all([
      fetch(`/api/stats?coupleId=${currentUser.coupleId}&userId=${currentUser.id}`)
    ]);
    setStats(await statsRes.json());
  };

  // 3. Messaging Callbacks
  const dispatchWebSocketMessage = (msg: Message) => {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat:message',
          message: msg
        }));
      } else {
        throw new Error('WebSocket is offline.');
      }
    } catch (err) {
      console.error('Failed to dispatch secure Private message, saving offline failed state:', err);
      // Mark failed state locally on this message
      setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
    }
  };

  const handleSendMessage = (privatePayload: { textEncrypted: string; iv: string; isVoice?: boolean; isMovie?: boolean }) => {
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

  const handleSendReaction = (messageId: string, emoji: string, action: 'add' | 'remove') => {
    if (!currentUser || !socketRef.current) return;

    const reaction = { emoji, userId: currentUser.id };
    
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
        return { ...m, reactions };
      }
      return m;
    }));

    // Broadcast over WS
    socketRef.current.send(JSON.stringify({
      type: 'chat:reaction',
      messageId,
      reaction,
      action
    }));
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (!currentUser || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'chat:typing',
      userId: currentUser.id,
      isTyping
    }));
  };

  // 4. Movie Cinema Synch Event Callback
  const handleEmitMovieSync = (state: MovieState) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'movie:sync',
      state
    }));
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
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'memories'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'calendar'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'daily'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'journal'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'bucket'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'bucket'
      }));
    }
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

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: 'bucket'
      }));
    }
  };

  // 6. Media and Calling handlers
  const initiateMediaStream = async (modeOverride?: 'voice' | 'video') => {
    const selectedMode = modeOverride || callTypeRef.current;
    try {
      // Standard video / voice browser interface query
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedMode === 'video' ? { width: 360, height: 360 } : false,
        audio: true
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(e => console.log('Playing feedback stream', e));
      }
      return stream;
    } catch (err) {
      console.warn('Media captures denied or camera missing (normal in sandboxed iframes). Proceeding with simulated calling visual overlays.', err);
      return null;
    }
  };

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

      if (socketRef.current && currentUser?.partnerId) {
        console.log('[WebRTC] Broadcasting fresh iceRestart SDP offer to partner:', currentUser.partnerId);
        socketRef.current.send(JSON.stringify({
          type: 'call:sdp-offer',
          sdp: offer,
          targetId: currentUser.partnerId
        }));
      }
    } catch (err) {
      console.error('[WebRTC] Automated reconnection flow failed:', err);
    }
  };

  const createPeerConnection = (stream: MediaStream | null) => {
    // We design the ICE candidate queues to persist during initialization to avoid race events
    console.log('[WebRTC] Creating RTCPeerConnection, current candidate queue size:', iceCandidatesQueueRef.current.length);

    // Multi-fallback STUN network servers to handle restricted NAT router configurations
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ],
      iceCandidatePoolSize: 10 // Pre-gathers candidates for faster call setup
    });

    peerConnectionRef.current = pc;

    const handleFailedConnection = () => {
      console.warn('[WebRTC] Connection has hit a failed state! Determining reconnect initiator...');
      if (currentUser && currentUser.partnerId) {
        if (currentUser.id < currentUser.partnerId) {
          console.log('[WebRTC] We are the designated initiator. Triggering reconnection after brief timeout...');
          setTimeout(() => {
            reconnectCall();
          }, 1000); // 1s buffer to let both ends stabilize state
        } else {
          console.log('[WebRTC] We are the passive negotiator. Remote partner will initiate the reconnection SDP offer.');
        }
      } else {
        // Fallback if user session isn't loaded
        console.log('[WebRTC] User session context incomplete. Fallback initiator triggers reconnect.');
        setTimeout(() => {
          reconnectCall();
        }, 1000);
      }
    };

    // Track state transitions to diagnose latency or potential visual freezes
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State changed to:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        handleFailedConnection();
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn('[WebRTC] ICE Connection sluggish/disconnected. Attempting automatic ICE restart...');
        if (typeof pc.restartIce === 'function') {
          try {
            pc.restartIce();
          } catch (err) {
            console.log('[WebRTC] ICE restart failed or got exception:', err);
          }
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection State changed to:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        handleFailedConnection();
      } else if (pc.connectionState === 'connected') {
        console.log('[WebRTC] Video/Audio channel fully CONNECTED and stable.');
      }
    };

    // Attach local tracks to the connection
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Capture generated ICE candidates and relay them via WebSocket Private matching
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && currentUser?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'call:ice-candidate',
          candidate: event.candidate,
          targetId: currentUser.partnerId
        }));
      }
    };

    // Receive incoming remote tracks and route them to standard UI players
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, 'ID:', event.track.id);
      
      // Lazily initialize the remote stream if it does not exist
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        console.log('[WebRTC] Initialized new remote MediaStream ref');
      }
      
      // Add the track to our accumulated MediaStream if not already present
      const alreadyHasTrack = remoteStreamRef.current.getTracks().some(t => t.id === event.track.id);
      if (!alreadyHasTrack) {
        console.log('[WebRTC] Accumulating remote track:', event.track.kind);
        remoteStreamRef.current.addTrack(event.track);
      }
      
      // Create a fresh wrapper MediaStream with all current tracks
      // This guarantees that the stream reference shifts, triggering React's dependency tracking
      const compositeStream = new MediaStream(remoteStreamRef.current.getTracks());
      setRemoteStream(compositeStream);
      setRemoteStreamActive(true);
      
      // Direct-binding stream immediately to existing elements to bypass React rendering cycle/stale ref delay
      if (partnerVideoRef.current) {
        if (partnerVideoRef.current.srcObject !== compositeStream) {
          console.log('[WebRTC] Direct-binding ontrack to partnerVideoRef');
          partnerVideoRef.current.srcObject = compositeStream;
          partnerVideoRef.current.play().catch(err => console.log('[WebRTC] partnerVideoRef play blocked:', err));
        }
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== compositeStream) {
          console.log('[WebRTC] Direct-binding ontrack to remoteAudioRef');
          remoteAudioRef.current.srcObject = compositeStream;
          remoteAudioRef.current.play().catch(err => console.log('[WebRTC] remoteAudioRef play blocked:', err));
        }
      }
    };

    return pc;
  };

  const drainIceCandidatesQueue = async () => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        const candidates = [...iceCandidatesQueueRef.current];
        iceCandidatesQueueRef.current = [];
        console.log(`[WebRTC] Draining ${candidates.length} accumulated ICE candidates...`);
        for (const candidate of candidates) {
          if (!candidate) continue;
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.error('[WebRTC] Failed to append queued ICE candidate:', err, candidate);
          }
        }
      }
    } catch (err) {
      console.error('[WebRTC] Failed to drain ICE candidates queue:', err);
    }
  };

  const handleStartWebRTCOffer = async () => {
    try {
      const pc = createPeerConnection(localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current && currentUser?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'call:sdp-offer',
          sdp: offer,
          targetId: currentUser.partnerId
        }));
      }
    } catch (err) {
      console.error('Failed to initiate SDP Offer:', err);
    }
  };

  const handleReceiveWebRTCOffer = async (sdp: any) => {
    try {
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(localStreamRef.current);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Drain any queued ice candidates safely now that remote description is set
      await drainIceCandidatesQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current && currentUser?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'call:sdp-answer',
          sdp: answer,
          targetId: currentUser.partnerId
        }));
      }
    } catch (err) {
      console.error('Failed to handle SDP Offer:', err);
    }
  };

  const handleReceiveWebRTCAnswer = async (sdp: any) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Drain any queued ice candidates safely
        await drainIceCandidatesQueue();
      }
    } catch (err) {
      console.error('Failed to handle SDP Answer:', err);
    }
  };

  const handleReceiveIceCandidate = async (candidate: any) => {
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
  };

  // Dial out call
  const triggerDialOut = async (mode: 'voice' | 'video') => {
    if (!currentUser || !socketRef.current) return;
    // Clear and reset ICE candidates queue strictly on new call session initialization
    iceCandidatesQueueRef.current = [];
    
    setCallType(mode);
    callTypeRef.current = mode;
    setIncomingCall(true);
    setRingingRole('caller');
    
    // Warm up local media stream immediately
    const stream = await initiateMediaStream(mode);

    // Send signal over websocket
    socketRef.current.send(JSON.stringify({
      type: 'call:dial',
      mode,
      callerId: currentUser.id
    }));
  };

  // Accept incoming call
  const handleAcceptCall = async () => {
    if (!socketRef.current || !currentUser) return;
    // Clear and reset ICE candidates queue strictly on new call session initialization
    iceCandidatesQueueRef.current = [];

    setIncomingCall(false);
    setCallActive(true);
    setRingingRole(null);

    // 1. Warm up the local media stream FIRST to avoid race descriptor on incoming offer
    const stream = await initiateMediaStream(callType);

    // 2. Create local peer connection with tracks
    createPeerConnection(stream);

    // 3. Send accept notification ONLY AFTER tracks are loaded in PC
    socketRef.current.send(JSON.stringify({
      type: 'call:response',
      action: 'accept',
      calleeId: currentUser.id
    }));
  };

  // Decline call
  const handleDeclineCall = () => {
    if (!socketRef.current || !currentUser) return;
    setIncomingCall(false);
    setRingingRole(null);

    // Send decline notification
    socketRef.current.send(JSON.stringify({
      type: 'call:response',
      action: 'decline',
      calleeId: currentUser.id
    }));
  };

  // Hanugp/End call
  const handleHangupCall = () => {
    if (!socketRef.current || !currentUser) return;
    cleanupCalling();

    // Notify other partner
    socketRef.current.send(JSON.stringify({
      type: 'call:hangup',
      userId: currentUser.id
    }));
  };

  const cleanupCalling = () => {
    setCallActive(false);
    setIncomingCall(false);
    setRingingRole(null);
    setRemoteStreamActive(false);
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
    if (socketRef.current && currentUser) {
      socketRef.current.send(JSON.stringify({
        type: 'state:update',
        section: enabled ? 'sleep_on' : 'sleep_off'
      }));
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
            onSendThumbKissToggle={(active) => {
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                  type: active ? 'chat:thumb-kiss-start' : 'chat:thumb-kiss-end',
                  userId: currentUser.id
                }));
              }
            }}
            onJoin={() => {
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                  type: 'chat:join',
                  userId: currentUser.id
                }));
              }
            }}
            onLeave={() => {
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                  type: 'chat:leave',
                  userId: currentUser.id
                }));
              }
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
      case 'home_customization':
        return (
          <HomeCustomizer
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

  return (
    <div className="min-h-screen pb-20">
      
      {/* Visual Navigation Bar */}
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

      {/* Modern Responsive Bottom Bar for Lazy Users perspective (1-Click Switchers) */}
      {currentUser && currentUser.partnerId && (
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

              {/* Notification Items List Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[42vh] min-h-[220px]">
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
      <main className="py-4 min-h-[82vh]">
        
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
            
            <div className="bg-stone-900 border border-stone-800 px-3 py-1 rounded-xl text-[9px] text-emerald-400 font-bold">
              🔒 Decrypted client-to-client
            </div>
          </div>

           {/* Video visual frame displays: capturing 90% of screen height */}
          <div className="flex-1 flex items-center justify-center py-4 relative">
            {callType === 'video' ? (
              <div className="w-full max-w-sm h-[70vh] sm:h-[75vh] md:aspect-[3/4] rounded-3xl bg-stone-950 overflow-hidden relative border border-stone-800 shadow-2xl">
                
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
                  style={{ display: 'none' }}
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

          </div>

        </div>
      )}

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
                  if (socketRef.current) {
                    socketRef.current.send(JSON.stringify({
                      type: 'state:update',
                      section: 'sleep_spark' as any
                    }));
                  }
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
