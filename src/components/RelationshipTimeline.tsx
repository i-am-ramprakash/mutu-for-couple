import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Plus, Calendar, Star, Heart, Clock, Gift, Tag } from 'lucide-react';
import { User, TimelineEvent } from '../types';

interface RelationshipTimelineProps {
  user: User;
  onBack: () => void;
}

export default function RelationshipTimeline({ user, onBack }: RelationshipTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'anniversary' | 'firsts' | 'trip' | 'chat' | 'gift' | 'custom'>('custom');
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/couple/timeline?coupleId=${user.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load timeline events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.coupleId) {
      fetchTimeline();
    }
  }, [user.coupleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) return;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/couple/timeline/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          createdBy: user.id,
          title,
          description,
          eventDate,
          date: eventDate,
          category
        })
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setEventDate(new Date().toISOString().split('T')[0]);
        setCategory('custom');
        setShowAddForm(false);
        fetchTimeline();
      }
    } catch (error) {
      console.error('Error adding milestone event:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getCategoryTheme = (cat: TimelineEvent['category']) => {
    switch (cat) {
      case 'anniversary':
        return {
          bg: 'bg-rose-100 hover:bg-rose-200 text-rose-600 border-rose-200/50',
          icon: <Heart size={14} className="fill-current" />
        };
      case 'firsts':
        return {
          bg: 'bg-orange-100 hover:bg-orange-200 text-orange-600 border-orange-200/50',
          icon: <Star size={14} className="fill-current" />
        };
      case 'trip':
        return {
          bg: 'bg-teal-100 hover:bg-teal-200 text-teal-600 border-teal-200/50',
          icon: <Tag size={14} />
        };
      case 'chat':
        return {
          bg: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 border-indigo-200/50',
          icon: <Clock size={14} />
        };
      case 'gift':
        return {
          bg: 'bg-purple-100 hover:bg-purple-200 text-purple-600 border-purple-200/50',
          icon: <Gift size={14} />
        };
      default:
        return {
          bg: 'bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200/50',
          icon: <Sparkles size={14} />
        };
    }
  };

  const formatDateFriendly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6" id="relationship_timeline_section">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/85 rounded-xl transition cursor-pointer text-stone-600 dark:text-stone-300"
            id="back_btn_timeline"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              📅 Relationship Timeline Engine
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              The continuous heartbeat of your shared memory milestones.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <Plus size={14} /> Add Milestone
        </button>
      </div>

      {/* Add Milestone Form Overlay */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-150 dark:border-stone-700/60 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Append Custom Milestone Achievement</h4>
            <span className="text-[10px] text-rose-500 font-bold">Unlocks for both</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Achievement Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sent our first physical gift"
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Completion Date</label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl dark:bg-stone-800 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Milestone Category</label>
            <div className="flex gap-2 flex-wrap">
              {(['anniversary', 'firsts', 'trip', 'gift', 'custom'] as const).map(catOpt => (
                <button
                  key={catOpt}
                  type="button"
                  onClick={() => setCategory(catOpt)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold capitalize transition cursor-pointer ${
                    category === catOpt
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white dark:bg-stone-800 border-stone-200 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {catOpt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">Description / Story (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Record a short emotional footnote of how this felt..."
              rows={2}
              className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl dark:bg-stone-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 bg-stone-200 text-stone-650 rounded-lg hover:bg-stone-250 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSyncing}
              className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-lg font-bold cursor-pointer"
            >
              {isSyncing ? 'Linking...' : 'Cement Story'}
            </button>
          </div>
        </form>
      )}

      {/* Main Timeline Stream */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border-4 border-rose-400 border-t-transparent animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-stone-400 dark:text-stone-500">
          <p className="text-sm font-medium">No milestone events locked in yet.</p>
          <p className="text-xs">Add your first custom milestone together or let active chats produce alerts!</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-rose-100 dark:border-stone-800 space-y-6">
          {events.map((evt, idx) => {
            const theme = getCategoryTheme(evt.category);
            return (
              <div key={evt.id || idx} className="relative group animate-fade-in">
                {/* Node Dot Icon */}
                <div className={`absolute -left-10 top-1.5 p-1.5 rounded-full border border-white dark:border-stone-900 ${theme.bg} text-xs shadow-sm transition-transform duration-300 group-hover:scale-110 flex items-center justify-center`}>
                  {theme.icon}
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/80 hover:bg-rose-50/10 dark:hover:bg-rose-950/5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <h4 className="font-bold text-stone-800 dark:text-stone-100 text-sm">
                      {evt.title}
                    </h4>
                    <span className="text-[10px] font-bold text-stone-400 font-mono flex items-center gap-1">
                      <Calendar size={11} /> {formatDateFriendly(evt.eventDate || evt.date || '')}
                    </span>
                  </div>
                  {evt.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                      " {evt.description} "
                    </p>
                  )}
                  {evt.autoGenerated && (
                    <span className="inline-block mt-2 bg-rose-50 dark:bg-stone-800 text-rose-500 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                      ⚡ Platform Milestones Engine Auto-Locked
                    </span>
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
