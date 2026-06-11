import React, { useEffect, useState } from 'react';
import { ArrowLeft, Home, Sparkles, Plus, Trash2, Layout, Store, ShoppingBag, Eye, HelpCircle } from 'lucide-react';
import { User, HomeDecoration } from '../types';

interface HomeCustomizerProps {
  user: User;
  onBack: () => void;
}

const DECOR_STORE = [
  { name: 'Fluffy White Cat 🐈', cost: 100, itemType: 'furniture', icon: '🐈' },
  { name: 'Warm Comfort Couch 🛋️', cost: 250, itemType: 'furniture', icon: '🛋️' },
  { name: 'Monstera Plant Pot 🪴', cost: 75, itemType: 'furniture', icon: '🪴' },
  { name: 'Warm Fireplace 🔥', cost: 500, itemType: 'furniture', icon: '🔥' },
  { name: 'Acoustic Guitar 🎸', cost: 150, itemType: 'furniture', icon: '🎸' },
  { name: 'Cute Teddy Bear 🧸', cost: 50, itemType: 'furniture', icon: '🧸' },
  { name: 'Espresso Coffee Machine ☕', cost: 120, itemType: 'furniture', icon: '☕' },
  { name: 'Anniversary Polaroid 🖼️', cost: 80, itemType: 'polaroid', icon: '🖼️' },
  { name: 'Golden Retriever Pup 🦮', cost: 450, itemType: 'furniture', icon: '🦮' }
];

