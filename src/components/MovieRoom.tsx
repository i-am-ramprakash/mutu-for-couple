import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Play, Pause, RotateCcw, Link2, 
  MessageSquare, Send, ShieldCheck, HelpCircle, Film, Sparkles,
  Upload, Trash2, Clock, History, FileVideo, PlayCircle, Loader2
} from 'lucide-react';
import { User, Message, MovieState } from '../types';

interface MovieRoomProps {
  user: User;
  onBack: () => void;
  messages: Message[];
  onSendChatMessage: (msg: { textEncrypted: string; iv: string; isMovie?: boolean }) => void;
  movieSyncState: MovieState | null;
  onEmitMovieSync: (state: MovieState) => void;
}

// Romantic and cinematic nature loop video choices
const RECOMMENDED_MOVIES = [
  { title: 'Romantic Pastel Forest Loop 🌸', url: 'https://assets.mixkit.co/videos/preview/mixkit-sakura-trees-with-pink-flowers-in-spring-44391-large.mp4' },
  { title: 'Golden Hour Ocean Shore 🌅', url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-crashing-on-the-shore-during-golden-hour-42289-large.mp4' },
  { title: 'Warm Crackling Fireplace 🔥', url: 'https://assets.mixkit.co/videos/preview/mixkit-log-fireplace-burning-interior-decor-34062-large.mp4' }
];

interface UploadedMovie {
  id: string;
  filename: string;
  url: string;
  uploadedAt: number;
}

interface WatchHistory {
  id: string;
  title: string;
  watchedAt: number;
  coupleId?: string;
}

export default function MovieRoom({ 
  user, onBack, messages, onSendChatMessage, movieSyncState, onEmitMovieSync 
}: MovieRoomProps) {
  const [selectedVideo, setSelectedVideo] = useState(RECOMMENDED_MOVIES[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [sideChatInput, setSideChatInput] = useState('');
  
  // Custom uploaded movies & watched history states
  const [uploadedMovies, setUploadedMovies] = useState<UploadedMovie[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'presets' | 'uploads' | 'history'>('presets');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const decryptAll = async () => {
      const cache = { ...decryptedCache };
      let updated = false;

      for (const msg of messages) {
        if (msg.id && !cache[msg.id]) {
          try {
            const { decryptMessage } = await import('../crypto');
            const text = await decryptMessage(msg.textEncrypted, msg.iv, user.loveKey || '');
            if (active) {
              cache[msg.id] = text;
              updated = true;
            }
          } catch (e) {
            console.error('Failed to decrypt message in movie room:', e);
          }
        }
      }

      if (active && updated) {
        setDecryptedCache(cache);
      }
    };

    decryptAll();
    return () => {
      active = false;
    };
  }, [messages, user.loveKey]);

  // Player DOM refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRemoteSyncRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch movies and history on load
  const fetchMoviesAndHistory = async () => {
    try {
      const moviesRes = await fetch('/api/movies');
      if (moviesRes.ok) {
        const data = await moviesRes.json();
        setUploadedMovies(data);
      }
      
      const histRes = await fetch('/api/movies/history');
      if (histRes.ok) {
        const data = await histRes.json();
        setWatchHistory(data);
      }
    } catch (err) {
      console.error('Failed fetching movies or history:', err);
    }
  };

  useEffect(() => {
    fetchMoviesAndHistory();
    // Poll every 10 seconds to refresh remaining time clocks & newly uploaded movies
    const interval = setInterval(fetchMoviesAndHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync effect: When remote movieState changes, apply it
  useEffect(() => {
    if (!movieSyncState || !videoRef.current) return;
    
    const player = videoRef.current;
    
    // Check if the current source fits or we need to align
    if (movieSyncState.videoUrl && player.src !== movieSyncState.videoUrl) {
      isRemoteSyncRef.current = true;
      player.src = movieSyncState.videoUrl;
      const matched = RECOMMENDED_MOVIES.find(m => m.url === movieSyncState.videoUrl);
      const matchedUpload = uploadedMovies.find(m => m.url === movieSyncState.videoUrl);
      
      setSelectedVideo(
        matched || 
        matchedUpload || 
        { title: movieSyncState.videoTitle, url: movieSyncState.videoUrl }
      );
    }

    // Capture difference in seek timing
    const delta = Math.abs(player.currentTime - movieSyncState.currentTime);
    if (delta > 2.0) {
      isRemoteSyncRef.current = true;
      player.currentTime = movieSyncState.currentTime;
    }

    // Playback state alignment
    if (movieSyncState.isPlaying && player.paused) {
      isRemoteSyncRef.current = true;
      player.play().catch(err => console.log('Autoplay request ignored', err));
    } else if (!movieSyncState.isPlaying && !player.paused) {
      isRemoteSyncRef.current = true;
      player.pause();
    }
  }, [movieSyncState, uploadedMovies]);

  // Handle local user control events
  const handlePlay = () => {
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }
    emitSyncState(true);
    addWatchHistory(selectedVideo.title);
  };

  const handlePause = () => {
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }
    emitSyncState(false);
  };

  const handleSeek = () => {
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }
    emitSyncState(!videoRef.current?.paused);
  };

  const emitSyncState = (playing: boolean) => {
    if (!videoRef.current) return;
    onEmitMovieSync({
      videoUrl: selectedVideo.url,
      videoTitle: selectedVideo.title,
      isPlaying: playing,
      currentTime: videoRef.current.currentTime,
      senderId: user.id,
      timestamp: Date.now()
    });
  };

  // Switch custom video url
  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const customVid = {
      title: 'Custom Link Stream 🎬',
      url: customUrl.trim()
    };
    setSelectedVideo(customVid);
    setCustomUrl('');
    setShowCustomInput(false);

    // Dynamic sync emission for partner
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.src = customVid.url;
        videoRef.current.currentTime = 0;
        emitSyncState(false);
      }
    }, 200);

    addWatchHistory(customVid.title);
  };

  const handleLoadPreset = (movie: typeof RECOMMENDED_MOVIES[0]) => {
    setSelectedVideo(movie);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.src = movie.url;
        videoRef.current.currentTime = 0;
        emitSyncState(false);
      }
    }, 200);
    addWatchHistory(movie.title);
  };

  const handleLoadUploaded = (movie: UploadedMovie) => {
    const active = { title: movie.filename, url: movie.url };
    setSelectedVideo(active);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.src = movie.url;
        videoRef.current.currentTime = 0;
        emitSyncState(false);
      }
    }, 200);
    addWatchHistory(movie.filename);
  };

  // Record viewed films in history
  const addWatchHistory = async (title: string) => {
    try {
      await fetch('/api/movies/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, coupleId: user.coupleId })
      });
      fetchMoviesAndHistory();
    } catch (err) {
      console.error('Failed to log watch history:', err);
    }
  };

  // Stream video chunks file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 100MB is generally readable inside localhost/container)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('Please choose a stream clip under 100MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/movies/upload', true);
      xhr.setRequestHeader('x-filename', file.name);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          setUploadedMovies(prev => [res, ...prev]);
          // Load uploaded video as the current play source immediately!
          handleLoadUploaded(res);
          setActiveTab('uploads');
        } else {
          try {
            const errBody = JSON.parse(xhr.responseText);
            setUploadError(errBody.error || 'Server rejected file.');
          } catch {
            setUploadError('Upload failed.');
          }
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setUploadError('Host pipeline failed.');
        setUploading(false);
      };

      xhr.send(file);
    } catch (err) {
      setUploadError('Local connection failure.');
      setUploading(false);
    }
  };

  // Quick text commentary while watching
  const handleSendCommentary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sideChatInput.trim()) return;

    try {
      const text = sideChatInput.trim();
      const enc = await import('../crypto').then(m => m.encryptMessage(text, user.loveKey || ''));
      onSendChatMessage({ textEncrypted: enc.ciphertext, iv: enc.iv, isMovie: true });
      setSideChatInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Render countdown hours
  const renderRemainingHours = (uploadedAt: number) => {
    const ageMs = Date.now() - uploadedAt;
    const remainingMs = Math.max(0, 24 * 60 * 60 * 1000 - ageMs);
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  // Format watched times
  const formatDateFriendly = (time: number) => {
    return new Date(time).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 py-4 font-sans select-none" id="movieroom_container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 text-stone-500 rounded-xl transition-all"
            id="movie_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              Cozy Cinema Room <span className="text-rose-500">🍿</span>
            </h2>
            <p className="text-[10px] text-stone-400 font-medium">Play romantic video presets or stream uploaded movies together.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom File Upload Activator */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100/60 rounded-xl text-rose-600 font-semibold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
            id="upload_movie_btn"
          >
            {uploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span>{uploading ? `Uploading... ${uploadProgress}%` : 'Upload a Movie'}</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="video/*" 
            className="hidden" 
          />

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-xs px-3 py-2 border border-rose-100 rounded-xl hover:bg-rose-50 text-stone-600 font-semibold flex items-center gap-1.5 bg-white transition"
            id="btn_custom_movie_url"
          >
            <Link2 size={13} /> {showCustomInput ? 'Presets' : 'Movie Link'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 text-xs px-3 py-2 bg-red-100/80 border border-red-200 text-red-700 rounded-xl flex items-center gap-1">
          ⚠️ {uploadError}
        </div>
      )}

      {showCustomInput && (
        <form onSubmit={handleLoadCustomUrl} className="mb-6 p-4 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center gap-3">
          <input
            type="url"
            placeholder="Paste direct movie .mp4 link (e.g. cloud video URL)..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-rose-200 rounded-xl bg-white"
            required
          />
          <button
            type="submit"
            className="btn-romantic py-2 px-4 text-xs rounded-xl"
          >
            Load Movie Link
          </button>
        </form>
      )}

      {/* Main Screen grid: Video on Left (3/4) and commentary/tabs on Right (1/4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Video Player area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-stone-950 rounded-3xl overflow-hidden aspect-video shadow-md border border-stone-800 relative group flex items-center justify-center">
            
            <video
              ref={videoRef}
              src={selectedVideo.url}
              className="w-full h-full object-contain"
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeek}
              controls
              playsInline
              id="synced_player"
            />

            {/* Sync Overlay notification pill */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur border border-white/10 px-3 py-1 rounded-xl flex items-center gap-1.5 text-[10px] text-rose-300 font-bold select-none opacity-80">
              <Film size={11} /> 
              <span className="truncate max-w-[200px]">Watching: {selectedVideo.title}</span>
            </div>
          </div>

          {/* Sub Content Tabs selection inside Nest Room */}
          <div className="bg-white border border-rose-100/60 rounded-3xl p-5 shadow-3xs">
            <div className="flex border-b border-rose-100 pb-2 mb-4 gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-2 px-1 transition-all flex items-center gap-1.5 ${activeTab === 'presets' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <Sparkles size={13} /> Preset Loops
              </button>
              <button
                onClick={() => setActiveTab('uploads')}
                className={`pb-2 px-1 transition-all flex items-center gap-1.5 relative ${activeTab === 'uploads' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <FileVideo size={13} /> Uploaded Movies
                {uploadedMovies.length > 0 && (
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute -top-0.5 -right-1"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'text-rose-600 border-b-2 border-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <History size={13} /> Watch History
              </button>
            </div>

            <div className="min-h-[110px]">
              {/* Presets */}
              {activeTab === 'presets' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RECOMMENDED_MOVIES.map((movie, index) => (
                    <button
                      key={index}
                      onClick={() => handleLoadPreset(movie)}
                      className={`p-3.5 text-left rounded-2xl text-xs transition-all border flex items-center gap-2 ${
                        selectedVideo.url === movie.url 
                          ? 'border-rose-400 bg-rose-50/60 text-rose-600 font-bold shadow-3xs' 
                          : 'border-stone-100 bg-white text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <PlayCircle size={14} className="shrink-0" />
                      <span className="truncate">{movie.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Uploads */}
              {activeTab === 'uploads' && (
                <div className="space-y-2">
                  {uploadedMovies.length === 0 ? (
                    <div className="text-center py-6 text-stone-400 text-xs flex flex-col items-center justify-center gap-2 bg-stone-50/50 rounded-2xl">
                      <Film size={20} className="text-stone-300" />
                      <p>No custom uploaded movies available. Grab a movie and upload it to start!</p>
                      <p className="text-[10px] text-stone-400 italic">⚠️ Uploaded movies last exactly 24 hours, then they automagically delete.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedMovies.map((movie) => (
                        <div
                          key={movie.id}
                          className={`p-3 rounded-2xl transition-all border flex items-center justify-between gap-2 ${
                            selectedVideo.url === movie.url 
                              ? 'border-rose-400 bg-rose-50/60 text-rose-600 font-semibold' 
                              : 'border-stone-100 bg-white text-stone-600 hover:border-stone-200'
                          }`}
                        >
                          <button
                            onClick={() => handleLoadUploaded(movie)}
                            className="flex-1 text-left flex items-center gap-2 cursor-pointer text-xs"
                          >
                            <PlayCircle size={14} className="text-rose-500 shrink-0" />
                            <div className="truncate">
                              <p className="truncate font-semibold text-stone-700 dark:text-stone-200">{movie.filename}</p>
                              <p className="text-[9px] text-rose-400 flex items-center gap-0.5 mt-0.5">
                                <Clock size={10} /> {renderRemainingHours(movie.uploadedAt)}
                              </p>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History */}
              {activeTab === 'history' && (
                <div className="space-y-1">
                  {watchHistory.length === 0 ? (
                    <p className="text-xs text-stone-400 py-6 text-center italic bg-stone-50/50 rounded-2xl">No movies watched yet. Select a movie and enjoy together!</p>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 scrollbar-none">
                      {watchHistory.map((hist) => (
                        <div key={hist.id} className="flex items-center justify-between bg-[#FCF8F8] px-3.5 py-2.5 rounded-xl border border-rose-100/20 text-xs text-stone-600 hover:bg-stone-50/40">
                          <span className="font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 truncate">
                            🍿 {hist.title}
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono shrink-0">
                            {formatDateFriendly(hist.watchedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Shared Reaction chat loop */}
        <div className="lg:col-span-1 flex flex-col h-[520px] bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-3xs" id="movie_commentary_sidebar">
          <div className="p-3.5 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between shadow-3xs">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-1">
              <MessageSquare size={13} className="text-rose-400" /> Cinema Reaction
            </span>
            <span className="text-[8px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full select-none uppercase tracking-wide">Live Stream</span>
          </div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-stone-50/30">
            {messages.length === 0 ? (
              <p className="text-[10px] text-stone-400 text-center py-12 leading-relaxed">No live inputs yet. Feel free to type comments below as the movie streams! 🥰</p>
            ) : (
              messages
                .filter(m => m.id)
                .slice(-12)
                .map((msg, idx) => {
                  const isMe = msg.senderId === user.id;
                  const decryptedVal = decryptedCache[msg.id] || 'Decrypting... 🔐';
                  return (
                    <div key={msg.id || idx} className="bg-white p-2.5 rounded-xl border border-rose-100/50 text-[10px] text-stone-600 shadow-3xs">
                      <strong className="text-rose-500">{isMe ? 'You' : user.partnerName || 'Beloved'}:</strong>
                      <p className="mt-0.5 text-stone-650 leading-normal font-sans prose max-w-full break-all">
                        {decryptedVal}
                      </p>
                    </div>
                  );
                })
            )}
          </div>

          <form onSubmit={handleSendCommentary} className="p-2 border-t border-rose-100 bg-white flex items-center gap-1.5 shadow-md">
            <input
              type="text"
              placeholder="Love thoughts... 🥰"
              value={sideChatInput}
              onChange={(e) => setSideChatInput(e.target.value)}
              className="flex-1 text-[11px] px-2.5 py-2 border border-rose-100 rounded-xl bg-stone-50 focus:outline-none focus:bg-white"
            />
            <button
              type="submit"
              disabled={!sideChatInput.trim()}
              className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shrink-0 transition"
            >
              <Send size={11} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
