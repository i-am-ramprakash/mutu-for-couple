import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Edit3, Save, Camera, Sparkles, Smile, Check, Plus, Trash2, Heart, 
  MapPin, Clock, Calendar, Volume2, Moon, Sun, Briefcase, PhoneCall, Gift, BookOpen, 
  MessageSquare, Star, Milestone, Compass, Activity, Play, Eye, Share2, Upload, CloudSun, X, ZoomIn
} from 'lucide-react';
import { User } from '../types';
import { playSweetSparkSound, playSweetHeartbeat, playSweetMessageSound } from '../utils/audio';

interface UserProfileProps {
  currentUser: User;
  profileUserId: string;
  onBack: () => void;
  onRefreshUser: () => void;
}

// Default cover image placeholder
const DEFAULT_COVER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'><rect width='100%' height='100%' fill='%23131b2e'/><circle cx='400' cy='200' r='180' fill='%231e293b' opacity='0.4'/><path d='M150 300 C 250 200, 350 350, 450 150 C 550 380, 650 120, 750 250' stroke='%23f43f5e' stroke-width='4' fill='none' opacity='0.3'/><circle cx='150' cy='150' r='6' fill='%23ec4899' opacity='0.7'/><circle cx='600' cy='100' r='8' fill='%23ec4899' opacity='0.6'/><circle cx='300' cy='250' r='4' fill='%2314b8a6' opacity='0.5'/></svg>";

const STANDARD_TIMEZONES = [
  "UTC-08:00 (Pacific Time - SF, LA)",
  "UTC-05:00 (Eastern Time - NY, Miami)",
  "UTC+00:00 (London, Dublin)",
  "UTC+01:00 (Paris, Berlin, Rome)",
  "UTC+05:30 (Mumbai, New Delhi)",
  "UTC+08:00 (Singapore, Beijing)",
  "UTC+09:00 (Tokyo, Seoul)",
  "UTC+10:00 (Sydney, Melbourne)"
];

const STANDARD_MOODS = [
  { emoji: "💖", label: "Hopelessly in love" },
  { emoji: "🥰", label: "Cozy & Warm" },
  { emoji: "😊", label: "Happy / Peaceful" },
  { emoji: "😘", label: "Flirty / Playful" },
  { emoji: "⭐", label: "Cosmic Sparkly" },
  { emoji: "🔋", label: "Energetic / Ready" },
  { emoji: "💤", label: "Sleepy / Dreamy" },
  { emoji: "💭", label: "Thinking about you" },
  { emoji: "🌧️", label: "Missing you deeply" }
];

const StandardEmojis = ["❤️", "💖", "✨", "🦋", "🌸", "🌹", "👑", "🌙", "🥂", "🍿", "🍕", "✈️", "🎵", "💬", "🧸", "💑", "🔮", "🌅", "💘", "💋"];

