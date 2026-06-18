import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Loader2, Sparkles, User as UserIcon, Calendar, Mail, Lock, LogIn, UserPlus, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { User } from '../types';
import { signInWithGoogle, signInWithApple, signInWithEmailAndPassword, createUserWithEmailAndPassword, auth } from '../lib/firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  currentUser: User | null;
  onRefreshUser: () => void;
}

export default function AuthScreen({ onAuthSuccess, currentUser, onRefreshUser }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Pairing States
  const [partnerCode, setPartnerCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [joiningCode, setJoiningCode] = useState(false);
  const [showTroubleshootingModal, setShowTroubleshootingModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Avatar presets
  const avatarPresets = [
    '🌸', '🦊', '🐼', '🐯', '🐰', '🐈', '🐶', '💖', '🧸', '🍪'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const safeParseResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      return data;
    }
    const text = await res.text();
    if (text.trim().startsWith('<')) {
      throw new Error(`Server connection error (HTTP ${res.status}). The server may be restarting or is currently unavailable. Please wait a moment and try again.`);
    }
    throw new Error(text || `Server returned custom error status ${res.status}`);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let fbUser;
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        fbUser = result.user;
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        fbUser = result.user;
      }

      const url = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { uid: fbUser.uid, email }
        : { uid: fbUser.uid, name, email, password: 'firebase-managed', birthday, profilePhoto: profilePhoto || '💖' };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await safeParseResponse(res);
      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      // Trigger Firebase Google Popup
      const result = await signInWithGoogle();
      const fbUser = result.user;

      // Send to our backend to ensure they are added to the users list
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          name: fbUser.displayName,
          email: fbUser.email,
          profilePhoto: fbUser.photoURL
        })
      });
      
      const data = await safeParseResponse(res);
      onAuthSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithApple();
      const fbUser = result.user;

      const res = await fetch('/api/auth/google', { // Reuse the google endpoint which syncs generic third-party users
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Apple User',
          email: fbUser.email || `${fbUser.uid}@apple.com`,
          profilePhoto: fbUser.photoURL || '🍎'
        })
      });
      
      const data = await safeParseResponse(res);
      onAuthSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Apple Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Create Couple Invite Code function
  const handleGenerateInvite = async () => {
    if (!currentUser) return;
    setGeneratingCode(true);
    setError('');
    
    try {
      const defaultAnniversary = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/couple/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, anniversaryDate: defaultAnniversary })
      });
      const data = await safeParseResponse(res);

      // Refresh local user state
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Link up with partner code
  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !partnerCode.trim()) return;
    setJoiningCode(true);
    setError('');

    try {
      const res = await fetch('/api/couple/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, inviteCode: partnerCode.trim() })
      });
      const data = await safeParseResponse(res);

      // Success coupling refresh state
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to join the connection.');
    } finally {
      setJoiningCode(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentUser && !currentUser.partnerId && currentUser.inviteCode) {
      interval = setInterval(() => {
        onRefreshUser();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser, onRefreshUser]);

  // First stage: Register/Login View
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 font-sans text-stone-800 dark:text-stone-200">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-3xl glass-card relative overflow-hidden"
          id="auth_panel"
        >
          {/* Subtle floating heart accent */}
          <div className="absolute top-10 right-10 opacity-10 animate-pulse text-rose-500">
            <Heart size={80} fill="currentColor" />
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="bg-rose-100 p-4 rounded-full text-rose-500 mb-2 shadow-sm">
              <Heart size={36} fill="currentColor" className="animate-pulse" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-rose-600 tracking-tight">MuTu</h1>
            <p className="text-stone-500 font-medium text-sm mt-1">• For Couples </p>
            <p className="text-stone-500 font-medium text-sm mt-1">• A home for hearts that live apart.</p>
          </div>

        <div className="text-center pt-2 pb-2">
          <div className="flex flex-col gap-3 mt-2 mb-4">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 text-white text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> Continue with Google</>}
            </button>
            
            <button
              onClick={handleAppleAuth}
              disabled={loading}
              className="w-full py-3 text-white text-sm font-bold bg-black rounded-xl hover:bg-stone-900 transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Continue with Apple</>}
            </button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-rose-100 dark:border-stone-800"></span></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white dark:bg-[#1a1c1e] text-stone-400 font-medium">OR EMAIL</span></div>
          </div>

          <div className="flex border-b border-rose-100/60 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-colors ${
                isLogin ? 'text-rose-500 border-b-2 border-rose-500' : 'text-stone-400'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-colors ${
                !isLogin ? 'text-rose-500 border-b-2 border-rose-500' : 'text-stone-400'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-stone-700 dark:text-rose-200 text-xs text-left" id="auth_error">
              {error.includes('operation-not-allowed') ? (
                <div className="space-y-2">
                  <p className="font-bold text-red-600 dark:text-rose-400 text-[13px] flex items-center gap-1">
                    🔑 Email/Password Auth Disabled
                  </p>
                  <p className="text-stone-600 dark:text-stone-300">
                    Firebase has blocked this login because <strong>Email/Password Sign-in</strong> is disabled in your Firebase Console.
                  </p>
                  <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-rose-100/40 dark:border-stone-800 space-y-2 text-[11px] font-sans">
                    <p className="font-bold text-rose-500">How to fix this in 1 minute:</p>
                    <ol className="list-decimal list-inside space-y-1 text-stone-500 dark:text-stone-400">
                      <li>Go to your <a href="https://console.firebase.google.com/project/just-facet-x74w7/authentication/providers" target="_blank" rel="noopener noreferrer" className="underline font-bold text-rose-500 hover:text-rose-600">Firebase Auth Console</a>.</li>
                      <li>Click the <strong>Add new provider</strong> button (or select Email/Password if visible).</li>
                      <li>Select <strong>Email/Password</strong>.</li>
                      <li>Toggle the first switch to <strong>Enable</strong> and click <strong>Save</strong>!</li>
                    </ol>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1 font-medium animate-pulse">
                    ✨ After saving, you can instantly log in or register below!
                  </p>
                </div>
              ) : (
                <span className="text-center block">{error}</span>
              )}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                  key="reg-fields"
                >
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">Your Lovely Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 text-rose-300 dark:text-stone-500" size={18} />
                      <input
                        type="text"
                        required={!isLogin}
                        placeholder="e.g. Priya or Rahul"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rose-100 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-400/50 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm transition-colors"
                      />
                    </div>
                  </div>

                  {/* Birthday Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">Your Birthday</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-rose-300 dark:text-stone-500" size={18} />
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        required={!isLogin}
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rose-100 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-400/50 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-rose-300 dark:text-stone-500" size={18} />
                <input
                  type="email"
                  required
                  placeholder="love@mutu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rose-100 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-400/50 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-rose-300 dark:text-stone-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-rose-100 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-400/50 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 text-white text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
              id="btn_auth_submit"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isLogin ? (
                <>
                  <LogIn size={18} /> Let's Enter Our Home
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Build Our Shared Home
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// 2. Second stage: Partner linking panel (if logged in but not linked)
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-stone-800 dark:text-stone-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-3xl glass-card space-y-6"
        id="pairing_panel"
      >
        <div className="text-center space-y-2">
          <span className="text-4xl text-rose-500">🏰</span>
          <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200">Welcome, {currentUser.name}!</h2>
          <p className="text-xs text-stone-400 font-medium">
            You're currently in the MuTu entrance. Let's unlock your shared digital sanctuary together.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-stone-700 dark:text-stone-200 rounded-xl text-xs text-center">
            {error}
          </div>
        )}

        {/* Option A: Generate an invite code */}
        <div className="p-5 bg-gradient-to-tr from-pink-50/60 to-rose-50/60 rounded-2xl border border-rose-200/50 space-y-3">
          <h3 className="font-semibold text-sm text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
            <Sparkles size={16} className="text-rose-400" /> Option A: Invite Your Partner
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Generate an invite code and send it to your partner. When they enter it, your MuTu virtual home unlocks!
          </p>
          
          {currentUser.inviteCode ? (
            <div className="space-y-2">
              <div 
                className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-rose-200 dark:border-stone-700 flex items-center justify-between cursor-pointer shadow-inner relative group active:scale-95 transition-transform"
                onClick={() => {
                  navigator.clipboard.writeText(currentUser.inviteCode!);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
              >
                <span className="font-mono font-bold text-rose-500 text-lg tracking-wider" id="generated_code_display">
                  {currentUser.inviteCode}
                </span>
                <div className="flex items-center gap-2 text-rose-400">
                  {codeCopied ? <span className="text-[10px] font-bold">Copied!</span> : <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>}
                  <Copy size={16} />
                </div>
              </div>
              <p className="text-[10px] text-center text-rose-400 font-medium animate-pulse">
                📲 Send this code to your partner! Waiting for them to join...
              </p>
              <button
                onClick={onRefreshUser}
                className="w-full text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 mt-2"
              >
                <Loader2 size={10} className="animate-spin" /> Checking connection...
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingCode}
              className="w-full bg-white dark:bg-stone-800 border border-rose-300 dark:border-stone-700 text-rose-500 dark:text-rose-300 font-bold py-2 px-4 rounded-xl text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center justify-center gap-2"
              id="btn_generate_invite"
            >
              {generatingCode ? <Loader2 size={14} className="animate-spin" /> : 'Get My Invite Code'}
            </button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-rose-100"></span></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-[#fffafc] text-stone-300 font-bold">OR</span></div>
        </div>

        {/* Option B: Enter partner's invite code */}
        <form onSubmit={handleJoinCouple} className="p-5 bg-gradient-to-tr from-rose-50/60 to-rose-100/30 dark:from-stone-800 dark:to-stone-900 rounded-2xl border border-rose-200/50 dark:border-stone-800 space-y-3">
          <h3 className="font-semibold text-sm text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
            <Heart size={15} fill="currentColor" className="text-rose-400 animate-pulse" /> Option B: Enter Partner's Code
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            If your partner already sent you an invite code, enter it below to step inside mutual home right away.
          </p>

          <div className="space-y-2">
            <div className="relative">
              <Key size={14} className="absolute left-3 top-3 text-rose-300" />
              <input
                type="text"
                placeholder="LOVE-XXXX-XXXX"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2 border border-rose-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-rose-400 text-xs text-center font-mono font-bold tracking-wider"
              />
            </div>
            
            <button
              type="submit"
              disabled={joiningCode || !partnerCode}
              className="w-full btn-romantic py-2 text-xs rounded-xl flex items-center justify-center gap-2"
              id="btn_join_partner"
            >
              {joiningCode ? <Loader2 size={14} className="animate-spin" /> : 'Activate Love Connection'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 pb-2">
          <p className="text-[10px] text-stone-400">
            🔒 Just for you two. A shared space that keeps your world intimate, safe, and close.
          </p>
        </div>

        {/* Stuck/Logout Section */}
        <div className="pt-2 text-center border-t border-stone-200/60 mt-4">
          <p className="text-xs text-stone-500 mb-2">Feeling stuck or need to switch accounts?</p>
          <button 
            type="button"
            onClick={() => setShowTroubleshootingModal(true)}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-200 border border-stone-200 hover:bg-stone-100 px-4 py-2 rounded-xl transition-colors cursor-pointer w-full"
          >
            Open Troubleshooting Modal
          </button>
        </div>
      </motion.div>

      {/* Troubleshooting Modal */}
      {showTroubleshootingModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-serif mb-2 text-stone-800 dark:text-stone-100">Troubleshooting</h3>
            <p className="text-xs text-stone-500 mb-6">
              If you or your partner are unable to connect or sync up correctly, try these options.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                   setShowTroubleshootingModal(false);
                   onRefreshUser();
                }}
                className="w-full text-sm py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold transition-colors"
              >
                Reset Connection
              </button>
              <button
                onClick={() => {
                   setShowTroubleshootingModal(false);
                   localStorage.removeItem('mutu_user_session');
                   window.location.reload();
                }}
                className="w-full text-sm py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
              >
                Sign out and try a different account
              </button>
            </div>
            <button
              onClick={() => setShowTroubleshootingModal(false)}
              className="mt-4 w-full text-xs text-stone-400 hover:text-stone-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
