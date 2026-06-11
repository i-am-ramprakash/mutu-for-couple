import React, { useState } from 'react';
import { ArrowLeft, Sparkles, MessageSquare, Heart, RefreshCw, Send, HelpCircle, Compass } from 'lucide-react';
import { User } from '../types';

interface AILoveAssistantProps {
  user: User;
  onBack: () => void;
}

export default function AILoveAssistant({ user, onBack }: AILoveAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState<'romantic' | 'playful' | 'comforting' | 'adventurous'>('romantic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Suggested pre-made templates
  const SUGGESTIONS = [
    "Suggest cozy online date night ideas for long distance",
    "Draft a cute and comforting apology letter after a silly disagreement",
    "List conversation topics to deepen intimacy before sleep",
    "Make up a creative storytelling game we can play in Private Chat"
  ];

  const handleGenerate = async (queryText?: string) => {
    const finalPrompt = queryText || prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/gemini/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          prompt: finalPrompt,
          mood
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.ideas);
      } else {
        setResult("The companion had a tiny error dreaming that up. Please retry!");
      }
    } catch (err) {
      setResult("Offline or server failure. Check terminal logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-6" id="ai_love_assistant_section">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 rounded-xl transition cursor-pointer text-stone-600 dark:text-stone-300"
            id="back_btn_assistant"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <span>🤖 AI Love Assistant</span>
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Your customized companion for drafting sweet quotes, planning dates and solving advice.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel left side */}
        <div className="lg:col-span-1 space-y-4">
          <span className="text-[11px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Compass size={12} className="text-rose-500" /> Choose Cozy Prompt
          </span>

          {/* Quick Pre-made Prompts */}
          <div className="space-y-1.5">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s);
                  handleGenerate(s);
                }}
                className="w-full text-left p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 hover:bg-rose-50/20 dark:hover:bg-rose-950/10 border border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 transition cursor-pointer font-medium leading-tight block"
              >
                💡 "{s}"
              </button>
            ))}
          </div>

          {/* Mood modifiers */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase px-1">Cozy Intimacy Vibe</label>
            <div className="grid grid-cols-2 gap-2">
              {(['romantic', 'playful', 'comforting', 'adventurous'] as const).map(mKey => (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => setMood(mKey)}
                  className={`py-2 rounded-xl border text-[11px] font-bold capitalize transition cursor-pointer ${
                    mood === mKey
                      ? 'bg-indigo-650 text-white border-indigo-655'
                      : 'bg-white dark:bg-stone-800 border-stone-200 text-stone-650 dark:text-stone-300'
                  }`}
                >
                  {mKey}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Text field & active output playground */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-450 uppercase tracking-widest">Write custom request</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask me to suggest date ideas, sweet bedtime lyrics or intimacy plans..."
                className="flex-1 text-xs px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-2xl bg-white dark:bg-stone-800 dark:text-white focus:outline-rose-500"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={loading || !prompt.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-455 text-white rounded-2xl cursor-pointer shadow transition"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Loader or AI output layout */}
          {loading && (
            <div className="p-8 border border-dashed rounded-3xl flex flex-col justify-center items-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500" size={24} />
              <p className="text-xs text-indigo-600 font-semibold animate-pulse">Our romantic companion is brainstorming customized intimacy proposals...</p>
            </div>
          )}

          {result && (
            <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 p-6 rounded-3xl space-y-4 animate-fade-in shadow-inner">
              <div className="flex items-center gap-1.5 border-b pb-2">
                <Heart size={14} className="text-rose-500 fill-current" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-750 dark:text-indigo-400">Your AI-Generated Action-Plan</h4>
              </div>
              <div className="whitespace-pre-wrap text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                {result}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="p-8 text-center text-stone-400 dark:text-stone-500 border border-dashed rounded-3xl">
              <p className="text-xs font-semibold">Ready to draft creative dates!</p>
              <p className="text-[11px]">Select any quick suggestion card on the left side to write custom proposals instantly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
