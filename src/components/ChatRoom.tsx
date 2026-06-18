import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Send, Sparkles, AlertCircle, Heart, 
  Smile, ShieldCheck, Loader2, Image as ImageIcon, Flame,
  Mic, Square, Play, Pause, Trash2, Upload, ZoomIn, X, Reply,
  Video, VolumeX, Volume2, Phone
} from 'lucide-react';
import { User, Message, MessageReaction } from '../types';
import { encryptMessage, decryptMessage } from '../crypto';
import { playSweetHeartbeat, playSweetSparkSound } from '../utils/audio';

interface ChatRoomProps {
  user: User;
  onBack: () => void;
  messages: Message[];
  onSendMessage: (msg: { textEncrypted: string; iv: string; isVoice?: boolean; replyToId?: string; replyToText?: string }) => void;
  onSendReaction: (messageId: string, emoji: string, action: 'add' | 'remove') => void;
  typingPartner: boolean;
  onTyping: (isTyping: boolean) => void;
  partnerThumbKissActive?: boolean;
  onSendThumbKissToggle?: (active: boolean) => void;
  onJoin?: () => void;
  onLeave?: () => void;
  onRetryMessage?: (msg: Message) => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
}

// Sub-component to stream decrypted Private base64 audio voice note attachments safely
const VoiceNotePlayer = ({ base64Audio }: { base64Audio: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioSrc = `data:audio/webm;base64,${base64Audio}`;
    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [base64Audio]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error('Audio run error: ', err));
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 text-inherit max-w-full overflow-hidden">
      <button
        onClick={togglePlay}
        type="button"
        className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-current flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90"
      >
        {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="ml-0.5 fill-current" />}
      </button>
      <div className="flex-1 min-w-[100px]">
        {/* Real-time moving soundwave representations */}
        <div className="flex items-end gap-0.5 h-3.5 my-0.5 px-0.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const h = isPlaying ? (4 + Math.sin(currentTime * 8 + i) * 10) : 5;
            return (
              <span
                key={i}
                className="w-[1.5px] bg-current rounded-full transition-all duration-150"
                style={{ height: `${Math.max(3, Math.min(14, h))}px`, opacity: isPlaying ? 1 : 0.6 }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[7.5px] opacity-75 font-mono leading-none">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '0:03'}</span>
        </div>
      </div>
    </div>
  );
};

// Sub-component to render base64 Video Note circles
const VideoNotePlayer = ({ base64Video }: { base64Video: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoUrl = useMemo(() => {
    return `data:video/webm;base64,${base64Video}`;
  }, [base64Video]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Video note playback errored:', err);
      });
    }
  };

  const toggleMuted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-pink-100 dark:border-stone-800 group shadow-lg bg-black flex items-center justify-center cursor-pointer select-none"
      onClick={() => togglePlay()}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover rounded-full"
        loop
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Control buttons overlay */}
      <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button 
          onClick={togglePlay}
          type="button"
          className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition"
        >
          {isPlaying ? <Pause size={12} className="fill-white" /> : <Play size={12} className="ml-0.5 fill-white" />}
        </button>
        <button 
          onClick={toggleMuted}
          type="button"
          className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition"
        >
          {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="w-10 h-10 rounded-full bg-pink-500/80 text-white flex items-center justify-center animate-pulse">
            <Play size={16} fill="currentColor" className="ml-0.5 text-white" />
          </div>
        </div>
      )}

      {/* Muted toggle mini state pill indicators */}
      <button 
        onClick={toggleMuted}
        type="button"
        className="absolute bottom-1.5 right-1/2 translate-x-1/2 px-2 py-0.5 bg-black/60 hover:bg-black/80 text-[8px] font-bold text-white rounded-full flex items-center gap-1 transition-all z-10"
      >
        {isMuted ? <VolumeX size={8} /> : <Volume2 size={8} />}
        <span>{isMuted ? 'Muted' : 'Sound'}</span>
      </button>
    </div>
  );
};

// Helper to check if a string is a valid image source (base64, URL, or icon URL) vs. a text emoji
const isImageString = (src: string | undefined | null): boolean => {
  if (!src) return false;
  return src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.length > 20;
};

