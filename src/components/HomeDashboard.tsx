import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Heart, Calendar, Award, MessageSquare, Image as ImageIcon, 
  BookOpen, Edit3, Sparkles, LogOut, Info, Settings, Film, Compass,
  History, Home, Flame, Music, ShieldCheck, TrendingUp
} from 'lucide-react';
import { User, Message, Memory, JournalEntry } from '../types';

const isImageString = (src: string | undefined | null): boolean => {
  if (!src) return false;
  return src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.length > 20;
};

const ROMA_MOODS = [
  { icon: '🥰', label: 'Warm' },
  { icon: '💖', label: 'Bubbling' },
  { icon: '🌧️', label: 'Missing You' },
  { icon: '🧸', label: 'Cozy' },
  { icon: '☕', label: 'Busy' }
];

const LOVE_LANG_NEEDS = [
  'Words of Affirmation',
  'Quality Time',
  'Physical Touch',
  'Acts of Service',
  'Receiving Gifts'
];

interface HomeDashboardProps {
  user: User;
  stats: {
    messagesCount: number;
    memoriesCount: number;
    journalCount: number;
    answerCount: number;
  };
  messages: Message[];
  memories: Memory[];
  journalEntries: JournalEntry[];
  isSleepMode: boolean;
  onToggleSleepMode: (enabled: boolean) => void;
  onSectionSelect: (section: string) => void;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export default function HomeDashboard({ 
  user, stats, messages, memories, journalEntries, isSleepMode, onToggleSleepMode, onSectionSelect, onLogout, onRefreshUser 
}: HomeDashboardProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newAnniversary, setNewAnniversary] = useState(user.anniversaryDate || '');
  const [updating, setUpdating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const unreadChatCount = messages.filter(m => m.senderId !== user.id && !m.read && !m.isMovie).length;

  const handleCopyCode = () => {
    if (user.inviteCode) {
      navigator.clipboard.writeText(user.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    }
  };

  // Calculate days together
  const calculateDaysTogether = () => {
    if (!user.anniversaryDate) return null;
    const anniv = new Date(user.anniversaryDate);
    const today = new Date();
    const diffTime = today.getTime() - anniv.getTime();
    if (diffTime < 0) return 0; // future date
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate days remaining to a calendar date
  const daysUntil = (targetDateStr: string) => {
    if (!targetDateStr) return null;
    const today = new Date();
    let target = new Date(targetDateStr);
    
    // Convert target to current year to calculate countdown
    target.setFullYear(today.getFullYear());
    
    // If date has already passed this year, set to next year
    if (target.getTime() < today.getTime()) {
      target.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const [counterTitleInput, setCounterTitleInput] = useState(user.customLoveCounterTitle || 'Days Together');
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [cityInput, setCityInput] = useState(user.locationCity || '');
  const [timezoneInput, setTimezoneInput] = useState(user.locationTimezone || '0');
  const [weatherInput, setWeatherInput] = useState(user.locationWeather || '');

  const handleSaveLocation = async () => {
    try {
      const res = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          locationCity: cityInput.trim(),
          locationTimezone: timezoneInput,
          locationWeather: weatherInput.trim()
        })
      });
      if (res.ok) {
        setShowLocationEditor(false);
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMood = async (mood: string) => {
    try {
      const res = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          checkInMood: mood
        })
      });
      if (res.ok) {
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLoveLanguage = async (lang: string) => {
    try {
      const res = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          checkInLoveLanguage: lang
        })
      });
      if (res.ok) {
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getGmtTime = (offsetStr?: string) => {
    if (!offsetStr) return 'Not Set';
    try {
      const offset = parseFloat(offsetStr);
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const nd = new Date(utc + (3600000 * offset));
      return nd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (GMT${offset >= 0 ? '+' : ''}${offset})`;
    } catch {
      return '⌛';
    }
  };

  const localCurrentTime = getGmtTime(user.locationTimezone);
  const partnerCurrentTime = getGmtTime(user.partnerTimezone);

  const handleUpdateAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnniversary) return;
    setUpdating(true);

    try {
      const resAnniv = await fetch('/api/couple/update-anniversary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          userId: user.id,
          anniversaryDate: newAnniversary
        })
      });
      
      const resTitle = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          customLoveCounterTitle: counterTitleInput.trim() || 'Days Together'
        })
      });

      if (resAnniv.ok && resTitle.ok) {
        setShowDatePicker(false);
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const daysCount = calculateDaysTogether();
  const partnerBirthDaysLeft = user.partnerBirthday ? daysUntil(user.partnerBirthday) : null;
  const userBirthDaysLeft = user.birthday ? daysUntil(user.birthday) : null;
  const anniversaryDaysLeft = user.anniversaryDate ? daysUntil(user.anniversaryDate) : null;

  // Format YYYY-MM-DD back to reader format
  const formatDateFriendly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const [customChatBgInput, setCustomChatBgInput] = useState(user.chatBackground || '');
  const [appThemeInput, setAppThemeInput] = useState<'light' | 'dark' | 'auto'>(user.appTheme || 'light');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setCityInput(user.locationCity || '');
    setCustomChatBgInput(user.chatBackground || '');
    setAppThemeInput(user.appTheme || 'light');
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      setUpdating(true);
      // Save Chat Background to Couple config
      const resCouple = await fetch('/api/couple/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          userId: user.id,
          chatBackground: customChatBgInput
        })
      });

      // Save App Theme to User config
      const resUser = await fetch('/api/couple/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          appTheme: appThemeInput
        })
      });

      if (resCouple.ok && resUser.ok) {
        setShowSettingsModal(false);
        onRefreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 font-sans relative">
      
      {/* Top Welcome Title & Slogan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-200 transition-colors flex items-center gap-2">
            MuTu Shared Nest <span className="text-rose-500 animate-pulse">🏡</span>
          </h1>
          <p className="text-stone-500 dark:text-stone-400 transition-colors text-sm font-medium mt-1">A virtual home for hearts that live apart.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSectionSelect('tour')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-300 font-bold text-xs rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100 dark:border-rose-900/40"
            id="btn_app_tour"
          >
            <Sparkles size={14} />
            App Tour
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/40 text-stone-500 dark:text-stone-300 rounded-xl transition-all"
            title="Theme Settings"
            id="btn_theme_settings"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={onLogout}
            className="p-2 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-stone-500 dark:text-stone-300 rounded-xl transition-all"
            title="Log out of MuTu"
            id="btn_logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Love Code Card */}
      <div className="bg-white dark:bg-stone-900 border border-rose-100 dark:border-stone-800 p-5 rounded-3xl shadow-sm mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-1">
            <Heart size={16} className="text-rose-500" fill="currentColor" /> 
            Your Personal Love Code
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Share this code to re-link devices or invite your partner.
          </p>
        </div>
        <button 
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-stone-700 text-rose-600 dark:text-rose-300 font-mono font-bold tracking-wider rounded-xl hover:bg-rose-100 dark:hover:bg-stone-600 transition-colors shrink-0"
        >
          {user.inviteCode || 'N/A'}
          {codeCopied ? <span className="text-xs bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100 px-2 py-0.5 rounded ml-2 font-sans tracking-normal animate-fade-in">Copied!</span> : null}
        </button>
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold font-serif mb-4 dark:text-white">Theme & Experience</h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">App Theme Mode</label>
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  {['light', 'dark', 'auto'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setAppThemeInput(theme as any)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                        appThemeInput === theme 
                        ? 'bg-white dark:bg-stone-700 shadow text-stone-800 dark:text-stone-200 dark:text-white' 
                        : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">Chat Room Background</label>
                <p className="text-[10px] text-stone-400 mb-2">Set a custom background image URL or gradient string for your shared chat room.</p>
                <input
                  type="text"
                  placeholder="e.g., https://.../photo.jpg or linear-gradient(...)"
                  value={customChatBgInput}
                  onChange={(e) => setCustomChatBgInput(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-rose-500 outline-none dark:text-white transition-all mb-2"
                />
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {[
                    { label: 'Rose Gold', val: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' },
                    { label: 'Night Sky', val: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)' },
                    { label: 'Warm Glow', val: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
                    { label: 'Plum Cosmic', val: 'linear-gradient(135deg, #2D2529 0%, #1C1418 100%)' },
                    { label: 'Deep Ocean', val: 'linear-gradient(to top, #09203f 0%, #537895 100%)' },
                    { label: 'Sweet Sunset', val: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)' },
                    { label: 'Forest Mint', val: 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)' },
                    { label: 'Clear', val: '' }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setCustomChatBgInput(preset.val)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-stone-200 dark:border-stone-700 hover:border-rose-500 dark:hover:border-rose-500 whitespace-nowrap dark:text-stone-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 font-bold text-sm bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={updating}
                className="px-5 py-2 rounded-xl text-white font-bold text-sm bg-rose-500 hover:bg-rose-600 transition"
              >
                {updating ? 'Saving...' : 'Save Theme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero: Couple Status Ring & CounterCard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left Side: Avatar Ring Pairing */}
        <div className="lg:col-span-1 p-6 rounded-3xl glass-card flex flex-col justify-center items-center text-center relative overflow-hidden" id="couple_profiles_hero">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Heart size={110} fill="currentColor" className="text-rose-500" />
          </div>

          {/* Active streak badge */}
          <div className="mb-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 font-bold px-3 py-1 rounded-2xl text-[10px] tracking-wide flex items-center gap-1">
            🔥 {user.streakCurrent || 1} Day Streak
            <span className="text-[9px] font-normal text-stone-400">(Max: {user.streakMax || 1})</span>
          </div>

          <div className="flex items-center justify-center gap-6 relative">
            {/* User */}
            <div className="flex flex-col items-center">
              <div 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).navigateToProfile) {
                    (window as any).navigateToProfile(user.id);
                  }
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-100 to-rose-200 border-2 border-white romantic-glow shadow flex items-center justify-center text-3xl overflow-hidden relative cursor-pointer hover:scale-110 active:scale-95 transition-all"
                title={`${user.name}'s profile room`}
              >
                {isImageString(user.profilePhoto) ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.profilePhoto || '❤️'}</span>
                )}
              </div>
              <span className="text-xs font-semibold mt-2 text-stone-600 dark:text-stone-300 truncate max-w-[80px]">{user.name}</span>
              
              {/* Presence Status selector dropdown */}
              <select
                value={user.currentPresenceStatus || 'Thinking about you 🌙'}
                onChange={async (e) => {
                  try {
                    await fetch('/api/user/presence', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, presenceStatus: e.target.value })
                    });
                    onRefreshUser();
                  } catch (err) {}
                }}
                className="text-[9px] font-bold text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded-lg mt-1 outline-none text-center cursor-pointer max-w-[95px] truncate"
              >
                <option value="Thinking about you 🌙">Thinking about you 🌙</option>
                <option value="Studying for exams 📚">Studying 📚</option>
                <option value="Sleeping 😴">Sleeping 😴</option>
                <option value="Busy cooking 🍳">Cooking 🍳</option>
                <option value="Online 💖">Online 💖</option>
              </select>
            </div>

            {/* Connecting line with a floating heart */}
            <div className="relative flex items-center justify-center">
              <span className="w-10 h-0.5 bg-rose-200"></span>
              <Heart size={14} fill="currentColor" className="text-rose-500 absolute animate-bounce" />
            </div>

            {/* Partner */}
            <div className="flex flex-col items-center">
              <div 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).navigateToProfile && user.partnerId) {
                    (window as any).navigateToProfile(user.partnerId);
                  }
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-100 to-pink-200 border-2 border-white romantic-glow shadow flex items-center justify-center text-3xl overflow-hidden relative cursor-pointer hover:scale-110 active:scale-95 transition-all"
                title={`${user.partnerName || 'Companion'}'s profile room`}
              >
                {isImageString(user.partnerPhoto) ? (
                  <img src={user.partnerPhoto} alt={user.partnerName} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.partnerPhoto || '🧡'}</span>
                )}
                {/* Visual pulse for heartbeat less than 3 mins */}
                {user.partnerHeartbeat && Date.now() - user.partnerHeartbeat < 180000 && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-ping"></span>
                )}
              </div>
              <span className="text-xs font-semibold mt-2 text-stone-600 dark:text-stone-300 truncate max-w-[80px]">{user.partnerName || 'Partner'}</span>
              
              {/* Partner Emotional Status */}
              <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 px-2 py-0.5 rounded-lg mt-1 max-w-[95px] truncate text-center">
                {user.partnerPresenceStatus || 'Idle status 🥀'}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-1 z-10">
            <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 dark:text-stone-500">YOUR LOVE KEY UNLOCKED</span>
            <div className="bg-rose-100/40 dark:bg-rose-900/30 border border-rose-200/40 dark:border-rose-900/50 px-2.5 py-1 rounded text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 justify-center">
              🔑 {user.loveKey}
            </div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 leading-tight">Keep key private to decrypt conversation feed.</p>
          </div>
        </div>

        {/* Center/Right: Milestone counter and set anniversary */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card flex flex-col justify-between relative overflow-hidden" id="loving_duration_banner">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} /> Live Loving Timer
              </span>
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-stone-400 dark:text-stone-500 hover:text-rose-500 text-xs font-semibold flex items-center gap-1 bg-stone-100/50 dark:bg-stone-800/50 hover:bg-rose-100/20 px-2.5 py-1 rounded-xl transition-all"
                id="btn_open_anniversary_picker"
              >
                <Calendar size={13} /> {user.anniversaryDate ? 'Change Date' : 'Set Start Date'}
              </button>
            </div>

            {/* Anniversary Date Selector Overlay */}
            {showDatePicker && (
              <form onSubmit={handleUpdateAnniversary} className="bg-rose-50/70 dark:bg-stone-800/50 p-4 rounded-3xl border border-rose-200/50 dark:border-stone-700/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-1">Relationship Start Date</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      required
                      value={newAnniversary}
                      onChange={(e) => setNewAnniversary(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-rose-200 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-1">Custom Title Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Days Together, Days Since Kiss"
                      value={counterTitleInput}
                      onChange={(e) => setCounterTitleInput(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-rose-200 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-4 rounded-xl text-xs flex items-center gap-1"
                  >
                    {updating ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}

            {daysCount !== null ? (
              <div className="py-2">
                <h2 className="text-5xl font-serif font-bold text-rose-600 dark:text-rose-400 leading-none">
                  {daysCount.toLocaleString()} <span className="text-stone-800 dark:text-stone-200 text-2xl font-sans font-medium">{user.customLoveCounterTitle || 'Days Together'}</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                  Since your beautiful connection began on <strong className="text-stone-600 dark:text-stone-300">{formatDateFriendly(user.anniversaryDate!)}</strong>. Every second sparkles with memory.
                </p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <span className="text-2xl">⏳</span>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Please set your relationship start/anniversary date to initiate the Live Loving Timer!</p>
              </div>
            )}
          </div>

          <div className="border-t border-rose-100/50 dark:border-stone-800 pt-3 grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-stone-50/50 dark:bg-stone-800/50 rounded-xl border border-stone-100/50 dark:border-stone-700/50">
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 block uppercase">Anniversary</span>
              <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                {anniversaryDaysLeft !== null ? `${anniversaryDaysLeft}d left` : '—'}
              </span>
            </div>
            <div className="text-center p-2 bg-stone-50/50 dark:bg-stone-800/50 rounded-xl border border-stone-100/50 dark:border-stone-700/50">
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 block uppercase">His/Her Birthday</span>
              <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                {partnerBirthDaysLeft !== null ? `${partnerBirthDaysLeft}d left` : '—'}
              </span>
            </div>
            <div className="text-center p-2 bg-stone-50/50 dark:bg-stone-800/50 rounded-xl border border-stone-100/50 dark:border-stone-700/50">
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 block uppercase">Your Birthday</span>
              <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                {userBirthDaysLeft !== null ? `${userBirthDaysLeft}d left` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Twin Heart Weathers + Daily Check-ins Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* 1. Twin Heart Location & Local Time Widget */}
        <div className="p-6 rounded-3xl glass-card flex flex-col justify-between relative overflow-hidden" id="twin_location_time_capsule">
          <div className="flex items-center justify-between border-b border-rose-100/60 pb-3 mb-4">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              🌍 Nest Weathers & Times
            </span>
            <button 
              onClick={() => setShowLocationEditor(!showLocationEditor)}
              type="button" 
              className="text-[10px] text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer border border-rose-200/50"
            >
              Update Mine
            </button>
          </div>

          {/* Location Editor Drawer */}
          {showLocationEditor && (
            <div className="bg-rose-50/70 dark:bg-stone-800/50 p-4 rounded-3xl border border-rose-200/50 dark:border-stone-700/50 mb-4 text-xs space-y-3">
              <h5 className="font-bold text-stone-700 dark:text-stone-200">Configure Your Location Settings</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-stone-500 uppercase">Your City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Paris"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-500 uppercase">Timezone (GMT offset)</label>
                  <select 
                    value={timezoneInput}
                    onChange={(e) => setTimezoneInput(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="-8">GMT-8 (PST)</option>
                    <option value="-5">GMT-5 (EST)</option>
                    <option value="0">GMT+0 (BST)</option>
                    <option value="1">GMT+1 (CET)</option>
                    <option value="2">GMT+2 (EET)</option>
                    <option value="5.5">GMT+5.5 (IST)</option>
                    <option value="8">GMT+8 (SGT)</option>
                    <option value="9">GMT+9 (JST)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-stone-500 uppercase">Your Weather Conditions</label>
                <input 
                  type="text" 
                  placeholder="e.g. ☀️ Sunny, 21°C - misses you!"
                  value={weatherInput}
                  onChange={(e) => setWeatherInput(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => setShowLocationEditor(false)}
                  className="px-3 py-1.5 text-[10px] text-stone-500 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveLocation}
                  className="px-3 py-1.5 text-[10px] text-white bg-rose-500 hover:bg-rose-600 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Save settings
                </button>
              </div>
            </div>
          )}

          {/* Local Display of locations side-by-side */}
          <div className="grid grid-cols-2 gap-4 divide-x divide-rose-100/40">
            {/* Me / Host */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">Your Side</span>
              <div className="space-y-0.5">
                <h4 className="font-bold text-stone-700 dark:text-stone-200 text-sm truncate">{user.locationCity || 'Not Set'}</h4>
                <p className="text-[10px] text-stone-500 font-semibold font-mono">{localCurrentTime}</p>
              </div>
              <p className="text-xs text-rose-500 font-semibold truncate">{user.locationWeather || '☁️ Custom message...'}</p>
            </div>

            {/* Partner */}
            <div className="pl-4 space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-450 block">Partner's Side</span>
              <div className="space-y-0.5">
                <h4 className="font-bold text-stone-700 dark:text-stone-200 text-sm truncate">{user.partnerCity || 'Not Set'}</h4>
                <p className="text-[10px] text-stone-500 font-semibold font-mono">{partnerCurrentTime}</p>
              </div>
              <p className="text-xs text-rose-500 font-semibold truncate">{user.partnerWeather || '☁️ Waiting check-in...'}</p>
            </div>
          </div>
        </div>

        {/* 2. Cozy Connection / Daily Check-ins (Mood & Love Language) */}
        <div className="p-6 rounded-3xl glass-card flex flex-col justify-between" id="daily_loving_checkins">
          <div className="flex items-center justify-between border-b border-rose-100/60 pb-3 mb-4">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              ❤️ Daily Intimate Check-in
            </span>
            <span className="bg-rose-50 border border-rose-100 text-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Tap to broadcast
            </span>
          </div>

          <div className="space-y-3">
            {/* Romantic Mood selection */}
            <div>
              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">How are you feeling for {user.partnerName || 'your partner'}?</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {ROMA_MOODS.map(m => (
                  <button
                    key={m.label}
                    onClick={() => handleUpdateMood(m.label)}
                    type="button"
                    className={`px-2 py-1 text-[10px] rounded-xl border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      user.checkInMood === m.label 
                        ? 'bg-rose-500 text-white border-rose-500 font-bold scale-102 shadow-xs' 
                        : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <span>{m.icon}</span> <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Love Language Needs Selection */}
            <div>
              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">What is your core need today?</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {LOVE_LANG_NEEDS.map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleUpdateLoveLanguage(lang)}
                    type="button"
                    className={`px-2.5 py-1 text-[10px] rounded-xl border transition-all shrink-0 cursor-pointer ${
                      user.checkInLoveLanguage === lang 
                        ? 'bg-purple-600 text-white border-purple-600 font-bold scale-102 shadow-xs' 
                        : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Summary of Partner's state */}
            {user.partnerId && (user.partnerMood || user.partnerLoveLanguage) && (
              <div className="bg-pink-50/50 border border-pink-100/30 p-2.5 rounded-2xl text-[10.5px] leading-normal text-stone-650 flex items-center gap-1.5">
                <span>💕</span>
                <span>
                  {user.partnerName || 'Your lover'} is feeling <strong className="text-rose-500 font-bold">{user.partnerMood || 'Not checked in'}</strong> today, needing <strong className="text-purple-650 font-bold">{user.partnerLoveLanguage || 'warmth'}</strong>.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid Navigation Rooms - "The Hearth of the House" */}
      <h3 className="text-lg font-serif font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-1.5 px-1">
        🏰 Explore Shared Nest Rooms
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8" id="nest_navigation_grid">
        
        {/* Messages */}
        <button
          onClick={() => onSectionSelect('chat')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group relative overflow-visible"
          id="nav_room_chat"
        >
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-sans text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center justify-center animate-pulse shadow-md z-10">
              {unreadChatCount} new
            </span>
          )}
          <div className="bg-rose-100 text-rose-500 p-2.5 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
            <MessageSquare size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 dark:text-stone-500 block uppercase tracking-wider">Couple Lounge</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Private Chat Box</h4>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">Send heart emojis, live gifs & private letters.</p>
          </div>
        </button>

        {/* Movie Room */}
        <button
          onClick={() => onSectionSelect('movie')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_movie"
        >
          <div className="bg-red-100 text-red-500 p-2.5 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
            <Film size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 dark:text-stone-500 block uppercase tracking-wider">Cinema</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Movie Room</h4>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">Play, pause & seek romantic movies together in real-time.</p>
          </div>
        </button>

        {/* Memory Wall */}
        <button
          onClick={() => onSectionSelect('memories')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_memories"
        >
          <div className="bg-pink-100 text-pink-500 p-2.5 rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
            <ImageIcon size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Gallery</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Memory Wall</h4>
            <p className="text-[10px] text-stone-400 mt-1">Chronological love milestones, polaroids & dates log.</p>
          </div>
        </button>

        {/* Love Calendar */}
        <button
          onClick={() => onSectionSelect('calendar')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_calendar"
        >
          <div className="bg-purple-100 text-purple-500 p-2.5 rounded-2xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <Calendar size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Hearth</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Love Calendar</h4>
            <p className="text-[10px] text-stone-400 mt-1">Countdown birthdays, future physical reunions & events.</p>
          </div>
        </button>

        {/* Daily Questions */}
        <button
          onClick={() => onSectionSelect('daily')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_questions"
        >
          <div className="bg-amber-100 text-amber-500 p-2.5 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Sparkles size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Playroom</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Daily Q&A Box</h4>
            <p className="text-[10px] text-stone-400 mt-1">Learn something cute; answers unlock when both reply.</p>
          </div>
        </button>

        {/* Couple Diary / Journal */}
        <button
          onClick={() => onSectionSelect('journal')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_journal"
        >
          <div className="bg-lime-100 text-lime-600 p-2.5 rounded-2xl group-hover:bg-lime-500 group-hover:text-white transition-colors">
            <BookOpen size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Study Desk</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Shared Journal</h4>
            <p className="text-[10px] text-stone-400 mt-1">Write secrets, daily diaries & mood logs for each other.</p>
          </div>
        </button>

        {/* Bucket List */}
        <button
          onClick={() => onSectionSelect('bucket')}
          className="p-5 rounded-3xl glass-card flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_bucket"
        >
          <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Compass size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Lounge</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Adventure List</h4>
            <p className="text-[10px] text-stone-400 mt-1">Dream list & checklist for shared lover achievements.</p>
          </div>
        </button>

        {/* Secret Letters Vault */}
        <button
          onClick={() => onSectionSelect('vault')}
          className="p-5 rounded-3xl glass-card border border-rose-200/50 bg-rose-50/10 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_vault"
        >
          <div className="bg-rose-100 text-rose-500 p-2.5 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
            <Settings size={20} className="stroke-current" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Vault</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Secret Letters</h4>
            <p className="text-[10px] text-stone-400 mt-1">Send locked letters with custom unlock dates.</p>
          </div>
        </button>

        {/* 1. Relationship Timeline Engine */}
        <button
          onClick={() => onSectionSelect('timeline')}
          className="p-5 rounded-3xl glass-card border border-orange-200/40 bg-orange-50/5 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_timeline"
        >
          <div className="bg-orange-100 text-orange-600 p-2.5 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <History size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-orange-400 block uppercase tracking-wider">Heritage</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Timeline Engine</h4>
            <p className="text-[10px] text-stone-400 mt-1">First call, message milestones and automatic memory anniversary alerts.</p>
          </div>
        </button>

        {/* 3. AI Love Assistant Companion */}
        <button
          onClick={() => onSectionSelect('copilot')}
          className="p-5 rounded-3xl glass-card border border-indigo-200/40 bg-indigo-50/5 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_copilot"
        >
          <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <Sparkles size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-indigo-400 block uppercase tracking-wider">Advisor</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">AI Love Assistant</h4>
            <p className="text-[10px] text-stone-400 mt-1">Smart date suggestions, intimacy ideas, and custom activities custom generated.</p>
          </div>
        </button>

        {/* 4. Shared Music Space */}
        <button
          onClick={() => onSectionSelect('music_space')}
          className="p-5 rounded-3xl glass-card border border-rose-200/40 bg-rose-50/5 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_music"
        >
          <div className="bg-pink-100 text-pink-600 p-2.5 rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
            <Music size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-rose-500 block uppercase tracking-wider font-semibold">Tuning</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Cozy Audio Room</h4>
            <p className="text-[10px] text-stone-400 mt-1">Listen to custom YouTube/Audio links and romantic synth melodies together.</p>
          </div>
        </button>

        {/* 5. Intimacy Analytics & Health Assessment */}
        <button
          onClick={() => onSectionSelect('analytics')}
          className="p-5 rounded-3xl glass-card border border-teal-200/40 bg-teal-50/5 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_analytics"
        >
          <div className="bg-teal-100 text-teal-600 p-2.5 rounded-2xl group-hover:bg-teal-500 group-hover:text-white transition-colors">
            <TrendingUp size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-teal-500 block uppercase tracking-wider">Metrics</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5">Intimacy Analytics</h4>
            <p className="text-[10px] text-stone-400 mt-1">Interactive messaging charts, check-in history & AI Relationship Health report.</p>
          </div>
        </button>

        {/* 6. Connection History & Link Controls */}
        <button
          onClick={() => onSectionSelect('security')}
          className="p-5 rounded-3xl glass-card border border-stone-200 dark:border-stone-700 bg-stone-50/5 flex flex-col justify-between items-start text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
          id="nav_room_security"
        >
          <div className="bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 p-2.5 rounded-2xl group-hover:bg-stone-500 group-hover:text-white transition-colors">
            <ShieldCheck size={20} />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">Trust</span>
            <h4 className="font-bold text-base text-stone-700 dark:text-stone-200 mt-0.5 font-medium">Safety & Privacy</h4>
            <p className="text-[10px] text-stone-400 mt-1">Review active logged devices, download CSV data backups or delete account.</p>
          </div>
        </button>
      </div>

      {/* Sleep Together Cozy Switch Card */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-md border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-rose-400 flex items-center gap-1">
              🌙 Night Mode • Sleep Together
            </span>
            <h4 className="font-serif font-bold text-lg text-white">Soft Sleep Together Room</h4>
            <p className="text-xs text-slate-400">
              Dims the UI layout into a deep starry bedtime canopy, playing a beautiful synced ambient lullaby loop for you and your partner simultaneously.
            </p>
          </div>
          <button
            onClick={() => onToggleSleepMode(!isSleepMode)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              isSleepMode 
                ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            id="toggle_sleep_btn"
          >
            {isSleepMode ? '🌅 Rise & Wake' : '🌙 Start Sleeping'}
          </button>
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1 justify-content-center">
          <Info size={11} /> <span>MuTu for Long Distance relationships • Made with 💖 for couple hearts.</span>
        </p>
      </div>

    </div>
  );
}