export default function UserProfile({ currentUser, profileUserId, onBack, onRefreshUser }: UserProfileProps) {
  const isSelf = profileUserId === currentUser.id;
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Crop / Reposition simulators
  const [showCropCoverModal, setShowCropCoverModal] = useState(false);
  const [showCropAvatarModal, setShowCropAvatarModal] = useState(false);
  const [coverZoom, setCoverZoom] = useState(100);
  const [coverRepositionY, setCoverRepositionY] = useState(50);
  const [avatarZoom, setAvatarZoom] = useState(100);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);

  // Fullscreen picture state
  const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false);

  // Live voice recorder simulator
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);
  const [voiceWaves, setVoiceWaves] = useState<number[]>([15, 30, 20, 45, 10, 60, 25, 40, 50, 15, 30, 45, 20]);
  const voiceTimerRef = useRef<any>(null);

  // Emoji note quick menu
  const [showEmojiNoteMenu, setShowEmojiNoteMenu] = useState(false);

  // Future Dreams sub-lists
  const [newGoal, setNewGoal] = useState("");
  const [newTrip, setNewTrip] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  // Live ticker for reunion countdown
  const [tickerTime, setTickerTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0, valid: false });

  // Load profile data on mount or user change
  useEffect(() => {
    fetchProfile();
  }, [profileUserId, currentUser]);

  // Handle live ticker logic
  useEffect(() => {
    if (!profileData?.reunionDate) {
      setTickerTime(t => ({ ...t, valid: false }));
      return;
    }

    const updateTicker = () => {
      const target = new Date(profileData.reunionDate + "T00:00:00").getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (isNaN(target) || diff <= 0) {
        setTickerTime({ days: 0, hours: 0, mins: 0, secs: 0, valid: false });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTickerTime({ days, hours, mins, secs, valid: true });
      }
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [profileData?.reunionDate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user/profile/${profileUserId}`);
      if (!res.ok) throw new Error('Failed to fetch profile info.');
      const d = await res.json();
      if (d.success) {
        // Ensure lists exist as arrays
        const userWithLists = {
          ...d.user,
          sharedGoals: Array.isArray(d.user.sharedGoals) ? d.user.sharedGoals : d.user.sharedGoals ? JSON.parse(d.user.sharedGoals) : [],
          plannedTrips: Array.isArray(d.user.plannedTrips) ? d.user.plannedTrips : d.user.plannedTrips ? JSON.parse(d.user.plannedTrips) : [],
          lifeMilestones: Array.isArray(d.user.lifeMilestones) ? d.user.lifeMilestones : d.user.lifeMilestones ? JSON.parse(d.user.lifeMilestones) : []
        };
        setProfileData(userWithLists);
        if (userWithLists.coverRepositionY !== undefined) {
          setCoverRepositionY(Number(userWithLists.coverRepositionY));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;
    try {
      setSaving(true);
      
      const payload = {
        userId: profileData.id,
        name: profileData.name,
        birthday: profileData.birthday,
        nickname: profileData.nickname || '',
        personalNote: profileData.personalNote || '',
        currentPresenceStatus: profileData.currentPresenceStatus || '',
        checkInMood: profileData.checkInMood || '💖',
        locationTimezone: profileData.locationTimezone || '',
        locationCity: profileData.locationCity || '',
        coverPhoto: profileData.coverPhoto || '',
        profilePhoto: profileData.profilePhoto || '',
        coverRepositionY: coverRepositionY,
        
        favFood: profileData.favFood || '',
        favMovie: profileData.favMovie || '',
        favSong: profileData.favSong || '',
        favColor: profileData.favColor || '',
        dreamDestination: profileData.dreamDestination || '',
        checkInLoveLanguage: profileData.checkInLoveLanguage || '',
        
        distance: profileData.distance || '',
        reunionDate: profileData.reunionDate || '',
        
        wakeTime: profileData.wakeTime || '',
        sleepTime: profileData.sleepTime || '',
        workSchedule: profileData.workSchedule || '',
        bestTimeToCall: profileData.bestTimeToCall || '',
        
        favPhoto: profileData.favPhoto || '',
        favVoiceNoteText: profileData.favVoiceNoteText || '',
        favLetterTitle: profileData.favLetterTitle || '',
        favMemoryText: profileData.favMemoryText || '',
        
        sharedGoals: profileData.sharedGoals,
        plannedTrips: profileData.plannedTrips,
        lifeMilestones: profileData.lifeMilestones
      };

      const res = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Save failed');
      const d = await res.json();
      if (d.success) {
        setIsEditing(false);
        playSweetSparkSound();
        onRefreshUser();
        // Refresh local data to be correct
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
      alert('Could not sync profile settings.');
    } finally {
      setSaving(false);
    }
  };

  // Base64 file loaders
  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileData({ ...profileData, coverPhoto: reader.result as string });
      playSweetHeartbeat();
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileData({ ...profileData, profilePhoto: reader.result as string });
      playSweetHeartbeat();
    };
    reader.readAsDataURL(file);
  };

  // Virtual Wave simulator
  const startVoicePlayback = () => {
    if (voicePlaybackActive) {
      setVoicePlaybackActive(false);
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      return;
    }
    
    setVoicePlaybackActive(true);
    playSweetHeartbeat();
    
    voiceTimerRef.current = setInterval(() => {
      setVoiceWaves(prev => prev.map(() => Math.floor(Math.random() * 55) + 10));
    }, 150);

    // Stop simulator after 6 seconds automatically
    setTimeout(() => {
      setVoicePlaybackActive(false);
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center p-6 space-y-4">
        <motion.div 
          animate={{ scale: [1, 1.15, 1], rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-rose-500 font-bold"
        >
          <Heart size={36} fill="currentColor" className="animate-pulse" />
        </motion.div>
        <span className="text-stone-400 font-mono text-xs tracking-wider">Unlocking Cosmic Room...</span>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-stone-950 p-6 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 text-stone-400">
          <Heart size={40} className="mx-auto text-stone-600" />
          <p>Cosmic Room not set up yet.</p>
          <button onClick={onBack} className="px-5 py-2.5 bg-rose-500 text-white rounded-full font-bold">
            Back Lobby
          </button>
        </div>
      </div>
    );
  }

  // Calculate days together nicely
  const getDaysTogether = () => {
    const start = currentUser.anniversaryDate ? new Date(currentUser.anniversaryDate).getTime() : null;
    if (!start) return null;
    const now = new Date().getTime();
    const diff = now - start;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  };

  const daysTogether = getDaysTogether();

  return (
    <div className="min-h-screen bg-[#0C101B]/95 text-stone-100 flex flex-col font-sans select-none overflow-x-hidden relative">
      
      {/* 1. Cover Image Section (Occupies 25-30% of viewport height) */}
      <div 
        className="w-full h-[28vh] md:h-[35vh] relative overflow-hidden bg-cover bg-center transition-all duration-300"
        style={{ 
          backgroundImage: `url(${profileData.coverPhoto || DEFAULT_COVER})`,
          backgroundPositionY: `${coverRepositionY}%`,
          backgroundSize: `${coverZoom}%`
        }}
        id="profile_cover_container"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C101B] via-transparent to-black/35" />
        
        {/* Back and Action Buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-2xl hover:bg-black/70 text-white border border-stone-800 transition-all active:scale-95 cursor-pointer"
            id="profile_btn_back"
          >
            <ArrowLeft size={18} />
          </button>

          {isSelf && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-xs shadow-lg transition-all border cursor-pointer ${
                  isEditing 
                    ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white animate-pulse'
                    : 'bg-[#181E32]/80 backdrop-blur-md hover:bg-rose-500 text-rose-300 hover:text-white border-rose-900/30'
                }`}
                id="profile_edit_toggle"
              >
                {isEditing ? <Save size={13} /> : <Edit3 size={13} />}
                <span>{isEditing ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Room'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Cover Actions menu */}
        {isEditing && (
          <div className="absolute bottom-4 right-4 flex gap-2 z-10 pb-1">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-black/65 backdrop-blur-md hover:bg-black/85 text-[11px] text-stone-200 rounded-xl cursor-pointer border border-stone-800 tracking-wider">
              <Camera size={12} className="text-rose-400" />
              <span>Replace Cover</span>
              <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
            </label>
            <button
              onClick={() => setShowCropCoverModal(true)}
              className="px-3 py-1.5 bg-[#181E32]/90 backdrop-blur-md text-[11px] text-rose-300 rounded-xl border border-rose-900/40 font-bold hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
            >
              Crop & Pan
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 pb-20 relative z-20">
        
        {/* Profile Card Header Info */}
        <div className="relative -mt-16 sm:-mt-22 mb-6 flex flex-col items-center sm:items-start text-center sm:text-left sm:flex-row sm:gap-6">
          
          {/* 2. Floating Profile Picture Container */}
          <div className="relative shrink-0">
            <div 
              onClick={() => !isEditing && setShowFullscreenAvatar(true)}
              className={`w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-[#0C101B] bg-slate-900 overflow-hidden shadow-2xl relative select-none hover:scale-105 active:scale-95 transition-all ${!isEditing ? 'cursor-pointer' : ''}`}
            >
              {profileData.profilePhoto ? (
                <img 
                  src={profileData.profilePhoto} 
                  alt={profileData.name} 
                  className="w-full h-full object-cover transition-all"
                  style={{
                    transform: `scale(${avatarZoom / 100}) translate(${avatarOffsetX}px, ${avatarOffsetY}px)`
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl text-rose-500 font-bold">
                  {profileData.nickname?.[0]?.toUpperCase() || profileData.name?.[0]?.toUpperCase() || '❤️'}
                </div>
              )}
              
              {!isEditing && (
                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn size={20} className="text-white" />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="absolute -bottom-2 -right-1 flex gap-1 z-30">
                <label className="p-2 bg-rose-500 text-white rounded-full cursor-pointer hover:bg-rose-600 border-2 border-[#0C101B] flex items-center justify-center transition shadow-md">
                  <Camera size={14} />
                  <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" />
                </label>
                <button
                  onClick={() => setShowCropAvatarModal(true)}
                  className="p-2 bg-[#181E32] text-rose-300 rounded-full border-2 border-[#0C101B] hover:bg-rose-500 hover:text-white shadow-md flex items-center justify-center transition cursor-pointer"
                  title="Crop profile photo"
                >
                  <Sparkles size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats: Display Name, Nickname, Live Status */}
          <div className="flex-1 mt-4 sm:mt-16 flex flex-col justify-end min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3.5">
              
              {/* 3. Identity and Online Status inside same block */}
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-0.5">Display Name</label>
                    <input 
                      type="text" 
                      value={profileData.name || ''} 
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs w-full focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-0.5">Nickname / Endearment</label>
                    <input 
                      type="text" 
                      placeholder="My Sweetheart"
                      value={profileData.nickname || ''} 
                      onChange={e => setProfileData({ ...profileData, nickname: e.target.value })}
                      className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs w-full focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl font-serif font-black tracking-tight text-white">{profileData.name}</h1>
                    {profileData.nickname && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                        {profileData.nickname}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Presence Section (badge element) */}
              <div className="mt-2.5 sm:mt-0 flex items-center gap-2 justify-center">
                <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${profileData.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-500'}`} />
                <span className="text-xs font-mono font-bold text-stone-400">
                  {profileData.isOnline ? 'In the Hearth (Online)' : 'Away (Offline)'}
                </span>
                
                {!profileData.isOnline && profileData.lastActive && (
                  <span className="text-[10px] text-stone-500 font-sans tracking-wide">
                    Last seen {new Date(profileData.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Custom Mood Status lines */}
            <div className="mt-2 text-xs flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-lg shrink-0">{profileData.checkInMood || '💖'}</span>
              
              {isEditing ? (
                <div className="flex flex-col gap-1 w-full max-w-sm mt-1">
                  <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-0.5">Custom Status Line</label>
                  <input
                    type="text"
                    placeholder="E.g., Cuddles and code 🌙"
                    value={profileData.currentPresenceStatus || ''}
                    onChange={e => setProfileData({ ...profileData, currentPresenceStatus: e.target.value })}
                    className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs w-full focus:outline-none focus:border-rose-500"
                    maxLength={100}
                  />

                  <div className="mt-1 flex flex-wrap gap-1">
                    {STANDARD_MOODS.map(m => (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => {
                          setProfileData({ ...profileData, checkInMood: m.emoji, currentPresenceStatus: m.label });
                          playSweetHeartbeat();
                        }}
                        className="px-2 py-1 bg-stone-900 border border-stone-800 text-[10px] rounded-lg text-stone-300 hover:border-rose-500/50 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{m.emoji}</span>
                        <span>{m.label.substring(0, 10)}...</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-stone-300 font-mono italic">
                  &ldquo;{profileData.currentPresenceStatus || 'Dreaming under the same stars.'}&rdquo;
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Personal Note Section (Editable, 500 chars, displayed prominently) */}
        <div className="w-full bg-[#111625]/85 border border-[#1d243b]/40 rounded-3xl p-5 mb-6 text-stone-300 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500/80" />
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center gap-1.5 font-serif">
              <Sparkles size={13} className="text-yellow-400" />
              My Inner Quote & Notes
            </span>
            {isEditing && (
              <span className="text-[9px] font-mono text-stone-500">
                {(profileData.personalNote || '').length}/500 limits
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="relative mt-1">
              <textarea
                value={profileData.personalNote || ''}
                onChange={e => {
                  if (e.target.value.length <= 500) {
                    setProfileData({ ...profileData, personalNote: e.target.value });
                  }
                }}
                placeholder="Write down any beautiful warm thought details here so your partner can read it anytime they open your door room..."
                className="w-full min-h-[90px] px-3 py-2.5 bg-stone-950 border border-stone-900 rounded-2xl text-xs text-stone-100 focus:outline-none focus:border-rose-500 text-left resize-none"
                maxLength={500}
              />
              
              {/* Emoji quick drawer */}
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEmojiNoteMenu(!showEmojiNoteMenu)}
                  className="p-1 px-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-[10px] text-stone-400 cursor-pointer flex items-center gap-1 select-none"
                >
                  <Smile size={11} className="text-stone-300" />
                  <span>Insert Emoji</span>
                </button>
                {showEmojiNoteMenu && (
                  <div className="flex flex-wrap gap-1 bg-stone-950 border border-stone-800 rounded-xl p-2 max-w-full">
                    {StandardEmojis.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          const note = (profileData.personalNote || '') + em;
                          if (note.length <= 500) {
                            setProfileData({ ...profileData, personalNote: note });
                          }
                          setShowEmojiNoteMenu(false);
                        }}
                        className="text-base hover:scale-125 transition-transform p-0.5 cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs sm:text-sm italic font-medium leading-relaxed tracking-wide text-stone-200 pl-2">
              {profileData.personalNote || 'This room is a warm shelter. Write down a sweet note or personal quote to greet your partner here! Click Edit to customise your nest.'}
            </div>
          )}
        </div>

        {/* Identity & Presence Details Grid Segment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Section: Identity Details */}
          <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 space-y-4 shadow-md backdrop-blur-xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 flex items-center gap-2">
              <Gift size={14} className="text-rose-400" />
              Identity Coordinates
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Birthday</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={profileData.birthday || ''}
                    onChange={e => setProfileData({ ...profileData, birthday: e.target.value })}
                    className="mt-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs w-full focus:outline-none"
                  />
                ) : (
                  <span className="font-mono text-stone-300 block mt-1">
                    {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No birthday scheduled'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Local Timezone</span>
                {isEditing ? (
                  <select
                    value={profileData.locationTimezone || ''}
                    onChange={e => setProfileData({ ...profileData, locationTimezone: e.target.value })}
                    className="mt-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs w-full focus:outline-none"
                  >
                    <option value="">Select timezone</option>
                    {STANDARD_TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-stone-300 block mt-1 truncate" title={profileData.locationTimezone || 'Coordinated Universal Time'}>
                    {profileData.locationTimezone || 'UTC+00:00 (Greenwich Standard)'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Hearth City</span>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="San Francisco"
                    value={profileData.locationCity || ''}
                    onChange={e => setProfileData({ ...profileData, locationCity: e.target.value })}
                    className="mt-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-stone-300 font-serif block mt-1">
                    {profileData.locationCity || 'Uncharted Haven'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Current Climate</span>
                <span className="font-sans text-stone-300 block mt-1 flex items-center gap-1">
                  <CloudSun size={13} className="text-yellow-400" />
                  <span>{profileData.locationWeather || 'Temperate Cosy 24°C'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section: 7. Relationship Information & Counts */}
          <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 mb-3 flex items-center gap-2">
                <Heart size={14} fill="currentColor" className="text-rose-500" />
                Relationship Milestones
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Anniversary</span>
                  <span className="font-mono text-[#f43f5e] font-black block mt-1">
                    {currentUser.anniversaryDate ? new Date(currentUser.anniversaryDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Setting up Anniv Date'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Days Together</span>
                  <span className="font-serif font-extrabold text-white text-base block mt-0.5">
                    {daysTogether !== null ? `${daysTogether} Glorious Days` : 'Set Date in Lobby'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Physical Distance</span>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="E.g., 2,400 miles (LDR)"
                      value={profileData.distance || ''}
                      onChange={e => setProfileData({ ...profileData, distance: e.target.value })}
                      className="mt-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs w-full focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono text-stone-300 block mt-1">
                      {profileData.distance || '0 miles apart (Same Nest)'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Next Reunion Target</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileData.reunionDate || ''}
                      onChange={e => setProfileData({ ...profileData, reunionDate: e.target.value })}
                      className="mt-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs w-full focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono text-stone-300 block mt-1">
                      {profileData.reunionDate ? new Date(profileData.reunionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Plan date range'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Reunion Countdown Ticker */}
            {tickerTime.valid ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#f43f5e] mb-1">Live Reunion Countdown Ticker ✈️</span>
                <div className="flex gap-2 text-stone-100 font-mono text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black bg-stone-900/60 px-1.5 py-0.5 rounded-lg text-white">{tickerTime.days}</span>
                    <span className="text-[8px] text-stone-400 mt-0.5">days</span>
                  </div>
                  <span className="text-stone-500 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black bg-stone-900/60 px-1.5 py-0.5 rounded-lg text-white">{tickerTime.hours}</span>
                    <span className="text-[8px] text-stone-400 mt-0.5">hours</span>
                  </div>
                  <span className="text-stone-500 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black bg-stone-900/60 px-1.5 py-0.5 rounded-lg text-white">{tickerTime.mins}</span>
                    <span className="text-[8px] text-stone-400 mt-0.5">mins</span>
                  </div>
                  <span className="text-stone-500 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black bg-stone-900/60 px-1.5 py-0.5 rounded-lg text-white">{tickerTime.secs}</span>
                    <span className="text-[8px] text-stone-400 mt-0.5">secs</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900/40 rounded-2xl p-3 text-center border border-dashed border-stone-800 text-[10px] text-stone-400">
                🚀 No reunion planned yet. Add a reunion target date in your room!
              </div>
            )}
          </div>
        </div>

        {/* 6. Love Profile Section (Favorites list) */}
        <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 mb-6 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 mb-4 flex items-center gap-2">
            <Compass size={14} className="text-emerald-400" />
            Romantic Love Favorites
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl relative">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Favorite Food</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.favFood || ''} 
                  onChange={e => setProfileData({ ...profileData, favFood: e.target.value })}
                  placeholder="🍣 Shabu Shabu"
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none"
                />
              ) : (
                <p className="text-xs font-medium text-stone-200">{profileData.favFood || '🍕 Slice of Pizza'}</p>
              )}
            </div>

            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl relative">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Favorite Movie</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.favMovie || ''} 
                  onChange={e => setProfileData({ ...profileData, favMovie: e.target.value })}
                  placeholder="🎬 Inception"
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none"
                />
              ) : (
                <p className="text-xs font-medium text-stone-200">{profileData.favMovie || '🍿 Before Sunrise'}</p>
              )}
            </div>

            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl relative">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Signature Song</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.favSong || ''} 
                  onChange={e => setProfileData({ ...profileData, favSong: e.target.value })}
                  placeholder="🎵 Lover - Taylor Swift"
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none"
                />
              ) : (
                <p className="text-xs font-medium text-stone-200">{profileData.favSong || '🎻 Blue Jeans'}</p>
              )}
            </div>

            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Comforting Color</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.favColor || ''} 
                  onChange={e => setProfileData({ ...profileData, favColor: e.target.value })}
                  placeholder="🎨 Soft Pink"
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full inline-block bg-pink-400 border border-white/20" />
                  <p className="text-xs font-medium text-stone-200">{profileData.favColor || 'Milky White'}</p>
                </div>
              )}
            </div>

            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Dream Haven Voyage</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.dreamDestination || ''} 
                  onChange={e => setProfileData({ ...profileData, dreamDestination: e.target.value })}
                  placeholder="✈️ Amalfi Coast, Italy"
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none"
                />
              ) : (
                <p className="text-xs font-medium text-stone-200">{profileData.dreamDestination || '🌴 Kyoto, Japan'}</p>
              )}
            </div>

            <div className="bg-[#111625] border border-[#1d243b]/30 p-3 rounded-2xl">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1">Primary Love Language</span>
              {isEditing ? (
                <select 
                  value={profileData.checkInLoveLanguage || ''} 
                  onChange={e => setProfileData({ ...profileData, checkInLoveLanguage: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-200 outline-none focus:outline-none"
                >
                  <option value="">Select language</option>
                  <option value="Words of Affirmation 💬">Words of Affirmation 💬</option>
                  <option value="Quality Time ⏳">Quality Time ⏳</option>
                  <option value="Physical Touch 💑">Physical Touch 💑</option>
                  <option value="Acts of Service 🛠️">Acts of Service 🛠️</option>
                  <option value="Receiving Gifts 🎁">Receiving Gifts 🎁</option>
                </select>
              ) : (
                <p className="text-xs font-medium text-stone-200">{profileData.checkInLoveLanguage || 'Physical Touch 💑'}</p>
              )}
            </div>

          </div>
        </div>

        {/* 8. Availability Information Grid Section */}
        <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 mb-6 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-pink-400" />
            Comfort Availability & Schedule
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-stone-900/40 p-3.5 rounded-2xl border border-[#1d243b]/10">
              <span className="text-[9px] text-stone-500 font-bold uppercase block flex items-center gap-1">
                <Sun size={10} className="text-amber-400" />
                Rise & Wake Time
              </span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.wakeTime || ''} 
                  onChange={e => setProfileData({ ...profileData, wakeTime: e.target.value })}
                  placeholder="07:30 AM"
                  className="mt-1 w-full bg-stone-900 border border-stone-800 text-xs px-2 py-1 rounded-lg text-stone-200 outline-none"
                />
              ) : (
                <p className="mt-1 font-mono font-bold text-stone-300">{profileData.wakeTime || '07:00 AM'}</p>
              )}
            </div>

            <div className="bg-stone-900/40 p-3.5 rounded-2xl border border-[#1d243b]/10">
              <span className="text-[9px] text-stone-500 font-bold uppercase block flex items-center gap-1">
                <Moon size={10} className="text-sky-400" />
                Sleep Comfort Hour
              </span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.sleepTime || ''} 
                  onChange={e => setProfileData({ ...profileData, sleepTime: e.target.value })}
                  placeholder="11:30 PM"
                  className="mt-1 w-full bg-stone-900 border border-stone-800 text-xs px-2 py-1 rounded-lg text-stone-200 outline-none"
                />
              ) : (
                <p className="mt-1 font-mono font-bold text-stone-300">{profileData.sleepTime || '11:00 PM'}</p>
              )}
            </div>

            <div className="bg-stone-900/40 p-3.5 rounded-2xl border border-[#1d243b]/10">
              <span className="text-[9px] text-stone-500 font-bold uppercase block flex items-center gap-1">
                <Briefcase size={10} className="text-stone-400" />
                Daily Work/Study Cycle
              </span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.workSchedule || ''} 
                  onChange={e => setProfileData({ ...profileData, workSchedule: e.target.value })}
                  placeholder="09:00 - 18:00 (MF)"
                  className="mt-1 w-full bg-stone-900 border border-stone-800 text-xs px-2 py-1 rounded-lg text-stone-200 outline-none"
                />
              ) : (
                <p className="mt-1 text-stone-300 truncate" title={profileData.workSchedule}>{profileData.workSchedule || '9 AM - 5 PM, Mon-Fri'}</p>
              )}
            </div>

            <div className="bg-stone-900/40 p-3.5 rounded-2xl border border-[#1d243b]/10">
              <span className="text-[9px] text-stone-500 font-bold uppercase block flex items-center gap-1">
                <PhoneCall size={10} className="text-emerald-400" />
                Sweetest Time to Dial
              </span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.bestTimeToCall || ''} 
                  onChange={e => setProfileData({ ...profileData, bestTimeToCall: e.target.value })}
                  placeholder="21:00 PM - 22:30 PM"
                  className="mt-1 w-full bg-stone-900 border border-stone-800 text-xs px-2 py-1 rounded-lg text-stone-200 outline-none"
                />
              ) : (
                <p className="mt-1 text-stone-300 font-black truncate" title={profileData.bestTimeToCall}>{profileData.bestTimeToCall || '8 PM onwards'}</p>
              )}
            </div>
          </div>
        </div>

        {/* 9. Memory Highlights */}
        <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 mb-6 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 mb-4 flex items-center gap-2">
            <BookOpen size={14} className="text-yellow-500" />
            Special Memory Archives
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Memory Polaroid Highlight */}
            <div className="bg-stone-950 p-4 rounded-3xl border border-stone-800/60 flex flex-col items-center">
              <span className="text-[9px] text-[#f43f5e] font-bold uppercase tracking-wider block mb-2 text-center">Highlighted Polaroid</span>
              
              <div className="w-full max-w-[200px] bg-white p-2 pb-5 shadow-2xl rounded-sm transform -rotate-1 hover:rotate-0 transition-transform">
                <div className="w-full h-36 bg-[#181E32] rounded-xs overflow-hidden relative border border-stone-200/40">
                  {profileData.favPhoto ? (
                    <img src={profileData.favPhoto} alt="Highlights" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 gap-1 text-[10px] p-4 text-center">
                      <p>🌌 No featured polaroid set.</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center text-[10px] font-serif text-stone-600 font-bold truncate">
                  {profileData.favMemoryText || 'A pure magical moment.'}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 w-full">
                  <label className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-stone-900 hover:bg-stone-800/90 text-stone-300 border border-stone-800 text-[10px] rounded-xl cursor-pointer select-none">
                    <Upload size={12} className="text-rose-400" />
                    <span>Upload Highlight Polaroid</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setProfileData({ ...profileData, favPhoto: reader.result as string });
                            playSweetHeartbeat();
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Voice Notes Audio Simulator & Letters */}
            <div className="space-y-4">
              
              {/* Highlight Voice Note Transcribed */}
              <div className="bg-stone-900/40 p-4 border border-[#1d243b]/15 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1 flex items-center gap-1">
                    <Volume2 size={12} className="text-yellow-400" />
                    Sweetest Voice Note Echo
                  </span>
                  
                  {isEditing ? (
                    <input 
                      type="text"
                      placeholder="E.g., I loved when you sang Lover on video call..."
                      value={profileData.favVoiceNoteText || ''}
                      onChange={e => setProfileData({ ...profileData, favVoiceNoteText: e.target.value })}
                      className="w-full mt-1 bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-100 outline-none"
                    />
                  ) : (
                    <p className="text-[11px] leading-relaxed italic text-stone-300">{profileData.favVoiceNoteText || '“Calling you late at night is my absolute favorite piece of the week...”'}</p>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={startVoicePlayback}
                    className="p-1 px-3 bg-rose-500 hover:bg-rose-600 text-white font-mono text-[9px] rounded-lg tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Play size={8} fill="currentColor" />
                    <span>{voicePlaybackActive ? "Playing" : "Hear note"}</span>
                  </button>

                  <div className="flex-1 flex gap-0.5 items-end justify-around h-6">
                    {voiceWaves.map((h, i) => (
                      <span 
                        key={i} 
                        className={`w-0.5 rounded-full ${voicePlaybackActive ? 'bg-rose-500' : 'bg-stone-600'} transition-all`} 
                        style={{ height: `${h}%` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Memory / Letter Title */}
              <div className="bg-stone-900/40 p-4 border border-[#1d243b]/15 rounded-2xl">
                <span className="text-[9px] text-stone-500 font-bold uppercase block mb-1 flex items-center gap-1">
                  <MessageSquare size={12} className="text-rose-400" />
                  Beloved Shared Letter Highlight
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="E.g., Your first birthday letter..."
                    value={profileData.favLetterTitle || ''}
                    onChange={e => setProfileData({ ...profileData, favLetterTitle: e.target.value })}
                    className="w-full mt-1 bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-xl text-stone-100 outline-none"
                  />
                ) : (
                  <p className="text-xs font-semibold text-stone-200 mt-1">💌 &ldquo;{profileData.favLetterTitle || 'Your First Anniversary Letter'}&rdquo;</p>
                )}
                
                {isEditing ? (
                  <textarea
                    placeholder="E.g., Summarise your favorite memory together"
                    value={profileData.favMemoryText || ''}
                    onChange={e => setProfileData({ ...profileData, favMemoryText: e.target.value })}
                    className="w-full mt-2 bg-stone-900 border border-stone-800 text-xs p-2 rounded-xl text-stone-100 outline-none resize-none h-14"
                  />
                ) : (
                  <p className="text-[10px] text-stone-500 mt-1 pl-1 line-clamp-2">
                    {profileData.favMemoryText || 'A lovely memory page highlighting the core values we hold dear to ourselves.'}
                  </p>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* 10. Future Dreams (Shared goals, Planned Trips, Milestones lists) */}
        <div className="bg-[#111625]/50 border border-[#1d243b]/20 rounded-3xl p-5 mb-6 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] border-b border-stone-800 pb-2 mb-4 flex items-center gap-2 font-serif">
            <Milestone size={14} className="text-[#a855f7]" />
            Future Cozy Horizons & Dreams
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* List A: Shared Goals */}
            <div className="bg-stone-900/30 border border-stone-800/40 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#f43f5e] font-bold uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <Star size={11} className="text-yellow-400" />
                  Shared Spark Goals
                </span>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {profileData.sharedGoals?.length === 0 ? (
                    <span className="text-[10px] text-stone-600 italic block">No goals added yet. Plan a cozy horizon!</span>
                  ) : (
                    profileData.sharedGoals?.map((gl: string, index: number) => (
                      <div key={index} className="flex justify-between items-center gap-1.5 bg-stone-950 px-2 py-1.5 rounded-lg border border-stone-900">
                        <span className="truncate text-[11px] text-stone-200">{gl}</span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...profileData.sharedGoals];
                              updated.splice(index, 1);
                              setProfileData({ ...profileData, sharedGoals: updated });
                            }}
                            className="text-stone-500 hover:text-rose-500 shrink-0 cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 flex gap-1">
                  <input
                    type="text"
                    placeholder="Move together 🏠"
                    value={newGoal}
                    onChange={e => setNewGoal(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-900 rounded-lg px-2 py-1 text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newGoal) return;
                      setProfileData({ ...profileData, sharedGoals: [...(profileData.sharedGoals || []), newGoal] });
                      setNewGoal("");
                      playSweetHeartbeat();
                    }}
                    className="p-1 px-2.5 bg-[#a855f7] hover:bg-purple-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* List B: Planned Trips */}
            <div className="bg-stone-900/30 border border-stone-800/40 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#f43f5e] font-bold uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <Compass size={11} className="text-emerald-400" />
                  Planned Journeys
                </span>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {profileData.plannedTrips?.length === 0 ? (
                    <span className="text-[10px] text-stone-600 italic block">No trips mapped yet. Dream together!</span>
                  ) : (
                    profileData.plannedTrips?.map((tr: string, index: number) => (
                      <div key={index} className="flex justify-between items-center gap-1.5 bg-stone-950 px-2 py-1.5 rounded-lg border border-stone-900">
                        <span className="truncate text-[11px] text-stone-200">{tr}</span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...profileData.plannedTrips];
                              updated.splice(index, 1);
                              setProfileData({ ...profileData, plannedTrips: updated });
                            }}
                            className="text-stone-500 hover:text-rose-500 shrink-0 cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 flex gap-1">
                  <input
                    type="text"
                    placeholder="Road Trip 🚗"
                    value={newTrip}
                    onChange={e => setNewTrip(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-900 rounded-lg px-2 py-1 text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTrip) return;
                      setProfileData({ ...profileData, plannedTrips: [...(profileData.plannedTrips || []), newTrip] });
                      setNewTrip("");
                      playSweetHeartbeat();
                    }}
                    className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* List C: Life Milestones */}
            <div className="bg-stone-900/30 border border-stone-800/40 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#f43f5e] font-bold uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <Star size={11} className="text-yellow-400" />
                  Anniversary Peaks
                </span>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {profileData.lifeMilestones?.length === 0 ? (
                    <span className="text-[10px] text-stone-600 italic block">No core milestones locked yet. Add one!</span>
                  ) : (
                    profileData.lifeMilestones?.map((ml: string, index: number) => (
                      <div key={index} className="flex justify-between items-center gap-1.5 bg-stone-950 px-2 py-1.5 rounded-lg border border-stone-900">
                        <span className="truncate text-[11px] text-stone-200">{ml}</span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...profileData.lifeMilestones];
                              updated.splice(index, 1);
                              setProfileData({ ...profileData, lifeMilestones: updated });
                            }}
                            className="text-stone-500 hover:text-rose-500 shrink-0 cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 flex gap-1">
                  <input
                    type="text"
                    placeholder="Milestone 🥂"
                    value={newMilestone}
                    onChange={e => setNewMilestone(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-900 rounded-lg px-2 py-1 text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMilestone) return;
                      setProfileData({ ...profileData, lifeMilestones: [...(profileData.lifeMilestones || []), newMilestone] });
                      setNewMilestone("");
                      playSweetHeartbeat();
                    }}
                    className="p-1 px-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* MODAL 1: Crop Cover Image Reposition Simulator overlay */}
      <AnimatePresence>
        {showCropCoverModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-950 border border-stone-800 rounded-3xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Reposition & Zoom Cover</span>
                <button onClick={() => setShowCropCoverModal(false)} className="text-stone-400 hover:text-white cursor-pointer p-0.5">
                  <X size={16} />
                </button>
              </div>

              <div className="w-full h-32 bg-stone-900 border border-stone-850 rounded-xl relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${profileData.coverPhoto || DEFAULT_COVER})`,
                    backgroundPositionY: `${coverRepositionY}%`,
                    backgroundSize: `${coverZoom}%`
                  }}
                />
                <div className="absolute inset-0 border-y-2 border-dashed border-rose-500/50 pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] text-white/80 bg-black/45 px-2 py-1 rounded-md tracking-widest font-mono">DRAG PREVIEW / SLIDER</span>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Vertical Cover Displacement Offset</span>
                    <span className="font-mono text-rose-400">{coverRepositionY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverRepositionY}
                    onChange={e => {
                      setCoverRepositionY(Number(e.target.value));
                    }}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Cover Magnification Zoom</span>
                    <span className="font-mono text-rose-400">{coverZoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="180"
                    value={coverZoom}
                    onChange={e => {
                      setCoverZoom(Number(e.target.value));
                    }}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowCropCoverModal(false);
                  playSweetSparkSound();
                }}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Apply Crop Dimensions
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Crop Profile Avatar Image Reposition Scanner overlay */}
      <AnimatePresence>
        {showCropAvatarModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-950 border border-stone-800 rounded-3xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Surgical Profile Photo Crop</span>
                <button onClick={() => setShowCropAvatarModal(false)} className="text-stone-400 hover:text-white cursor-pointer p-0.5">
                  <X size={16} />
                </button>
              </div>

              <div className="w-full h-44 bg-slate-900 border border-stone-850 rounded-2xl flex items-center justify-center relative overflow-hidden p-4">
                <div className="w-32 h-32 rounded-full ring-4 ring-rose-500/60 overflow-hidden relative select-none">
                  {profileData.profilePhoto ? (
                    <img 
                      src={profileData.profilePhoto} 
                      alt="Crop preview" 
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${avatarZoom / 100}) translate(${avatarOffsetX}px, ${avatarOffsetY}px)`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-rose-500 font-bold">Av</div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Photo Radial Zoom</span>
                    <span className="font-mono text-rose-400">{avatarZoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    value={avatarZoom}
                    onChange={e => setAvatarZoom(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-stone-500 mb-1 block uppercase tracking-wider">Pan Axis X</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={avatarOffsetX}
                      onChange={e => setAvatarOffsetX(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 mb-1 block uppercase tracking-wider">Pan Axis Y</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={avatarOffsetY}
                      onChange={e => setAvatarOffsetY(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowCropAvatarModal(false);
                  playSweetSparkSound();
                }}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Lock Avatar Position
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Fullscreen Avatar View overlay */}
      <AnimatePresence>
        {showFullscreenAvatar && (
          <div 
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-55 cursor-pointer pb-6"
            onClick={() => setShowFullscreenAvatar(false)}
          >
            <button 
              onClick={() => setShowFullscreenAvatar(false)}
              className="absolute top-6 right-6 p-2 bg-stone-900 border border-stone-800 rounded-full text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{ scale: 0.90, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.90, opacity: 0 }}
              className="max-w-[90%] max-h-[80%]"
            >
              <img 
                src={profileData.profilePhoto || DEFAULT_COVER} 
                alt="Portrait View" 
                className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl border-4 border-stone-900"
                style={{
                  transform: `scale(${avatarZoom / 100}) translate(${avatarOffsetX}px, ${avatarOffsetY}px)`
                }}
              />
              <p className="text-center font-serif italic text-stone-400 text-xs mt-4 tracking-wider">
                &ldquo;Portrait of {profileData.name}&rdquo;
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