// Built-in list of warm romantic high-fidelity Gifs & Stickers
const ROMANTIC_GIFS = [
  { id: 'g1', tag: 'Kiss', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTE1ZWZhcjR6b2kya2h2MXQzdzRkbHN3YXV0a3Vrd3NoaTZ5MTB0NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g6F7T66fGZ40Udf2R/giphy.gif' },
  { id: 'g2', tag: 'Cute Hug', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMThkb3pyNjhsNjR5aWswMHZ6YmJzODQ0MmhiNW1wMDdzOHo5YmcwdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WfNytZcoasvThZ9Z85/giphy.gif' },
  { id: 'g3', tag: 'Miss You', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWM5YWhpdmFhbTk1ZjBlN29yMGtkMWV4YWU2aHBsa3d6a25uNWZ4YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/K77qfeWf8bK5WCHvN1/giphy.gif' },
  { id: 'g4', tag: 'Cuddling', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTI1MDBkYWM5N29zb3l3dmpzbzgwdTFwZzlveXAwcHk1aGR2MzRwZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/lZba8z07pT5M0/giphy.gif' },
  { id: 'g5', tag: 'Love Hearts', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ3ZHdpc2NndjZubzMxODh1NzR0ZW8yb3R6ZTF3MzRhZjN5NWdqOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/A9mby686msm2YgEAtE/giphy.gif' },
  { id: 'g6', tag: 'Rose Kiss', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWkyYWJrcXlzamR4YmRlOHpncDZudmt3cGFrbW5sdHpkZ3dtNXp4eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/986v6xat7S6uP3Y820/giphy.gif' },
  // Extra warm and emotional additions
  { id: 'g7', tag: 'Forehead Kiss', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNXBrbm9uOHE3NzlyZmVzMW16enp1MWY5ZGplM2xhZjVkdHFwbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/VfD83fP8G78pveVxsP/giphy.gif' },
  { id: 'g8', tag: 'Back Hug', url: 'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif' },
  { id: 'g9', tag: 'Sweet Cozy Couch', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzFlZnA5aXZsYWNydjRpa2U2NG9hYm5iOXE4YWdqdnV5bjcxODRyOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WwStS75OChfG2t6X47/giphy.gif' },
  { id: 'g10', tag: 'I Love U', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWI2bTBoNjhhcHBycG85cTFhaDNidG53MWVrcTJqanpvY3VnMHhxZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l4pTdcifPzcLe494A/giphy.gif' }
];

export default function ChatRoom({ 
  user, onBack, messages, onSendMessage, onSendReaction, typingPartner, onTyping,
  partnerThumbKissActive = false, onSendThumbKissToggle, onJoin, onLeave, onRetryMessage,
  onVoiceCall, onVideoCall
}: ChatRoomProps) {
  useEffect(() => {
    if (onJoin) onJoin();
    return () => {
      if (onLeave) onLeave();
    };
  }, [onJoin, onLeave]);

  const [inputText, setInputText] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifDrawer, setShowGifDrawer] = useState(false);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBadge, setShowScrollBottomBadge] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string>('');
  const isInitialMountRef = useRef(true);
  const typingTimeoutRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Swipe to reply & cancellation states
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipeTranslation, setSwipeTranslation] = useState<Record<string, number>>({});
  const touchStartXRef = useRef<number | null>(null);
  const activeSwipeMsgIdRef = useRef<string | null>(null);
  const isRecordingCancelledRef = useRef(false);

  // Video note states
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingSeconds, setVideoRecordingSeconds] = useState(0);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoRecordTimerRef = useRef<any>(null);
  const localVideoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Touch Portal states
  const [showThumbKissPortal, setShowThumbKissPortal] = useState(false);
  const [localThumbKissActive, setLocalThumbKissActive] = useState(false);
  const [bothTouching, setBothTouching] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; delay: number }[]>([]);

  useEffect(() => {
    if (localThumbKissActive && partnerThumbKissActive) {
      setBothTouching(true);
      playSweetHeartbeat();
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
      } catch {}

      // Spawn floating hearts
      const hearts = Array.from({ length: 24 }).map((_, idx) => ({
        id: Date.now() + idx,
        left: 10 + Math.random() * 80,
        delay: Math.random() * 2
      }));
      setFloatingHearts(hearts);
    } else {
      setBothTouching(false);
      setFloatingHearts([]);
    }
  }, [localThumbKissActive, partnerThumbKissActive]);

  const handleThumbPress = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (localThumbKissActive) return;
    setLocalThumbKissActive(true);
    if (onSendThumbKissToggle) {
      onSendThumbKissToggle(true);
    }
  };

  const handleThumbRelease = () => {
    if (!localThumbKissActive) return;
    setLocalThumbKissActive(false);
    if (onSendThumbKissToggle) {
      onSendThumbKissToggle(false);
    }
  };

  // Reaction display states supporting mobile touch interaction
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const longPressTimerRef = useRef<any>(null);

  // Fullscreen picture viewer toggle
  const [zoomImgSrc, setZoomImgSrc] = useState<string | null>(null);

  // Voice recording states and references
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    isRecordingCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (isRecordingCancelledRef.current) {
          audioChunksRef.current = [];
          return; // cancelled
        }

        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          if (!base64data) return;

          setIsEncrypting(true);
          try {
            const voiceUrl = `[VOICE_NOTE]:${base64data}`;
            const pld = await encryptMessage(voiceUrl, user.loveKey || '');
            onSendMessage({ textEncrypted: pld.ciphertext, iv: pld.iv, isVoice: true });
          } catch (err) {
            console.error(err);
          } finally {
            setIsEncrypting(false);
          }
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.warn('Microphone error details:', err);
      alert('Could not open the voice recorder. Please ensure microphone permissions are allowed in settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    isRecordingCancelledRef.current = true;
    audioChunksRef.current = [];
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Video Note Recording handlers
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 320, facingMode: 'user' }, 
        audio: true 
      });
      setVideoStream(stream);
      setIsVideoRecording(true);
      setVideoRecordingSeconds(0);
      videoChunksRef.current = [];

      // Render live preview container
      setTimeout(() => {
        if (localVideoPreviewRef.current) {
          localVideoPreviewRef.current.srcObject = stream;
        }
      }, 100);

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);

        if (videoChunksRef.current.length === 0) return;

        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          if (!base64data) return;

          setIsEncrypting(true);
          try {
            const videoUrl = `[VIDEO_NOTE]:${base64data}`;
            const pld = await encryptMessage(videoUrl, user.loveKey || '');
            onSendMessage({ textEncrypted: pld.ciphertext, iv: pld.iv });
          } catch (err) {
            console.error('Video message encryption failed:', err);
          } finally {
            setIsEncrypting(false);
          }
        };
      };

      recorder.start();
      setVideoRecorder(recorder);

      if (videoRecordTimerRef.current) clearInterval(videoRecordTimerRef.current);
      videoRecordTimerRef.current = setInterval(() => {
        setVideoRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.warn('Camera/Mic permission details:', err);
      alert('Could not record video. Ensure camera & microphone services are allowed.');
    }
  };

  const cancelVideoRecording = () => {
    if (videoRecorder && videoRecorder.state !== 'inactive') {
      videoChunksRef.current = [];
      videoRecorder.stop();
    } else if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null);
    }
    setIsVideoRecording(false);
    if (videoRecordTimerRef.current) clearInterval(videoRecordTimerRef.current);
  };

  const stopVideoRecording = () => {
    if (videoRecorder && videoRecorder.state !== 'inactive') {
      videoRecorder.stop();
    }
    setIsVideoRecording(false);
    if (videoRecordTimerRef.current) clearInterval(videoRecordTimerRef.current);
  };

  // Safe client side picture compressor using standard HTML Canvas
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Build sizing constraints privately keeping images at gorgeous 720p resolution
        const maxResolution = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxResolution) {
            height *= maxResolution / width;
            width = maxResolution;
          }
        } else {
          if (height > maxResolution) {
            width *= maxResolution / height;
            height = maxResolution;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.90);
          sendEncryptedImage(compressedBase64);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const sendEncryptedImage = async (base64Img: string) => {
    setIsEncrypting(true);
    try {
      const customPayload = `[IMAGE_ATTACHMENT]:${base64Img}`;
      const pld = await encryptMessage(customPayload, user.loveKey || '');
      onSendMessage({ textEncrypted: pld.ciphertext, iv: pld.iv });
    } catch (err) {
      console.error('Image cryptography push failure:', err);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (videoRecordTimerRef.current) clearInterval(videoRecordTimerRef.current);
    };
  }, []);

  // Quick select reaction list
  const reactionEmojis = ['❤️', '🥰', '😘', '💋', '🌹', '🤗', '🔥', '👑'];

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 200;
    if (isAtBottom) {
      setShowScrollBottomBadge(false);
    }
  };

  // WhatsApp-style message arrival behavior
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const isMyMessage = lastMsg.senderId === user.id;
    const el = messagesContainerRef.current;

    if (el) {
      if (isInitialMountRef.current) {
        // Scroll instantly without slow smooth-scroll transition on mount (Issue 7)
        el.scrollTo({ top: el.scrollHeight });
        isInitialMountRef.current = false;
        setShowScrollBottomBadge(false);
      } else {
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 200;
        if (isMyMessage || isAtBottom) {
          setTimeout(() => {
            if (el) {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }
          }, 100);
          setShowScrollBottomBadge(false);
        } else {
          if (lastMsg.id !== lastMessageId) {
            setShowScrollBottomBadge(true);
          }
        }
      }
    }
    setLastMessageId(lastMsg.id);
  }, [messages, user.id, lastMessageId]);

  // Adjust scroll when partner is typing to accommodate the bubble
  useEffect(() => {
    if (typingPartner) {
      const el = messagesContainerRef.current;
      if (el) {
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 200;
        if (isAtBottom) {
          setTimeout(() => {
            if (el) {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }
          }, 100);
        }
      }
    }
  }, [typingPartner]);

  // Decrypt incoming private messages and cache them
  useEffect(() => {
    const decryptAll = async () => {
      const cache: Record<string, string> = { ...decryptedCache };
      let updated = false;

      for (const msg of messages) {
        if (!cache[msg.id]) {
          const text = await decryptMessage(msg.textEncrypted, msg.iv, user.loveKey || '');
          cache[msg.id] = text;
          updated = true;
        }
      }

      if (updated) {
        setDecryptedCache(cache);
      }
    };

    decryptAll();
  }, [messages, user.loveKey]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsEncrypting(true);
    try {
      const text = inputText.trim();
      const pld = await encryptMessage(text, user.loveKey || '');
      
      let replyToId: string | undefined = undefined;
      let replyToText: string | undefined = undefined;

      if (replyingTo) {
        replyToId = replyingTo.id;
        const decryptedReplied = decryptedCache[replyingTo.id];
        if (decryptedReplied) {
          if (decryptedReplied.startsWith('[VOICE_NOTE]:')) {
            replyToText = '🎤 Voice Note';
          } else if (decryptedReplied.startsWith('[VIDEO_NOTE]:')) {
            replyToText = '📹 Video Note';
          } else if (decryptedReplied.startsWith('[IMAGE_ATTACHMENT]:')) {
            replyToText = '📸 Shared Image';
          } else if (decryptedReplied.startsWith('[GIF]:')) {
            replyToText = '💖 Romantic Sticker';
          } else {
            replyToText = decryptedReplied.substring(0, 60);
          }
        } else {
          replyToText = 'Locked Message 🔒';
        }
      }

      onSendMessage({ 
        textEncrypted: pld.ciphertext, 
        iv: pld.iv,
        replyToId,
        replyToText
      });
      setInputText('');
      setReplyingTo(null);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    } catch (err) {
      console.error('Encryption pipeline failed:', err);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSendGif = async (gifUrl: string) => {
    setIsEncrypting(true);
    try {
      const customText = `[GIF]:${gifUrl}`;
      const pld = await encryptMessage(customText, user.loveKey || '');
      onSendMessage({ textEncrypted: pld.ciphertext, iv: pld.iv });
      setShowGifDrawer(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Dynamic Touch events for long-press simulation on smartphone viewports
  const handleTouchStart = (msgId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setFocusedMessageId(msgId);
    }, 600); // 600ms hold makes a secure long press trigger
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Drag / Swipe to reply handlers
  const handleMessageSwipeStart = (e: React.TouchEvent | React.MouseEvent, msgId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartXRef.current = clientX;
    activeSwipeMsgIdRef.current = msgId;
  };

  const handleMessageSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartXRef.current === null || activeSwipeMsgIdRef.current === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diffX = clientX - touchStartXRef.current;
    
    // Only register right swipe
    if (diffX > 0) {
      setSwipeTranslation({ [activeSwipeMsgIdRef.current]: Math.min(diffX, 85) });
    }
  };

  const handleMessageSwipeEnd = () => {
    if (activeSwipeMsgIdRef.current !== null) {
      const translation = swipeTranslation[activeSwipeMsgIdRef.current] || 0;
      if (translation > 55) {
        // Trigger reply state
        const msg = messages.find(m => m.id === activeSwipeMsgIdRef.current);
        if (msg) {
          setReplyingTo(msg);
          playSweetSparkSound();
        }
      }
    }
    setSwipeTranslation({});
    touchStartXRef.current = null;
    activeSwipeMsgIdRef.current = null;
  };

  const selectReaction = (msgId: string, emoji: string) => {
    onSendReaction(msgId, emoji, 'add');
    setFocusedMessageId(null);
  };

  const [viewportHeight] = useState<string>('100%');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setTimeout(() => {
        const el = messagesContainerRef.current;
        if (el) {
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 300;
          if (isAtBottom) {
            el.scrollTo({ top: el.scrollHeight });
          }
        }
      }, 100);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [activeSeconds, setActiveSeconds] = useState<number>(0);

  // Live active partner session chronometer
  useEffect(() => {
    if (!user.partnerOnline) {
      setActiveSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [user.partnerOnline]);

  const formatChronometer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPartnerStatusLabel = () => {
    if (typingPartner) {
      return (
        <span className="text-[10px] text-pink-500 font-bold animate-pulse flex items-center gap-1">
          ✍️ My Dearest is writing...
        </span>
      );
    }

    if (user.partnerOnline) {
      return (
        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 relative pl-3.5 pr-2">
          <span className="w-2.5 h-2.5 bg-emerald-500/30 rounded-full animate-ping absolute left-0" />
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute left-0.5" />
          <span>Beloved online</span>
        </span>
      );
    }

    // Partner is offline/away. Format distance since active using user.partnerLastActiveTime
    if (user.partnerLastActiveTime) {
      const diffMs = Date.now() - user.partnerLastActiveTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        return (
          <span className="text-[10px] text-stone-400 font-bold">
            Beloved was just active
          </span>
        );
      }
      if (diffMins < 60) {
        return (
          <span className="text-[10px] text-stone-400 font-bold">
            Beloved active {diffMins}m ago
          </span>
        );
      }
      if (diffHrs < 24) {
        const remainingMins = diffMins % 60;
        return (
          <span className="text-[10px] text-stone-400 font-bold">
            Beloved active {diffHrs}h {remainingMins}m ago
          </span>
        );
      }
      return (
        <span className="text-[10px] text-stone-400 font-bold">
          Beloved is sleeping off-grid 💤
        </span>
      );
    }

    return (
      <span className="text-[10px] text-stone-400 font-bold">
        Beloved resting 💤
      </span>
    );
  };

  const chatBgStyle = user.chatBackground 
    ? { background: user.chatBackground.startsWith('http') ? `url(${user.chatBackground}) center/cover no-repeat` : user.chatBackground }
    : {};

  return (
    <div 
      className="w-full max-w-2xl mx-auto flex flex-col md:rounded-3xl rounded-none glass-card md:border border-none overflow-hidden relative transition-all duration-150 h-full" 
      id="chat_room_wrapper"
      style={chatBgStyle}
    >
      
      {/* Header section */}
      <div className="p-3 bg-white/90 dark:bg-stone-900/90 border-b border-rose-100 dark:border-stone-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300 rounded-xl transition-all shrink-0"
            id="chat_back_btn"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <div 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).navigateToProfile && user.partnerId) {
                  (window as any).navigateToProfile(user.partnerId);
                }
              }}
              className="w-9 h-9 rounded-full bg-rose-100 dark:bg-stone-800 flex items-center justify-center text-lg shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all"
              title={`${user.partnerName || 'Companion'}'s profile room`}
            >
              {isImageString(user.partnerPhoto) ? (
                <img src={user.partnerPhoto} alt={user.partnerName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{user.partnerPhoto || '🦊'}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs text-stone-700 dark:text-stone-300 leading-none truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={user.partnerName || 'Partner'}>
                {user.partnerName || 'Partner'}
              </h3>
              <div className="mt-0.5 flex items-center min-h-[14px]">
                {getPartnerStatusLabel()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Speak voice-dial button */}
          {onVoiceCall && (
            <button
              onClick={onVoiceCall}
              className="p-2 border border-rose-100 dark:border-stone-800 hover:bg-rose-50 dark:hover:bg-stone-800 text-rose-500 rounded-xl transition-all cursor-pointer bg-white dark:bg-stone-900"
              title="Voice Call"
              id="chat_header_voice_dial"
            >
              <Phone size={14} />
            </button>
          )}

          {/* Quick Live video-dial button */}
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              title="Video Call"
              id="chat_header_video_dial"
            >
              <Video size={14} />
            </button>
          )}

          {/* Private Indicator - Hidden on mobile screen spaces */}
          <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-[10px] text-rose-600 font-semibold shadow-inner">
            <Heart size={12} className="text-rose-500" fill="currentColor" />
            <span>Just for you two</span>
          </div>
        </div>
      </div>

      {/* Birthday reminder */}
      {user.partnerBirthday && (
        <div className="bg-pink-100/50 px-4 py-2 border-b border-rose-100/40 text-[11px] text-stone-600 font-medium text-center flex items-center justify-center gap-1 select-none">
          🎉 <strong className="text-rose-600">{user.partnerName}'s Birthday:</strong> {new Date(user.partnerBirthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} • Spark something beautiful! 🎂
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 flex flex-col relative bg-stone-50/10 dark:bg-stone-950/20">
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 select-none scroll-smooth"
        >
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <span className="text-4xl animate-bounce">💌</span>
            <h4 className="font-serif font-bold text-stone-700 dark:text-stone-200 text-sm">Write Your Secret Message</h4>
            <p className="text-[10px] text-stone-400 max-w-[280px] leading-relaxed">
              Every message, voice clip, and photo is private locally with your Love Key <strong>{user.loveKey}</strong>.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user.id;
            const decryptedVal = decryptedCache[msg.id];
            const hasGif = decryptedVal && decryptedVal.startsWith('[GIF]:');
            const gifUrl = hasGif ? decryptedVal.replace('[GIF]:', '') : '';
            const hasImg = decryptedVal && decryptedVal.startsWith('[IMAGE_ATTACHMENT]:');
            const base64ImgSrc = hasImg ? decryptedVal.replace('[IMAGE_ATTACHMENT]:', '') : '';

            // Dynamic date grouping to display separators while scrolling the chat (Issue 5)
            const currentMsgDate = new Date(msg.timestamp).toDateString();
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;
            const showDateHeader = currentMsgDate !== prevMsgDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-3 select-none w-full animate-fade-in">
                    <span className="bg-stone-200/50 dark:bg-stone-800/60 border border-stone-200/10 text-stone-500 dark:text-stone-300 text-[8.5px] font-mono tracking-wider font-bold uppercase px-2.5 py-1 rounded-full shadow-4xs">
                      {currentMsgDate === new Date().toDateString() ? 'Today' : 
                       currentMsgDate === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                       new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                
                <div 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group max-w-full`}
                >
                {/* Message Bubble container */}
                <div className="flex items-start gap-1.5 max-w-[85%] relative">
                  
                  {!isMe && (
                    <div 
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).navigateToProfile && user.partnerId) {
                          (window as any).navigateToProfile(user.partnerId);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs mt-1 shrink-0 cursor-pointer hover:scale-115 active:scale-95 transition-all"
                      title={`${user.partnerName || 'Companion'}'s profile room`}
                    >
                      {isImageString(user.partnerPhoto) ? (
                        <img src={user.partnerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>{user.partnerPhoto || '🦊'}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col relative">
                    {/* Swipe reply indicator */}
                    {(swipeTranslation[msg.id] || 0) > 0 && (
                      <div 
                        className="absolute left-[-35px] top-1/2 -translate-y-1/2 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-stone-800 p-1.5 rounded-full shadow-sm border border-rose-100 dark:border-stone-700 font-bold transition-all z-20"
                        style={{ 
                          opacity: Math.min((swipeTranslation[msg.id] || 0) / 50, 1),
                          transform: `translateY(-50%) scale(${Math.min((swipeTranslation[msg.id] || 0) / 50, 1.2)})` 
                        }}
                      >
                        <Reply size={13} strokeWidth={2.5} />
                      </div>
                    )}
                    <div 
                      onTouchStart={(e) => { handleTouchStart(msg.id); handleMessageSwipeStart(e, msg.id); }}
                      onTouchMove={handleMessageSwipeMove}
                      onTouchEnd={() => { handleTouchEnd(); handleMessageSwipeEnd(); }}
                      onMouseDown={(e) => { handleTouchStart(msg.id); handleMessageSwipeStart(e, msg.id); }}
                      onMouseMove={handleMessageSwipeMove}
                      onMouseUp={() => { handleTouchEnd(); handleMessageSwipeEnd(); }}
                      onMouseLeave={handleMessageSwipeEnd}
                      onClick={() => setFocusedMessageId(focusedMessageId === msg.id ? null : msg.id)}
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed transition-all shadow-3xs relative cursor-pointer select-none ${
                        isMe 
                          ? 'bg-rose-100 text-stone-800 border-rose-200 dark:bg-rose-900/70 dark:text-rose-50 dark:border-rose-800 rounded-tr-none' 
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-tl-none'
                      }`}
                      style={{ 
                        transform: `translateX(${swipeTranslation[msg.id] || 0}px)`, 
                        transition: swipeTranslation[msg.id] ? 'none' : 'transform 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)' 
                      }}
                    >
                      {msg.replyToText && (
                        <div className="mb-2 px-2.5 py-1.5 bg-black/5 dark:bg-stone-900/40 border-l-2 border-rose-400 rounded-lg text-[10px] text-stone-600 dark:text-stone-300 flex flex-col max-w-full">
                          <span className="font-bold text-rose-500 text-[8px] uppercase tracking-wider">Replied Message</span>
                          <span className="truncate block italic mt-0.5">{msg.replyToText}</span>
                        </div>
                      )}
                      {decryptedVal ? (
                        hasGif ? (
                          <div className="rounded-xl overflow-hidden max-w-[180px]">
                            <img src={gifUrl} alt="Romantic Sticker" className="w-full h-auto object-cover" />
                          </div>
                        ) : hasImg ? (
                          <div className="relative group/img max-w-[210px] rounded-xl overflow-hidden shadow-sm">
                            <img src={base64ImgSrc} alt="Shared Love Card" className="w-full h-auto object-cover max-h-48" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setZoomImgSrc(base64ImgSrc); }}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity duration-150"
                            >
                              <ZoomIn size={18} />
                            </button>
                          </div>
                        ) : decryptedVal.startsWith('[VOICE_NOTE]:') ? (
                          <VoiceNotePlayer base64Audio={decryptedVal.replace('[VOICE_NOTE]:', '')} />
                        ) : decryptedVal.startsWith('[VIDEO_NOTE]:') ? (
                          <VideoNotePlayer base64Video={decryptedVal.replace('[VIDEO_NOTE]:', '')} />
                        ) : (
                          <p className="break-words whitespace-pre-wrap">{decryptedVal}</p>
                        )
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-stone-400 animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Unlocking letter...
                        </span>
                      )}

                      {/* Msg reactions drawer */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="absolute -bottom-2 -right-1.5 flex gap-0.5 bg-white dark:bg-stone-800 border border-rose-100 dark:border-stone-700 px-1 py-0.5 rounded-full shadow-sm max-w-full overflow-hidden">
                          {msg.reactions.map((react, rIdx) => (
                            <span 
                              key={rIdx} 
                              className="text-[10px] hover:scale-130 transition"
                              onClick={() => onSendReaction(msg.id, react.emoji, 'remove')}
                            >
                              {react.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Reactions bar on Long-press / Click feedback toggle */}
                    <AnimatePresence>
                      {focusedMessageId === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 5 }}
                          className={`absolute -top-10 ${isMe ? 'right-0' : 'left-4'} bg-white dark:bg-stone-800 border border-rose-100 dark:border-stone-700 px-2 py-1 rounded-full shadow-md flex gap-1.5 z-40`}
                        >
                          {reactionEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); selectReaction(msg.id, emoji); }}
                              className="hover:scale-140 active:scale-90 transition text-sm cursor-pointer px-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Date tag and delivery indicators below message bubble */}
                <div className={`flex items-center gap-1.5 ${isMe ? 'justify-end pr-2' : 'justify-start pl-8'} mt-0.5`}>
                  <span className="text-[8px] text-stone-400 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    <span className="leading-none flex items-center select-none" style={{ fontSize: '11px' }}>
                      {msg.status === 'failed' ? (
                        <button
                          onClick={() => onRetryMessage && onRetryMessage(msg)}
                          className="text-rose-500 font-extrabold flex items-center gap-0.5 hover:scale-105 transition cursor-pointer border-none bg-transparent p-0"
                          title="Failed to send. Click to retry."
                        >
                          <span className="text-[9px] bg-rose-50 text-rose-600 px-1 rounded-full font-mono font-bold animate-pulse">Failed 🔂</span>
                        </button>
                      ) : msg.status === 'sending' ? (
                        <span className="text-stone-300 font-mono text-[9px] animate-pulse" title="Sending...">⏳</span>
                      ) : msg.read || msg.status === 'seen' ? (
                        <span className="text-sky-500 font-black tracking-[-1.5px]" title="Seen pb-0.5">✓✓</span>
                      ) : msg.status === 'delivered' ? (
                        <span className="text-stone-400 font-serif font-black tracking-[-1.5px]" title="Delivered">✓✓</span>
                      ) : (
                        <span className="text-stone-400 font-serif font-bold" title="Sent">✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })
        )}

        {typingPartner && (
          <div className="flex items-center gap-2 max-w-[80%]">
            <div 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).navigateToProfile && user.partnerId) {
                  (window as any).navigateToProfile(user.partnerId);
                }
              }}
              className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs shrink-0 cursor-pointer hover:scale-115 active:scale-95 transition-all"
              title={`${user.partnerName || 'Companion'}'s profile room`}
            >
              {isImageString(user.partnerPhoto) ? (
                <img src={user.partnerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{user.partnerPhoto || '🦊'}</span>
              )}
            </div>
            <div className="px-3 py-2 bg-stone-100 border border-stone-200/50 rounded-2xl rounded-tl-none text-xs flex items-center gap-1 text-stone-500 shadow-inner">
              <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating bottom badge */}
      <AnimatePresence>
        {showScrollBottomBadge && (
          <motion.button
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            type="button"
            onClick={() => {
              const el = messagesContainerRef.current;
              if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              }
              setShowScrollBottomBadge(false);
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all z-20"
          >
            <span>New Messages</span>
            <span className="text-[10px]">↓</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>

      {/* Love Stickers & GIF Drawer */}
      <AnimatePresence>
        {showGifDrawer && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '140px' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-stone-900 border-t border-rose-100 dark:border-stone-850 p-3 overflow-y-auto z-10"
            id="gif_drawer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Lovable stickers & gifs</span>
              <button onClick={() => setShowGifDrawer(false)} className="text-[10px] text-stone-400 font-semibold hover:text-stone-600 cursor-pointer">Close</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 select-none">
              {ROMANTIC_GIFS.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSendGif(gif.url)}
                  className="rounded-xl overflow-hidden bg-rose-50/50 border border-rose-100 shrink-0 hover:border-pink-400 active:scale-95 transition w-24 h-16 flex flex-col justify-between p-1 relative cursor-pointer"
                >
                  <img src={gif.url} alt={gif.tag} className="w-full h-full object-cover rounded-lg" />
                  <span className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 text-[6.5px] font-bold rounded text-white">{gif.tag}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat bottom bar controls */}
      <div className="p-3 bg-white dark:bg-stone-900 border-t border-rose-100 dark:border-stone-800 flex flex-col gap-2 z-10 select-none">
        
        {replyingTo && (
          <div className="px-3.5 py-2 bg-rose-50/70 dark:bg-stone-800 border-l-4 border-rose-400 rounded-lg flex items-center justify-between gap-3 text-xs shadow-3xs animate-fade-in select-none">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold text-rose-500 block uppercase tracking-wider">
                Replying to {replyingTo.senderId === user.id ? 'Yourself' : user.partnerName || 'Partner'}
              </span>
              <p className="text-stone-600 dark:text-stone-300 truncate text-[11px] mt-0.5 font-medium">
                {decryptedCache[replyingTo.id]?.startsWith('[VOICE_NOTE]:') ? '🎤 Voice Note' : decryptedCache[replyingTo.id]?.startsWith('[VIDEO_NOTE]:') ? '📹 Video Note' : decryptedCache[replyingTo.id]?.startsWith('[IMAGE_ATTACHMENT]:') ? '📸 Shared Image' : decryptedCache[replyingTo.id]?.startsWith('[GIF]:') ? '💖 Romantic Sticker' : decryptedCache[replyingTo.id]}
              </p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isVideoRecording ? (
          <div className="flex flex-col items-center justify-center bg-rose-50/40 dark:bg-stone-900 border border-rose-100 dark:border-stone-800 p-4 rounded-2xl gap-3 shadow-md">
            <span className="text-xs font-bold text-rose-500 animate-pulse uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              Video Note Rec: {Math.floor(videoRecordingSeconds / 60)}:{(videoRecordingSeconds % 60) < 10 ? '0' : ''}{videoRecordingSeconds % 60}
            </span>
            
            {/* Round Webcam live preview */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-rose-400 shadow-inner bg-black">
              <video
                ref={localVideoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVideoRecording}
                className="py-1.5 px-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition font-semibold text-[10px] cursor-pointer"
              >
                Cancel Video
              </button>
              <button
                type="button"
                onClick={stopVideoRecording}
                className="py-1.5 px-4 bg-rose-500 text-white hover:bg-rose-600 rounded-xl transition font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Square size={8} className="fill-white" />
                <span>Send Video Note</span>
              </button>
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between bg-rose-50/50 border border-rose-100 p-2 rounded-2xl animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
              <span className="text-xs font-semibold text-rose-600 font-mono tracking-wide">
                REC • {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60) < 10 ? '0' : ''}{recordingSeconds % 60}
              </span>
              <span className="text-[10px] text-stone-400 font-medium sm:block hidden">Recording Private letter...</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-xl transition cursor-pointer"
                title="Cancel Note"
              >
                <Trash2 size={15} />
              </button>

              <button
                type="button"
                onClick={stopRecording}
                className="py-1.5 px-3 bg-rose-500 text-white hover:bg-rose-600 rounded-xl transition flex items-center gap-1.5 font-bold text-[10px] shadow-sm active:scale-95 cursor-pointer"
                title="Send Note"
              >
                <Square size={10} className="fill-white" />
                <span>Send Letter</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            
            {/* Image Attachment Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Share Private Photo"
              id="chat_img_uploader_btn"
            >
              <Upload size={18} />
            </button>
            <input 
              type="file" 
              ref={imageInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Lovable Gif Selector button */}
            <button
              type="button"
              onClick={() => { setShowGifDrawer(!showGifDrawer); }}
              className={`p-2 rounded-xl transition ${
                showGifDrawer ? 'bg-rose-100 text-rose-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
              }`}
              title="Send GIFs/Stickers"
              id="gif_toggle_btn"
            >
              <ImageIcon size={18} />
            </button>

            {/* Mic audio recorder */}
            <button
              type="button"
              onClick={startRecording}
              className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Record Voice Note"
              id="chat_mic_record_btn"
            >
              <Mic size={18} />
            </button>

            {/* Video note recorder */}
            <button
              type="button"
              onClick={startVideoRecording}
              className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Record Video Note"
              id="chat_video_record_btn"
            >
              <Video size={18} />
            </button>

            {/* Thumb Kiss Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setShowThumbKissPortal(true);
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showThumbKissPortal ? 'bg-pink-100 text-pink-600' : 'text-stone-400 hover:text-pink-500 hover:bg-pink-50'
              }`}
              title="Initiate Double Thumb Kiss"
              id="chat_thumb_kiss_launcher_btn"
            >
              <Heart size={18} className={partnerThumbKissActive ? "animate-pulse stroke-pink-500 fill-pink-300" : ""} />
            </button>

              <input
                type="text"
                placeholder="Write a sweet private letter..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2 text-xs rounded-xl border border-rose-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white dark:focus:bg-stone-900 text-stone-700 dark:text-stone-100 font-medium"
                disabled={isEncrypting}
                id="chat_input_field"
              />

            <button
              type="submit"
              disabled={isEncrypting || !inputText.trim()}
              className="p-2 btn-romantic rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 disabled:scale-100 active:scale-95 transition text-white cursor-pointer"
              id="chat_send_btn"
            >
              {isEncrypting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        )}

        {/* Emojis shortcuts bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs text-stone-400 scrollbar-none justify-center">
          <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-0.5 uppercase shrink-0">
            <Flame size={10} /> Quick Lovers:
          </span>
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInputText((prev) => prev + emoji)}
              className="px-1.5 py-0.5 hover:bg-rose-50 rounded text-sm shrink-0 transition hover:scale-130"
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen zoom Image viewer modal */}
      <AnimatePresence>
        {zoomImgSrc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setZoomImgSrc(null)}
          >
            <button 
              onClick={() => setZoomImgSrc(null)}
              className="absolute top-4 right-4 text-white hover:text-stone-300 p-2 bg-stone-800/60 rounded-full"
            >
              <X size={20} />
            </button>
            <img 
              src={zoomImgSrc} 
              alt="Shared Love" 
              className="max-w-full max-h-full rounded-2xl object-contain select-none"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumb Kiss Intimate Touchscreen Portal */}
      <AnimatePresence>
        {showThumbKissPortal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/90 backdrop-blur-md flex flex-col items-center justify-between p-6 z-50 text-white select-none pointer-events-auto"
            id="thumb_kiss_overlay_portal"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between text-stone-300">
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-pink-400">TOUCH PORTAL ACTIVE</span>
              <button
                onClick={() => {
                  if (localThumbKissActive) {
                    handleThumbRelease();
                  }
                  setShowThumbKissPortal(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-stone-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Middle Prompt */}
            <div className="text-center max-w-xs space-y-2">
              <h3 className="text-xl font-serif font-bold text-pink-300 flex items-center justify-center gap-1.5 leading-none">
                <Sparkles size={16} /> Double Thumb Kiss
              </h3>
              <p className="text-xs text-stone-400 leading-normal">
                Place and hold your index/thumb on the glowing kiss circle below. Once your partner holds theirs at the same time, your screens fuse & vibrate!
              </p>
              {partnerThumbKissActive && (
                <div className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold inline-block animate-pulse">
                  ⚡ Partner is holding! Kiss ready...
                </div>
              )}
            </div>

            {/* Glowing Touch pad zone */}
            <div className="relative w-72 h-72 flex items-center justify-center">
              
              {/* Floating Hearts spawning upon both touching */}
              {bothTouching && floatingHearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ y: 50, opacity: 1, scale: 0.5 }}
                  animate={{ y: -260, opacity: 0, scale: [0.5, 1.5, 1], x: [0, (h.left - 50) * 1.5, (h.left - 50) * -1] }}
                  transition={{ duration: 2.2, delay: h.delay, ease: 'easeOut' }}
                  className="absolute text-pink-500 text-2xl select-none"
                  style={{ left: `${h.left}%`, bottom: '25%' }}
                >
                  ❤️
                </motion.div>
              ))}

              {/* Pulsing ring aura if both touching */}
              {bothTouching && (
                <div className="absolute w-60 h-60 rounded-full bg-pink-500/10 border-2 border-pink-500/25 animate-ping duration-1000"></div>
              )}

              {/* Pad Element */}
              <div
                onMouseDown={handleThumbPress}
                onMouseUp={handleThumbRelease}
                onMouseLeave={handleThumbRelease}
                onTouchStart={handleThumbPress}
                onTouchEnd={handleThumbRelease}
                className={`relative w-44 h-44 rounded-full border-2 cursor-pointer flex flex-col items-center justify-center transition-all ${
                  bothTouching 
                    ? 'bg-rose-500 text-white border-white scale-110 shadow-[0_0_40px_rgba(244,63,94,0.6)]'
                    : localThumbKissActive
                      ? 'bg-pink-600 text-pink-100 border-pink-400 scale-105 shadow-[0_0_25px_rgba(219,39,119,0.4)] animate-pulse'
                      : partnerThumbKissActive
                        ? 'bg-pink-900/40 text-pink-300 border-pink-500/40 hover:scale-102 hover:border-pink-400'
                        : 'bg-white/5 text-stone-400 border-white/15 hover:border-white/30'
                }`}
                style={{ touchAction: 'none' }}
              >
                <div className="text-center p-3 flex flex-col items-center justify-center space-y-1 select-none">
                  <Heart size={36} fill={bothTouching || localThumbKissActive ? "currentColor" : "none"} className={bothTouching ? "animate-bounce" : ""} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    {bothTouching ? 'KISS TOUCHED! 🥰' : localThumbKissActive ? 'HOLDING... ⏳' : 'HOLD THUMB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Status feedback */}
            <div className="text-center text-[10px] text-stone-500 py-2">
              {bothTouching ? (
                <span className="text-pink-300 font-bold tracking-wide animate-pulse uppercase">双人连通中 • Feeling partner's heartbeat</span>
              ) : localThumbKissActive ? (
                <span className="text-pink-400 font-medium font-sans">Waiting for your partner to hold their pad...</span>
              ) : (
                <span className="text-stone-400 font-sans uppercase tracking-widest">Client Touch Active</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
