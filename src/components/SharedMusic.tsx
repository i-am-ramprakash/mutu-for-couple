import React, { useEffect, useState } from 'react';
import { ArrowLeft, Music, Plus, Play, Pause, Trash2, Volume2, HelpCircle, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  addedBy: string;
}

interface SharedMusicProps {
  user: User;
  onBack: () => void;
}

export default function SharedMusic({ user, onBack }: SharedMusicProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');

  // Local audio players state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/couple/music?coupleId=${user.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.coupleId) {
      fetchTracks();
    }
    return () => {
      if (audioObj) {
        audioObj.pause();
      }
    };
  }, [user.coupleId]);

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) return;

    setAdding(true);
    try {
      const res = await fetch('/api/couple/music/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          title,
          artist,
          url: url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // lovely royalty-free safe default stream
          addedBy: user.id
        })
      });

      if (res.ok) {
        setTitle('');
        setArtist('');
        setUrl('');
        fetchTracks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePlay = (track: Track) => {
    if (playingTrackId === track.id) {
      // Pause
      if (audioObj) {
        audioObj.pause();
      }
      setPlayingTrackId(null);
    } else {
      // Stop current
      if (audioObj) {
        audioObj.pause();
      }

      // Play new
      const sound = new Audio(track.url);
      sound.play().catch(err => {
        alert("The browser is preventing auto-play. Please interact with the page first or verify the link is a public streaming audio MP3.");
      });
      sound.loop = true;
      setAudioObj(sound);
      setPlayingTrackId(track.id);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (playingTrackId === trackId) {
      if (audioObj) audioObj.pause();
      setPlayingTrackId(null);
    }

    try {
      const res = await fetch('/api/couple/music/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: user.coupleId,
          trackId
        })
      });

      if (res.ok) {
        setTracks(prev => prev.filter(t => t.id !== trackId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6" id="shared_music_space_section">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 rounded-xl transition cursor-pointer text-stone-600 dark:text-stone-300"
            id="back_btn_music"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <span>🎵 Shared Audio Space Playlist</span>
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Paste relaxing MP3 streams or romantic tune links to play beautiful ambient background chords for each other.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form adding */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-3xl bg-stone-50 dark:bg-stone-800/20 border border-stone-100 dark:border-stone-850 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1">
              <Plus size={14} className="text-rose-500" /> Log Loving Tune
            </h4>

            <form onSubmit={handleAddTrack} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-stone-500 uppercase">Song Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Sleep Lullaby"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-stone-500 uppercase">Artist / Mood</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chillhop Beats"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-stone-500 uppercase">Audio Stream URL (MP3 format)</label>
                <input
                  type="url"
                  placeholder="https://example.com/stream.mp3"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold transition"
              >
                {adding ? 'Securing track...' : 'Add to Shared Room'}
              </button>
            </form>
          </div>
        </div>

        {/* Tracks List */}
        <div className="md:col-span-2 space-y-3">
          <span className="text-[11px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1 px-1">
            <Volume2 size={12} className="text-rose-500" /> Linked Loving Radio playlist
          </span>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 rounded-full border-4 border-rose-450 border-t-transparent animate-spin"></div>
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-12 text-center text-stone-400 dark:text-stone-500 border border-dashed rounded-3xl">
              <p className="text-sm font-semibold">No Shared Tracks yet</p>
              <p className="text-xs">Add standard MP3 streaming links or chill beats to play together!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map(track => (
                <div key={track.id} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Disc spin simulation */}
                    <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white shrink-0 ${playingTrackId === track.id ? 'animate-spin' : ''}`}>
                      <Music size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-stone-700 dark:text-stone-200 block truncate">{track.title}</span>
                      <span className="text-[10px] text-stone-400 block truncate">{track.artist}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePlay(track)}
                      className={`p-2.5 rounded-xl cursor-pointer transition ${
                        playingTrackId === track.id
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-stone-200 dark:bg-stone-700 hover:bg-rose-100/50'
                      }`}
                    >
                      {playingTrackId === track.id ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button
                      onClick={() => handleRemoveTrack(track.id)}
                      className="p-2.5 bg-stone-200 dark:bg-stone-700 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 p-3.5 bg-blue-50/50 dark:bg-slate-850 border border-blue-100/30 rounded-2xl text-[10.5px] text-stone-500">
            <HelpCircle size={12} className="shrink-0" />
            <span>The Shared Radio uses standard client streaming. Copy/paste direct MP3 URLs to play music simultaneously on sleep night rooms.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
