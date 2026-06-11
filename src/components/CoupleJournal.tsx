import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, BookOpen, Sparkles, Loader2, Calendar, 
  Smile, Camera, Heart, HelpCircle 
} from 'lucide-react';
import { User, JournalEntry } from '../types';

interface CoupleJournalProps {
  user: User;
  onBack: () => void;
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
}

export default function CoupleJournal({ user, onBack, entries, onAddEntry }: CoupleJournalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState('💕 Cozy Cozy');
  const [imageBase64, setImageBase64] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const moodChoices = [
    '💕 Cozy Cozy', '🦊 Miss You', '✨ Blissful', '🍕 Hungry Together', 
    '☕ Calm', '🎉 Excited', '🧸 Sleepy Side', '🌸 Fluttering'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('Image file must be under 8MB.');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide a title and write something in the sheet.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await onAddEntry({
        coupleId: user.coupleId!,
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
        date,
        imageBase64,
        mood
      });

      // Clear states
      setTitle('');
      setContent('');
      setDate(new Date().toISOString().split('T')[0]);
      setMood('💕 Cozy Cozy');
      setImageBase64('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save diary sheet.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateFriendly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-1 py-4 font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-500 rounded-xl transition-all"
            id="journal_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              Shared Couple Journal <span className="text-lime-600">📖</span>
            </h2>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">A shared diary space for deep declarations, mutual logs & cozy memoirs.</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-romantic bg-lime-600 py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow"
            id="btn_write_diary"
          >
            <Plus size={14} /> Write Entry
          </button>
        )}
      </div>

      {/* Add Entry Form overlay */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-white dark:bg-stone-900 border border-rose-250/50 dark:border-stone-800 rounded-3xl shadow"
            key="add-journal-form"
          >
            <div className="flex items-center justify-between mb-4 border-b border-rose-100 dark:border-stone-800 pb-2">
              <span className="font-serif font-bold text-stone-700 dark:text-stone-200 text-sm flex items-center gap-1">
                <Sparkles size={14} className="text-rose-400" /> Page a Mutual Diary Sheet
              </span>
              <button onClick={() => { setShowAddForm(false); setError(''); }} className="text-stone-400 dark:text-stone-500 font-semibold text-xs">Cancel</button>
            </div>

            {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-rose-200 text-xs text-center border border-red-200 dark:border-red-900/50 rounded-xl">{error}</div>}

            <form onSubmit={handleSaveEntry} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Diary Entry Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Dream conversation or Sweet Midnight talk"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 focus:bg-white dark:focus:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl focus:outline-none placeholder-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Current Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl focus:outline-none"
                  >
                    {moodChoices.map(mc => (
                      <option key={mc} value={mc} className="bg-white dark:bg-stone-900">{mc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Sheet Content (Be honest! Change hearts)</label>
                  <textarea
                    placeholder="Write your beautiful thoughts, secrets, what you did, or how much you missed them today..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full text-xs p-3 border border-rose-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 rounded-2xl focus:outline-none text-stone-800 dark:text-stone-100 placeholder-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Diary Sheet Photo (Optional)</label>
                  <div className={`border-2 border-dashed border-rose-200 dark:border-stone-700 rounded-2xl bg-rose-50/10 dark:bg-stone-800/10 text-center relative h-40 flex flex-col justify-center items-center overflow-hidden cursor-pointer ${imageBase64 ? 'p-0' : 'p-4'}`}>
                    {imageBase64 ? (
                      <>
                        <img src={imageBase64} alt="Diary Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageBase64('')}
                          className="absolute bottom-2 right-2 bg-stone-800/70 text-white text-[8px] font-bold px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Camera size={20} className="text-rose-400 mx-auto" />
                        <span className="text-[10px] text-stone-500 block">Pick an illustrative photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Diary Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-rose-100 dark:border-stone-700 rounded-xl focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-romantic py-2.5 text-xs flex items-center justify-center gap-1 bg-lime-600 rounded-xl"
                id="btn_submit_diary"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Log Shared Diary Entry'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diary history feed */}
      {entries.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 select-none">
          <span className="text-4xl">📖</span>
          <h3 className="font-serif font-bold text-stone-600 dark:text-stone-300 mt-2 text-sm">Diary Sheets Are Blank</h3>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 max-w-xs mx-auto">Build an archive of sweet journal entries, shared letters, and daily mood updates!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((ent) => {
            const isMe = ent.userId === user.id;

            return (
              <div 
                key={ent.id}
                className="bg-white dark:bg-stone-900 border border-rose-100 dark:border-stone-800 rounded-3xl p-6 shadow-3xs flex flex-col md:flex-row gap-6 hover:shadow-xs transition-shadow relative overflow-hidden"
              >
                {/* Mood Tag */}
                <span className="absolute top-4 right-4 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 px-2.5 py-1 rounded-full text-[9px] font-bold text-rose-600 dark:text-rose-400 select-none">
                  Mood: {ent.mood}
                </span>

                {/* Left Side: Text data */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 dark:text-stone-500">
                      <Calendar size={11} className="text-rose-400" /> {formatDateFriendly(ent.date)}
                    </div>
                    <h3 className="font-serif font-bold text-stone-700 dark:text-stone-200 text-lg leading-snug">{ent.title}</h3>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed break-words whitespace-pre-wrap font-medium">
                    {ent.content}
                  </p>

                  <div className="pt-3 border-t border-rose-50 dark:border-stone-800 flex items-center justify-between text-[8px] text-stone-400 select-none">
                    <span>Written by: <strong>{isMe ? 'You' : user.partnerName}</strong></span>
                    <span>MuTu Relationship Diary ✓</span>
                  </div>
                </div>

                {/* Right Side: Photo aspect if provided */}
                {ent.imageBase64 && (
                  <div className="w-full md:w-44 h-40 shrink-0 bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden shadow-inner border border-stone-100 dark:border-stone-700 select-none">
                    <img src={ent.imageBase64} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
