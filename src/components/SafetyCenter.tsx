import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, ShieldAlert, Cpu, Download, AlertTriangle, RefreshCw, Key, ToggleLeft, CheckCircle } from 'lucide-react';
import { User, SecurityLog } from '../types';

interface SafetyCenterProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

export default function SafetyCenter({ user, onBack, onLogout }: SafetyCenterProps) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/couple/security-logs?coupleId=${user.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.coupleId) {
      fetchLogs();
    }
  }, [user.coupleId]);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/couple/export-data?userId=${user.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `mutu_gdpr_export_${user.id}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else {
        alert("Unable to compile GDPR packet this second. Try again shortly.");
      }
    } catch (err) {
      alert("Error generating backup dataset.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteProfile = async () => {
    const doubleCheck = window.confirm(
      "☣️ WARNING: This action will permanently delete your user profile, purge all letters & memories, and un-link your devices under GDPR Right to Be Forgotten. This CANNOT be undone. Proceed?"
    );
    if (!doubleCheck) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/couple/delete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        alert("Your records have been compiled for permanent deletion and local caches shredded successfully.");
        onLogout();
      } else {
        alert("Purge request aborted by server guards.");
      }
    } catch (err) {
      alert("Offline deletion error.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDateFriendly = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6" id="safety_trust_space">
      {/* Header */}
      <div className="flex items-center justify-between border-b dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 rounded-xl transition cursor-pointer text-stone-600 dark:text-stone-300"
            id="back_btn_security"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <span>🛡️ Connections & Comfort Safety Center</span>
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              View connected device history, download your memories, or permanently close your Nest.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actions panel left */}
        <div className="md:col-span-1 space-y-4">
          {/* Status security card */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 text-xs space-y-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle size={14} className="fill-current" /> Device Connection Active
            </span>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
              We use a safe and unique relationship key. Your key: <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-rose-500 font-mono font-bold leading-none">{user.loveKey}</code> is used to unveil private letters just for your eyes.
            </p>
          </div>

          {/* Export card */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 space-y-3">
            <h4 className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Relationship Data Backup</h4>
            <p className="text-[11px] text-stone-450 dark:text-stone-500 leading-relaxed">
              Export all typed messages, love diaries, bucket items, in a structured, portable JSON document format.
            </p>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="w-full py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 disabled:bg-stone-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 justify-center cursor-pointer shadow-sm active:scale-95"
            >
              <Download size={13} />
              {exporting ? 'Packing JSON Archive...' : 'Download My Data'}
            </button>
          </div>

          {/* Purge Account */}
          <div className="p-4 rounded-2xl border border-red-200/50 dark:border-red-900/30 bg-red-50/5 dark:bg-red-950/20 space-y-3">
            <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1">
              <AlertTriangle size={13} /> Close Your Nest Forever
            </h4>
            <p className="text-[11px] text-stone-450 dark:text-stone-500 leading-relaxed">
              Instantly uncouple with your partner, delete your entire profile and scrub relationship data completely off our cloud stores.
            </p>
            <button
              onClick={handleDeleteProfile}
              disabled={deleting}
              className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 justify-center cursor-pointer shadow"
            >
              <span>Close Nest</span>
            </button>
          </div>
        </div>

        {/* Activity history right */}
        <div className="md:col-span-2 space-y-3">
          <span className="text-[11px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Cpu size={12} className="text-rose-500" /> Recent Connection History
          </span>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 rounded-full border-4 border-rose-450 border-t-transparent animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-stone-400 border border-dashed rounded-3xl">
              <p className="text-sm font-semibold">No recent connection events</p>
              <p className="text-xs">Connection events register upon linking, login, or key downloads.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={log.id || idx} className="p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/80 rounded-xl flex justify-between items-start text-xs gap-3 font-medium">
                  <div className="space-y-0.5">
                    <span className="font-bold text-stone-800 dark:text-stone-200 block">{log.actionDescription}</span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 block font-mono">IP: {log.ipAddress || 'unknown'} • Browser/OS: {log.deviceInfo || 'Nest Client'}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap shrink-0">{formatDateFriendly(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
