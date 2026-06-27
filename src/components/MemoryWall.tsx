import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Image as ImageIcon, Sparkles, MapPin, 
  Calendar, Camera, Loader2, CalendarRange, Heart 
} from 'lucide-react';
import { User, Memory } from '../types';
import { compressImage } from '../utils/image';

interface MemoryWallProps {
  user: User;
  onBack: () => void;
  memories: Memory[];
  onAddMemory: (memory: Omit<Memory, 'id'>) => Promise<void>;
}

export default function MemoryWall({ user, onBack, memories, onAddMemory }: MemoryWallProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [imageBase64, setImageBase64] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        setError('Image file must be under 12MB.');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalBase64 = reader.result as string;
          // Compress Polaroid base64 photo to a max width/height of 1200px at 0.7 quality
          const compressed = await compressImage(originalBase64, 1200, 1200, 0.7);
          setImageBase64(compressed);
        } catch (compressErr) {
          console.warn('Image compression failed, falling back to original:', compressErr);
          setImageBase64(reader.result as string);
        }
      };
      reader.onerror = () => {
        setError('Failed to process image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || !imageBase64 || !date) {
      setError('Please provide a caption, select a date, and upload a beautiful photo.');
      return;
    }

    setAdding(true);
    setError('');

    try {
      await onAddMemory({
        coupleId: user.coupleId!,
        userId: user.id,
        date,
        caption: caption.trim(),
        imageBase64,
        location: location.trim()
      });

      // Clear Form state
      setCaption('');
      setLocation('');
      setImageBase64('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save photo memory.');
    } finally {
      setAdding(false);
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
    <div className="w-full max-w-4xl mx-auto px-1 py-4 font-sans select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 text-stone-500 rounded-xl transition-all"
            id="memories_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              Partners Memory Wall <span className="text-rose-500">📸</span>
            </h2>
            <p className="text-[10px] text-stone-400 font-medium">Capture, cherish & recall the beautiful milestones of your romance.</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-romantic py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow"
            id="btn_add_memory_form"
          >
            <Plus size={14} /> Log Memory
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-white border border-rose-200/60 rounded-3xl shadow-md overflow-hidden"
            key="add-memory-form"
          >
            <div className="flex items-center justify-between mb-4 border-b border-rose-100/50 pb-2">
              <span className="font-serif font-bold text-base text-rose-600 flex items-center gap-1">
                <Sparkles size={16} /> Hang a Polaroid Moment
              </span>
              <button 
                onClick={() => { setShowAddForm(false); setError(''); }} 
                className="text-stone-400 font-semibold hover:text-stone-600 text-xs"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs border border-red-200 rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveMemory} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Image Selection Area */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-500">Milestone Photo</label>
                
                <div className={`border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl bg-rose-50/20 text-center relative h-64 flex flex-col justify-center items-center overflow-hidden cursor-pointer transition-all ${imageBase64 ? 'p-0' : 'p-4'}`}>
                  {imageBase64 ? (
                    <>
                      <img src={imageBase64} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageBase64('')}
                        className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg border border-white/20 select-none"
                      >
                        Change Photo
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-rose-100 p-3 rounded-full text-rose-500 inline-block">
                        <Camera size={26} />
                      </div>
                      <p className="text-xs font-semibold text-stone-600">Select or drop love image file</p>
                      <p className="text-[9px] text-stone-400">JPEG, PNG, HEIC (Max 12MB)</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Memory Data fields */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">What happened? (Love Caption)</label>
                    <textarea
                      placeholder="Write how special this memory was... (e.g. First call after reunion, wedding day dream, first date in London)"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={3}
                      maxLength={300}
                      className="w-full text-xs px-3 py-2 border border-rose-100 rounded-xl bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white text-stone-700 dark:text-stone-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Milestone Date</label>
                      <div className="relative">
                        <Calendar size={13} className="absolute left-3 top-2.5 text-rose-300" />
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-2 hover:bg-rose-50 text-[11px] rounded-xl border border-rose-100 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Location (Optional)</label>
                      <div className="relative">
                        <MapPin size={13} className="absolute left-3 top-2.5 text-rose-300" />
                        <input
                          type="text"
                          placeholder="e.g. Central Park, NY"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-2 text-[11px] rounded-xl border border-rose-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full btn-romantic py-2.5 mt-4 text-xs flex items-center justify-center gap-2 rounded-xl"
                  id="btn_submit_memory"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : 'Hang On Polaroid Memory'}
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* memories timeline list */}
      {memories.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-stone-50 border border-stone-100">
          <span className="text-4xl">🎑</span>
          <h3 className="font-serif font-bold text-stone-600 mt-2 text-sm">Your Polaroid Wall is Spotless</h3>
          <p className="text-[10px] text-stone-400 mt-1 max-w-xs mx-auto">Upload milestones, polaroids & dates, and watch your relationship blossom chronologically!</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-dashed border-rose-200 pl-6 ml-4 space-y-8 select-none">
          {memories.map((memory) => {
            const isUploaderMe = memory.userId === user.id;

            return (
              <motion.div 
                key={memory.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Glowing ring node on the timeline line */}
                <div className="absolute -left-[31px] top-6 bg-rose-500 text-white w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  <Heart size={8} fill="currentColor" />
                </div>

                {/* Polaroid card */}
                <div className="bg-white p-4 pb-6 rounded-2xl border border-rose-100 shadow-xs max-w-md hover:rotate-1 hover:scale-[1.01] transition-transform">
                  
                  {/* Photo content */}
                  <div className="aspect-[4/3] bg-stone-100 rounded-xl overflow-hidden shadow-inner border border-stone-100">
                    <img 
                      src={memory.imageBase64} 
                      alt={memory.caption} 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                  </div>

                  {/* Polaroid layout data spacer */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-stone-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-rose-400" /> {formatDateFriendly(memory.date)}
                      </span>
                      {memory.location && (
                        <span className="flex items-center gap-0.5 text-stone-500">
                          <MapPin size={10} className="text-rose-400" /> {memory.location}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-sans font-medium">{memory.caption}</p>
                    
                    <div className="pt-2 border-t border-rose-50/50 flex items-center justify-between text-[8px] text-stone-400">
                      <span>Posted by: <strong>{isUploaderMe ? 'You' : user.partnerName}</strong></span>
                      <span>MuTu Timeline ✓</span>
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
