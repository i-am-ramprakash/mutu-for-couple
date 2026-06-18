import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertOctagon, HelpCircle } from 'lucide-react';

interface CallDiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
  iceConnectionState: string;
  signalingState: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onReconnect: () => void;
}

export default function CallDiagnostics({
  isOpen,
  onClose,
  iceConnectionState,
  signalingState,
  localStream,
  remoteStream,
  onReconnect
}: CallDiagnosticsProps) {
  // Read existing custom STUN/TURN configs from localStorage
  const [turnUrl, setTurnUrl] = useState(() => localStorage.getItem('mutu_custom_turn_url') || '');
  const [turnUsername, setTurnUsername] = useState(() => localStorage.getItem('mutu_custom_turn_username') || '');
  const [turnCredential, setTurnCredential] = useState(() => localStorage.getItem('mutu_custom_turn_credential') || '');
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  if (!isOpen) return null;

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mutu_custom_turn_url', turnUrl.trim());
    localStorage.setItem('mutu_custom_turn_username', turnUsername.trim());
    localStorage.setItem('mutu_custom_turn_credential', turnCredential.trim());
    
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('mutu_custom_turn_url');
    localStorage.removeItem('mutu_custom_turn_username');
    localStorage.removeItem('mutu_custom_turn_credential');
    setTurnUrl('');
    setTurnUsername('');
    setTurnCredential('');
    
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const getIceStateBadge = (state: string) => {
    const s = state.toLowerCase();
    if (s === 'connected' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/30 font-mono">
          <CheckCircle size={10} /> CONNECTED / TRAFFIC ACTIVE
        </span>
      );
    }
    if (s === 'checking') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-500/30 font-mono animate-pulse">
          ⏳ NEGOTIATING STUN/TURN...
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-500/30 font-mono">
          <AlertOctagon size={10} /> FAILED (IFRAME/SANDBOX BLOCK)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-stone-500/10 text-stone-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-stone-500/30 font-mono uppercase">
        {state || 'unknown'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex justify-end animate-fade-in font-sans">
      <div 
        className="w-full max-w-md bg-stone-900 border-l border-stone-800 text-stone-200 h-full p-6 flex flex-col justify-between overflow-y-auto relative animate-slide-in shadow-2xl"
        id="webrtc_diagnostics_panel"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-rose-400 flex items-center gap-2">
                ⚙️ WebRTC Core Settings
              </h3>
              <p className="text-[10px] text-stone-500">Real-time traversal diagnostics & custom credentials</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Real-time diagnostics banner */}
          <div className="bg-stone-950/80 rounded-xl p-4 border border-stone-800/60 space-y-3">
            <h4 className="text-[11px] font-bold text-stone-400 tracking-wider uppercase font-mono">
              🩺 Connection Diagnostics
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[9px] text-stone-500 uppercase font-mono">ICE Traversal Status</span>
                <div className="mt-1">{getIceStateBadge(iceConnectionState)}</div>
              </div>
              <div>
                <span className="block text-[9px] text-stone-500 uppercase font-mono">Signaling Channel</span>
                <span className="inline-block mt-1 font-mono text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                  {signalingState.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800/40 text-[11px] space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">Local Capture:</span>
                <span className="text-amber-400">
                  {localStream 
                    ? `Active (${localStream.getTracks().length} tracks: ${localStream.getTracks().map(t => t.kind).join(', ')})`
                    : 'Synthetic Cozy Overlay 💗'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Remote Capture:</span>
                <span className="text-pink-400">
                  {remoteStream 
                    ? `Connected (${remoteStream.getTracks().length} tracks)`
                    : 'Awaiting remote bytes... ⏳'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Setup tips */}
          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 text-xs space-y-2 text-rose-300">
            <h5 className="font-bold flex items-center gap-1">
              <HelpCircle size={13} className="text-rose-400" />
              How do I make Peer-to-Peer calls work?
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-400">
              <li>
                <strong className="text-rose-300">Open in a New Tab</strong>: Browser sandboxes block camera permission inside iframes. Click the &apos;Open in new tab&apos; icon in the outer editor.
              </li>
              <li>
                <strong className="text-rose-300">Setup a TURN Server</strong>: When partners are on different internet networks (e.g. mobile vs wifi), symmetric NATs block direct connections. Enter your personal STUN/TURN key down below!
              </li>
              <li>
                <strong className="text-rose-300">Cozy Sandbox Bypass</strong>: When hardware permission is denied, MuTu automatically activates a gorgeous synthetic couple stream!
              </li>
            </ol>
          </div>

          {/* TURN config form */}
          <form onSubmit={handleSaveConfigs} className="space-y-4">
            <h4 className="text-[11px] font-bold text-stone-400 tracking-wider uppercase font-mono">
              🛠️ Custom ICE Servers (STUN / TURN)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-stone-400 font-mono font-medium mb-1 dark:text-stone-300">
                  TURN/STUN Server URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. turn:your-turn-service.com:3478"
                  value={turnUrl}
                  onChange={(e) => setTurnUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 hover:border-stone-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-600 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-stone-400 font-mono font-medium mb-1 dark:text-stone-300">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. user123"
                    value={turnUsername}
                    onChange={(e) => setTurnUsername(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 hover:border-stone-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 font-mono font-medium mb-1 dark:text-stone-300">
                    Credential / Key
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={turnCredential}
                    onChange={(e) => setTurnCredential(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 hover:border-stone-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-600 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl cursor-pointer transition active:scale-95"
              >
                Apply Custom TURN
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-medium text-xs px-3 py-2 rounded-xl cursor-pointer transition"
              >
                Reset Default
              </button>
            </div>
            
            {showSavedMsg && (
              <p className="text-[11px] text-emerald-400 font-mono text-center animate-pulse">
                ✓ WebRTC custom server configuration synchronized successfully.
              </p>
            )}
          </form>
        </div>

        {/* Footer actions */}
        <div className="border-t border-stone-800/80 pt-4 flex gap-3 mt-6">
          <button
            onClick={() => {
              onReconnect();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-stone-800 border border-stone-700 hover:bg-stone-700 text-stone-200 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={13} className="animate-spin" />
            Force Reconnect Media Channel
          </button>
        </div>
      </div>
    </div>
  );
}
