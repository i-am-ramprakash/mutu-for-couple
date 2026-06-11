import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, CheckCircle2, Circle, Trash2, Sparkles, Award, Map, Compass, Coffee, Home, Heart, Leaf } from 'lucide-react';
import { User, BucketItem } from '../types';

interface BucketListProps {
  user: User;
  onBack: () => void;
  items: BucketItem[];
  onAddItem: (title: string, category: BucketItem['category']) => Promise<void>;
  onToggleItem: (id: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  playSparkSound: () => void;
}

export default function BucketList({
  user,
  onBack,
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  playSparkSound,
}: BucketListProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BucketItem['category']>('cozy');
  const [activeTab, setActiveTab] = useState<'all' | BucketItem['category']>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Calculate percentage
  const totalCount = items.length;
  const completedCount = items.filter((i) => i.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError('');
    try {
      await onAddItem(title.trim(), category);
      setTitle('');
    } catch (err: any) {
      setError('Could not add adventure to the checklist.');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryDecorator = (cat: BucketItem['category']) => {
    switch (cat) {
      case 'travel':
        return { icon: <Map size={14} />, label: 'Travel', color: 'text-sky-500', bg: 'bg-sky-50' };
      case 'adventure':
        return { icon: <Compass size={14} />, label: 'Adventure', color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'food':
        return { icon: <Coffee size={14} />, label: 'Food & Drink', color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'cozy':
        return { icon: <Home size={14} />, label: 'Cozy Times', color: 'text-purple-500', bg: 'bg-purple-50' };
      case 'growth':
        return { icon: <Leaf size={14} />, label: 'Growth & Future', color: 'text-emerald-500', bg: 'bg-emerald-50' };
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  // Sort items: incomplete first, then completed order
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 font-sans select-none text-stone-850 dark:text-rose-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300 rounded-xl transition-all cursor-pointer"
            id="bucket_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200 dark:text-rose-100 flex items-center gap-1.5">
              Our Adventure Bucket List <span className="text-rose-500">🗺️</span>
            </h2>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
              Dream, plan, and mark shared life adventures with your other half.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card Section */}
      <div className="bg-gradient-to-br from-rose-500/5 to-pink-500/5 dark:from-rose-950/15 dark:to-pink-950/15 border border-rose-100 dark:border-stone-800 rounded-3xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 text-rose-200/40 dark:text-rose-900/20 select-none">
          <Heart size={80} fill="currentColor" stroke="none" className="rotate-12 translate-x-4 -translate-y-4" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-serif font-bold text-stone-700 dark:text-stone-300 text-sm flex items-center gap-1.5">
              <Award size={16} className="text-rose-500 animate-pulse" /> Together Completion: {percentage}%
            </h3>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
              Marked <strong className="text-rose-600 dark:text-rose-400">{completedCount}</strong> of {totalCount} goals. 
              {percentage === 100 
                ? ' ✨ Incredible! You have mapped every dream in the skies.' 
                : percentage > 50 
                ? ' 💖 Halfway there! Keep dreaming and supporting each other.' 
                : ' 🌸 Every tick is a gorgeous loving footprint on your timeline.'}
            </p>

            <div className="relative w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full mt-4 overflow-hidden border border-stone-200/20 dark:border-stone-700/40">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Adding Goal form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-stone-900/60 border border-rose-100 dark:border-stone-800 rounded-2xl shadow-xs mb-6 space-y-3">
        {error && <p className="text-[9.5px] font-bold text-red-500">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            placeholder="e.g. Back-to-back 5-hour movie cuddle marathon 🍿"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-rose-100 dark:border-stone-800 bg-white dark:bg-stone-800 rounded-xl focus:outline-none focus:border-rose-300 dark:focus:border-rose-700 text-stone-800 dark:text-stone-100 placeholder-stone-400"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BucketItem['category'])}
              className="text-[11px] font-semibold px-2 border border-rose-100 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 focus:outline-none focus:border-rose-300"
            >
              <option value="cozy" className="dark:bg-stone-900">🌌 Cozy Times</option>
              <option value="travel" className="dark:bg-stone-900">✈️ Travel</option>
              <option value="food" className="dark:bg-stone-900">🍜 Food & Drink</option>
              <option value="adventure" className="dark:bg-stone-900">🧗 Adventure</option>
              <option value="growth" className="dark:bg-stone-900">🌱 Growth & Future</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-bold p-2.5 rounded-xl transition active:scale-95 cursor-pointer text-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} /> Add Idea
            </button>
          </div>
        </div>
      </form>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-4 scrollbar-none select-none">
        {(['all', 'cozy', 'travel', 'food', 'adventure', 'growth'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          let label = tab === 'all' ? 'All Goals' : tab === 'travel' ? 'Travel ✈️' : tab === 'adventure' ? 'Adventure 🧗' : tab === 'food' ? 'Food 🍜' : tab === 'cozy' ? 'Cozy 🌌' : 'Future 🌱';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                isSelected 
                  ? 'bg-stone-850 dark:bg-stone-700 text-white dark:text-rose-150 shadow-sm' 
                  : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Checklist list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sortedItems.length === 0 ? (
            <div className="text-center py-10 bg-stone-50/50 dark:bg-stone-900/10 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
              <span className="text-3xl">🏜️</span>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 font-semibold">No items matched in this folder.</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const decor = getCategoryDecorator(item.category);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 border rounded-2xl flex items-center gap-3 transition-colors ${
                    item.completed 
                      ? 'bg-rose-50/10 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/40' 
                      : 'bg-white dark:bg-stone-900/40 border-rose-100/30 dark:border-stone-800 shadow-3xs hover:border-rose-200 dark:hover:border-stone-700'
                  }`}
                >
                  {/* Checking Circle */}
                  <button
                    onClick={async () => {
                      if (!item.completed) playSparkSound();
                      await onToggleItem(item.id);
                    }}
                    className={`shrink-0 transition-all cursor-pointer ${
                      item.completed ? 'text-rose-500' : 'text-stone-300 dark:text-stone-600 hover:text-rose-400'
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle2 size={20} fill="currentColor" className="text-rose-500 bg-white dark:bg-stone-900 rounded-full" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs text-stone-700 dark:text-stone-200 font-semibold truncate ${
                        item.completed ? 'line-through text-stone-400 dark:text-stone-500 font-normal' : ''
                      }`}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 select-none">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold ${decor.bg} ${decor.color} dark:bg-rose-950/25`}>
                        {decor.icon} {decor.label}
                      </span>
                      {item.completedDate && (
                        <span className="text-[8.5px] text-stone-400 dark:text-stone-500 font-semibold font-mono">
                          • Checked on {item.completedDate}
                        </span>
                      )}
                      {item.suggested && (
                        <span className="text-[8.5px] text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1 rounded font-bold">
                          ★ Idea Starter
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button (only show delete if created by user or suggest item) */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-stone-800 text-stone-300 dark:text-stone-600 hover:text-red-500 rounded-lg transition shrink-0 cursor-pointer"
                    title="Remove adventure goal"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
