import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Unlock, Mail, Clock, Send, Sparkles, AlertCircle, Heart, Eye } from 'lucide-react';
import { User, LockedLetter } from '../types';
import { encryptMessage, decryptMessage } from '../crypto';

interface SecretVaultProps {
  user: User;
  onBack: () => void;
}

export default function SecretVault({ user, onBack }: SecretVaultProps) {
  const [letters, setLetters] = useState<LockedLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [writeMode, setWriteMode] = useState(false);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Local clock state to refresh countdowns every second
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLetters = async () => {
    if (!user.coupleId) return;
    try {
      const res = await fetch(`/api/couple/locked-letters?coupleId=${user.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setLetters(data);
      }
    } catch (err) {
      console.error('Error fetching locked letters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
    
    // Set default unlock date tomorrow
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    tom.setMinutes(tom.getMinutes() - tom.getTimezoneOffset());
    setUnlockDate(tom.toISOString().slice(0, 16));
  }, [user.coupleId]);

  const handleCreateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !unlockDate) {
      setErrorText('Please load all fields before locking.');
      return;
    }

    const unlockTime = new Date(unlockDate).getTime();
    if (unlockTime <= Date.now()) {
      setErrorText('Unlock date must be in the future to build anticipation!');
      return;
    }

    setIsSending(true);
    setErrorText('');

    try {
      // 1. Client-side Private encrypt the letter content with shared Love Key
      const key = user.loveKey || 'MUTU-DEFAULT-LOVE-KEY';
      const enc = await encryptMessage(content, key);

      // 2. Transmit ciphertext to server
      const res = await fetch('/api/couple/locked-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          senderId: user.id,
          senderName: user.name,
          title: title.trim(),
          contentEncrypted: enc.ciphertext,
          iv: enc.iv,
          unlockDate
        })
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setWriteMode(false);
        fetchLetters();
      } else {
        setErrorText('Failed to transmit Private packet.');
      }
    } catch (err) {
      console.error(err);
      setErrorText('Encryption or network failure.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenLetter = async (letter: LockedLetter) => {
    const isReady = new Date(letter.unlockDate).getTime() <= now;
    if (!isReady) return;

    // Cache decrypt on the fly
    const loveKey = user.loveKey || 'MUTU-DEFAULT-LOVE-KEY';
    const dec = await decryptMessage(letter.contentEncrypted, letter.iv, loveKey);
    setDecryptedCache(prev => ({ ...prev, [letter.id]: dec }));
    setActiveLetterId(letter.id);

    // Call server to mark as opened once
    if (!letter.isOpened) {
      try {
        await fetch('/api/couple/locked-letters/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letterId: letter.id, userId: user.id })
        });
        // Slower local state update is fine, update to preserve local open indicator
        setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, isOpened: true } : l));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getCountdownString = (unlockDateStr: string) => {
    const diff = new Date(unlockDateStr).getTime() - now;
    if (diff <= 0) return 'Ready to be opened! 🌸';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return `Unlocks in: ${parts.join(' ')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 font-sans text-stone-800 dark:text-stone-200 dark:text-rose-100">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-100 dark:border-stone-800 pb-4 mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-300 hover:text-rose-500 transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Home Nest
        </button>
        <div className="text-center flex-1 pr-6">
          <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200 dark:text-rose-100 flex items-center justify-center gap-1.5">
            🔐 Secret Letters Vault
          </h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold tracking-wide uppercase mt-0.5">Beautifully Private Digital Antiques</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Rules or write letter selector */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-3xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-700 dark:text-stone-300">How Vault Works 💖</h4>
            <ul className="text-[11px] text-stone-500 dark:text-stone-400 space-y-2 list-disc pl-4 leading-relaxed">
              <li>Locked letters are client-side fully private before they ever leave your device.</li>
              <li>Only you and your partner hold the key. Not even MuTu server can intercept.</li>
              <li>Setting a future unlock date creates anticipation. Until that date, the contents remain completely secret!</li>
            </ul>
            {!writeMode ? (
              <button
                onClick={() => setWriteMode(true)}
                className="w-full btn-romantic py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 mt-3 shadow-sm cursor-pointer"
              >
                <Mail size={13} /> Write Locked Letter
              </button>
            ) : (
              <button
                onClick={() => setWriteMode(false)}
                className="w-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200/80 dark:hover:bg-stone-705 text-stone-600 dark:text-stone-300 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 mt-3 cursor-pointer transition-all"
              >
                <ArrowLeft size={13} /> View Letters list
              </button>
            )}
          </div>
          
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100/60 dark:border-stone-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 block uppercase">SENTIMENT VERIFIED</span>
              <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block">Private Relationship Vault</span>
            </div>
          </div>
        </div>

        {/* Right Side / Middle: Content Area */}
        <div className="md:col-span-2">
          
          {writeMode ? (
            // Write Letter Form
            <form onSubmit={handleCreateLetter} className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-rose-100 dark:border-stone-800 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-stone-800 pb-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> Create Locked Sentiment
                </span>
                <span className="text-[9px] text-stone-400 dark:text-stone-500 font-mono font-bold">PRIVATE-BUFFER-READY</span>
              </div>

              {errorText && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-200 rounded-xl text-[10.5px] font-semibold flex items-center gap-1.5 border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle size={13} /> {errorText}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Letter Title / Sentiment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Happy First Anniversary, My Soulmate"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-rose-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 dark:text-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white dark:focus:bg-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Unlock Date & Time (anticipation countdown)</label>
                <input
                  type="datetime-local"
                  required
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-rose-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white dark:focus:bg-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Secret Content (will be kept private)</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Type your intimate love letter, romantic memory, or surprise promise here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-rose-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 dark:text-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white dark:focus:bg-stone-900 font-medium resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full btn-romantic py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? 'Locking Sentiment...' : (
                    <>
                      <Lock size={12} /> Seal & Send to Vault
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Letters list
            <div className="space-y-4">
              
              {loading ? (
                <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800">
                  <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">Opening vault boxes...</p>
                </div>
              ) : letters.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 flex flex-col items-center justify-center space-y-3">
                  <span className="text-4xl">📭</span>
                  <div className="max-w-xs">
                    <h4 className="font-serif font-bold text-stone-700 dark:text-stone-300 text-sm">Secure Vault is Empty</h4>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 leading-normal">
                      No future letters are waiting. Be the first to surprise your lover with a locked surprise capsule tomorrow!
                    </p>
                  </div>
                  <button
                    onClick={() => setWriteMode(true)}
                    className="btn-romantic py-2 px-5 rounded-xl text-xs font-bold shadow-md"
                  >
                    Lock standard letter
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest pl-1">
                    Shipment boxes & Surprise Letters ({letters.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {letters.map((letter) => {
                      const isReady = new Date(letter.unlockDate).getTime() <= now;
                      const senderMe = letter.senderId === user.id;
                      const decryptedText = decryptedCache[letter.id];

                      return (
                        <div 
                          key={letter.id}
                          className={`p-5 rounded-3xl border transition-all ${
                            activeLetterId === letter.id 
                              ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900 shadow-md' 
                              : 'bg-white dark:bg-stone-900 border-stone-150 dark:border-stone-800 hover:border-rose-100 dark:hover:border-rose-800/80 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1 text-left">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isReady ? (
                                  <span className="text-emerald-500 shrink-0"><Unlock size={14} /></span>
                                ) : (
                                  <span className="text-rose-400 shrink-0"><Lock size={14} /></span>
                                )}
                                <span className="font-serif font-bold text-stone-800 dark:text-stone-200 dark:text-rose-100 text-sm truncate block">{letter.title}</span>
                              </div>
                              <p className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
                                From: <b className="text-stone-500 dark:text-stone-300">{senderMe ? 'You' : letter.senderName}</b> • Sent {new Date(letter.timestamp).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Status tag */}
                            <div className="shrink-0 text-right">
                              {isReady ? (
                                <span className="bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                  Ready to Read
                                </span>
                              ) : (
                                <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/30 flex items-center gap-1 shrink-0">
                                  <Clock size={10} /> Lock Box
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Countdown slider */}
                          {!isReady && (
                            <div className="mt-3 bg-stone-50 dark:bg-stone-950 border border-stone-100/50 dark:border-stone-800 p-2.5 rounded-2xl flex items-center justify-between text-stone-500 dark:text-stone-400">
                              <span className="text-[10.5px] font-medium font-mono text-stone-600 dark:text-stone-300">{getCountdownString(letter.unlockDate)}</span>
                              <span className="text-[8px] text-stone-400 dark:text-stone-500 uppercase font-bold tracking-wider">LOCKED AT TIME ZONE</span>
                            </div>
                          )}

                          {isReady && decryptedText && activeLetterId === letter.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 p-4 rounded-2xl bg-white dark:bg-stone-950 border border-rose-100/60 dark:border-rose-900/30 leading-relaxed text-xs text-stone-700 dark:text-stone-300 relative whitespace-pre-wrap font-sans text-left"
                            >
                              <div className="absolute top-0 right-0 p-3 opacity-5">
                                <Heart size={60} fill="currentColor" className="text-rose-400" />
                              </div>
                              {decryptedText}
                            </motion.div>
                          )}

                          {isReady && !decryptedText && (
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleOpenLetter(letter)}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                              >
                                <Eye size={11} /> Open & Read Sentiment
                              </button>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