export default function HomeCustomizer({ user, onBack }: HomeCustomizerProps) {
  const [decorations, setDecorations] = useState<HomeDecoration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState<string>('Living Room');
  const [buying, setBuying] = useState(false);

  // Polaroid hanger form
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPolaroidModal, setShowPolaroidModal] = useState(false);

  const fetchDecorations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/couple/decorations?coupleId=${user.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setDecorations(data);
      }
    } catch (err) {
      console.error('Failed to load home layout list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.coupleId) {
      fetchDecorations();
    }
  }, [user.coupleId]);

  const handlePurchase = async (storeObj: typeof DECOR_STORE[0]) => {
    // Standard validation
    const currentPoints = user.lovePoints || 600;
    if (currentPoints < storeObj.cost) {
      alert("You need more Sweet Sparks! Fill daily check-ins to gain points.");
      return;
    }

    setBuying(true);
    try {
      const res = await fetch('/api/couple/decorations/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          userId: user.id,
          name: storeObj.name,
          cost: storeObj.cost,
          itemType: storeObj.itemType,
          room: selectedGrid,
          emojiIcon: storeObj.icon,
          coordinatesX: Math.floor(15 + Math.random() * 65), // percentage coordinates placement of isometric room canvas
          coordinatesY: Math.floor(15 + Math.random() * 55)
        })
      });

      if (res.ok) {
        fetchDecorations();
        // Trigger page alert/sounds
        alert(`Successfully furnished the nest with ${storeObj.name}!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuying(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch('/api/couple/decorations/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          decorationId: itemId
        })
      });
      if (res.ok) {
        setDecorations(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHangPolaroid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return;

    try {
      const res = await fetch('/api/couple/decorations/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          userId: user.id,
          name: "Our Polaroid Frame",
          cost: 0,
          itemType: 'polaroid',
          photoUrl: photoUrl.trim(),
          room: selectedGrid,
          emojiIcon: '🖼️',
          coordinatesX: Math.floor(20 + Math.random() * 60),
          coordinatesY: Math.floor(10 + Math.random() * 40)
        })
      });

      if (res.ok) {
        setPhotoUrl('');
        setShowPolaroidModal(false);
        fetchDecorations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter decorations based on active visible selected room
  const activeDecorations = decorations.filter(d => d.room === selectedGrid);
  const remainingBudget = user.lovePoints ?? 600;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-105 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6" id="couple_home_customization">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 rounded-xl transition cursor-pointer text-stone-600 dark:text-stone-300"
            id="back_btn_customizer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="space-y-0.5">
            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              🏡 Cozy Shared Nest Designer
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Co-purchase furniture, plants, pets & hang real Polaroid pictures on your shared map.
            </p>
          </div>
        </div>

        {/* Currency Budget displays */}
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-2xl text-xs font-bold font-mono tracking-wide flex items-center gap-2 max-w-fit shadow-xs">
          ✨ Sweet Sparks: {remainingBudget} <span>🎟️</span>
        </div>
      </div>

      {/* Grid Rooms Toggles */}
      <div className="flex items-center gap-2 border-b dark:border-stone-800 pb-2">
        {['Living Room', 'Cozy Bedroom', 'Balcony Garden'].map(room => (
          <button
            key={room}
            onClick={() => setSelectedGrid(room)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedGrid === room
                ? 'bg-rose-500 text-white'
                : 'text-stone-550 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Layout size={13} /> {room}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Isometric Shared Placement Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1">
              <Eye size={12} className="text-rose-500" /> Co-Decorated Map Grid
            </span>
            <button
              onClick={() => setShowPolaroidModal(true)}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
            >
              📷 Hang Custom Polaroid
            </button>
          </div>

          <div className="relative w-full aspect-video min-h-[290px] bg-sky-50 dark:bg-indigo-950/10 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
            {/* Ambient Room Graphic Blueprint Background */}
            <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(244,63,94,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.08)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

            {/* Empty instructions */}
            {activeDecorations.length === 0 && (
              <div className="text-center p-6 space-y-2 relative z-10 max-w-sm">
                <span className="text-3xl">🧺</span>
                <h4 className="font-serif font-bold text-sm text-stone-600/80">Your Nest's {selectedGrid} is Empty</h4>
                <p className="text-[10.5px] text-stone-400">Collaborate with your partner to browse the boutique store below and purchase decorations!</p>
              </div>
            )}

            {/* Placed Interactive Decor Assets */}
            {activeDecorations.map(decor => (
              <div
                key={decor.id}
                className="absolute group z-25 cursor-pointer selection-none"
                style={{ left: `${decor.coordinatesX}%`, top: `${decor.coordinatesY}%` }}
              >
                {/* Polaroid Picture */}
                {decor.itemType === 'polaroid' && decor.photoUrl ? (
                  <div className="bg-white p-1 pb-3 shadow-md border rounded group-hover:scale-105 transition duration-200 w-16 relative">
                    <img referrerPolicy="no-referrer" src={decor.photoUrl} className="w-full h-11 object-cover" alt="Wall Polaroid Frame" />
                    <div className="text-[7px] text-stone-400 mt-1 font-mono text-center truncate">Framed</div>
                    
                    {/* Delete tooltip */}
                    <button
                      onClick={() => handleDeleteItem(decor.id)}
                      className="absolute -top-2 -right-2 bg-stone-900 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 size={8} />
                    </button>
                  </div>
                ) : (
                  // General Emoji Furniture Piece
                  <div className="relative flex flex-col items-center">
                    <span className="text-4xl hover:scale-110 active:scale-95 transition duration-150 block">{decor.emojiIcon}</span>
                    <span className="text-[9px] bg-stone-900/85 text-white font-semibold font-sans px-1.5 py-0.5 rounded-full absolute -bottom-5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 flex items-center gap-1 shadow">
                      {decor.name}
                      <Trash2 size={9} className="text-rose-400 hover:text-rose-500 cursor-pointer" onClick={() => handleDeleteItem(decor.id)} />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 p-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-[10px] text-stone-450 justify-content-center">
            <HelpCircle size={10} />
            <span>Items are loaded globally. When you buy or clear items, your partner sees the changes instantly!</span>
          </div>
        </div>

        {/* Nest Boutique Store / Shoppe */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1 px-1">
            <Store size={12} className="text-yellow-500" /> Nest Boutique
          </span>

          <div className="p-4 rounded-3xl bg-stone-50 dark:bg-stone-800/20 border border-stone-100 dark:border-stone-800/80 space-y-3 divide-y dark:divide-stone-800">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Cozy Shop Stock</span>
              <span className="text-[10px] text-stone-400 font-bold">Buy with sparks</span>
            </div>

            <div className="space-y-2.5 pt-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
              {DECOR_STORE.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1 text-xs py-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="truncate">
                      <span className="font-bold text-stone-700 dark:text-stone-200 block truncate">{item.name}</span>
                      <span className="text-[10px] text-stone-400 capitalize">{item.itemType}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={buying}
                    className="px-2.5 py-1 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition active:scale-95 cursor-pointer text-[10px] whitespace-nowrap shrink-0 flex items-center gap-1"
                  >
                    🛒 Pay {item.cost}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Polaroid Frame Modal Form */}
      {showPolaroidModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleHangPolaroid} className="bg-white dark:bg-stone-900 border border-stone-200 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h4 className="font-serif font-bold text-base text-stone-800 dark:text-stone-200 dark:text-rose-100 flex items-center gap-2">
              📷 Hang Real Wall Polaroid Frame
            </h4>
            <p className="text-xs text-stone-500">Provide an image link to pin a realistic polaroid on your cozy room board.</p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase">Image Address URL</label>
              <input
                type="url"
                required
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full text-xs px-3.5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="px-3 py-1.5 bg-stone-150 rounded"
                onClick={() => setShowPolaroidModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-1.5 bg-rose-500 text-white font-bold rounded"
                type="submit"
              >
                Pin Polaroid
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
