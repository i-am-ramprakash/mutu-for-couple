import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Calendar, Plus, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { User, CalendarEvent } from '../types';

interface LoveCalendarProps {
  user: User;
  onBack: () => void;
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
}

export default function LoveCalendar({ user, onBack, events, onAddEvent }: LoveCalendarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'birthday' | 'anniversary' | 'date' | 'custom'>('custom');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      setError('Please provide a title and event date.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await onAddEvent({
        coupleId: user.coupleId!,
        createdBy: user.id,
        title: title.trim(),
        date,
        category,
        description: description.trim()
      });

      // Clear Form state
      setTitle('');
      setDate('');
      setDescription('');
      setCategory('custom');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to list event.');
    } finally {
      setSaving(false);
    }
  };

  // Safe countdown logic
  const daysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Sort calendar events based on days remaining chronologically
  const sortedEvents = [...events].sort((a, b) => {
    const d1 = daysRemaining(a.date);
    const d2 = daysRemaining(b.date);
    // Move passed dates to bottom of countdown list
    if (d1 < 0 && d2 >= 0) return 1;
    if (d2 < 0 && d1 >= 0) return -1;
    return d1 - d2;
  });

  const formatDateLabel = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryDecorator = (cat: string) => {
    switch (cat) {
      case 'birthday': return { bg: 'bg-amber-100 text-amber-600', icon: '🎂' };
      case 'anniversary': return { bg: 'bg-rose-100 text-rose-600', icon: '💞' };
      case 'date': return { bg: 'bg-emerald-100 text-emerald-600', icon: '✈️' };
      default: return { bg: 'bg-purple-100 text-purple-600', icon: '💖' };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 text-stone-500 rounded-xl transition-all"
            id="calendar_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              Love Countdown Calendar <span className="text-purple-500">🗓️</span>
            </h2>
            <p className="text-[10px] text-stone-400 font-medium">Tick away the hours until you embrace each other once more.</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-romantic py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow"
            id="btn_open_calendar_form"
          >
            <Plus size={14} /> New Countdown
          </button>
        )}
      </div>

      {/* Add Custom Calendar Event Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 bg-white border border-rose-200 rounded-3xl shadow"
            key="add-event-form"
          >
            <div className="flex items-center justify-between mb-4 border-b border-rose-100 pb-2">
              <span className="font-serif font-bold text-stone-700 dark:text-stone-200 text-sm flex items-center gap-1">
                <Sparkles size={14} className="text-rose-400 animate-pulse" /> Coordinate Countdown Date
              </span>
              <button onClick={() => setShowAddForm(false)} className="text-stone-400 font-semibold text-xs">Cancel</button>
            </div>

            {error && <div className="mb-4 text-xs font-semibold text-red-500 text-center">{error}</div>}

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Countdown Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Flight to India 🛫"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-stone-50/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Target Date</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-stone-50/50 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Date Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-stone-50/50 focus:outline-none"
                  >
                    <option value="birthday">Birthday 🎂</option>
                    <option value="anniversary">Anniversary 💞</option>
                    <option value="date">Airport Reunion / Date ✈️</option>
                    <option value="custom">General Custom 💖</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Brief Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Can't wait after 4 months apart!"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-stone-50/50 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-romantic py-2 text-xs flex items-center justify-center gap-1.5"
                id="btn_save_calendar_event"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : 'Launch Love Countdown'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorted Countdown listing */}
      {sortedEvents.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-stone-50 border border-stone-100">
          <span className="text-4xl">🗓️</span>
          <h3 className="font-serif font-bold text-stone-500 mt-2 text-sm">Countdown Deck Empty</h3>
          <p className="text-[10px] text-stone-400 mt-1">Log flight reservations, wedding countdowns, or virtual game nights!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((ev) => {
            const count = daysRemaining(ev.date);
            const decorator = getCategoryDecorator(ev.category);
            const isPassed = count < 0;

            return (
              <div 
                key={ev.id}
                className={`p-4 bg-white border rounded-2xl flex items-center justify-between gap-4 relative overflow-hidden transition-all hover:shadow-xs ${
                  isPassed ? 'opacity-60 border-stone-100' : 'border-rose-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${decorator.bg} shrink-0`}>
                    {decorator.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-stone-700 dark:text-stone-200 flex items-center gap-1">
                      {ev.title}
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
                      Event on {formatDateLabel(ev.date)} {ev.description ? `• ${ev.description}` : ''}
                    </p>
                  </div>
                </div>

                {/* Countdown display */}
                <div className="text-right shrink-0">
                  {isPassed ? (
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Completed ✓</span>
                  ) : count === 0 ? (
                    <span className="text-[10px] font-extrabold text-[#ff4d5a] animate-pulse block uppercase tracking-wider">🌟 HAPPENING TODAY 🌟</span>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-extrabold text-stone-700 dark:text-stone-200 tracking-tight leading-none">
                        {count.toLocaleString()}
                      </span>
                      <span className="text-[8px] font-bold text-stone-400 uppercase mt-0.5">Days Left</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
